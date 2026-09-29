const express = require('express');
const Challenge = require('../models/Challenge');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { permissions } = require('../permissions');

const router = express.Router();

// learner browse API: only published, newest first
router.get('/', auth, requireRole(...permissions.learnerChallenges), async (req, res) => {
    try {
        const challenges = await Challenge.find({ status: 'PUBLISHED' })
            .select('challengeNumber title type tier publishedAt')
            .sort({ publishedAt: -1 });

        return res.json(challenges);
    } catch (error) {
        console.error(error.message);
        return res.status(400).json({ message: 'Cannot load challenges' });
    }
});

// learner detail: one published challenge, all task info except review criteria
router.get('/:id', auth, requireRole(...permissions.learnerChallenges), async (req, res) => {
    try {
        const challenge = await Challenge.findOne({
            _id: req.params.id,
            status: 'PUBLISHED',
        }).select('-reviewCriteria');

        if (!challenge) {
            return res.status(404).json({ message: 'Challenge not found' });
        }

        return res.json(challenge);
    } catch (error) {
        return res.status(404).json({ message: 'Challenge not found' });
    }
});

module.exports = router;
