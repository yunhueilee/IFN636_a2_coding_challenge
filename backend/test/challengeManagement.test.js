// Functional tests for Member 2 - Challenge Management (FR-05 to FR-09)
// The database is replaced with Sinon stubs, so no MongoDB or .env is needed.
const { expect } = require('chai');
const sinon = require('sinon');
const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const User = require('../models/User');
const Challenge = require('../models/Challenge');
const challengeRoutes = require('../routes/challenges');
const { stateFor, InvalidTransitionError } = require('../states');

const USER_ID = '507f1f77bcf86cd799439011';
const CHALLENGE_ID = '507f1f77bcf86cd799439022';

// small app with only the challenge routes (server.js would connect to MongoDB)
function buildApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/challenges', challengeRoutes);
    return app;
}

// log in as a role: sign a token and make auth() find an active user with that role
function loginAs(role) {
    sinon.stub(User, 'findById').resolves({ _id: USER_ID, role, active: true });
    return 'Bearer ' + jwt.sign({ userId: USER_ID, role }, process.env.JWT_SECRET);
}

// a fake challenge document with the methods the routes call
function fakeChallenge(status) {
    return {
        _id: CHALLENGE_ID,
        title: 'Fix the login bug',
        status,
        save: sinon.stub().resolves(),
        populate: sinon.stub().resolves(),
        deleteOne: sinon.stub().resolves(),
    };
}

// stub the query chain used by nextChallengeNumber(): findOne().sort().select()
function stubLastChallengeNumber(number) {
    const last = number ? { challengeNumber: number } : null;
    sinon.stub(Challenge, 'findOne').returns({
        sort: () => ({ select: () => Promise.resolve(last) }),
    });
}

