// this file is for login and register routes
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

const adminRoles = ['SUPER_ADMIN', 'ADMIN_MANAGER', 'ADMIN'];

function isStrongPassword(password) {
    return (
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /[0-9]/.test(password) &&
        /[^A-Za-z0-9]/.test(password)
    );
}

function makeToken(user, expiresIn) {
    return jwt.sign(
        {
            userId: user._id,
            role: user.role,
        },
        process.env.JWT_SECRET,
        { expiresIn } // '1h' for admin, '7d' for learner
    );
}

function userPayload(user, expiresIn) {
    return {
        token: makeToken(user, expiresIn),
        user: {
            id: user._id,
            email: user.email,
            username: user.username,
            role: user.role,
        },
    };
}

async function findByLoginName(loginName) {
    let user = await User.findOne({ email: loginName.toLowerCase() });

    if (!user) {
        user = await User.findOne({ username: loginName });
    }

    return user;
}

router.post('/login', async (req, res) => {
    try {
        const { email, username, password } = req.body;
        const loginName = email || username;

        if (!loginName || !password) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        const user = await findByLoginName(loginName);

        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // three admin types can use this login, learners cannot
        if (!adminRoles.includes(user.role)) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        if (!user.active) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // admin session lasts 1 hour
        return res.json(userPayload(user, '1h'));
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ message: 'Server error' });
    }
});

router.post('/learner-login', async (req, res) => {
    try {
        const { email, username, password } = req.body;
        const loginName = email || username;

        if (!loginName || !password) {
            return res.status(400).json({ message: 'Email/username or password is incorrect.' });
        }

        const user = await findByLoginName(loginName);

        if (!user || user.role !== 'LEARNER' || !user.active) {
            return res.status(401).json({ message: 'Email/username or password is incorrect.' });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);

        if (!isMatch) {
            return res.status(401).json({ message: 'Email/username or password is incorrect.' });
        }

        // learner session lasts 7 days if they do not come back
        return res.json(userPayload(user, '7d'));
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ message: 'Server error' });
    }
});

router.post('/register', async (req, res) => {
    try {
        const email = String(req.body.email || '').trim().toLowerCase();
        const username = String(req.body.username || '').trim();
        const password = String(req.body.password || '');
        const genderValue = String(req.body.gender || '').trim();
        const fieldErrors = {};

        if (!email) {
            fieldErrors.email = 'This field is required';
        }

        if (!username) {
            fieldErrors.username = 'This field is required';
        }

        if (!password) {
            fieldErrors.password = 'This field is required';
        } else if (!isStrongPassword(password)) {
            fieldErrors.password =
                'Password must include uppercase, lowercase, a number and a symbol';
        }

        if (Object.keys(fieldErrors).length > 0) {
            return res.status(400).json(fieldErrors);
        }

        // admin cannot create an account here
        if (await User.findOne({ email })) {
            fieldErrors.email = 'This email is already used';
        }

        if (await User.findOne({ username })) {
            fieldErrors.username = 'This username is already used';
        }

        if (Object.keys(fieldErrors).length > 0) {
            return res.status(400).json(fieldErrors);
        }

        let gender = null;
        if (genderValue === 'Male' || genderValue === 'Female' || genderValue === 'Other') {
            gender = genderValue;
        }

        const user = await User.create({
            email,
            username,
            passwordHash: await bcrypt.hash(password, 10),
            gender,
            role: 'LEARNER',
        });

        // same 7 day session as learner login
        return res.status(201).json(userPayload(user, '7d'));
    } catch (error) {
        console.error(error.message);
        return res.status(400).json({ message: 'Cannot create account' });
    }
});

module.exports = router;
