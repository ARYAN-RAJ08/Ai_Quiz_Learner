const express = require('express');
const router = express.Router();
const {
    generateQuestions,
    generateMixed,
    scheduleQuiz,
    getScheduledQuizzes,
    updateScheduledQuiz,
    deleteScheduledQuiz,
    suggestSubject,
    analyzePerformance,
} = require('../controllers/aiController');
const { protect, authorize } = require('../middleware/authMiddleware');

// ── AI Generation (all authenticated users) ──
router.post('/generate-questions', protect, generateQuestions);
router.post('/generate-mixed',     protect, generateMixed);
router.post('/suggest-subject',    protect, suggestSubject);
router.post('/analyze-performance', protect, analyzePerformance);

// ── Scheduling (teachers + admin only) ──
router.post(  '/schedule-quiz',           protect, authorize('teacher', 'admin'), scheduleQuiz);
router.get(   '/scheduled-quizzes',       protect, authorize('teacher', 'admin'), getScheduledQuizzes);
router.put(   '/scheduled-quizzes/:id',   protect, authorize('teacher', 'admin'), updateScheduledQuiz);
router.delete('/scheduled-quizzes/:id',   protect, authorize('teacher', 'admin'), deleteScheduledQuiz);

module.exports = router;
