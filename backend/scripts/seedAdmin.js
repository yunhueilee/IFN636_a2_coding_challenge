require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const startSeed = async () => {
    try {
        const mongoUri = process.env.MONGO_URI;
        const adminEmail = process.env.SUPER_ADMIN_EMAIL;
        const adminPassword = process.env.SUPER_ADMIN_PASSWORD;

        if (!mongoUri || !adminEmail || !adminPassword) {
            throw new Error('Missing required environment variables');
        }

        await mongoose.connect(mongoUri);
        console.log('MongoDB connected');

        const existingAdmin = await User.findOne({ email: adminEmail });

        if (existingAdmin) {
            console.log('Super Admin already exists');
            process.exit(0);
        }

        const passwordHash = await bcrypt.hash(adminPassword, 10);

        await User.create({
            email: adminEmail,
            username: 'superadmin',
            passwordHash,
            role: 'SUPER_ADMIN', // first account, manages admins only
            active: true,
        });

        console.log('Super Admin created');
        process.exit(0);
    } catch (error) {
        console.error('Seed failed:', error.message);
        process.exit(1);
    }
};

startSeed();
