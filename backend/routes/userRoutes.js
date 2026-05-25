const express = require('express');
const router = express.Router();
const { getAllUsers, deleteUser, updateUser, getPlatformAnalytics, getDetailedAnalytics, createUser } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/analytics', protect, authorize('admin'), getPlatformAnalytics);
router.get('/detailed-analytics', protect, authorize('admin'), getDetailedAnalytics);
router.get('/', protect, authorize('admin'), getAllUsers);
router.post('/', protect, authorize('admin'), createUser);
router.put('/:id', protect, authorize('admin'), updateUser);
router.delete('/:id', protect, authorize('admin'), deleteUser);

module.exports = router;