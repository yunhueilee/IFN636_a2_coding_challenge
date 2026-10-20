// Functional tests for Member 4 - review queue and feedback (FR-16 to FR-23, NFR-04 to NFR-06)
// Each test sends a real HTTP request to the submissions router.
// The database is replaced with Sinon stubs, so no MongoDB or .env is needed.
const { expect } = require('chai');
const sinon = require('sinon');
const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const User = require('../models/User');
const Submission = require('../models/Submission');
const Progress = require('../models/Progress');
const ConsoleLogObserver = require('../observers/ConsoleLogObserver');
const EmailObserver = require('../observers/EmailObserver');
const submissionRoutes = require('../routes/submissions');

const ADMIN_ID = '507f1f77bcf86cd799439011';
const MANAGER_ID = '507f1f77bcf86cd799439012';
const OTHER_ADMIN_ID = '507f1f77bcf86cd799439013';
const LEARNER_ID = '507f1f77bcf86cd799439014';
const ATTEMPT_ID = '507f1f77bcf86cd799439030';
const CHALLENGE_ID = '507f1f77bcf86cd799439022';

// small app with only the submission routes (server.js would connect to MongoDB)
function buildApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/submissions', submissionRoutes);
    return app;
}

// sign a token for this user; auth() then loads the user, so findById is stubbed per id
function tokenFor(userId, role) {
    return 'Bearer ' + jwt.sign({ userId, role }, process.env.JWT_SECRET);
}

// users that auth() can find, keyed by id
function stubUsers(users) {
    sinon.stub(User, 'findById').callsFake(async (id) => users[String(id)] || null);
}

const users = {
    [ADMIN_ID]: { _id: ADMIN_ID, role: 'ADMIN', active: true },
    [MANAGER_ID]: { _id: MANAGER_ID, role: 'ADMIN_MANAGER', active: true },
    [OTHER_ADMIN_ID]: { _id: OTHER_ADMIN_ID, role: 'ADMIN', active: true },
    [LEARNER_ID]: { _id: LEARNER_ID, role: 'LEARNER', active: true },
};

// mongoose queries are chained (.populate().populate().sort()) and then awaited;
// this fake query supports the chain and resolves to the given value
function query(value) {
    const q = {
        populate: () => q,
        sort: () => q,
        select: () => q,
        then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
    };
    return q;
}

// an attempt as the routes see it
function attempt(overrides = {}) {
    return {
        _id: ATTEMPT_ID,
        challenge: { _id: CHALLENGE_ID, title: 'Two Sum', challengeNumber: 'CCP-CH-001' },
        learner: { _id: LEARNER_ID, username: 'learner', email: 'learner@test.com' },
        attemptNumber: 1,
        status: 'SUBMITTED',
        selectedForReview: true,
        reviewer: null,
        comments: [],
        ...overrides,
    };
}

