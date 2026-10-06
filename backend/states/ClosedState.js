const ChallengeState = require('./ChallengeState');

// CLOSED: final state. Every action is refused (inherited from ChallengeState).
class ClosedState extends ChallengeState {
    get name() {
        return 'CLOSED';
    }
}

module.exports = ClosedState;