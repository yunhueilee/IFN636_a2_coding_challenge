require('dotenv').config();

const mongoose = require('mongoose');
const User = require('../models/User');

const start = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected');

        const users = await User.find();
        console.log(users);

        process.exit(0);
    } catch (error) {
        console.error(error.message);
        process.exit(1);
    }
};

start();
