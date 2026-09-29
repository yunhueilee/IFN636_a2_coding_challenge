const express = require('express');
const Challenge = require('../models/Challenge');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { permissions } = require('../permissions');

const router = express.Router();
const canManageChallenges = requireRole(...permissions.challengeManagement);

async function nextChallengeNumber() {
    const last = await Challenge.findOne({ challengeNumber: { $exists: true } })
        .sort({ challengeNumber: -1 })
        .select('challengeNumber');

    if (!last || !last.challengeNumber) {
        return 'CCP-CH-001';
    }

    const lastNumber = Number(String(last.challengeNumber).replace('CCP-CH-', ''));
    return 'CCP-CH-' + String(lastNumber + 1).padStart(3, '0');
}

function keywordsFromBody(body) {
    if (Array.isArray(body.keywords)) {
        return body.keywords.map((word) => String(word).trim()).filter(Boolean);
    }

    return String(body.keywords || '')
        .split(',')
        .map((word) => word.trim())
        .filter(Boolean);
}

// keep whatever they typed, skip empty boxes
function draftFields(body) {
    const data = {
        keywords: keywordsFromBody(body),
    };

    const textFields = [
        'title',
        'type',
        'description',
        'testExample',
        'expectedResult',
        'starterRepo',
        'reviewCriteria',
    ];

    for (const field of textFields) {
        if (body[field] !== undefined && String(body[field]).trim() !== '') {
            data[field] = String(body[field]).trim();
        }
    }

    if (body.tier !== undefined && String(body.tier).trim() !== '') {
        data.tier = Number(body.tier);
    }

    return data;
}

// admin list: drafts, published and closed
router.get('/', auth, canManageChallenges, async (req, res) => {
    try {
        const challenges = await Challenge.find()
            .populate('createdBy', 'username')
            .sort({ createdAt: -1 });

        return res.json(challenges);
    } catch (error) {
        console.error(error.message);
        return res.status(400).json({ message: 'Cannot load challenges' });
    }
});

// save a new draft
router.post('/', auth, canManageChallenges, async (req, res) => {
    try {
        const challenge = await Challenge.create({
            ...draftFields(req.body),
            challengeNumber: await nextChallengeNumber(),
            createdBy: req.user.userId,
            status: 'DRAFT',
        });

        return res.status(201).json(challenge);
    } catch (error) {
        console.error(error.message);
        return res.status(400).json({ message: 'Cannot create challenge' });
    }
});

// save fields only, do not change status here
router.put('/:id', auth, canManageChallenges, async (req, res) => {
    try {
        const challenge = await Challenge.findByIdAndUpdate(
            req.params.id,
            draftFields(req.body),
            { new: true, runValidators: true }
        ).populate('createdBy', 'username');

        if (!challenge) {
            return res.status(404).json({ message: 'Challenge not found' });
        }

        return res.json(challenge);
    } catch (error) {
        console.error(error.message);
        return res.status(400).json({ message: 'Cannot update challenge' });
    }
});

// ADMIN / ADMIN_MANAGER only: DRAFT -> PUBLISHED, PUBLISHED -> CLOSED
router.patch('/:id/status', auth, canManageChallenges, async (req, res) => {
    try {
        const nextStatus = req.body.status;
        const challenge = await Challenge.findById(req.params.id);

        if (!challenge) {
            return res.status(404).json({ message: 'Challenge not found' });
        }

        if (nextStatus === 'PUBLISHED') {
            if (challenge.status !== 'DRAFT') {
                return res.status(400).json({ message: 'Only a draft can be published' });
            }

            challenge.status = 'PUBLISHED';
            challenge.publishedAt = new Date();
        } else if (nextStatus === 'CLOSED') {
            if (challenge.status !== 'PUBLISHED') {
                return res.status(400).json({ message: 'Only a published challenge can be closed' });
            }

            // close is allowed even if submissions already exist
            challenge.status = 'CLOSED';
        } else {
            return res.status(400).json({ message: 'Status must be PUBLISHED or CLOSED' });
        }

        await challenge.save();
        await challenge.populate('createdBy', 'username');
        return res.json(challenge);
    } catch (error) {
        console.error(error.message);
        return res.status(400).json({ message: 'Cannot update status' });
    }
});

// discard a draft and remove its number
router.delete('/:id', auth, canManageChallenges, async (req, res) => {
    try {
        const challenge = await Challenge.findById(req.params.id);

        if (!challenge) {
            return res.status(404).json({ message: 'Challenge not found' });
        }

        if (challenge.status !== 'DRAFT') {
            return res.status(400).json({ message: 'Only a draft can be discarded' });
        }

        await challenge.deleteOne();
        return res.json({ message: 'Draft discarded' });
    } catch (error) {
        console.error(error.message);
        return res.status(400).json({ message: 'Cannot discard draft' });
    }
});

module.exports = router;
