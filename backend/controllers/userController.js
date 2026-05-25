const User = require('../models/User');
const Attempt = require('../models/Attempt');
const Quiz = require('../models/Quiz');

// GET /api/users  (admin)
const getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// DELETE /api/users/:id  (admin)
const deleteUser = async (req, res) => {
    try {
        const target = await User.findById(req.params.id);
        if (!target) return res.status(404).json({ message: 'User not found' });
        if (target.email === 'nitishkumarpandey05@gmail.com')
            return res.status(403).json({ message: 'This admin account cannot be deleted' });
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// PUT /api/users/:id  (admin)
const updateUser = async (req, res) => {
    try {
        const target = await User.findById(req.params.id);
        if (!target) return res.status(404).json({ message: 'User not found' });
        if (target.email === 'nitishkumarpandey05@gmail.com') {
            delete req.body.role;
            delete req.body.isActive;
        }
        const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).select('-password');
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET /api/users/analytics  (admin) - basic stats
const getPlatformAnalytics = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalStudents = await User.countDocuments({ role: 'student' });
        const totalTeachers = await User.countDocuments({ role: 'teacher' });
        const totalQuizzes = await Quiz.countDocuments();
        const totalAttempts = await Attempt.countDocuments();
        res.json({ totalUsers, totalStudents, totalTeachers, totalQuizzes, totalAttempts });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET /api/users/detailed-analytics  (admin) - full tracking
const getDetailedAnalytics = async (req, res) => {
    try {
        // All teachers with their quizzes
        const teachers = await User.find({ role: 'teacher' }).select('-password');
        const teacherData = await Promise.all(teachers.map(async (teacher) => {
            const quizzes = await Quiz.find({ teacherId: teacher._id })
                .select('title subject targetClass totalAttempts createdAt isPublished')
                .sort({ createdAt: -1 });
            return {
                _id: teacher._id,
                name: teacher.name,
                email: teacher.email,
                quizCount: quizzes.length,
                quizzes,
            };
        }));

        // All students with their attempts and scores
        const students = await User.find({ role: 'student' }).select('-password');
        const studentData = await Promise.all(students.map(async (student) => {
            const attempts = await Attempt.find({ studentId: student._id })
                .populate('quizId', 'title subject targetClass')
                .sort({ createdAt: -1 });
            const totalScore = attempts.reduce((sum, a) => sum + (a.score || 0), 0);
            const totalQuestions = attempts.reduce((sum, a) => sum + (a.totalQuestions || 0), 0);
            const avgPercent = attempts.length > 0
                ? ((totalScore / (totalQuestions || 1)) * 100).toFixed(1)
                : 0;
            return {
                _id: student._id,
                name: student.name,
                email: student.email,
                studentClass: student.studentClass,
                section: student.section,
                attemptCount: attempts.length,
                avgPercent,
                attempts: attempts.map(a => ({
                    quizTitle: a.quizId?.title || 'Unknown Quiz',
                    subject: a.quizId?.subject || '',
                    score: a.score,
                    totalQuestions: a.totalQuestions,
                    percent: a.totalQuestions > 0
                        ? ((a.score / a.totalQuestions) * 100).toFixed(1)
                        : 0,
                    date: a.createdAt,
                })),
            };
        }));

        res.json({ teacherData, studentData });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// POST /api/users  (admin creates student/teacher)
const createUser = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        if (!name || !email || !password || !role)
            return res.status(400).json({ message: 'All fields are required' });
        const exists = await User.findOne({ email });
        if (exists) return res.status(400).json({ message: 'Email already registered' });
        const user = await User.create({ name, email, password, role });
        res.status(201).json({ _id: user._id, name: user.name, email: user.email, role: user.role });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = { getAllUsers, deleteUser, updateUser, getPlatformAnalytics, getDetailedAnalytics, createUser };