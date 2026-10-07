const DraftState = require('./DraftState');
const PublishedState = require('./PublishedState');
const ClosedState = require('./ClosedState');
const InvalidTransitionError = require('./InvalidTransitionError');

const states = {
    DRAFT: DraftState,
    PUBLISHED: PublishedState,
    CLOSED: ClosedState,
};

// Return the state object that matches the challenge's current status.
function stateFor(challenge) {
    const StateClass = states[challenge.status] || DraftState;
    return new StateClass(challenge);
}

module.exports = { stateFor, InvalidTransitionError };