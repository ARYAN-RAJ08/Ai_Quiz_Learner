/**
 * server.js — Quiz Learner Backend
 * Updated to include AI scheduler boot.
 */
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
    origin: [
        'http://localhost:3000',
        'https://quiz-learner-beta.vercel.app',
        process.env.FRONTEND_URL,
    ].filter(Boolean),
    credentials: true,
}));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',       require('./routes/authRoutes'));
app.use('/api/users',      require('./routes/userRoutes'));
app.use('/api/quizzes',    require('./routes/quizRoutes'));
app.use('/api/attempts',   require('./routes/attemptRoutes'));
app.use('/api/ai',         require('./routes/aiRoutes'));        // ← includes scheduling
app.use('/api/notes',      require('./routes/noteRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/coding',     require('./routes/codingRoutes'));
app.use('/api/timetable',  require('./routes/timetableRoutes'));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.json({ message: 'Quiz Learner API running' }));

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: err.message || 'Server Error' });
});

// ── DB + Server Boot ──────────────────────────────────────────────────────────
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        console.log('MongoDB connected');

        // ── Start the quiz auto-publish scheduler ──────────────────────────
        const { startQuizScheduler } = require('./jobs/quizScheduler');
        startQuizScheduler();
        // ──────────────────────────────────────────────────────────────────

        app.listen(process.env.PORT || 5000, () =>
            console.log(`Server running on port ${process.env.PORT || 5000}`)
        );
    })
    .catch((err) => console.error('DB connection error:', err));
