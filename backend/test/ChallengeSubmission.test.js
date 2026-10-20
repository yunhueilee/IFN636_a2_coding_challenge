// Functional tests for CCP-25 / CCP-29 (Member 2):
// FR-05 unique challenge numbers with retry, FR-06 field validation on create and edit.
// The database is replaced with Sinon stubs, so no MongoDB or .env is needed.
const { expect } = require('chai');
const sinon = require('sinon');
const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const User = require('../models/User');
const Challenge = require('../models/Challenge');
const Submission = require('../models/Submission');
const Progress = require('../models/Progress');
const submissionRoutes = require('../routes/submissions');


const USER_ID = '507f1f77bcf86cd799439011';
const CHALLENGE_ID = '507f1f77bcf86cd799439022';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';


// small app with only the challenge routes (server.js would connect to MongoDB)
function buildApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/submissions', submissionRoutes);
    return app;
}

// // log in as a role: sign a token and make auth() find an active user with that role
// function loginAs(role) {
//     sinon.stub(User, 'findById').resolves({ _id: USER_ID, role, active: true });
//     return 'Bearer ' + jwt.sign({ userId: USER_ID, role }, process.env.JWT_SECRET);
// }


// function fakeChallenge(status) {
//     return {
//         _id: CHALLENGE_ID,
//         title: 'Fix the login bug',
//         status,
//         save: sinon.stub().resolves(),
//         populate: sinon.stub().resolves(),
//         deleteOne: sinon.stub().resolves(),
//     };
// }

