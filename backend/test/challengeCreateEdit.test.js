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
const challengeRoutes = require('../routes/challenges');

const USER_ID = '507f1f77bcf86cd799439011';
const CHALLENGE_ID = '507f1f77bcf86cd799439022';

function buildApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/challenges', challengeRoutes);
    return app;
}

function loginAs(role) {
    sinon.stub(User, 'findById').resolves({ _id: USER_ID, role, active: true });
    return 'Bearer ' + jwt.sign({ userId: USER_ID, role }, process.env.JWT_SECRET);
}

// each call to findOne().sort().select() returns the next "last number" in the list
function stubLastNumbers(...numbers) {
    const findOne = sinon.stub(Challenge, 'findOne');
    numbers.forEach((number, index) => {
        const last = number ? { challengeNumber: number } : null;
        findOne.onCall(index).returns({ sort: () => ({ select: () => Promise.resolve(last) }) });
    });
}

// the error MongoDB raises when a unique index is broken
function duplicateKeyError() {
    const error = new Error('E11000 duplicate key error: challengeNumber');
    error.code = 11000;
    return error;
}

describe('Challenge create and edit (CCP-25, CCP-29)', () => {
    let app;

    beforeEach(() => {
        app = buildApp();
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('FR-05 Unique challenge numbers', () => {
        it('the Challenge model has a unique index on challengeNumber', () => {
            expect(Challenge.schema.path('challengeNumber').options.unique).to.equal(true);
        });

        it('retries with the next number when another admin took the same number', async () => {
            const token = loginAs('ADMIN');
            stubLastNumbers('CCP-CH-002', 'CCP-CH-003');
            const create = sinon.stub(Challenge, 'create');
            create.onCall(0).rejects(duplicateKeyError());
            create.onCall(1).callsFake(async (data) => ({ _id: CHALLENGE_ID, ...data }));

            const res = await request(app)
                .post('/api/challenges')
                .set('Authorization', token)
                .send({ title: 'Race condition' });

            expect(res.status).to.equal(201);
            expect(res.body.challengeNumber).to.equal('CCP-CH-004');
            expect(create.calledTwice).to.equal(true);
        });

        it('gives up with 400 after 3 duplicate numbers in a row', async () => {
            const token = loginAs('ADMIN');
            sinon.stub(console, 'error');
            stubLastNumbers('CCP-CH-002', 'CCP-CH-002', 'CCP-CH-002');
            const create = sinon.stub(Challenge, 'create').rejects(duplicateKeyError());

            const res = await request(app)
                .post('/api/challenges')
                .set('Authorization', token)
                .send({ title: 'Keeps clashing' });

            expect(res.status).to.equal(400);
            expect(res.body.message).to.equal('Cannot create challenge');
            expect(create.callCount).to.equal(3);
        });

        it('does not retry when the error is not a duplicate number', async () => {
            const token = loginAs('ADMIN');
            sinon.stub(console, 'error');
            stubLastNumbers('CCP-CH-002');
            const create = sinon.stub(Challenge, 'create').rejects(new Error('database is down'));

            const res = await request(app)
                .post('/api/challenges')
                .set('Authorization', token)
                .send({ title: 'Database down' });

            expect(res.status).to.equal(400);
            expect(create.calledOnce).to.equal(true);
        });
    });

    describe('FR-06 Field validation on create and edit', () => {
        it('create: rejects tier 12 with a tier error and saves nothing', async () => {
            const token = loginAs('ADMIN');
            const create = sinon.stub(Challenge, 'create');

            const res = await request(app)
                .post('/api/challenges')
                .set('Authorization', token)
                .send({ title: 'Too hard', tier: 12 });

            expect(res.status).to.equal(400);
            expect(res.body.errors.tier).to.equal('Tier must be a whole number from 1 to 8');
            expect(res.body.message).to.include('Tier must be');
            expect(create.called).to.equal(false);
        });

        it('create: reports every bad field at once (type and starter repo)', async () => {
            const token = loginAs('ADMIN_MANAGER');
            const create = sinon.stub(Challenge, 'create');

            const res = await request(app)
                .post('/api/challenges')
                .set('Authorization', token)
                .send({ title: 'Bad fields', type: 'Gaming', starterRepo: 'github.com/no-protocol' });

            expect(res.status).to.equal(400);
            expect(res.body.errors).to.have.all.keys('type', 'starterRepo');
            expect(create.called).to.equal(false);
        });

        it('create: an incomplete draft with only a title is still allowed', async () => {
            const token = loginAs('ADMIN');
            stubLastNumbers('CCP-CH-009');
            sinon.stub(Challenge, 'create').callsFake(async (data) => ({ _id: CHALLENGE_ID, ...data }));

            const res = await request(app)
                .post('/api/challenges')
                .set('Authorization', token)
                .send({ title: 'Just a title', tier: '', type: '' });

            expect(res.status).to.equal(201);
            expect(res.body.challengeNumber).to.equal('CCP-CH-010');
        });

        it('edit: rejects tier 0 and does not update the challenge', async () => {
            const token = loginAs('ADMIN');
            const update = sinon.stub(Challenge, 'findByIdAndUpdate');

            const res = await request(app)
                .put('/api/challenges/' + CHALLENGE_ID)
                .set('Authorization', token)
                .send({ tier: 0 });

            expect(res.status).to.equal(400);
            expect(res.body.errors).to.have.property('tier');
            expect(update.called).to.equal(false);
        });

        it('edit: saves valid fields and still never changes the status', async () => {
            const token = loginAs('ADMIN');
            const update = sinon.stub(Challenge, 'findByIdAndUpdate').returns({
                populate: () => Promise.resolve({ _id: CHALLENGE_ID, tier: 5, status: 'DRAFT' }),
            });

            const res = await request(app)
                .put('/api/challenges/' + CHALLENGE_ID)
                .set('Authorization', token)
                .send({ tier: 5, starterRepo: 'https://github.com/ccp/starter', status: 'PUBLISHED' });

            expect(res.status).to.equal(200);
            const fieldsSaved = update.firstCall.args[1];
            expect(fieldsSaved.tier).to.equal(5);
            expect(fieldsSaved.starterRepo).to.equal('https://github.com/ccp/starter');
            expect(fieldsSaved).to.not.have.property('status');
        });
    });
});