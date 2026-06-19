const express = require('express');
const router = express.Router();

const {
    authenticateUser
} = require('../middleware/authMiddleware');

const {
    list,
    unread,
    markRead,
    markReadAll,
    deleteNotification,
    clearAll
} = require('../controllers/notificationController');

// All routes require user authentication
router.use(authenticateUser);

// 1. Unread notifications list
router.get('/unread', unread);

// 2. Mark all notifications as read
router.put('/read-all', markReadAll);

// 3. Clear all notifications (soft delete all)
router.delete('/', clearAll);

// 4. List notifications (supports paginated filter sets)
router.get('/', list);

// 5. Mark specific notification as read
router.put('/:id/read', markRead);

// 6. Archive specific notification (soft delete)
router.delete('/:id', deleteNotification);

module.exports = router;