describe('Challenge submissions', () => {
    let app;

    beforeEach(() => {
        app = buildApp();
    });

    afterEach(() => {
        sinon.restore();
    });

    it('creates a submission for a learner and a published challenge', async () => {
        sinon.stub(User, 'findById').resolves({
            _id: USER_ID,
            role: 'LEARNER',
            active: true,
        });
        sinon.stub(Challenge, 'findById').resolves({
            _id: CHALLENGE_ID,
            status: 'PUBLISHED',
        });
        sinon.stub(Submission, 'find').resolves([]);
        sinon.stub(Submission, 'updateMany').resolves({});
        sinon.stub(Submission, 'create').resolves({
            _id: '507f1f77bcf86cd799439033',
            challenge: CHALLENGE_ID,
            learner: USER_ID,
            attemptNumber: 1,
            status: 'SUBMITTED',
            selectedForReview: true,
        });
        sinon.stub(Progress, 'findOneAndUpdate').resolves({});

        const token = jwt.sign(
            { userId: USER_ID, role: 'LEARNER' },
            process.env.JWT_SECRET
        );

        const response = await request(app)
            .post('/api/submissions')
            .set('Authorization', `Bearer ${token}`)
            .send({
                challengeId: CHALLENGE_ID,
                repoUrl: 'https://github.com/example/project',
                commitUrl: 'https://github.com/example/project/commit/abc123',
                explanation: 'Fixed the reported issue.',
                testEvidence: 'All relevant tests pass.',
            });

        expect(response.status).to.equal(201);
        expect(response.body.status).to.equal('SUBMITTED');
        expect(response.body.attemptNumber).to.equal(1);
        expect(response.body.selectedForReview).to.equal(true);
    });


    it('it rejects a submission with a missing repository URL', async () => {
        sinon.stub(User, 'findById').resolves({
            _id: USER_ID,
            role: 'LEARNER',
            active: true,
        });
        sinon.stub(Challenge, 'findById').resolves({
            _id: CHALLENGE_ID,
            status: 'PUBLISHED',
        });
        sinon.stub(Submission, 'find').resolves([]);
        sinon.stub(Submission, 'updateMany').resolves({});
        sinon.stub(Submission, 'create').resolves({
            _id: '507f1f77bcf86cd799439033',
            challenge: CHALLENGE_ID,
            learner: USER_ID,
            attemptNumber: 1,
            status: 'SUBMITTED',
            selectedForReview: true,
        });
        sinon.stub(Progress, 'findOneAndUpdate').resolves({});

        const token = jwt.sign(
            { userId: USER_ID, role: 'LEARNER' },
            process.env.JWT_SECRET
        );

        const response = await request(app)
            .post('/api/submissions')
            .set('Authorization', `Bearer ${token}`)
            .send({
                challengeId: CHALLENGE_ID,
                repoUrl: '',
                commitUrl: 'https://github.com/example/project/commit/abc123',
                explanation: 'Fixed the reported issue.',
                testEvidence: 'All relevant tests pass.',
            });

        expect(response.status).to.equal(400);
        expect(response.body.repoUrl).to.equal('This field is required');


    });

    it('it rejects a submission with a invalid repositoryURL', async () => {
        sinon.stub(User, 'findById').resolves({
            _id: USER_ID,
            role: 'LEARNER',
            active: true,
        });
        sinon.stub(Challenge, 'findById').resolves({
            _id: CHALLENGE_ID,
            status: 'PUBLISHED',
        });
        sinon.stub(Submission, 'find').resolves([]);
        sinon.stub(Submission, 'updateMany').resolves({});
        sinon.stub(Submission, 'create').resolves({
            _id: '507f1f77bcf86cd799439033',
            challenge: CHALLENGE_ID,
            learner: USER_ID,
            attemptNumber: 1,
            status: 'SUBMITTED',
            selectedForReview: true,
        });
        sinon.stub(Progress, 'findOneAndUpdate').resolves({});

        const token = jwt.sign(
            { userId: USER_ID, role: 'LEARNER' },
            process.env.JWT_SECRET
        );

        const response = await request(app)
            .post('/api/submissions')
            .set('Authorization', `Bearer ${token}`)
            .send({
                challengeId: CHALLENGE_ID,
                repoUrl: 'notvalidURL',
                commitUrl: 'https://github.com/example/project/commit/abc123',
                explanation: 'Fixed the reported issue.',
                testEvidence: 'All relevant tests pass.',
            });

        expect(response.status).to.equal(400);
        expect(response.body.repoUrl).to.equal('Please enter a valid URL');


    });



        it('it rejects a submission with a missing commit URL', async () => {
        sinon.stub(User, 'findById').resolves({
            _id: USER_ID,
            role: 'LEARNER',
            active: true,
        });
        sinon.stub(Challenge, 'findById').resolves({
            _id: CHALLENGE_ID,
            status: 'PUBLISHED',
        });
        sinon.stub(Submission, 'find').resolves([]);
        sinon.stub(Submission, 'updateMany').resolves({});
        sinon.stub(Submission, 'create').resolves({
            _id: '507f1f77bcf86cd799439033',
            challenge: CHALLENGE_ID,
            learner: USER_ID,
            attemptNumber: 1,
            status: 'SUBMITTED',
            selectedForReview: true,
        });
        sinon.stub(Progress, 'findOneAndUpdate').resolves({});

        const token = jwt.sign(
            { userId: USER_ID, role: 'LEARNER' },
            process.env.JWT_SECRET
        );

        const response = await request(app)
            .post('/api/submissions')
            .set('Authorization', `Bearer ${token}`)
            .send({
                challengeId: CHALLENGE_ID,
                repoUrl: 'https://github.com/example/project',
                commitUrl: '',
                explanation: 'Fixed the reported issue.',
                testEvidence: 'All relevant tests pass.',
            });

        expect(response.status).to.equal(400);
        expect(response.body.commitUrl).to.equal('This field is required');


    });



     it('it rejects a submission with an invalid commit URL', async () => {
        sinon.stub(User, 'findById').resolves({
            _id: USER_ID,
            role: 'LEARNER',
            active: true,
        });
        sinon.stub(Challenge, 'findById').resolves({
            _id: CHALLENGE_ID,
            status: 'PUBLISHED',
        });
        sinon.stub(Submission, 'find').resolves([]);
        sinon.stub(Submission, 'updateMany').resolves({});
        sinon.stub(Submission, 'create').resolves({
            _id: '507f1f77bcf86cd799439033',
            challenge: CHALLENGE_ID,
            learner: USER_ID,
            attemptNumber: 1,
            status: 'SUBMITTED',
            selectedForReview: true,
        });
        sinon.stub(Progress, 'findOneAndUpdate').resolves({});

        const token = jwt.sign(
            { userId: USER_ID, role: 'LEARNER' },
            process.env.JWT_SECRET
        );

        const response = await request(app)
            .post('/api/submissions')
            .set('Authorization', `Bearer ${token}`)
            .send({
                challengeId: CHALLENGE_ID,
                repoUrl: 'https://github.com/example/project',
                commitUrl: 'notvalidURL',
                explanation: 'Fixed the reported issue.',
                testEvidence: 'All relevant tests pass.',
            });

        expect(response.status).to.equal(400);
        expect(response.body.commitUrl).to.equal('Please enter a valid URL');


    });

        it('it rejects a submission with a missing explanation', async () => {
        sinon.stub(User, 'findById').resolves({
            _id: USER_ID,
            role: 'LEARNER',
            active: true,
        });
        sinon.stub(Challenge, 'findById').resolves({
            _id: CHALLENGE_ID,
            status: 'PUBLISHED',
        });
        sinon.stub(Submission, 'find').resolves([]);
        sinon.stub(Submission, 'updateMany').resolves({});
        sinon.stub(Submission, 'create').resolves({
            _id: '507f1f77bcf86cd799439033',
            challenge: CHALLENGE_ID,
            learner: USER_ID,
            attemptNumber: 1,
            status: 'SUBMITTED',
            selectedForReview: true,
        });
        sinon.stub(Progress, 'findOneAndUpdate').resolves({});

        const token = jwt.sign(
            { userId: USER_ID, role: 'LEARNER' },
            process.env.JWT_SECRET
        );

        const response = await request(app)
            .post('/api/submissions')
            .set('Authorization', `Bearer ${token}`)
            .send({
                challengeId: CHALLENGE_ID,
                repoUrl: 'https://github.com/example/project',
                commitUrl: 'https://github.com/example/project/commit/abc123',
                explanation: '',
                testEvidence: 'All relevant tests pass.',
            });

        expect(response.status).to.equal(400);
        expect(response.body.explanation).to.equal('This field is required');


    });


     it('it rejects a submission with a duplicate commit url', async () => {
        sinon.stub(User, 'findById').resolves({
            _id: USER_ID,
            role: 'LEARNER',
            active: true,
        });
        sinon.stub(Challenge, 'findById').resolves({
            _id: CHALLENGE_ID,
            status: 'PUBLISHED',
        });

        sinon.stub(Submission, 'find').resolves([
        {
            status: 'SUBMITTED',
            commitUrl: 'https://exampleOld',
        },
        ]);

        sinon.stub(Submission, 'updateMany').resolves({});
        sinon.stub(Submission, 'create').resolves({
            _id: '507f1f77bcf86cd799439033',
            challenge: CHALLENGE_ID,
            learner: USER_ID,
            attemptNumber: 2,
            status: 'SUBMITTED',
            selectedForReview: true,
        });
        sinon.stub(Progress, 'findOneAndUpdate').resolves({});

        const token = jwt.sign(
            { userId: USER_ID, role: 'LEARNER' },
            process.env.JWT_SECRET
        );

        const response = await request(app)
            .post('/api/submissions')
            .set('Authorization', `Bearer ${token}`)
            .send({
                challengeId: CHALLENGE_ID,
                repoUrl: 'https://github.com',
                commitUrl: 'https://exampleOld',
                explanation: 'no',
                testEvidence: 'All relevant tests pass.',
            });

        expect(response.status).to.equal(400);
        expect(response.body.message).to.equal('You have already submitted this commit URL for this challenge. Please check to make sure you have submitted the correct commit URL.');


    });

    it('it rejects a submission with a missing test evidence', async () => {
        sinon.stub(User, 'findById').resolves({
            _id: USER_ID,
            role: 'LEARNER',
            active: true,
        });
        sinon.stub(Challenge, 'findById').resolves({
            _id: CHALLENGE_ID,
            status: 'PUBLISHED',
        });
        sinon.stub(Submission, 'find').resolves([]);
        sinon.stub(Submission, 'updateMany').resolves({});
        sinon.stub(Submission, 'create').resolves({
            _id: '507f1f77bcf86cd799439033',
            challenge: CHALLENGE_ID,
            learner: USER_ID,
            attemptNumber: 1,
            status: 'SUBMITTED',
            selectedForReview: true,
        });
        sinon.stub(Progress, 'findOneAndUpdate').resolves({});

        const token = jwt.sign(
            { userId: USER_ID, role: 'LEARNER' },
            process.env.JWT_SECRET
        );

        const response = await request(app)
            .post('/api/submissions')
            .set('Authorization', `Bearer ${token}`)
            .send({
                challengeId: CHALLENGE_ID,
                repoUrl: 'https://github.com/example/project',
                commitUrl: 'https://github.com/example/project/commit/abc123',
                explanation: 'Fixed the reported issue.',
                testEvidence: '',
            });

        expect(response.status).to.equal(400);
        expect(response.body.testEvidence).to.equal('This field is required');


    });

    it('it rejects a submission on attempt 11', async () => {
        sinon.stub(User, 'findById').resolves({
            _id: USER_ID,
            role: 'LEARNER',
            active: true,
        });
        sinon.stub(Challenge, 'findById').resolves({
            _id: CHALLENGE_ID,
            status: 'PUBLISHED',
        });
        sinon.stub(Submission, 'find').resolves(
            Array.from({ length: 10 }, (_, index) => ({
                attemptNumber: index + 1,
                status: 'FAILED',
                commitUrl: `https://github.com/example/project/commit/old-${index}`,
            }))
        );

        sinon.stub(Submission, 'updateMany').resolves({});
        sinon.stub(Submission, 'create').resolves({
            _id: '507f1f77bcf86cd799439033',
            challenge: CHALLENGE_ID,
            learner: USER_ID,
            attemptNumber: 11,
            status: 'SUBMITTED',
            selectedForReview: true,
        });
        sinon.stub(Progress, 'findOneAndUpdate').resolves({});

        const token = jwt.sign(
            { userId: USER_ID, role: 'LEARNER' },
            process.env.JWT_SECRET
        );

        const response = await request(app)
            .post('/api/submissions')
            .set('Authorization', `Bearer ${token}`)
            .send({
                challengeId: CHALLENGE_ID,
                repoUrl: 'https://github.com/example/project',
                commitUrl: 'https://github.com/example/project/commit/abc123',
                explanation: 'Fixed the reported issue.',
                testEvidence: 'fake evidence',
            });

        expect(response.status).to.equal(400);
        expect(response.body.message).to.equal('You can submit at most 10 attempts');


    });
    
});

