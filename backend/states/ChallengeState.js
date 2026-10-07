const InvalidTransitionError = require('./InvalidTransitionError');

// Base state. By default every action is refused.
// Each concrete state only overrides the actions it allows.
class ChallengeState {
    constructor(challenge) {
        this.challenge = challenge;
    }

    get name() {
        throw new Error('Subclass must define name');
    }

    publish() {
        throw new InvalidTransitionError('Only a draft can be published');
    }

    close() {
        throw new InvalidTransitionError('Only a published challenge can be closed');
    }

    discard() {
        throw new InvalidTransitionError('Only a draft can be discarded');
    }
}

module.exports = ChallengeState;