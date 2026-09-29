// load values from .env, such as MONGO_URI
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const authRoutes = require('./routes/auth');
const challengeRoutes = require('./routes/challenges');
const publishedChallengeRoutes = require('./routes/publishedChallenges');
const submissionRoutes = require('./routes/submissions');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());


// login APIs
app.use('/api/auth', authRoutes);
// challenge APIs
app.use('/api/challenges/published', publishedChallengeRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/submissions', submissionRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

// connect to MongoDB
const startServer = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected');

        // old student accounts used USER; now they are LEARNER
        const User = require('./models/User');
        await User.updateMany({ role: 'USER' }, { $set: { role: 'LEARNER' } });

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        // database is not connected
        console.error('MongoDB connection error:', error.message);
        process.exit(1);
    }
};

startServer();
