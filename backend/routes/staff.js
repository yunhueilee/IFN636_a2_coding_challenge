// this file is for super admin creating staff accounts
const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { permissions } = require('../permissions');
const { getStaffCreator, STAFF_ROLES } = require('../factories/staffAccountFactory');
const { isStrongPassword } = require('../utils/passwordRules');

const router = express.Router();
const canManageStaff = requireRole(...permissions.staffManagement);

// super admin lists all staff accounts, newest first
router.get('/', auth, canManageStaff, async (req, res) => {
    try {
        const staff = await User.find({ role: { $in: STAFF_ROLES } })
            .select('username email role createdAt')
            .sort({ createdAt: -1 });

        return res.json(staff);
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ message: 'Cannot load staff accounts' });
    }
});

// super admin creates an ADMIN, ADMIN_MANAGER or SUPER_ADMIN account
router.post('/', auth, canManageStaff, async (req, res) => {
    try {
        const email = String(req.body.email || '').trim().toLowerCase();
        const username = String(req.body.username || '').trim();
        const password = String(req.body.password || '');
        const role = String(req.body.role || '').trim();
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

        const creator = getStaffCreator(role);
        if (!creator) {
            fieldErrors.role = 'Role must be ' + STAFF_ROLES.join(', ');
        }

        if (Object.keys(fieldErrors).length > 0) {
            return res.status(400).json(fieldErrors);
        }

        if (await User.findOne({ email })) {
            fieldErrors.email = 'This email is already used';
        }

        if (await User.findOne({ username })) {
            fieldErrors.username = 'This username is already used';
        }

        if (Object.keys(fieldErrors).length > 0) {
            return res.status(400).json(fieldErrors);
        }

        const user = await creator.create({ email, username, password });

        return res.status(201).json({
            id: user._id,
            email: user.email,
            username: user.username,
            role: user.role,
        });
    } catch (error) {
        console.error(error.message);
        return res.status(400).json({ message: 'Cannot create staff account' });
    }
});

module.exports = router;
