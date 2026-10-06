const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const sinon = require('sinon');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const auth = require('../middleware/auth');

const SECRET = 'test-secret';

// fake express response: res.status(code).json(body) returns res so it can chain
function makeRes() {
    const res = {};
    res.status = sinon.stub().returns(res);
    res.json = sinon.stub().returns(res);
    return res;
}

describe('auth middleware', () => {
    let res;
    let next;
    let findById;
    let consoleError;
    let originalSecret;

    beforeEach(() => {
        originalSecret = process.env.JWT_SECRET;
        process.env.JWT_SECRET = SECRET;
        res = makeRes();
        next = sinon.stub();
        findById = sinon.stub(User, 'findById');
        consoleError = sinon.stub(console, 'error');
    });

    afterEach(() => {
        sinon.restore();
        process.env.JWT_SECRET = originalSecret;
    });

    it('returns 401 when there is no Authorization header', async () => {
        await auth({ headers: {} }, res, next);

        assert.ok(res.status.calledWith(401));
        assert.ok(res.json.calledWith({ message: 'Please login first' }));
        assert.equal(next.called, false);
    });

    it('returns 401 when the token is not a valid JWT', async () => {
        await auth({ headers: { authorization: 'Bearer not-a-token' } }, res, next);

        assert.ok(res.status.calledWith(401));
        assert.equal(next.called, false);
    });

    it('returns 401 when the Bearer prefix has no token after it', async () => {
        await auth({ headers: { authorization: 'Bearer' } }, res, next);

        assert.ok(res.status.calledWith(401));
        assert.equal(next.called, false);
    });

    it('returns 401 when the token was signed with a different secret', async () => {
        const token = jwt.sign({ userId: 'abc' }, 'some-other-secret');

        await auth({ headers: { authorization: `Bearer ${token}` } }, res, next);

        assert.ok(res.status.calledWith(401));
        assert.equal(next.called, false);
    });

    it('returns 401 when the user no longer exists', async () => {
        findById.resolves(null);
        const token = jwt.sign({ userId: 'abc' }, SECRET);

        await auth({ headers: { authorization: `Bearer ${token}` } }, res, next);

        assert.ok(res.status.calledWith(401));
        assert.equal(next.called, false);
    });

    it('returns 401 when the account is disabled', async () => {
        findById.resolves({ _id: 'abc', role: 'LEARNER', active: false });
        const token = jwt.sign({ userId: 'abc' }, SECRET);

        await auth({ headers: { authorization: `Bearer ${token}` } }, res, next);

        assert.ok(res.status.calledWith(401));
        assert.equal(next.called, false);
    });

    it('sets req.user from the database and calls next for an active account', async () => {
        findById.resolves({ _id: 'abc', role: 'ADMIN', active: true });
        const token = jwt.sign({ userId: 'abc' }, SECRET);
        const req = { headers: { authorization: `Bearer ${token}` } };

        await auth(req, res, next);

        assert.deepEqual(req.user, { userId: 'abc', role: 'ADMIN' });
        assert.equal(next.calledOnce, true);
        assert.equal(res.status.called, false);
    });

    it('uses the role stored in the database, not any role in the token', async () => {
        findById.resolves({ _id: 'abc', role: 'LEARNER', active: true });
        const token = jwt.sign({ userId: 'abc', role: 'SUPER_ADMIN' }, SECRET);
        const req = { headers: { authorization: `Bearer ${token}` } };

        await auth(req, res, next);

        assert.equal(req.user.role, 'LEARNER');
    });

    it('returns 500 when the database lookup fails', async () => {
        findById.rejects(new Error('db down'));
        const token = jwt.sign({ userId: 'abc' }, SECRET);

        await auth({ headers: { authorization: `Bearer ${token}` } }, res, next);

        assert.ok(res.status.calledWith(500));
        assert.ok(res.json.calledWith({ message: 'Server error' }));
        assert.equal(next.called, false);
        assert.equal(consoleError.calledOnce, true);
    });
});
