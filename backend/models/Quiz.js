const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    questionText: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctAnswer: { type: Number, required: true }, // 0-based index of correct option
    explanation: { type: String, default: '' },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
});

const quizSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true },
        description: { type: String, default: '' },
        category: { type: String, required: true },
        subject: { type: String, default: '' },
        targetClass: { type: String, default: '' },
        section: { type: String, default: '' },
        teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        questions: [questionSchema],
        duration: { type: Number, default: 30 }, // minutes

        difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
        isPublished: { type: Boolean, default: false },
        totalAttempts: { type: Number, default: 0 },

        // Quiz Type
        quizType: { type: String, enum: ['dpp', 'scheduled'], default: 'dpp' },

        // ─── Scheduling Fields ────────────────────────────────────────────────
        // status: 'draft' = saved but not active, 'scheduled' = waiting for time,
        //         'active' = live for students, 'expired' = past expiry
        status: {
            type: String,
            enum: ['draft', 'scheduled', 'active', 'expired'],
            default: 'draft',
        },
        scheduledAt: { type: Date, default: null },   // when to auto-publish
        startTime:   { type: Date, default: null },   // alias / display
        expiryTime:  { type: Date, default: null },   // when to deactivate
        schedulingEnabled: { type: Boolean, default: false },

        // Attendance
        attendanceEnabled: { type: Boolean, default: false },
    },
    { timestamps: true }
);

// Virtual: is the quiz currently live for students?
quizSchema.virtual('isLive').get(function () {
    const now = new Date();
    if (this.status !== 'active') return false;
    if (this.startTime && now < this.startTime) return false;
    if (this.expiryTime && now > this.expiryTime) return false;
    return true;
});

module.exports = mongoose.model('Quiz', quizSchema);
