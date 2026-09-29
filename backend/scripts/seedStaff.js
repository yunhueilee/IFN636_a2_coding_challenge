require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const startSeed = async () => {
    try {
        const mongoUri = process.env.MONGO_URI;
        const managerEmail = process.env.ADMIN_MANAGER_EMAIL;
        const managerPassword = process.env.ADMIN_MANAGER_PASSWORD;
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (!mongoUri || !managerEmail || !managerPassword || !adminEmail || !adminPassword) {
            throw new Error('Missing required environment variables');
        }

        await mongoose.connect(mongoUri);
        console.log('MongoDB connected');

        // two staff accounts that can manage challenges
        const staff = [
            {
                email: managerEmail,
                username: 'adminmanager',
                password: managerPassword,
                role: 'ADMIN_MANAGER',
            },
            {
                email: adminEmail,
                username: 'admin',
                password: adminPassword,
                role: 'ADMIN',
            },
        ];

        for (const person of staff) {
            const existing = await User.findOne({ email: person.email });

            if (existing) {
                console.log(person.role + ' already exists');
                continue;
            }

            const passwordHash = await bcrypt.hash(person.password, 10);

            await User.create({
                email: person.email,
                username: person.username,
                passwordHash,
                role: person.role,
                active: true,
            });

            console.log(person.role + ' created');
        }

        process.exit(0);
    } catch (error) {
        console.error('Seed failed:', error.message);
        process.exit(1);
    }
};

startSeed();
