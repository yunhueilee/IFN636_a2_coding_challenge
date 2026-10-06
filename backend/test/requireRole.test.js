const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const sinon = require('sinon');
const requireRole = require('../middleware/requireRole');

// fake express response: res.status(code).json(body) returns res so it can chain
function makeRes() {
    const res = {};
    res.status = sinon.stub().returns(res);
    res.json = sinon.stub().returns(res);
    return res;
}

describe('requireRole middleware', () => {
    let res;
    let next;

    beforeEach(() => {
        res = makeRes();
        next = sinon.stub();
    });

    it('returns 401 when there is no logged in user', () => {
        requireRole('ADMIN')({}, res, next);

        assert.ok(res.status.calledWith(401));
        assert.ok(res.json.calledWith({ message: 'Please login first' }));
        assert.equal(next.called, false);
    });

    it('returns 403 when the user role is not allowed', () => {
        requireRole('ADMIN')({ user: { role: 'LEARNER' } }, res, next);

        assert.ok(res.status.calledWith(403));
        assert.ok(res.json.calledWith({ message: 'Forbidden' }));
        assert.equal(next.called, false);
    });

    it('calls next when the user role is allowed', () => {
        requireRole('ADMIN')({ user: { role: 'ADMIN' } }, res, next);

        assert.equal(next.calledOnce, true);
        assert.equal(res.status.called, false);
    });

    it('allows any of several roles', () => {
        const guard = requireRole('ADMIN', 'ADMIN_MANAGER');

        guard({ user: { role: 'ADMIN_MANAGER' } }, res, next);

        assert.equal(next.calledOnce, true);
    });

    it('rejects a role that is not in the list even when others are', () => {
        requireRole('ADMIN', 'ADMIN_MANAGER')({ user: { role: 'SUPER_ADMIN' } }, res, next);

        assert.ok(res.status.calledWith(403));
        assert.equal(next.called, false);
    });
});
