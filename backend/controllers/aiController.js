/**
 * aiController.js
 * Handles AI question generation and quiz scheduling.
 *
 * Endpoints:
 *   POST /api/ai/generate-questions   → generate questions from a prompt
 *   POST /api/ai/schedule-quiz        → save a scheduled quiz to DB
 *   GET  /api/ai/scheduled-quizzes    → list teacher's scheduled quizzes
 *   PUT  /api/ai/scheduled-quizzes/:id → edit a scheduled quiz
 *   DELETE /api/ai/scheduled-quizzes/:id → delete a scheduled quiz
 */

const { generateQuiz, generateMixedQuiz } = require('../utils/quizGenerator');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Quiz = require('../models/Quiz');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const getModel = () => genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse a natural-language prompt like:
 *   "Create 5 questions from Math for Class 9"
 * and extract { topic, count, subject, targetClass }
 */
const parsePrompt = (prompt) => {
    const countMatch = prompt.match(/\b(\d+)\s+questions?\b/i);
    const count = countMatch ? parseInt(countMatch[1]) : 5;

    // subject patterns: "from Math", "on Physics", "about Chemistry", "for Science"
    const subjectMatch = prompt.match(/\b(?:from|on|about|in|for)\s+([A-Za-z\s]+?)(?:\s+for\s+Class|\s+for\s+Grade|\s+(?:Class|Grade)\s|\s*$)/i);
    const subject = subjectMatch ? subjectMatch[1].trim() : '';

    // class patterns: "Class 9", "Grade 10"
    const classMatch = prompt.match(/\b(?:Class|Grade)\s+(\d{1,2}[A-Za-z]?)\b/i);
    const targetClass = classMatch ? `Class ${classMatch[1]}` : '';

    // topic = subject or the main noun phrase before "for"
    const topic = subject || prompt.replace(/create\s+\d+\s+questions?\s+(?:from|on|about|in)?\s*/i, '').trim();

    return { topic, count, subject, targetClass };
};

// ─── POST /api/ai/generate-questions ─────────────────────────────────────────

/**
 * Accepts either:
 *   { prompt }  → natural language, e.g. "Create 5 questions from Math for Class 9"
 *   { topic, count, difficulty, type, subject, targetClass, language, shuffle }
 */
const generateQuestions = async (req, res) => {
    try {
        let {
            prompt,
            topic,
            count = 5,
            difficulty = 'medium',
            type = 'mcq',
            subject,
            targetClass,
            language,
            shuffle,
        } = req.body;

        // ── If teacher used free-text prompt, parse it ──
        if (prompt && !topic) {
            const parsed = parsePrompt(prompt);
            topic = parsed.topic;
            count = parsed.count;
            subject = subject || parsed.subject;
            targetClass = targetClass || parsed.targetClass;
        }

        if (!topic?.trim())
            return res.status(400).json({ message: 'Topic is required' });

        const result = await generateQuiz({
            topic, count, difficulty, type,
            subject, targetClass, language, shuffle,
        });

        res.json({
            ...result,
            parsedPrompt: prompt ? { topic, count, subject, targetClass } : undefined,
        });
    } catch (err) {
        console.error('[generateQuestions]', err.message);
        res.status(500).json({ message: err.message });
    }
};

// ─── POST /api/ai/generate-mixed ─────────────────────────────────────────────

const generateMixed = async (req, res) => {
    try {
        const { topic, easyCount, mediumCount, hardCount, subject, targetClass } = req.body;
        if (!topic?.trim())
            return res.status(400).json({ message: 'Topic is required' });

        const result = await generateMixedQuiz({ topic, easyCount, mediumCount, hardCount, subject, targetClass });
        res.json(result);
    } catch (err) {
        console.error('[generateMixed]', err.message);
        res.status(500).json({ message: err.message });
    }
};

// ─── POST /api/ai/schedule-quiz ───────────────────────────────────────────────

/**
 * Save a quiz with scheduling metadata.
 * Body: { title, description, category, subject, targetClass, section,
 *         questions, duration, difficulty, scheduledAt, expiryTime }
 *
 * status is set to:
 *   'scheduled' if scheduledAt is in the future
 *   'active'    if scheduledAt is now or past (immediate publish)
 */
const scheduleQuiz = async (req, res) => {
    try {
        const {
            title,
            description = '',
            category = 'General',
            subject = '',
            targetClass = '',
            section = '',
            questions,
            duration = 30,
            difficulty = 'medium',
            scheduledAt,
            expiryTime,
            attendanceEnabled = false,
        } = req.body;

        // ── Validation ──
        if (!title?.trim())
            return res.status(400).json({ message: 'Quiz title is required' });

        if (!Array.isArray(questions) || questions.length === 0)
            return res.status(400).json({ message: 'At least one question is required' });

        if (!scheduledAt)
            return res.status(400).json({ message: 'scheduledAt datetime is required' });

        const scheduledDate = new Date(scheduledAt);
        if (isNaN(scheduledDate.getTime()))
            return res.status(400).json({ message: 'Invalid scheduledAt datetime' });

        // ── Validate each question ──
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            if (!q.questionText?.trim())
                return res.status(400).json({ message: `Question ${i + 1}: questionText is required` });
            if (!Array.isArray(q.options) || q.options.length < 2)
                return res.status(400).json({ message: `Question ${i + 1}: at least 2 options required` });
            if (typeof q.correctAnswer !== 'number' || q.correctAnswer < 0 || q.correctAnswer >= q.options.length)
                return res.status(400).json({ message: `Question ${i + 1}: invalid correctAnswer index` });
        }

        const now = new Date();
        const status = scheduledDate <= now ? 'active' : 'scheduled';
        const isPublished = status === 'active';

        const quiz = await Quiz.create({
            title: title.trim(),
            description,
            category,
            subject,
            targetClass,
            section,
            teacherId: req.user._id,
            questions,
            duration,
            difficulty,
            quizType: 'scheduled',
            schedulingEnabled: true,
            scheduledAt: scheduledDate,
            startTime: scheduledDate,
            expiryTime: expiryTime ? new Date(expiryTime) : null,
            status,
            isPublished,
            attendanceEnabled,
        });

        res.status(201).json({
            message: status === 'active'
                ? 'Quiz published immediately (scheduled time is now/past)'
                : `Quiz scheduled for ${scheduledDate.toISOString()}`,
            quiz,
            status,
        });
    } catch (err) {
        console.error('[scheduleQuiz]', err.message);
        res.status(500).json({ message: err.message });
    }
};

