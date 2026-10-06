const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { isStrongPassword } = require('../utils/passwordRules');

describe('isStrongPassword', () => {
    it('accepts a password with uppercase, lowercase, number and symbol', () => {
        assert.equal(isStrongPassword('Abcdef1!'), true);
    });

    it('rejects a password with no uppercase letter', () => {
        assert.equal(isStrongPassword('abcdef1!'), false);
    });

    it('rejects a password with no lowercase letter', () => {
        assert.equal(isStrongPassword('ABCDEF1!'), false);
    });

    it('rejects a password with no number', () => {
        assert.equal(isStrongPassword('Abcdefg!'), false);
    });

    it('rejects a password with no symbol', () => {
        assert.equal(isStrongPassword('Abcdefg1'), false);
    });

    it('rejects an empty password', () => {
        assert.equal(isStrongPassword(''), false);
    });
});