describe('Challenge Management (Member 2)', () => {
    let app;

    beforeEach(() => {
        app = buildApp();
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('State pattern classes', () => {
        it('DRAFT state publishes and stamps publishedAt', () => {
            const challenge = { status: 'DRAFT' };
            stateFor(challenge).publish();
            expect(challenge.status).to.equal('PUBLISHED');
            expect(challenge.publishedAt).to.be.instanceOf(Date);
        });

        it('PUBLISHED state closes', () => {
            const challenge = { status: 'PUBLISHED' };
            stateFor(challenge).close();
            expect(challenge.status).to.equal('CLOSED');
        });

        it('CLOSED state refuses publish, close and discard', () => {
            const challenge = { status: 'CLOSED' };
            expect(() => stateFor(challenge).publish()).to.throw(InvalidTransitionError);
            expect(() => stateFor(challenge).close()).to.throw(InvalidTransitionError);
            expect(() => stateFor(challenge).discard()).to.throw(InvalidTransitionError);
            expect(challenge.status).to.equal('CLOSED');
        });
    });

    describe('FR-05 Create challenge draft with auto-generated number', () => {
        it('creates a DRAFT with the next sequential number', async () => {
            const token = loginAs('ADMIN');
            stubLastChallengeNumber('CCP-CH-002');
            const create = sinon.stub(Challenge, 'create').callsFake(async (data) => ({ _id: CHALLENGE_ID, ...data }));

            const res = await request(app)
                .post('/api/challenges')
                .set('Authorization', token)
                .send({ title: 'Fix the login bug', type: 'Debugging', tier: 2 });

            expect(res.status).to.equal(201);
            expect(res.body.status).to.equal('DRAFT');
            expect(res.body.challengeNumber).to.equal('CCP-CH-003');
            expect(create.calledOnce).to.equal(true);
        });

        it('gives the first challenge number CCP-CH-001', async () => {
            const token = loginAs('ADMIN_MANAGER');
            stubLastChallengeNumber(null);
            sinon.stub(Challenge, 'create').callsFake(async (data) => ({ _id: CHALLENGE_ID, ...data }));

            const res = await request(app)
                .post('/api/challenges')
                .set('Authorization', token)
                .send({ title: 'First challenge' });

            expect(res.status).to.equal(201);
            expect(res.body.challengeNumber).to.equal('CCP-CH-001');
        });

        it('rejects a LEARNER with 403', async () => {
            const token = loginAs('LEARNER');
            const create = sinon.stub(Challenge, 'create');

            const res = await request(app)
                .post('/api/challenges')
                .set('Authorization', token)
                .send({ title: 'Not allowed' });

            expect(res.status).to.equal(403);
            expect(create.called).to.equal(false);
        });

        it('rejects a request with no token with 401', async () => {
            const res = await request(app).post('/api/challenges').send({ title: 'No token' });
            expect(res.status).to.equal(401);
        });
    });

    describe('FR-06 Edit challenge fields without changing status', () => {
        it('updates fields and ignores a status sent in the body', async () => {
            const token = loginAs('ADMIN');
            const update = sinon.stub(Challenge, 'findByIdAndUpdate').returns({
                populate: () => Promise.resolve({ _id: CHALLENGE_ID, title: 'New title', status: 'PUBLISHED' }),
            });

            const res = await request(app)
                .put('/api/challenges/' + CHALLENGE_ID)
                .set('Authorization', token)
                .send({ title: 'New title', status: 'CLOSED' });

            expect(res.status).to.equal(200);
            expect(res.body.title).to.equal('New title');
            expect(res.body.status).to.equal('PUBLISHED');
            const fieldsSaved = update.firstCall.args[1];
            expect(fieldsSaved).to.not.have.property('status');
        });

        it('returns 404 for a challenge that does not exist', async () => {
            const token = loginAs('ADMIN');
            sinon.stub(Challenge, 'findByIdAndUpdate').returns({ populate: () => Promise.resolve(null) });

            const res = await request(app)
                .put('/api/challenges/' + CHALLENGE_ID)
                .set('Authorization', token)
                .send({ title: 'Missing' });

            expect(res.status).to.equal(404);
            expect(res.body.message).to.equal('Challenge not found');
        });
    });

    describe('FR-07 Publish a draft challenge', () => {
        it('publishes a DRAFT and stamps publishedAt', async () => {
            const token = loginAs('ADMIN');
            const challenge = fakeChallenge('DRAFT');
            sinon.stub(Challenge, 'findById').resolves(challenge);

            const res = await request(app)
                .patch('/api/challenges/' + CHALLENGE_ID + '/status')
                .set('Authorization', token)
                .send({ status: 'PUBLISHED' });

            expect(res.status).to.equal(200);
            expect(res.body.status).to.equal('PUBLISHED');
            expect(res.body.publishedAt).to.be.a('string');
            expect(challenge.save.calledOnce).to.equal(true);
        });

        it('rejects publishing a CLOSED challenge with 400', async () => {
            const token = loginAs('ADMIN');
            const challenge = fakeChallenge('CLOSED');
            sinon.stub(Challenge, 'findById').resolves(challenge);

            const res = await request(app)
                .patch('/api/challenges/' + CHALLENGE_ID + '/status')
                .set('Authorization', token)
                .send({ status: 'PUBLISHED' });

            expect(res.status).to.equal(400);
            expect(res.body.message).to.equal('Only a draft can be published');
            expect(challenge.save.called).to.equal(false);
        });
    });

    describe('FR-08 Close a published challenge', () => {
        it('closes a PUBLISHED challenge', async () => {
            const token = loginAs('ADMIN_MANAGER');
            const challenge = fakeChallenge('PUBLISHED');
            sinon.stub(Challenge, 'findById').resolves(challenge);

            const res = await request(app)
                .patch('/api/challenges/' + CHALLENGE_ID + '/status')
                .set('Authorization', token)
                .send({ status: 'CLOSED' });

            expect(res.status).to.equal(200);
            expect(res.body.status).to.equal('CLOSED');
            expect(challenge.save.calledOnce).to.equal(true);
        });

        it('rejects closing a DRAFT with 400', async () => {
            const token = loginAs('ADMIN');
            const challenge = fakeChallenge('DRAFT');
            sinon.stub(Challenge, 'findById').resolves(challenge);

            const res = await request(app)
                .patch('/api/challenges/' + CHALLENGE_ID + '/status')
                .set('Authorization', token)
                .send({ status: 'CLOSED' });

            expect(res.status).to.equal(400);
            expect(res.body.message).to.equal('Only a published challenge can be closed');
            expect(challenge.save.called).to.equal(false);
        });

        it('rejects an unknown status value with 400', async () => {
            const token = loginAs('ADMIN');
            sinon.stub(Challenge, 'findById').resolves(fakeChallenge('DRAFT'));

            const res = await request(app)
                .patch('/api/challenges/' + CHALLENGE_ID + '/status')
                .set('Authorization', token)
                .send({ status: 'ARCHIVED' });

            expect(res.status).to.equal(400);
            expect(res.body.message).to.equal('Status must be PUBLISHED or CLOSED');
        });
    });

    describe('FR-09 Discard a draft challenge', () => {
        it('discards a DRAFT', async () => {
            const token = loginAs('ADMIN');
            const challenge = fakeChallenge('DRAFT');
            sinon.stub(Challenge, 'findById').resolves(challenge);

            const res = await request(app)
                .delete('/api/challenges/' + CHALLENGE_ID)
                .set('Authorization', token);

            expect(res.status).to.equal(200);
            expect(res.body.message).to.equal('Draft discarded');
            expect(challenge.deleteOne.calledOnce).to.equal(true);
        });

        it('rejects discarding a PUBLISHED challenge with 400', async () => {
            const token = loginAs('ADMIN');
            const challenge = fakeChallenge('PUBLISHED');
            sinon.stub(Challenge, 'findById').resolves(challenge);

            const res = await request(app)
                .delete('/api/challenges/' + CHALLENGE_ID)
                .set('Authorization', token);

            expect(res.status).to.equal(400);
            expect(res.body.message).to.equal('Only a draft can be discarded');
            expect(challenge.deleteOne.called).to.equal(false);
        });

        it('returns 404 for a challenge that does not exist', async () => {
            const token = loginAs('ADMIN');
            sinon.stub(Challenge, 'findById').resolves(null);

            const res = await request(app)
                .delete('/api/challenges/' + CHALLENGE_ID)
                .set('Authorization', token);

            expect(res.status).to.equal(404);
        });
    });
});