describe('Challenge eligibility', () => {
    let app;

    beforeEach(() => {
        app = buildApp();
    });

    afterEach(() => {
        sinon.restore();
    });

    it('fails a submission if challenge is not published', async () => {
        sinon.stub(User, 'findById').resolves({
            _id: USER_ID,
            role: 'LEARNER',
            active: true,
        });
        sinon.stub(Challenge, 'findById').resolves({
            _id: CHALLENGE_ID,
            status: 'DRAFT',
        });
        sinon.stub(Submission, 'find').resolves([]);
        sinon.stub(Submission, 'updateMany').resolves({});
        sinon.stub(Submission, 'create').resolves({
            _id: '507f1f77bcf86cd799439033',
            challenge: CHALLENGE_ID,
            learner: USER_ID,
            attemptNumber: 1,
            status: 'SUBMITTED',
            selectedForReview: true,
        });
        sinon.stub(Progress, 'findOneAndUpdate').resolves({});

        const token = jwt.sign(
            { userId: USER_ID, role: 'LEARNER' },
            process.env.JWT_SECRET
        );

        const response = await request(app)
            .post('/api/submissions')
            .set('Authorization', `Bearer ${token}`)
            .send({
                challengeId: CHALLENGE_ID,
                repoUrl: 'https://github.com/example/project',
                commitUrl: 'https://github.com/example/project/commit/abc123',
                explanation: 'Fixed the reported issue.',
                testEvidence: 'All relevant tests pass.',
            });

        expect(response.status).to.equal(400);
        expect(response.body.message).to.equal('This challenge does not accept new submissions');
    });



    it('fails a submission if challenge is closed', async () => {
        sinon.stub(User, 'findById').resolves({
            _id: USER_ID,
            role: 'LEARNER',
            active: true,
        });
        sinon.stub(Challenge, 'findById').resolves({
            _id: CHALLENGE_ID,
            status: 'CLOSED',
        });
        sinon.stub(Submission, 'find').resolves([]);
        sinon.stub(Submission, 'updateMany').resolves({});
        sinon.stub(Submission, 'create').resolves({
            _id: '507f1f77bcf86cd799439033',
            challenge: CHALLENGE_ID,
            learner: USER_ID,
            attemptNumber: 1,
            status: 'SUBMITTED',
            selectedForReview: true,
        });
        sinon.stub(Progress, 'findOneAndUpdate').resolves({});

        const token = jwt.sign(
            { userId: USER_ID, role: 'LEARNER' },
            process.env.JWT_SECRET
        );

        const response = await request(app)
            .post('/api/submissions')
            .set('Authorization', `Bearer ${token}`)
            .send({
                challengeId: CHALLENGE_ID,
                repoUrl: 'https://github.com/example/project',
                commitUrl: 'https://github.com/example/project/commit/abc123',
                explanation: 'Fixed the reported issue.',
                testEvidence: 'All relevant tests pass.',
            });

        expect(response.status).to.equal(400);
        expect(response.body.message).to.equal('This challenge does not accept new submissions');
    });
    

    it('rejects an attempt while another is under review', async () => {
        sinon.stub(User, 'findById').resolves({
            _id: USER_ID,
            role: 'LEARNER',
            active: true,
        });
        sinon.stub(Challenge, 'findById').resolves({
            _id: CHALLENGE_ID,
            status: 'PUBLISHED',
        });
        sinon.stub(Submission, 'find').resolves([
        {
            status: 'UNDER_REVIEW',
            commitUrl: ' https://exampleOld',
        },
    ]);
        sinon.stub(Submission, 'updateMany').resolves({});
        sinon.stub(Submission, 'create').resolves({
            _id: '507f1f77bcf86cd799439033',
            challenge: CHALLENGE_ID,
            learner: USER_ID,
            attemptNumber: 2,
            status: 'SUBMITTED',
            selectedForReview: true,
        });
        sinon.stub(Progress, 'findOneAndUpdate').resolves({});

        const token = jwt.sign(
            { userId: USER_ID, role: 'LEARNER' },
            process.env.JWT_SECRET
        );

        const response = await request(app)
            .post('/api/submissions')
            .set('Authorization', `Bearer ${token}`)
            .send({
                challengeId: CHALLENGE_ID,
                repoUrl: 'https://dr',
                commitUrl: 'https://gdr',
                explanation: 'Fixed the reported issue.',
                testEvidence: 'All relevant tests pass.',
            });

        expect(response.status).to.equal(400);
        expect(response.body.message).to.equal('You already have an attempt under review');
    });


        it('rejects an attempt while another attempt is accepted', async () => {
        sinon.stub(User, 'findById').resolves({
            _id: USER_ID,
            role: 'LEARNER',
            active: true,
        });
        sinon.stub(Challenge, 'findById').resolves({
            _id: CHALLENGE_ID,
            status: 'ACCEPTED',
        });
        sinon.stub(Submission, 'find').resolves([
        {
            status: 'UNDER_REVIEW',
            commitUrl: ' https://exampleOld',
        },
    ]);
        sinon.stub(Submission, 'updateMany').resolves({});
        sinon.stub(Submission, 'create').resolves({
            _id: '507f1f77bcf86cd799439033',
            challenge: CHALLENGE_ID,
            learner: USER_ID,
            attemptNumber: 2,
            status: 'SUBMITTED',
            selectedForReview: true,
        });
        sinon.stub(Progress, 'findOneAndUpdate').resolves({});

        const token = jwt.sign(
            { userId: USER_ID, role: 'LEARNER' },
            process.env.JWT_SECRET
        );

        const response = await request(app)
            .post('/api/submissions')
            .set('Authorization', `Bearer ${token}`)
            .send({
                challengeId: CHALLENGE_ID,
                repoUrl: 'https://dr',
                commitUrl: 'https://gdr',
                explanation: 'Fixed the reported issue.',
                testEvidence: 'All relevant tests pass.',
            });

        expect(response.status).to.equal(400);
        expect(response.body.message).to.equal('This challenge does not accept new submissions');
    });



    it('rejects an attempt while another is under review', async () => {
        sinon.stub(User, 'findById').resolves({
            _id: USER_ID,
            role: 'LEARNER',
            active: true,
        });
        sinon.stub(Challenge, 'findById').resolves({
            _id: CHALLENGE_ID,
            status: 'PUBLISHED',
        });
        sinon.stub(Submission, 'find').resolves([
        {
            status: 'UNDER_REVIEW',
            commitUrl: ' https://exampleOld',
        },
    ]);
        sinon.stub(Submission, 'updateMany').resolves({});
        sinon.stub(Submission, 'create').resolves({
            _id: '507f1f77bcf86cd799439033',
            challenge: CHALLENGE_ID,
            learner: USER_ID,
            attemptNumber: 2,
            status: 'SUBMITTED',
            selectedForReview: true,
        });
        sinon.stub(Progress, 'findOneAndUpdate').resolves({});

        const token = jwt.sign(
            { userId: USER_ID, role: 'LEARNER' },
            process.env.JWT_SECRET
        );

        const response = await request(app)
            .post('/api/submissions')
            .set('Authorization', `Bearer ${token}`)
            .send({
                challengeId: CHALLENGE_ID,
                repoUrl: 'https://dr',
                commitUrl: 'https://gdr',
                explanation: 'Fixed the reported issue.',
                testEvidence: 'All relevant tests pass.',
            });

        expect(response.status).to.equal(400);
        expect(response.body.message).to.equal('You already have an attempt under review');
    });



    it('rejects an attempt while final attempt is failed', async () => {
        sinon.stub(User, 'findById').resolves({
            _id: USER_ID,
            role: 'LEARNER',
            active: true,
        });
        sinon.stub(Challenge, 'findById').resolves({
            _id: CHALLENGE_ID,
            status: 'ACCEPTED',
        });
        sinon.stub(Submission, 'find').resolves([
        {
            status: 'UNDER_REVIEW',
            commitUrl: ' https://exampleOld',
        },
    ]);
        sinon.stub(Submission, 'updateMany').resolves({});
        sinon.stub(Submission, 'create').resolves({
            _id: '507f1f77bcf86cd799439033',
            challenge: CHALLENGE_ID,
            learner: USER_ID,
            attemptNumber: 2,
            status: 'FINAL_FAILED',
            selectedForReview: true,
        });
        sinon.stub(Progress, 'findOneAndUpdate').resolves({});

        const token = jwt.sign(
            { userId: USER_ID, role: 'LEARNER' },
            process.env.JWT_SECRET
        );

        const response = await request(app)
            .post('/api/submissions')
            .set('Authorization', `Bearer ${token}`)
            .send({
                challengeId: CHALLENGE_ID,
                repoUrl: 'https://dr',
                commitUrl: 'https://gdr',
                explanation: 'Fixed the reported issue.',
                testEvidence: 'All relevant tests pass.',
            });

        expect(response.status).to.equal(400);
        expect(response.body.message).to.equal('This challenge does not accept new submissions');
    });
});
