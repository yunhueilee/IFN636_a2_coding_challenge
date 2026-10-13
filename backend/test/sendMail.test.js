const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const sinon = require('sinon');
const { sendReviewEmail } = require('../utils/sendMail');

describe('sendReviewEmail', () => {
    let originalSmtpHost;
    let log;

    beforeEach(() => {
        originalSmtpHost = process.env.SMTP_HOST;
        delete process.env.SMTP_HOST;
        log = sinon.stub(console, 'log');
    });

    afterEach(() => {
        sinon.restore();
        if (originalSmtpHost === undefined) {
            delete process.env.SMTP_HOST;
        } else {
            process.env.SMTP_HOST = originalSmtpHost;
        }
    });

    it('prints the email instead of sending it when SMTP_HOST is not set', async () => {
        await sendReviewEmail({
            to: 'learner@example.com',
            challengeTitle: 'Two Sum',
            attemptNumber: 2,
            decision: 'PASS',
            feedback: 'Well done',
        });

        assert.ok(log.calledWith('Review email (not sent, no SMTP_HOST):', 'learner@example.com'));
        assert.ok(log.calledWith('Review result: Two Sum'));
    });

    it('builds a PASS email body with the attempt number and feedback', async () => {
        await sendReviewEmail({
            to: 'learner@example.com',
            challengeTitle: 'Two Sum',
            attemptNumber: 2,
            decision: 'PASS',
            feedback: 'Well done',
        });

        const text = log.lastCall.args[0];
        assert.ok(text.includes('Your attempt 2 for Two Sum was reviewed.'));
        assert.ok(text.includes('Result: PASS'));
        assert.ok(text.includes('Feedback:\nWell done'));
    });

    it('reports REVISION REQUIRED for any decision other than PASS', async () => {
        await sendReviewEmail({
            to: 'learner@example.com',
            challengeTitle: 'Two Sum',
            attemptNumber: 1,
            decision: 'FAIL',
            feedback: 'Try again',
        });

        const text = log.lastCall.args[0];
        assert.ok(text.includes('Result: REVISION REQUIRED'));
    });

    it('uses fallback wording when the challenge has no title', async () => {
        await sendReviewEmail({
            to: 'learner@example.com',
            attemptNumber: 1,
            decision: 'PASS',
            feedback: 'OK',
        });

        assert.ok(log.calledWith('Review result: your challenge'));
        assert.ok(log.lastCall.args[0].includes('for the challenge was reviewed.'));
    });
});