describe('Review queue and feedback (Member 4)', () => {
    let app;

    beforeEach(() => {
        app = buildApp();
        stubUsers(users);
        // keep the test output clean; the routes log errors and the review email
        sinon.stub(console, 'error');
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('FR-16 review queue shows only the latest open attempt', () => {
        it('returns the queue to an Admin and filters to latest SUBMITTED / UNDER_REVIEW attempts', async () => {
            const find = sinon.stub(Submission, 'find').returns(query([attempt()]));

            const res = await request(app)
                .get('/api/submissions/review-queue')
                .set('Authorization', tokenFor(ADMIN_ID, 'ADMIN'));

            expect(res.status).to.equal(200);
            expect(res.body).to.have.length(1);
            expect(find.firstCall.args[0]).to.deep.equal({
                selectedForReview: true,
                status: { $in: ['SUBMITTED', 'UNDER_REVIEW'] },
            });
        });

        it('rejects a Learner with 403', async () => {
            const res = await request(app)
                .get('/api/submissions/review-queue')
                .set('Authorization', tokenFor(LEARNER_ID, 'LEARNER'));

            expect(res.status).to.equal(403);
        });

        it('rejects a request with no token with 401', async () => {
            const res = await request(app).get('/api/submissions/review-queue');

            expect(res.status).to.equal(401);
        });
    });

    describe('FR-17 / NFR-04 claim locks an attempt to exactly one reviewer', () => {
        it('claims a SUBMITTED attempt with one atomic update', async () => {
            const update = sinon
                .stub(Submission, 'findOneAndUpdate')
                .returns(query(attempt({ status: 'UNDER_REVIEW', reviewer: { _id: ADMIN_ID } })));

            const res = await request(app)
                .post(`/api/submissions/review-queue/${ATTEMPT_ID}/claim`)
                .set('Authorization', tokenFor(ADMIN_ID, 'ADMIN'));

            expect(res.status).to.equal(200);
            expect(res.body.status).to.equal('UNDER_REVIEW');
            // the lock only matches while the attempt is still SUBMITTED
            expect(update.firstCall.args[0]).to.include({ status: 'SUBMITTED', selectedForReview: true });
            expect(update.firstCall.args[1].$set).to.deep.equal({ status: 'UNDER_REVIEW', reviewer: ADMIN_ID });
        });

        it('two reviewers claiming at the same time: exactly one succeeds, the other gets 409', async () => {
            const update = sinon.stub(Submission, 'findOneAndUpdate');
            update.onFirstCall().returns(query(attempt({ status: 'UNDER_REVIEW', reviewer: { _id: ADMIN_ID } })));
            update.onSecondCall().returns(query(null));
            sinon.stub(Submission, 'findById').resolves(attempt({ status: 'UNDER_REVIEW', reviewer: ADMIN_ID }));

            const [first, second] = await Promise.all([
                request(app)
                    .post(`/api/submissions/review-queue/${ATTEMPT_ID}/claim`)
                    .set('Authorization', tokenFor(ADMIN_ID, 'ADMIN')),
                request(app)
                    .post(`/api/submissions/review-queue/${ATTEMPT_ID}/claim`)
                    .set('Authorization', tokenFor(MANAGER_ID, 'ADMIN_MANAGER')),
            ]);

            const statuses = [first.status, second.status].sort();
            expect(statuses).to.deep.equal([200, 409]);
            const loser = first.status === 409 ? first : second;
            expect(loser.body.message).to.equal('This attempt is already under review');
        });

        it('rejects claiming an attempt that already has a decision (409)', async () => {
            sinon.stub(Submission, 'findOneAndUpdate').returns(query(null));
            sinon.stub(Submission, 'findById').resolves(attempt({ status: 'ACCEPTED', decision: 'PASS' }));

            const res = await request(app)
                .post(`/api/submissions/review-queue/${ATTEMPT_ID}/claim`)
                .set('Authorization', tokenFor(ADMIN_ID, 'ADMIN'));

            expect(res.status).to.equal(409);
            expect(res.body.message).to.equal('This attempt cannot be claimed for review');
        });

        it('returns 404 for a missing or cancelled attempt', async () => {
            sinon.stub(Submission, 'findOneAndUpdate').returns(query(null));
            sinon.stub(Submission, 'findById').resolves(null);

            const res = await request(app)
                .post(`/api/submissions/review-queue/${ATTEMPT_ID}/claim`)
                .set('Authorization', tokenFor(ADMIN_ID, 'ADMIN'));

            expect(res.status).to.equal(404);
        });
    });

    describe('FR-18 release a claimed attempt back to the queue', () => {
        it('lets the claiming reviewer release it (back to SUBMITTED, no reviewer)', async () => {
            const update = sinon
                .stub(Submission, 'findOneAndUpdate')
                .returns(query(attempt({ status: 'SUBMITTED', reviewer: null })));

            const res = await request(app)
                .post(`/api/submissions/review-queue/${ATTEMPT_ID}/release`)
                .set('Authorization', tokenFor(ADMIN_ID, 'ADMIN'));

            expect(res.status).to.equal(200);
            expect(res.body.status).to.equal('SUBMITTED');
            // only matches when this reviewer holds the lock
            expect(update.firstCall.args[0]).to.include({ status: 'UNDER_REVIEW', reviewer: ADMIN_ID });
        });

        it('rejects another reviewer with 403', async () => {
            sinon.stub(Submission, 'findOneAndUpdate').returns(query(null));

            const res = await request(app)
                .post(`/api/submissions/review-queue/${ATTEMPT_ID}/release`)
                .set('Authorization', tokenFor(OTHER_ADMIN_ID, 'ADMIN'));

            expect(res.status).to.equal(403);
            expect(res.body.message).to.equal('You cannot release this attempt');
        });
    });

    describe('FR-19 only an Admin Manager can reassign a locked attempt', () => {
        it('rejects an Admin with 403', async () => {
            const res = await request(app)
                .post(`/api/submissions/review-queue/${ATTEMPT_ID}/reassign`)
                .set('Authorization', tokenFor(ADMIN_ID, 'ADMIN'))
                .send({ reviewerId: OTHER_ADMIN_ID });

            expect(res.status).to.equal(403);
            expect(res.body.message).to.equal('Only an Admin Manager can reassign a review');
        });

        it('lets an Admin Manager reassign to another active reviewer', async () => {
            sinon.stub(User, 'findOne').resolves({ _id: OTHER_ADMIN_ID, role: 'ADMIN', active: true });
            const update = sinon
                .stub(Submission, 'findOneAndUpdate')
                .returns(query(attempt({ status: 'UNDER_REVIEW', reviewer: { _id: OTHER_ADMIN_ID } })));

            const res = await request(app)
                .post(`/api/submissions/review-queue/${ATTEMPT_ID}/reassign`)
                .set('Authorization', tokenFor(MANAGER_ID, 'ADMIN_MANAGER'))
                .send({ reviewerId: OTHER_ADMIN_ID });

            expect(res.status).to.equal(200);
            expect(res.body.reviewer._id).to.equal(OTHER_ADMIN_ID);
            expect(update.firstCall.args[0]).to.include({ status: 'UNDER_REVIEW' });
        });

        it('rejects an invalid or inactive reviewer with 400', async () => {
            sinon.stub(User, 'findOne').resolves(null);

            const res = await request(app)
                .post(`/api/submissions/review-queue/${ATTEMPT_ID}/reassign`)
                .set('Authorization', tokenFor(MANAGER_ID, 'ADMIN_MANAGER'))
                .send({ reviewerId: LEARNER_ID });

            expect(res.status).to.equal(400);
            expect(res.body.message).to.equal('Please choose a valid reviewer');
        });

        it('rejects reassigning an attempt that is not locked (400)', async () => {
            sinon.stub(User, 'findOne').resolves({ _id: OTHER_ADMIN_ID, role: 'ADMIN', active: true });
            sinon.stub(Submission, 'findOneAndUpdate').returns(query(null));

            const res = await request(app)
                .post(`/api/submissions/review-queue/${ATTEMPT_ID}/reassign`)
                .set('Authorization', tokenFor(MANAGER_ID, 'ADMIN_MANAGER'))
                .send({ reviewerId: OTHER_ADMIN_ID });

            expect(res.status).to.equal(400);
            expect(res.body.message).to.equal('This attempt is not locked for review');
        });
    });

    describe('FR-20 / NFR-05 one immutable decision per attempt', () => {
        function stubDecision(current, saved) {
            sinon.stub(Submission, 'findById').resolves(current);
            const update = sinon.stub(Submission, 'findOneAndUpdate').returns(query(saved));
            const progress = sinon.stub(Progress, 'findOneAndUpdate').resolves({});
            sinon.stub(EmailObserver.prototype, 'update').resolves();
            sinon.stub(ConsoleLogObserver.prototype, 'update');
            return { update, progress };
        }

        it('PASS sets the attempt to ACCEPTED and the progress to COMPLETED', async () => {
            const { update, progress } = stubDecision(
                attempt({ status: 'UNDER_REVIEW', reviewer: ADMIN_ID }),
                attempt({ status: 'ACCEPTED', decision: 'PASS', feedback: 'Well done' })
            );

            const res = await request(app)
                .post(`/api/submissions/review-queue/${ATTEMPT_ID}/decision`)
                .set('Authorization', tokenFor(ADMIN_ID, 'ADMIN'))
                .send({ decision: 'PASS', feedback: 'Well done' });

            expect(res.status).to.equal(200);
            expect(update.firstCall.args[1].$set).to.include({ decision: 'PASS', status: 'ACCEPTED' });
            // the write only matches while there is no decision yet (NFR-05)
            expect(update.firstCall.args[0].decision).to.deep.equal({ $exists: false });
            expect(progress.firstCall.args[1]).to.deep.equal({ status: 'COMPLETED' });
        });

        it('REVISION_REQUIRED on attempt 10 becomes FINAL_FAILED', async () => {
            const { update, progress } = stubDecision(
                attempt({ status: 'UNDER_REVIEW', reviewer: ADMIN_ID, attemptNumber: 10 }),
                attempt({ status: 'FINAL_FAILED', decision: 'REVISION_REQUIRED', attemptNumber: 10 })
            );

            const res = await request(app)
                .post(`/api/submissions/review-queue/${ATTEMPT_ID}/decision`)
                .set('Authorization', tokenFor(ADMIN_ID, 'ADMIN'))
                .send({ decision: 'REVISION_REQUIRED', feedback: 'Still failing the edge cases' });

            expect(res.status).to.equal(200);
            expect(update.firstCall.args[1].$set.status).to.equal('FINAL_FAILED');
            expect(progress.firstCall.args[1]).to.deep.equal({ status: 'FINAL_FAILED' });
        });

        it('rejects a decision value other than PASS / REVISION_REQUIRED (400)', async () => {
            const res = await request(app)
                .post(`/api/submissions/review-queue/${ATTEMPT_ID}/decision`)
                .set('Authorization', tokenFor(ADMIN_ID, 'ADMIN'))
                .send({ decision: 'MAYBE', feedback: 'x' });

            expect(res.status).to.equal(400);
            expect(res.body.message).to.equal('Decision must be PASS or REVISION_REQUIRED');
        });

        it('rejects empty feedback (400)', async () => {
            const res = await request(app)
                .post(`/api/submissions/review-queue/${ATTEMPT_ID}/decision`)
                .set('Authorization', tokenFor(ADMIN_ID, 'ADMIN'))
                .send({ decision: 'PASS', feedback: '   ' });

            expect(res.status).to.equal(400);
            expect(res.body.feedback).to.equal('This field is required');
        });

        it('rejects a reviewer who is not assigned to the attempt (403)', async () => {
            sinon.stub(Submission, 'findById').resolves(attempt({ status: 'UNDER_REVIEW', reviewer: ADMIN_ID }));

            const res = await request(app)
                .post(`/api/submissions/review-queue/${ATTEMPT_ID}/decision`)
                .set('Authorization', tokenFor(OTHER_ADMIN_ID, 'ADMIN'))
                .send({ decision: 'PASS', feedback: 'x' });

            expect(res.status).to.equal(403);
        });

        it('NFR-05: a second decision on the same attempt is rejected (400)', async () => {
            sinon
                .stub(Submission, 'findById')
                .resolves(attempt({ status: 'ACCEPTED', reviewer: ADMIN_ID, decision: 'PASS' }));
            const update = sinon.stub(Submission, 'findOneAndUpdate');

            const res = await request(app)
                .post(`/api/submissions/review-queue/${ATTEMPT_ID}/decision`)
                .set('Authorization', tokenFor(ADMIN_ID, 'ADMIN'))
                .send({ decision: 'REVISION_REQUIRED', feedback: 'changed my mind' });

            expect(res.status).to.equal(400);
            expect(res.body.message).to.equal('This review decision cannot be changed');
            expect(update.called).to.equal(false);
        });

        it('NFR-05: two decisions at the same time - the atomic write lets only one through', async () => {
            sinon.stub(Submission, 'findById').resolves(attempt({ status: 'UNDER_REVIEW', reviewer: ADMIN_ID }));
            // the other request already wrote its decision, so this conditional write matches nothing
            sinon.stub(Submission, 'findOneAndUpdate').returns(query(null));

            const res = await request(app)
                .post(`/api/submissions/review-queue/${ATTEMPT_ID}/decision`)
                .set('Authorization', tokenFor(ADMIN_ID, 'ADMIN'))
                .send({ decision: 'PASS', feedback: 'x' });

            expect(res.status).to.equal(400);
            expect(res.body.message).to.equal('This review decision cannot be changed');
        });
    });

    describe('FR-22 / NFR-06 notifying the learner', () => {
        it('a saved decision notifies the email and log observers with the result', async () => {
            sinon.stub(Submission, 'findById').resolves(attempt({ status: 'UNDER_REVIEW', reviewer: ADMIN_ID }));
            sinon
                .stub(Submission, 'findOneAndUpdate')
                .returns(query(attempt({ status: 'ACCEPTED', decision: 'PASS', attemptNumber: 2 })));
            sinon.stub(Progress, 'findOneAndUpdate').resolves({});
            const email = sinon.stub(EmailObserver.prototype, 'update').resolves();
            const log = sinon.stub(ConsoleLogObserver.prototype, 'update');

            const res = await request(app)
                .post(`/api/submissions/review-queue/${ATTEMPT_ID}/decision`)
                .set('Authorization', tokenFor(ADMIN_ID, 'ADMIN'))
                .send({ decision: 'PASS', feedback: 'Well done' });

            expect(res.status).to.equal(200);
            expect(email.calledOnce).to.equal(true);
            expect(email.firstCall.args[0]).to.include({
                to: 'learner@test.com',
                challengeTitle: 'Two Sum',
                attemptNumber: 2,
                decision: 'PASS',
                feedback: 'Well done',
                status: 'ACCEPTED',
            });
            expect(log.calledOnce).to.equal(true);
        });

        it('NFR-06: the decision is still returned (200) when the email fails', async () => {
            sinon.stub(Submission, 'findById').resolves(attempt({ status: 'UNDER_REVIEW', reviewer: ADMIN_ID }));
            sinon
                .stub(Submission, 'findOneAndUpdate')
                .returns(query(attempt({ status: 'REVISION_REQUIRED', decision: 'REVISION_REQUIRED' })));
            sinon.stub(Progress, 'findOneAndUpdate').resolves({});
            sinon.stub(ConsoleLogObserver.prototype, 'update');
            sinon.stub(EmailObserver.prototype, 'update').rejects(new Error('SMTP connection refused'));

            const res = await request(app)
                .post(`/api/submissions/review-queue/${ATTEMPT_ID}/decision`)
                .set('Authorization', tokenFor(ADMIN_ID, 'ADMIN'))
                .send({ decision: 'REVISION_REQUIRED', feedback: 'Add input checks' });

            expect(res.status).to.equal(200);
            expect(res.body.decision).to.equal('REVISION_REQUIRED');
            expect(ConsoleLogObserver.prototype.update.calledOnce).to.equal(true);
        });
    });

    describe('FR-21 supplementary comments after a decision', () => {
        function reviewedAttempt() {
            const doc = attempt({ status: 'ACCEPTED', decision: 'PASS', feedback: 'Well done', comments: [] });
            doc.save = sinon.stub().resolves();
            doc.populate = sinon.stub().resolves();
            return doc;
        }

        it('adds a comment without changing the decision or feedback (201)', async () => {
            const doc = reviewedAttempt();
            sinon.stub(Submission, 'findById').resolves(doc);

            const res = await request(app)
                .post(`/api/submissions/review-queue/${ATTEMPT_ID}/comments`)
                .set('Authorization', tokenFor(ADMIN_ID, 'ADMIN'))
                .send({ text: 'Also consider negative numbers' });

            expect(res.status).to.equal(201);
            expect(res.body.comments).to.have.length(1);
            expect(res.body.comments[0].text).to.equal('Also consider negative numbers');
            expect(res.body.decision).to.equal('PASS');
            expect(res.body.feedback).to.equal('Well done');
            expect(doc.save.calledOnce).to.equal(true);
        });

        it('rejects an empty comment (400)', async () => {
            const res = await request(app)
                .post(`/api/submissions/review-queue/${ATTEMPT_ID}/comments`)
                .set('Authorization', tokenFor(ADMIN_ID, 'ADMIN'))
                .send({ text: '  ' });

            expect(res.status).to.equal(400);
            expect(res.body.text).to.equal('This field is required');
        });

        it('rejects a comment before the review is completed (400)', async () => {
            sinon.stub(Submission, 'findById').resolves(attempt({ status: 'UNDER_REVIEW', reviewer: ADMIN_ID }));

            const res = await request(app)
                .post(`/api/submissions/review-queue/${ATTEMPT_ID}/comments`)
                .set('Authorization', tokenFor(ADMIN_ID, 'ADMIN'))
                .send({ text: 'too early' });

            expect(res.status).to.equal(400);
            expect(res.body.message).to.equal('Comments can be added after the review is completed');
        });
    });

    describe('FR-23 previously reviewed attempts', () => {
        it('lists attempts that have a decision', async () => {
            const find = sinon
                .stub(Submission, 'find')
                .returns(query([attempt({ status: 'ACCEPTED', decision: 'PASS' })]));

            const res = await request(app)
                .get('/api/submissions/reviewed')
                .set('Authorization', tokenFor(MANAGER_ID, 'ADMIN_MANAGER'));

            expect(res.status).to.equal(200);
            expect(res.body[0].decision).to.equal('PASS');
            expect(find.firstCall.args[0]).to.deep.equal({ decision: { $exists: true, $ne: null } });
        });

        it('rejects a Learner with 403', async () => {
            const res = await request(app)
                .get('/api/submissions/reviewed')
                .set('Authorization', tokenFor(LEARNER_ID, 'LEARNER'));

            expect(res.status).to.equal(403);
        });
    });
});