// ─── GET /api/ai/scheduled-quizzes ───────────────────────────────────────────

const getScheduledQuizzes = async (req, res) => {
    try {
        const filter = req.user.role === 'admin'
            ? { quizType: 'scheduled' }
            : { quizType: 'scheduled', teacherId: req.user._id };

        const quizzes = await Quiz.find(filter)
            .select('title subject targetClass status scheduledAt expiryTime questions isPublished createdAt duration difficulty')
            .sort({ scheduledAt: 1 })
            .lean();

        const result = quizzes.map((q) => ({
            ...q,
            questionCount: q.questions?.length || 0,
            questions: undefined,
        }));

        res.json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ─── PUT /api/ai/scheduled-quizzes/:id ───────────────────────────────────────

const updateScheduledQuiz = async (req, res) => {
    try {
        const filter = req.user.role === 'admin'
            ? { _id: req.params.id, quizType: 'scheduled' }
            : { _id: req.params.id, quizType: 'scheduled', teacherId: req.user._id };

        const existing = await Quiz.findOne(filter);
        if (!existing) return res.status(404).json({ message: 'Quiz not found or unauthorized' });

        // Don't allow editing an already-active quiz's schedule
        if (existing.status === 'active' && req.body.scheduledAt)
            return res.status(400).json({ message: 'Cannot reschedule an already-active quiz' });

        const updates = { ...req.body };

        if (updates.scheduledAt) {
            const scheduledDate = new Date(updates.scheduledAt);
            updates.scheduledAt = scheduledDate;
            updates.startTime = scheduledDate;
            const now = new Date();
            updates.status = scheduledDate <= now ? 'active' : 'scheduled';
            updates.isPublished = updates.status === 'active';
        }

        const quiz = await Quiz.findOneAndUpdate(filter, updates, { new: true });
        res.json({ message: 'Quiz updated', quiz });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ─── DELETE /api/ai/scheduled-quizzes/:id ────────────────────────────────────

const deleteScheduledQuiz = async (req, res) => {
    try {
        const filter = req.user.role === 'admin'
            ? { _id: req.params.id, quizType: 'scheduled' }
            : { _id: req.params.id, quizType: 'scheduled', teacherId: req.user._id };

        const deleted = await Quiz.findOneAndDelete(filter);
        if (!deleted) return res.status(404).json({ message: 'Quiz not found or unauthorized' });
        res.json({ message: 'Quiz deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ─── POST /api/ai/suggest-subject ────────────────────────────────────────────

const suggestSubject = async (req, res) => {
    try {
        const { title, category } = req.body;
        if (!title?.trim() && !category?.trim())
            return res.json({ subject: '' });

        const prompt = `Given a quiz titled "${title || category}" in category "${category || title}", suggest a specific subject name (2-4 words max). Return ONLY the subject name, nothing else.`;
        const model = getModel();
        const result = await model.generateContent(prompt);
        const subject = result.response.text().trim().replace(/['"]/g, '');
        res.json({ subject });
    } catch {
        res.json({ subject: '' });
    }
};

// ─── POST /api/ai/analyze-performance ────────────────────────────────────────

const analyzePerformance = async (req, res) => {
    try {
        const { score, totalQuestions, weakTopics, category } = req.body;
        const pct = ((score / totalQuestions) * 100).toFixed(1);

        const prompt = `A student scored ${score}/${totalQuestions} (${pct}%) in a ${category || 'general'} quiz.\nWeak topics: ${weakTopics?.length ? weakTopics.join(', ') : 'none'}.\nGive a short encouraging 2-3 sentence personalized feedback with specific improvement tips.`;

        const model = getModel();
        const result = await model.generateContent(prompt);
        const feedback = result.response.text().trim();
        const level = pct >= 85 ? 'excellent' : pct >= 65 ? 'good' : pct >= 40 ? 'average' : 'poor';

        res.json({ score: pct, level, feedback, message: `You answered ${score} out of ${totalQuestions} correctly.` });
    } catch {
        const pct = ((req.body.score / req.body.totalQuestions) * 100).toFixed(1);
        const level = pct >= 85 ? 'excellent' : pct >= 65 ? 'good' : pct >= 40 ? 'average' : 'poor';
        res.json({ score: pct, level, feedback: `You scored ${pct}%. Keep practicing!`, message: '' });
    }
};

module.exports = {
    generateQuestions,
    generateMixed,
    scheduleQuiz,
    getScheduledQuizzes,
    updateScheduledQuiz,
    deleteScheduledQuiz,
    suggestSubject,
    analyzePerformance,
};
