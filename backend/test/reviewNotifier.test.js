// Functional tests for Member 4 - review notifications (FR-22, NFR-06)
// Tests the Observer pattern classes directly, no database or SMTP is needed.
const { expect } = require('chai');
const sinon = require('sinon');

const ReviewDecisionNotifier = require('../observers/ReviewDecisionNotifier');
const ConsoleLogObserver = require('../observers/ConsoleLogObserver');
const EmailObserver = require('../observers/EmailObserver');

// the same shape the decision route sends to notify()
const result = {
    to: 'learner@test.com',
    challengeTitle: 'Two Sum',
    attemptNumber: 2,
    decision: 'PASS',
    feedback: 'Good work',
    status: 'ACCEPTED',
};

describe('Review notifications - Observer pattern (Member 4)', () => {
    afterEach(() => {
        sinon.restore();
    });

    describe('FR-22 ReviewDecisionNotifier', () => {
        it('starts with no observers', () => {
            const notifier = new ReviewDecisionNotifier();
            expect(notifier.observers).to.have.length(0);
        });

        it('subscribe() adds observers in order', () => {
            const notifier = new ReviewDecisionNotifier();
            const first = { update: sinon.stub() };
            const second = { update: sinon.stub() };

            notifier.subscribe(first);
            notifier.subscribe(second);

            expect(notifier.observers).to.deep.equal([first, second]);
        });

        it('notify() passes the same result to every observer', async () => {
            const notifier = new ReviewDecisionNotifier();
            const email = { update: sinon.stub().resolves() };
            const log = { update: sinon.stub() };
            notifier.subscribe(email);
            notifier.subscribe(log);

            await notifier.notify(result);

            expect(email.update.calledOnceWithExactly(result)).to.equal(true);
            expect(log.update.calledOnceWithExactly(result)).to.equal(true);
        });

        it('notify() waits for an async observer before calling the next one', async () => {
            const notifier = new ReviewDecisionNotifier();
            const calls = [];
            notifier.subscribe({
                update: async () => {
                    await new Promise((resolve) => setTimeout(resolve, 10));
                    calls.push('email');
                },
            });
            notifier.subscribe({ update: () => calls.push('log') });

            await notifier.notify(result);

            expect(calls).to.deep.equal(['email', 'log']);
        });
    });

    describe('NFR-06 a failing observer does not block the others', () => {
        it('keeps notifying when one observer rejects (mail server down)', async () => {
            sinon.stub(console, 'error');
            const notifier = new ReviewDecisionNotifier();
            const failingEmail = { update: sinon.stub().rejects(new Error('SMTP down')) };
            const log = { update: sinon.stub() };
            notifier.subscribe(failingEmail);
            notifier.subscribe(log);

            await notifier.notify(result);

            expect(failingEmail.update.calledOnce).to.equal(true);
            expect(log.update.calledOnceWithExactly(result)).to.equal(true);
        });

        it('notify() resolves instead of throwing, and logs the error', async () => {
            const errorLog = sinon.stub(console, 'error');
            const notifier = new ReviewDecisionNotifier();
            notifier.subscribe({ update: sinon.stub().throws(new Error('broken observer')) });

            let thrown = null;
            try {
                await notifier.notify(result);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).to.equal(null);
            expect(errorLog.calledOnce).to.equal(true);
            expect(errorLog.firstCall.args[0]).to.include('broken observer');
        });
    });

    describe('Concrete observers (polymorphism: same update(), different behaviour)', () => {
        it('ConsoleLogObserver.update() writes the result to the log', () => {
            const consoleLog = sinon.stub(console, 'log');

            new ConsoleLogObserver().update(result);

            expect(consoleLog.calledOnce).to.equal(true);
            expect(consoleLog.firstCall.args[1]).to.deep.equal(result);
        });

        it('EmailObserver.update() prints the email when SMTP is not set', async () => {
            const savedHost = process.env.SMTP_HOST;
            delete process.env.SMTP_HOST;
            const consoleLog = sinon.stub(console, 'log');

            await new EmailObserver().update(result);

            process.env.SMTP_HOST = savedHost;
            if (savedHost === undefined) delete process.env.SMTP_HOST;
            const printed = consoleLog.getCalls().map((call) => call.args.join(' ')).join('\n');
            expect(printed).to.include('learner@test.com');
            expect(printed).to.include('Result: PASS');
        });

        it('EmailObserver says FINAL FAIL when the 10th attempt is not passed', async () => {
            const savedHost = process.env.SMTP_HOST;
            delete process.env.SMTP_HOST;
            const consoleLog = sinon.stub(console, 'log');

            await new EmailObserver().update({
                ...result,
                attemptNumber: 10,
                decision: 'REVISION_REQUIRED',
                status: 'FINAL_FAILED',
            });

            process.env.SMTP_HOST = savedHost;
            if (savedHost === undefined) delete process.env.SMTP_HOST;
            const printed = consoleLog.getCalls().map((call) => call.args.join(' ')).join('\n');
            expect(printed).to.include('FINAL FAIL');
        });
    });
});
