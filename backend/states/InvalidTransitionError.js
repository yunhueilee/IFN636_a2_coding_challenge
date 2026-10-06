// Thrown when a challenge is asked to move to a status
// that its current state does not allow (e.g. publish a CLOSED challenge).
class InvalidTransitionError extends Error {
    constructor(message) {
        super(message);
        this.name = 'InvalidTransitionError';
        this.statusCode = 400;
    }
}

module.exports = InvalidTransitionError;