const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const sinon = require('sinon');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const { getStaffCreator, STAFF_ROLES } = require('../factories/staffAccountFactory');

describe('staffAccountFactory', () => {
    afterEach(() => {
        sinon.restore();
    });

    it('lists the three staff roles', () => {
        assert.deepEqual(STAFF_ROLES, ['SUPER_ADMIN', 'ADMIN_MANAGER', 'ADMIN']);
    });

    it('returns a creator for each staff role', () => {
        for (const role of STAFF_ROLES) {
            assert.ok(getStaffCreator(role), role);
        }
    });

    it('returns null for a role that is not a staff role', () => {
        assert.equal(getStaffCreator('LEARNER'), null);
        assert.equal(getStaffCreator('NOT_A_ROLE'), null);
    });

    it('returns null for inherited object properties such as toString', () => {
        assert.equal(getStaffCreator('toString'), null);
        assert.equal(getStaffCreator('constructor'), null);
    });

    it('saves a user with the requested role, null gender and a hashed password', async () => {
        const create = sinon.stub(User, 'create').callsFake(async (doc) => doc);

        const saved = await getStaffCreator('ADMIN_MANAGER').create({
            email: 'manager@example.com',
            username: 'manager',
            password: 'Secret1!',
        });

        assert.equal(create.calledOnce, true);
        assert.equal(saved.role, 'ADMIN_MANAGER');
        assert.equal(saved.gender, null);
        assert.equal(saved.email, 'manager@example.com');
        assert.equal(saved.username, 'manager');
        assert.notEqual(saved.passwordHash, 'Secret1!');
        assert.equal(await bcrypt.compare('Secret1!', saved.passwordHash), true);
    });

    it('creates a SUPER_ADMIN when asked for that role', async () => {
        sinon.stub(User, 'create').callsFake(async (doc) => doc);

        const saved = await getStaffCreator('SUPER_ADMIN').create({
            email: 'boss@example.com',
            username: 'boss',
            password: 'Secret1!',
        });

        assert.equal(saved.role, 'SUPER_ADMIN');
    });

    it('creates an ADMIN when asked for that role', async () => {
        sinon.stub(User, 'create').callsFake(async (doc) => doc);

        const saved = await getStaffCreator('ADMIN').create({
            email: 'admin@example.com',
            username: 'admin',
            password: 'Secret1!',
        });

        assert.equal(saved.role, 'ADMIN');
    });
});
