const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            trim: true, // draft can skip this
        },
        type:{
            type: String,
            enum: ['Debugging', 'Feature', 'Refactoring', 'Security'],
        },
        tier: {
            type: Number,
            min: 1,
            max: 8, // difficulty 1 to 8
        },
        keywords: {
            type: [String], // more than one, e.g. login, python
            default: [],
        },
        description: {
            type: String,
        },
        testExample: {
            type: String,
        },
        expectedResult: {
            type: String,
        },
        starterRepo: {
            type: String,
            trim: true, // github link the learner starts from
        },
        reviewCriteria: {
            type: String, // how the admin marks the solution
        },
        environment: {
            type: String,
            default: 'Python 3', // this unit only runs Python 3
        },
        status: {
            type: String,
            enum: ['DRAFT', 'PUBLISHED', 'CLOSED'],
            // CLOSED: hide from learner list/search, no new submissions
            // keep old submissions, reviews and progress for history
            default: 'DRAFT',
        },
        challengeNumber: {
            type: String,
            trim: true, // filled by the server, e.g. CCP-CH-001
        },
        publishedAt: {
            type: Date, // set by the server when status becomes PUBLISHED
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User', // who published it, set from the login token
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Challenge', challengeSchema);