const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { ADMIN_ROLES, permissions, can } = require('../permissions');

describe('permissions', () => {
    it('lists the three admin roles', () => {
        assert.deepEqual(ADMIN_ROLES, ['SUPER_ADMIN', 'ADMIN_MANAGER', 'ADMIN']);
    });

    it('lets only SUPER_ADMIN manage staff', () => {
        assert.equal(can('SUPER_ADMIN', 'staffManagement'), true);
        assert.equal(can('ADMIN_MANAGER', 'staffManagement'), false);
        assert.equal(can('ADMIN', 'staffManagement'), false);
        assert.equal(can('LEARNER', 'staffManagement'), false);
    });

    it('lets learners open learner challenges and nobody else', () => {
        assert.equal(can('LEARNER', 'learnerChallenges'), true);
        assert.equal(can('ADMIN', 'learnerChallenges'), false);
    });

    it('lets only ADMIN and ADMIN_MANAGER review submissions', () => {
        assert.equal(can('ADMIN', 'reviewQueue'), true);
        assert.equal(can('ADMIN_MANAGER', 'reviewQueue'), true);
        assert.equal(can('SUPER_ADMIN', 'reviewQueue'), false);
        assert.equal(can('LEARNER', 'reviewQueue'), false);
    });

    it('lets only ADMIN_MANAGER reassign reviews', () => {
        assert.equal(can('ADMIN_MANAGER', 'reassignReview'), true);
        assert.equal(can('ADMIN', 'reassignReview'), false);
        assert.equal(can('SUPER_ADMIN', 'reassignReview'), false);
    });

    it('gives every admin role access to the user list and statistics', () => {
        for (const role of ADMIN_ROLES) {
            assert.equal(can(role, 'userList'), true, role);
            assert.equal(can(role, 'dataStatistics'), true, role);
        }
    });

    it('denies access to an unknown page', () => {
        assert.equal(can('SUPER_ADMIN', 'doesNotExist'), false);
    });

    it('keeps every page list in sync with the exported permissions object', () => {
        assert.equal(permissions.userList, ADMIN_ROLES);
    });
});
