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
const Submission = require('../models/Submission');
const SubmissionRoutes = require('../routes/submissions');
const challengeRoutes = require('../routes/challenges');

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


});