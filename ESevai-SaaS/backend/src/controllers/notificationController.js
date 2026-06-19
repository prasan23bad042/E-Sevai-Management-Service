const {
    getNotificationsList,
    getUnreadNotifications,
    markAsRead,
    markAllAsRead,
    softDeleteNotification,
    clearAllNotifications
} = require('../services/notificationService');

/**
 * Lists paginated notifications with filters.
 */
const list = async (req, res) => {
    try {
        const { category, priority, is_read, page, limit } = req.query;
        const result = await getNotificationsList(
            req.user.id,
            { category, priority, is_read },
            { page, limit }
        );

        res.json({
            success: true,
            data: result.notifications
        });
    } catch (error) {
        console.error('Error listing notifications:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Returns only unread notifications.
 */
const unread = async (req, res) => {
    try {
        const notifications = await getUnreadNotifications(req.user.id);
        res.json({
            success: true,
            data: notifications
        });
    } catch (error) {
        console.error('Error fetching unread notifications:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Marks a notification as read.
 */
const markRead = async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await markAsRead(id, req.user.id);

        res.json({
            success: true,
            message: 'Notification marked as read successfully',
            data: notification
        });
    } catch (error) {
        console.error('Error marking notification read:', error);
        const code = error.message.includes('Access Denied') ? 403 : 400;
        res.status(code).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Marks all notifications as read.
 */
const markReadAll = async (req, res) => {
    try {
        const result = await markAllAsRead(req.user.id);
        res.json({
            success: true,
            message: 'All notifications marked as read',
            count: result.count
        });
    } catch (error) {
        console.error('Error marking all notifications read:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Soft deletes a notification.
 */
const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await softDeleteNotification(id, req.user.id);

        res.json({
            success: true,
            message: 'Notification archived successfully',
            data: notification
        });
    } catch (error) {
        console.error('Error archiving notification:', error);
        const code = error.message.includes('Access Denied') ? 403 : 400;
        res.status(code).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Clears/soft-deletes all notifications.
 */
const clearAll = async (req, res) => {
    try {
        const result = await clearAllNotifications(req.user.id);
        res.json({
            success: true,
            message: 'All notifications cleared successfully',
            count: result.count
        });
    } catch (error) {
        console.error('Error clearing all notifications:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    list,
    unread,
    markRead,
    markReadAll,
    deleteNotification,
    clearAll
};
