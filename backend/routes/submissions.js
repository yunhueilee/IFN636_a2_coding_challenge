// learner submit + admin review APIs
const express = require('express');
const Challenge = require('../models/Challenge');
const Submission = require('../models/Submission');
const Progress = require('../models/Progress');
const User = require('../models/User');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { permissions } = require('../permissions');
const { sendReviewEmail } = require('../utils/sendMail');

const router = express.Router();
const canSubmit = requireRole(...permissions.learnerChallenges);
const canReview = requireRole(...permissions.reviewQueue);

// queue only wants the latest attempt that is still waiting
const waitingForReview = {
    selectedForReview: true,
    status: { $nin: ['CANCELLED', 'PASSED', 'FAILED', 'ACCEPTED', 'REVISION_REQUIRED', 'FINAL_FAILED'] },
};

function isHttpUrl(value) {
    // repo and commit must be a real http/https link
    try {
        const url = new URL(String(value || '').trim());
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (error) {
        return false;
    }
}

// learner creates a new attempt
router.post('/', auth, canSubmit, async (req, res) => {
    try {
        const repoUrl = String(req.body.repoUrl || '').trim();
        const commitUrl = String(req.body.commitUrl || '').trim();
        const explanation = String(req.body.explanation || '').trim();
        const testEvidence = String(req.body.testEvidence || '').trim();
        const fieldErrors = {};

        if (!repoUrl) {
            fieldErrors.repoUrl = 'This field is required';
        } else if (!isHttpUrl(repoUrl)) {
            fieldErrors.repoUrl = 'Please enter a valid URL';
        }

        if (!commitUrl) {
            fieldErrors.commitUrl = 'This field is required';
        } else if (!isHttpUrl(commitUrl)) {
            fieldErrors.commitUrl = 'Please enter a valid URL';
        }

        if (!explanation) {
            fieldErrors.explanation = 'This field is required';
        }

        if (!testEvidence) {
            fieldErrors.testEvidence = 'This field is required';
        }

        if (Object.keys(fieldErrors).length > 0) {
            return res.status(400).json(fieldErrors);
        }

        const challenge = await Challenge.findById(req.body.challengeId);

        if (!challenge) {
            return res.status(404).json({ message: 'Challenge not found' });
        }

        if (challenge.status !== 'PUBLISHED') {
            return res.status(400).json({ message: 'This challenge does not accept new submissions' });
        }

        const existing = await Submission.find({
            learner: req.user.userId,
            challenge: challenge._id,
        });

        if (existing.some((item) => item.status === 'ACCEPTED')) {
            return res.status(400).json({ message: 'This challenge is already completed' });
        }

        if (existing.some((item) => item.status === 'FINAL_FAILED')) {
            return res.status(400).json({ message: 'No more attempts are allowed' });
        }

        if (existing.length >= 10) {
            return res.status(400).json({ message: 'You can submit at most 10 attempts' });
        }

        const underReview = existing.some((item) => item.status === 'UNDER_REVIEW');

        if (underReview) {
            return res.status(400).json({ message: 'You already have an attempt under review' });
        }

        // only the newest attempt is selected for review
        await Submission.updateMany(
            { learner: req.user.userId, challenge: challenge._id },
            { $set: { selectedForReview: false } }
        );

        const submission = await Submission.create({
            challenge: challenge._id,
            learner: req.user.userId,
            repoUrl,
            commitUrl,
            explanation,
            testEvidence,
            attemptNumber: existing.length + 1,
            submittedAt: new Date(),
            status: 'SUBMITTED',
            selectedForReview: true,
        });

        await Progress.findOneAndUpdate(
            { learner: req.user.userId, challenge: challenge._id },
            { status: 'IN_PROGRESS' },
            { upsert: true, new: true }
        );

        return res.status(201).json(submission);
    } catch (error) {
        console.error(error.message);
        return res.status(400).json({ message: 'Cannot create submission' });
    }
});

// admin queue: latest selected attempts, cancelled is hidden
router.get('/review-queue', auth, canReview, async (req, res) => {
    try {
        const submissions = await Submission.find(waitingForReview)
            .populate('challenge', 'challengeNumber title')
            .populate('learner', 'username')
            .populate('reviewer', 'username role')
            .sort({ submittedAt: -1 });

        return res.json(submissions);
    } catch (error) {
        console.error(error.message);
        return res.status(400).json({ message: 'Cannot load review queue' });
    }
});

// one attempt for the admin, including after they already reviewed it
router.get('/review-queue/:id', auth, canReview, async (req, res) => {
    try {
        const submission = await Submission.findById(req.params.id)
            .populate('challenge', 'challengeNumber title')
            .populate('learner', 'username email')
            .populate('reviewer', 'username role')
            .populate('comments.createdBy', 'username');

        if (!submission || submission.status === 'CANCELLED') {
            return res.status(404).json({ message: 'Attempt not found' });
        }

        return res.json(submission);
    } catch (error) {
        return res.status(404).json({ message: 'Attempt not found' });
    }
});

// admin manager uses this list to reassign a locked review
router.get('/reviewers', auth, canReview, async (req, res) => {
    try {
        const reviewers = await User.find({
            role: { $in: ['ADMIN', 'ADMIN_MANAGER'] },
            active: true,
        }).select('username role');

        return res.json(reviewers);
    } catch (error) {
        console.error(error.message);
        return res.status(400).json({ message: 'Cannot load reviewers' });
    }
});

// only one admin can claim an attempt
router.post('/review-queue/:id/claim', auth, canReview, async (req, res) => {
    try {
        const submission = await Submission.findOneAndUpdate(
            {
                _id: req.params.id,
                selectedForReview: true,
                status: 'SUBMITTED',
            },
            {
                $set: {
                    status: 'UNDER_REVIEW',
                    reviewer: req.user.userId,
                },
            },
            { new: true }
        )
            .populate('challenge', 'challengeNumber title')
            .populate('learner', 'username')
            .populate('reviewer', 'username role');

        if (submission) {
            return res.json(submission);
        }

        const existing = await Submission.findById(req.params.id);

        if (!existing || existing.status === 'CANCELLED') {
            return res.status(404).json({ message: 'Attempt not found' });
        }

        return res.status(409).json({ message: 'This attempt is already under review' });
    } catch (error) {
        console.error(error.message);
        return res.status(400).json({ message: 'Cannot start review' });
    }
});

// reviewer can let go before they submit a decision
router.post('/review-queue/:id/release', auth, canReview, async (req, res) => {
    try {
        const submission = await Submission.findOneAndUpdate(
            {
                _id: req.params.id,
                status: 'UNDER_REVIEW',
                reviewer: req.user.userId,
            },
            {
                $set: {
                    status: 'SUBMITTED',
                    reviewer: null,
                },
            },
            { new: true }
        )
            .populate('challenge', 'challengeNumber title')
            .populate('learner', 'username')
            .populate('reviewer', 'username role');

        if (!submission) {
            return res.status(403).json({ message: 'You cannot release this attempt' });
        }

        return res.json(submission);
    } catch (error) {
        console.error(error.message);
        return res.status(400).json({ message: 'Cannot release review' });
    }
});

router.post('/review-queue/:id/reassign', auth, canReview, async (req, res) => {
    // only admin manager can move a locked review to someone else
    try {
        if (req.user.role !== 'ADMIN_MANAGER') {
            return res.status(403).json({ message: 'Only an Admin Manager can reassign a review' });
        }

        const nextReviewer = await User.findOne({
            _id: req.body.reviewerId,
            role: { $in: ['ADMIN', 'ADMIN_MANAGER'] },
            active: true,
        });

        if (!nextReviewer) {
            return res.status(400).json({ message: 'Please choose a valid reviewer' });
        }

        const submission = await Submission.findOneAndUpdate(
            {
                _id: req.params.id,
                status: 'UNDER_REVIEW',
            },
            {
                $set: {
                    reviewer: nextReviewer._id,
                },
            },
            { new: true }
        )
            .populate('challenge', 'challengeNumber title')
            .populate('learner', 'username')
            .populate('reviewer', 'username role');

        if (!submission) {
            return res.status(400).json({ message: 'This attempt is not locked for review' });
        }

        return res.json(submission);
    } catch (error) {
        console.error(error.message);
        return res.status(400).json({ message: 'Cannot reassign review' });
    }
});

// first decision cannot be edited after this
router.post('/review-queue/:id/decision', auth, canReview, async (req, res) => {
    try {
        const decision = String(req.body.decision || '').trim();
        const feedback = String(req.body.feedback || '').trim();

        if (decision !== 'PASS' && decision !== 'REVISION_REQUIRED') {
            return res.status(400).json({ message: 'Decision must be PASS or REVISION_REQUIRED' });
        }

        if (!feedback) {
            return res.status(400).json({ feedback: 'This field is required' });
        }

        const current = await Submission.findById(req.params.id);

        if (!current) {
            return res.status(404).json({ message: 'Attempt not found' });
        }

        if (!current.reviewer || String(current.reviewer) !== String(req.user.userId)) {
            return res.status(403).json({ message: 'Only the assigned reviewer can submit a decision' });
        }

        if (current.status !== 'UNDER_REVIEW' || current.decision) {
            return res.status(400).json({ message: 'This review decision cannot be changed' });
        }

        let nextStatus = 'REVISION_REQUIRED';
        let progressStatus = 'IN_PROGRESS';

        if (decision === 'PASS') {
            nextStatus = 'ACCEPTED';
            progressStatus = 'COMPLETED';
        } else if (current.attemptNumber >= 10) {
            // last try and not a pass
            nextStatus = 'FINAL_FAILED';
            progressStatus = 'FINAL_FAILED';
        }

        const submission = await Submission.findOneAndUpdate(
            {
                _id: current._id,
                status: 'UNDER_REVIEW',
                reviewer: req.user.userId,
                decision: { $exists: false },
            },
            {
                $set: {
                    decision,
                    feedback,
                    reviewedAt: new Date(),
                    status: nextStatus,
                },
            },
            { new: true }
        )
            .populate('challenge', 'challengeNumber title')
            .populate('learner', 'username email')
            .populate('reviewer', 'username role');

        if (!submission) {
            return res.status(400).json({ message: 'This review decision cannot be changed' });
        }

        await Progress.findOneAndUpdate(
            { learner: submission.learner._id, challenge: submission.challenge._id },
            { status: progressStatus },
            { upsert: true, new: true }
        );

        // email fail should not block the saved review
        try {
            await sendReviewEmail({
                to: submission.learner.email,
                challengeTitle: submission.challenge.title || submission.challenge.challengeNumber,
                attemptNumber: submission.attemptNumber,
                decision,
                feedback,
            });
        } catch (mailError) {
            console.error(mailError.message);
        }

        return res.json(submission);
    } catch (error) {
        console.error(error.message);
        return res.status(400).json({ message: 'Cannot submit review decision' });
    }
});

// extra comment only, do not change decision or feedback
router.post('/review-queue/:id/comments', auth, canReview, async (req, res) => {
    try {
        const text = String(req.body.text || '').trim();

        if (!text) {
            return res.status(400).json({ text: 'This field is required' });
        }

        const submission = await Submission.findById(req.params.id);

        if (!submission) {
            return res.status(404).json({ message: 'Attempt not found' });
        }

        if (!submission.decision) {
            return res.status(400).json({ message: 'Comments can be added after the review is completed' });
        }

        submission.comments.push({
            text,
            createdBy: req.user.userId,
            createdAt: new Date(),
        });
        await submission.save();
        await submission.populate([
            { path: 'challenge', select: 'challengeNumber title' },
            { path: 'learner', select: 'username email' },
            { path: 'reviewer', select: 'username role' },
            { path: 'comments.createdBy', select: 'username' },
        ]);

        return res.status(201).json(submission);
    } catch (error) {
        console.error(error.message);
        return res.status(400).json({ message: 'Cannot add comment' });
    }
});

// already reviewed, so admin can open them again and add a comment
router.get('/reviewed', auth, canReview, async (req, res) => {
    try {
        const submissions = await Submission.find({
            decision: { $exists: true, $ne: null },
        })
            .populate('challenge', 'challengeNumber title')
            .populate('learner', 'username')
            .populate('reviewer', 'username role')
            .populate('comments.createdBy', 'username')
            .sort({ reviewedAt: -1 });

        return res.json(submissions);
    } catch (error) {
        console.error(error.message);
        return res.status(400).json({ message: 'Cannot load reviewed attempts' });
    }
});

// learner can only see their own review history
router.get('/reviews', auth, canSubmit, async (req, res) => {
    try {
        const submissions = await Submission.find({
            learner: req.user.userId,
            decision: { $exists: true, $ne: null },
        })
            .populate('challenge', 'challengeNumber title')
            .populate('comments.createdBy', 'username')
            .sort({ reviewedAt: -1 });

        return res.json(submissions);
    } catch (error) {
        console.error(error.message);
        return res.status(400).json({ message: 'Cannot load review history' });
    }
});

// learner can only see their own attempts, including cancelled
router.get('/', auth, canSubmit, async (req, res) => {
    try {
        const filter = { learner: req.user.userId };

        if (req.query.challengeId) {
            filter.challenge = req.query.challengeId;
        }

        const submissions = await Submission.find(filter)
            .populate('challenge', 'challengeNumber title')
            .populate('comments.createdBy', 'username')
            .sort({ submittedAt: -1 });

        return res.json(submissions);
    } catch (error) {
        console.error(error.message);
        return res.status(400).json({ message: 'Cannot load attempts' });
    }
});

// 404 if this is not their attempt, so they cannot peek at others
router.get('/:id', auth, canSubmit, async (req, res) => {
    try {
        const submission = await Submission.findOne({
            _id: req.params.id,
            learner: req.user.userId,
        })
            .populate('challenge', 'challengeNumber title')
            .populate('comments.createdBy', 'username');

        if (!submission) {
            return res.status(404).json({ message: 'Attempt not found' });
        }

        return res.json(submission);
    } catch (error) {
        return res.status(404).json({ message: 'Attempt not found' });
    }
});

router.patch('/:id/cancel', auth, canSubmit, async (req, res) => {
    // keep the row, just mark cancelled; block this while under review
    try {
        const submission = await Submission.findOne({
            _id: req.params.id,
            learner: req.user.userId,
        });

        if (!submission) {
            return res.status(404).json({ message: 'Attempt not found' });
        }

        if (submission.status === 'UNDER_REVIEW') {
            return res.status(400).json({ message: 'This attempt is under review and cannot be cancelled' });
        }

        if (submission.status !== 'SUBMITTED') {
            return res.status(400).json({ message: 'This attempt cannot be cancelled' });
        }

        submission.status = 'CANCELLED';
        await submission.save();
        return res.json(submission);
    } catch (error) {
        console.error(error.message);
        return res.status(400).json({ message: 'Cannot cancel attempt' });
    }
});

module.exports = router;
