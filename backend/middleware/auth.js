const jwt = require('jsonwebtoken');
const User = require('../models/User');

// check the token from login, then check the account is still active
async function auth(req, res, next) {
    const header = req.headers.authorization;

    if (!header) {
        return res.status(401).json({ message: 'Please login first' });
    }

    const token = header.split(' ')[1];
    let payload;

    try {
        payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        return res.status(401).json({ message: 'Please login first' });
    }

    try {
        // read the user from the database so a disabled account or a changed role takes effect now
        const user = await User.findById(payload.userId);

        if (!user || !user.active) {
            return res.status(401).json({ message: 'Please login first' });
        }

        req.user = { userId: payload.userId, role: user.role };
        next();
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ message: 'Server error' });
    }
}

module.exports = auth;
