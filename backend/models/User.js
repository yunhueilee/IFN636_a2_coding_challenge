const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        passwordHash: {
            type: String,
            required: true, // encrypted password, not plain text
        },
        gender: {
            type: String,
            enum: ['Male', 'Female', 'Other'],
            default: null, // Prefer not to say is stored as null
        },
        role: {
            type: String,
            // SUPER_ADMIN, ADMIN_MANAGER, ADMIN, LEARNER
            enum: ['SUPER_ADMIN', 'ADMIN_MANAGER', 'ADMIN', 'LEARNER'],
            default: 'LEARNER',
        },
        active: {
            type: Boolean,
            default: true, // false = cannot login
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('User', userSchema);
