const supabase = require('../config/supabase');

/**
 * Mocks a real-time event trigger (Supabase Realtime, Socket.IO, SSE preparation).
 */
const triggerRealtimeEvent = (userId, eventType, payload) => {
    console.log(`[Realtime Trigger] Dispatching "${eventType}" event to user: ${userId}`, JSON.stringify(payload));
};

/**
 * Mock Email notification gateway.
 */
const sendEmailNotification = async (userId, title, message) => {
    try {
        const { data: user } = await supabase.from('users').select('email, full_name').eq('id', userId).single();
        if (user && user.email) {
            console.log(`[Email Sent] To: ${user.full_name} <${user.email}> | Subject: ${title} | Body: ${message}`);
            return true;
        }
    } catch (err) {
        console.error('Email notify error:', err.message);
    }
    return false;
};

/**
 * Mock SMS notification gateway.
 */
const sendSMSNotification = async (userId, message) => {
    try {
        const { data: user } = await supabase.from('users').select('phone, full_name').eq('id', userId).single();
        if (user && user.phone) {
            console.log(`[SMS Sent] To: ${user.full_name} (${user.phone}) | Msg: ${message}`);
            return true;
        }
    } catch (err) {
        console.error('SMS notify error:', err.message);
    }
    return false;
};

/**
 * Mock WhatsApp notification gateway.
 */
const sendWhatsAppNotification = async (userId, message) => {
    try {
        const { data: user } = await supabase.from('users').select('phone, full_name').eq('id', userId).single();
        if (user && user.phone) {
            console.log(`[WhatsApp Sent] To: ${user.full_name} (${user.phone}) | Msg: ${message}`);
            return true;
        }
    } catch (err) {
        console.error('WhatsApp notify error:', err.message);
    }
    return false;
};

/**
 * Mock Push notification gateway.
 */
const sendPushNotification = async (userId, title, message) => {
    console.log(`[Push Notification Sent] To: ${userId} | Title: ${title} | Message: ${message}`);
    return true;
};

/**
 * Create a centralized notification record.
 * Maps event types to priorities and triggers channel networks (email, SMS, whatsapp, push).
 */
const createNotification = async (userId, notificationData) => {
    const {
        type, // e.g. 'Application Created', 'Staff Invitation Sent'
        title,
        message,
        category, // application, document, payment, staff, center, system
        priority, // low, medium, high, critical
        referenceType, // application, center, payment, document, etc.
        referenceId // UUID reference
    } = notificationData;

    if (!userId) {
        throw new Error('User ID is required to create a notification');
    }

    // Determine default priority based on event type if not specified
    let finalPriority = priority || 'low';
    if (!priority) {
        const typeLower = (type || '').toLowerCase();
        if (typeLower.includes('invitation')) {
            finalPriority = 'low';
        } else if (typeLower.includes('assigned') || typeLower.includes('created')) {
            finalPriority = 'medium';
        } else if (typeLower.includes('rejected') || typeLower.includes('failed') || typeLower.includes('cancel')) {
            finalPriority = 'high';
        } else if (typeLower.includes('breach') || typeLower.includes('critical') || typeLower.includes('overdue')) {
            finalPriority = 'critical';
        }
    }

    // Insert database notification
    const payload = {
        user_id: userId,
        notification_type: type,
        title,
        message,
        category: category || 'system',
        priority: finalPriority,
        reference_type: referenceType || null,
        reference_id: referenceId || null,
        is_read: false
    };

    const { data, error } = await supabase
        .from('notifications')
        .insert(payload)
        .select()
        .single();

    if (error) {
        console.error('Failed to save notification record to DB:', error.message);
        throw error;
    }

    // Trigger mock delivery channels asynchronously
    sendPushNotification(userId, title, message);
    triggerRealtimeEvent(userId, 'NEW_NOTIFICATION', data);

    // High and critical notifications trigger external integrations immediately
    if (finalPriority === 'high' || finalPriority === 'critical') {
        sendEmailNotification(userId, title, message);
        sendSMSNotification(userId, message);
        sendWhatsAppNotification(userId, message);
    } else {
        // Fallback for regular updates
        sendEmailNotification(userId, title, message);
    }

    return data;
};

/**
 * Fetches notifications list with filters, pagination, and soft delete boundaries.
 */
const getNotificationsList = async (userId, filters = {}, pagination = {}) => {
    const page = parseInt(pagination.page) || 1;
    const limit = parseInt(pagination.limit) || 10;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .is('deleted_at', null); // Filter out soft-deleted items

    // Apply filters
    if (filters.category) {
        query = query.eq('category', filters.category);
    }
    if (filters.priority) {
        query = query.eq('priority', filters.priority);
    }
    if (filters.is_read !== undefined) {
        const isReadBool = filters.is_read === 'true' || filters.is_read === true;
        query = query.eq('is_read', isReadBool);
    }

    const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

    if (error) throw error;

    const total = count || 0;
    const pages = Math.ceil(total / limit);

    return {
        notifications: data || [],
        total,
        page,
        limit,
        pages
    };
};

/**
 * Fetches unread notifications list.
 */
const getUnreadNotifications = async (userId) => {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('is_read', false)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
};

/**
 * Marks a single notification as read.
 */
const markAsRead = async (notificationId, userId) => {
    const { data: check } = await supabase
        .from('notifications')
        .select('user_id')
        .eq('id', notificationId)
        .single();

    if (!check) {
        throw new Error('Notification not found');
    }
    if (check.user_id !== userId) {
        throw new Error('Access Denied: You cannot modify notifications belonging to another user');
    }

    const { data, error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .select()
        .single();

    if (error) throw error;
    
    triggerRealtimeEvent(userId, 'NOTIFICATION_UPDATED', data);
    return data;
};

/**
 * Marks all user's notifications as read.
 */
const markAllAsRead = async (userId) => {
    const { data, error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .is('deleted_at', null)
        .select();

    if (error) throw error;

    triggerRealtimeEvent(userId, 'ALL_NOTIFICATIONS_READ', { count: data?.length || 0 });
    return { success: true, count: data?.length || 0 };
};

/**
 * Soft deletes a notification.
 */
const softDeleteNotification = async (notificationId, userId) => {
    const { data: check } = await supabase
        .from('notifications')
        .select('user_id')
        .eq('id', notificationId)
        .single();

    if (!check) {
        throw new Error('Notification not found');
    }
    if (check.user_id !== userId) {
        throw new Error('Access Denied: You cannot delete notifications belonging to another user');
    }

    const { data, error } = await supabase
        .from('notifications')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', notificationId)
        .select()
        .single();

    if (error) throw error;
    
    triggerRealtimeEvent(userId, 'NOTIFICATION_DELETED', { id: notificationId });
    return data;
};

/**
 * Soft deletes all notifications for a user (clear-all).
 */
const clearAllNotifications = async (userId) => {
    const { data, error } = await supabase
        .from('notifications')
        .update({ deleted_at: new Date().toISOString() })
        .eq('user_id', userId)
        .is('deleted_at', null)
        .select();

    if (error) throw error;

    triggerRealtimeEvent(userId, 'ALL_NOTIFICATIONS_CLEARED', { count: data?.length || 0 });
    return { success: true, count: data?.length || 0 };
};

module.exports = {
    createNotification,
    getNotificationsList,
    getUnreadNotifications,
    markAsRead,
    markAllAsRead,
    softDeleteNotification,
    clearAllNotifications
};
