const ChallengeState = require('./ChallengeState');

// DRAFT: can be published or discarded.
class DraftState extends ChallengeState {
    get name() {
        return 'DRAFT';
    }

    publish() {
        this.challenge.status = 'PUBLISHED';
        this.challenge.publishedAt = new Date();
    }

    discard() {
        return true; // allowed; the route deletes the record
    }
}

module.exports = DraftState;