const mongoose = require('mongoose');

// one row = one learner attempt for a challenge
const submissionSchema = new mongoose.Schema(
    {
        challenge: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Challenge',
            required: true,
        },
        learner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        repoUrl: {
            type: String,
            required: true,
            trim: true,
        },
        commitUrl: {
            type: String,
            required: true,
            trim: true,
        },
        explanation: {
            type: String,
            required: true,
        },
        testEvidence: {
            type: String,
            required: true,
        },
        attemptNumber: {
            type: Number,
            required: true,
            min: 1,
            max: 10, // learner can try up to 10 times
        },
        submittedAt: {
            type: Date,
            default: Date.now,
        },
        status: {
            type: String,
            // cancelled stays in history, it is not deleted
            enum: [
                'SUBMITTED',
                'UNDER_REVIEW',
                'PASSED',
                'FAILED',
                'CANCELLED',
                'ACCEPTED',
                'REVISION_REQUIRED',
                'FINAL_FAILED',
            ],
            default: 'SUBMITTED',
        },
        selectedForReview: {
            type: Boolean,
            default: false, // latest attempt is set true
        },
        reviewer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User', // admin who claimed this attempt
            default: null,
        },
        decision: {
            type: String,
            enum: ['PASS', 'REVISION_REQUIRED'], // first review result, do not edit later
        },
        feedback: {
            type: String, // first review text, do not edit later
        },
        reviewedAt: {
            type: Date,
        },
        // extra notes after the review, shown under feedback
        comments: [
            {
                text: {
                    type: String,
                    required: true,
                },
                createdBy: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User',
                },
                createdAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Submission', submissionSchema);
