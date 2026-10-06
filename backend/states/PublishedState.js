const ChallengeState = require('./ChallengeState');

// PUBLISHED: can only be closed.
class PublishedState extends ChallengeState {
    get name() {
        return 'PUBLISHED';
    }

    close() {
        this.challenge.status = 'CLOSED';
    }
}

module.exports = PublishedState;