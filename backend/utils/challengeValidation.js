// FR-05 / FR-06: check the fields an admin sends when creating or editing a challenge.
// Returns { fieldName: 'message' } for every problem; an empty object means valid.
// A draft may leave fields empty, so only fields that were filled in are checked.

const CHALLENGE_TYPES = ['Debugging', 'Feature', 'Refactoring', 'Security'];
const MIN_TIER = 1;
const MAX_TIER = 8;

function validateChallengeFields(fields) {
    const errors = {};

    if (fields.tier !== undefined) {
        const tier = fields.tier;
        if (!Number.isInteger(tier) || tier < MIN_TIER || tier > MAX_TIER) {
            errors.tier = 'Tier must be a whole number from ' + MIN_TIER + ' to ' + MAX_TIER;
        }
    }

    if (fields.type !== undefined && !CHALLENGE_TYPES.includes(fields.type)) {
        errors.type = 'Type must be one of: ' + CHALLENGE_TYPES.join(', ');
    }

    if (fields.starterRepo !== undefined && !/^https?:\/\/\S+$/i.test(fields.starterRepo)) {
        errors.starterRepo = 'Starter repo must be a link starting with http:// or https://';
    }

    return errors;
}

module.exports = { CHALLENGE_TYPES, validateChallengeFields };