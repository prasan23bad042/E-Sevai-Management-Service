const supabase = require('../config/supabase');
const notificationService = require('./notificationService');

// In-Memory cache storage
const dashboardCache = new Map();
const CACHE_TTL_MS = 30 * 1000; // 30 seconds caching for analytics

const getCachedData = (key) => {
    const entry = dashboardCache.get(key);
    if (entry && (Date.now() - entry.timestamp) < CACHE_TTL_MS) {
        return { data: entry.data, cached_at: new Date(entry.timestamp).toISOString() };
    }
    return null;
};

const setCachedData = (key, data) => {
    dashboardCache.set(key, {
        data,
        timestamp: Date.now()
    });
};

/**
 * Scan for SLA breaches (due_date < now) and trigger critical notifications.
 * Limits alerting to avoid duplicate alerts for the same application.
 */
const runSlaBreachCheck = async (userId, centerId = null) => {
    try {
        const nowStr = new Date().toISOString();
        let query = supabase
            .from('applications')
            .select('id, application_number, status, due_date, assigned_staff_id')
            .not('status', 'in', '("completed","cancelled")')
            .lt('due_date', nowStr);

        if (centerId) {
            query = query.eq('center_id', centerId);
        }

        const { data: overdueApps } = await query;
        if (overdueApps && overdueApps.length > 0) {
            for (const app of overdueApps) {
                // Determine recipient: assigned staff, or center manager/admin (userId)
                const alertTargetUserId = app.assigned_staff_id || userId;

                // Check for existing unread SLA Breach alert for this app
                const { data: existing } = await supabase
                    .from('notifications')
                    .select('id')
                    .eq('user_id', alertTargetUserId)
                    .eq('reference_id', app.id)
                    .eq('notification_type', 'SLA Breach')
                    .is('deleted_at', null)
                    .limit(1);

                if (!existing || existing.length === 0) {
                    await notificationService.createNotification(alertTargetUserId, {
                        type: 'SLA Breach',
                        title: 'CRITICAL: SLA Breach Alert',
                        message: `Application ${app.application_number} is overdue! Expected completion date: ${new Date(app.due_date).toLocaleDateString()}`,
                        category: 'system',
                        priority: 'critical',
                        referenceType: 'application',
                        referenceId: app.id
                    });
                }
            }
        }
    } catch (err) {
        console.error('[SLA Engine] Auto-check failed:', err.message);
    }
};

/**
 * Platform Admin Dashboard Metrics
 */
const getAdminDashboardMetrics = async (userId) => {
    const cacheKey = `admin_dashboard`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    // Trigger SLA background check
    runSlaBreachCheck(userId);

    // 1. Centers breakdown
    const { data: centers } = await supabase.from('centers').select('status');
    const totalCenters = centers?.length || 0;
    const approvedCenters = centers?.filter(c => c.status === 'approved').length || 0;
    const pendingCenters = totalCenters - approvedCenters;

    // 2. Applications count
    const { count: totalApps } = await supabase.from('applications').select('*', { count: 'exact', head: true });
    const { count: completedApps } = await supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'completed');

    // 3. Financial calculations
    const today = new Date().toISOString().split('T')[0];
    const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const { data: payments } = await supabase
        .from('payments')
        .select('total_amount, government_fee, service_charge, paid_at')
        .eq('payment_status', 'paid');

    let revenueToday = { government_revenue: 0, center_revenue: 0, total_revenue: 0 };
    let revenueThisMonth = { government_revenue: 0, center_revenue: 0, total_revenue: 0 };

    (payments || []).forEach(p => {
        const amt = parseFloat(p.total_amount) || 0;
        const gov = parseFloat(p.government_fee) || 0;
        const srv = parseFloat(p.service_charge) || 0;

        if (p.paid_at && p.paid_at.startsWith(today)) {
            revenueToday.total_revenue += amt;
            revenueToday.government_revenue += gov;
            revenueToday.center_revenue += srv;
        }
        if (p.paid_at && p.paid_at >= firstOfMonth) {
            revenueThisMonth.total_revenue += amt;
            revenueThisMonth.government_revenue += gov;
            revenueThisMonth.center_revenue += srv;
        }
    });

    // 4. Top Services (Aggregate service names)
    const { data: servicesRevenue } = await supabase
        .from('payments')
        .select('service_id, total_amount, payment_snapshot')
        .eq('payment_status', 'paid');

    const servicesMap = {};
    (servicesRevenue || []).forEach(p => {
        const sId = p.service_id;
        const name = p.payment_snapshot?.service_name || 'N/A';
        const amt = parseFloat(p.total_amount) || 0;

        if (!servicesMap[sId]) {
            servicesMap[sId] = { service_name: name, count: 0, revenue: 0 };
        }
        servicesMap[sId].count += 1;
        servicesMap[sId].revenue += amt;
    });
    const topServices = Object.values(servicesMap)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    // 5. Top Centers
    const centersMap = {};
    for (const p of servicesRevenue || []) {
        const cId = p.payment_snapshot?.center_id || 'N/A';
        const amt = parseFloat(p.total_amount) || 0;

        if (!centersMap[cId]) {
            centersMap[cId] = { center_id: cId, name: 'N/A', count: 0, revenue: 0 };
        }
        centersMap[cId].count += 1;
        centersMap[cId].revenue += amt;
    }
    // Fetch center names
    const centersIds = Object.keys(centersMap).filter(id => id !== 'N/A');
    if (centersIds.length > 0) {
        const { data: centersInfo } = await supabase.from('centers').select('id, name').in('id', centersIds);
        (centersInfo || []).forEach(c => {
            if (centersMap[c.id]) centersMap[c.id].name = c.name;
        });
    }
    const topCenters = Object.values(centersMap)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

    const metrics = {
        centers: { total: totalCenters, approved: approvedCenters, pending: pendingCenters },
        applications: { total: totalApps || 0, completed: completedApps || 0 },
        revenue: { today: revenueToday, month: revenueThisMonth },
        topServices,
        topCenters
    };

    setCachedData(cacheKey, metrics);
    return { data: metrics, cached_at: new Date().toISOString() };
};

/**
 * Center Owner Dashboard Metrics
 */
const getOwnerDashboardMetrics = async (userId) => {
    // 1. Get center owned by user
    const { data: center } = await supabase
        .from('centers')
        .select('id, name')
        .eq('owner_id', userId)
        .limit(1)
        .maybeSingle();

    if (!center) {
        throw new Error('Center Owner is not mapped to any active E-Sevai Center');
    }

    const centerId = center.id;
    const cacheKey = `owner_dashboard_${centerId}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    // Trigger SLA check for this center
    runSlaBreachCheck(userId, centerId);

    // 2. Applications today, pending, completed
    const today = new Date().toISOString().split('T')[0];
    const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const { data: apps } = await supabase
        .from('applications')
        .select('status, submitted_at')
        .eq('center_id', centerId);

    let appsToday = 0;
    let pendingApps = 0;
    let completedApps = 0;

    (apps || []).forEach(a => {
        if (a.submitted_at && a.submitted_at.startsWith(today)) appsToday++;
        if (['submitted', 'documents_pending', 'under_verification', 'in_progress', 'approved'].includes(a.status)) pendingApps++;
        if (a.status === 'completed') completedApps++;
    });

    // 3. Revenue Today, Month
    const { data: payments } = await supabase
        .from('payments')
        .select('total_amount, government_fee, service_charge, paid_at')
        .eq('center_id', centerId)
        .eq('payment_status', 'paid');

    let revenueToday = { government_revenue: 0, center_revenue: 0, total_revenue: 0 };
    let revenueThisMonth = { government_revenue: 0, center_revenue: 0, total_revenue: 0 };

    (payments || []).forEach(p => {
        const amt = parseFloat(p.total_amount) || 0;
        const gov = parseFloat(p.government_fee) || 0;
        const srv = parseFloat(p.service_charge) || 0;

        if (p.paid_at && p.paid_at.startsWith(today)) {
            revenueToday.total_revenue += amt;
            revenueToday.government_revenue += gov;
            revenueToday.center_revenue += srv;
        }
        if (p.paid_at && p.paid_at >= firstOfMonth) {
            revenueThisMonth.total_revenue += amt;
            revenueThisMonth.government_revenue += gov;
            revenueThisMonth.center_revenue += srv;
        }
    });

    // 4. Active staff count
    const { count: staffCount } = await supabase
        .from('center_staff')
        .select('*', { count: 'exact', head: true })
        .eq('center_id', centerId)
        .eq('is_active', true);

    // 5. Verification Queue (Pending verify documents count)
    const { data: appIds } = await supabase.from('applications').select('id').eq('center_id', centerId);
    const mappedIds = (appIds || []).map(a => a.id);

    let docQueue = 0;
    if (mappedIds.length > 0) {
        const { count: docVerifyCount } = await supabase
            .from('documents')
            .select('*', { count: 'exact', head: true })
            .in('application_id', mappedIds)
            .eq('verification_status', 'pending');
        docQueue = docVerifyCount || 0;
    }

    const metrics = {
        center_name: center.name,
        applications: { today: appsToday, pending: pendingApps, completed: completedApps },
        revenue: { today: revenueToday, month: revenueThisMonth },
        active_staff: staffCount || 0,
        verification_queue_length: docQueue
    };

    setCachedData(cacheKey, metrics);
    return { data: metrics, cached_at: new Date().toISOString() };
};

/**
 * Manager Dashboard Metrics
 */
const getManagerDashboardMetrics = async (userId) => {
    // 1. Get center of the manager
    const { data: staffRecord } = await supabase
        .from('center_staff')
        .select('center_id')
        .eq('user_id', userId)
        .eq('role', 'manager')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

    if (!staffRecord) {
        throw new Error('Manager is not active in any center staff registry');
    }

    const centerId = staffRecord.center_id;
    const cacheKey = `manager_dashboard_${centerId}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    // Trigger SLA check
    runSlaBreachCheck(userId, centerId);

    // 2. Assigned / Total Center applications count
    const { count: totalAssigned } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('center_id', centerId);

    // 3. Completed applications
    const { count: completedApps } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('center_id', centerId)
        .eq('status', 'completed');

    // 4. Pending reviews & Rejected documents count in center
    const { data: appIds } = await supabase.from('applications').select('id').eq('center_id', centerId);
    const mappedIds = (appIds || []).map(a => a.id);

    let pendingReviews = 0;
    let rejectedDocs = 0;

    if (mappedIds.length > 0) {
        const { count: countPending } = await supabase
            .from('documents')
            .select('*', { count: 'exact', head: true })
            .in('application_id', mappedIds)
            .eq('verification_status', 'pending');
        pendingReviews = countPending || 0;

        const { count: countRejected } = await supabase
            .from('documents')
            .select('*', { count: 'exact', head: true })
            .in('application_id', mappedIds)
            .eq('verification_status', 'rejected');
        rejectedDocs = countRejected || 0;
    }

    const metrics = {
        center_id: centerId,
        applications: { assigned_total: totalAssigned || 0, completed: completedApps || 0 },
        pending_document_reviews: pendingReviews,
        rejected_documents_count: rejectedDocs
    };

    setCachedData(cacheKey, metrics);
    return { data: metrics, cached_at: new Date().toISOString() };
};

/**
 * Staff Dashboard Metrics
 */
const getStaffDashboardMetrics = async (userId) => {
    const cacheKey = `staff_dashboard_${userId}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    // Trigger SLA check for assigned items
    runSlaBreachCheck(userId);

    // 1. Fetch assigned applications
    const { data: apps } = await supabase
        .from('applications')
        .select('status')
        .eq('assigned_staff_id', userId);

    let totalAssigned = apps?.length || 0;
    let completed = 0;
    let pending = 0;

    (apps || []).forEach(a => {
        if (a.status === 'completed') completed++;
        else if (a.status !== 'cancelled') pending++;
    });

    // 2. Today's Activity Timeline
    const today = new Date().toISOString().split('T')[0];
    const { data: activity } = await supabase
        .from('activity_logs')
        .select('action, created_at, details')
        .eq('user_id', userId)
        .gte('created_at', `${today}T00:00:00.000Z`)
        .order('created_at', { ascending: false });

    const metrics = {
        assigned_applications: totalAssigned,
        completed_applications: completed,
        pending_applications: pending,
        today_activity_timeline: activity || []
    };

    setCachedData(cacheKey, metrics);
    return { data: metrics, cached_at: new Date().toISOString() };
};

/**
 * Audit Dashboard
 */
const getAuditDashboardMetrics = async (userId) => {
    // Platform Admin check
    const { data: user } = await supabase.from('users').select('role').eq('id', userId).single();
    if (user?.role !== 'platform_admin') {
        throw new Error('Access Denied: Only platform admins can view the global audit dashboard');
    }

    // Recent Activity logs
    const { data: recentActivity } = await supabase
        .from('activity_logs')
        .select('action, created_at, details, users(full_name)')
        .order('created_at', { ascending: false })
        .limit(10);

    // Recent Payments
    const { data: recentPayments } = await supabase
        .from('payments')
        .select('payment_number, total_amount, payment_status, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

    // Recent Documents
    const { data: recentDocs } = await supabase
        .from('documents')
        .select('document_name, original_file_name, verification_status, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

    // Recent Approvals (applications status = approved)
    const { data: recentApprovals } = await supabase
        .from('applications')
        .select('application_number, customer_name, approved_at')
        .eq('status', 'approved')
        .order('approved_at', { ascending: false })
        .limit(10);

    // Recent Rejections (applications status = rejected)
    const { data: recentRejections } = await supabase
        .from('applications')
        .select('application_number, customer_name, rejected_at, rejection_reason')
        .eq('status', 'rejected')
        .order('rejected_at', { ascending: false })
        .limit(10);

    return {
        recent_activity: recentActivity || [],
        recent_payments: recentPayments || [],
        recent_documents: recentDocs || [],
        recent_approvals: recentApprovals || [],
        recent_rejections: recentRejections || []
    };
};

/**
 * Application Volume Trend Analytics
 */
const getApplicationTrendMetrics = async (userId) => {
    // 1. Fetch submitted applications timestamps
    const { data: apps, error } = await supabase
        .from('applications')
        .select('submitted_at');

    if (error) throw error;

    // Calculate dates
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    let countToday = 0;
    let countYesterday = 0;

    const last7DaysMap = {};
    for (let i = 0; i < 7; i++) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        last7DaysMap[d] = 0;
    }

    (apps || []).forEach(a => {
        if (!a.submitted_at) return;
        const dStr = a.submitted_at.split('T')[0];
        
        if (dStr === today) countToday++;
        if (dStr === yesterday) countYesterday++;
        if (last7DaysMap[dStr] !== undefined) {
            last7DaysMap[dStr]++;
        }
    });

    let growthPercentage = 0;
    if (countYesterday > 0) {
        growthPercentage = Math.round(((countToday - countYesterday) / countYesterday) * 100);
    } else if (countToday > 0) {
        growthPercentage = 100; // 100% growth from 0
    }

    const dailyTrends = Object.keys(last7DaysMap).map(date => ({
        date,
        count: last7DaysMap[date]
    })).sort((a, b) => a.date.localeCompare(b.date));

    return {
        today: countToday,
        yesterday: countYesterday,
        growth_percentage: growthPercentage,
        timeline_daily: dailyTrends
    };
};

/**
 * Revenue Trend Analytics
 */
const getRevenueTrendMetrics = async (userId) => {
    const { data: payments, error } = await supabase
        .from('payments')
        .select('total_amount, paid_at')
        .eq('payment_status', 'paid');

    if (error) throw error;

    const dailyRevMap = {};
    const monthlyRevMap = {};

    for (let i = 0; i < 7; i++) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        dailyRevMap[d] = 0;
    }

    (payments || []).forEach(p => {
        if (!p.paid_at) return;
        const dStr = p.paid_at.split('T')[0];
        const mStr = dStr.substring(0, 7); // YYYY-MM
        const amt = parseFloat(p.total_amount) || 0;

        if (dailyRevMap[dStr] !== undefined) {
            dailyRevMap[dStr] += amt;
        }
        if (!monthlyRevMap[mStr]) {
            monthlyRevMap[mStr] = 0;
        }
        monthlyRevMap[mStr] += amt;
    });

    const dailyTrend = Object.keys(dailyRevMap).map(date => ({
        date,
        revenue: dailyRevMap[date]
    })).sort((a, b) => a.date.localeCompare(b.date));

    const monthlyTrend = Object.keys(monthlyRevMap).map(month => ({
        month,
        revenue: monthlyRevMap[month]
    })).sort((a, b) => a.month.localeCompare(b.month));

    return {
        daily: dailyTrend,
        monthly: monthlyTrend
    };
};

module.exports = {
    getAdminDashboardMetrics,
    getOwnerDashboardMetrics,
    getManagerDashboardMetrics,
    getStaffDashboardMetrics,
    getAuditDashboardMetrics,
    getApplicationTrendMetrics,
    getRevenueTrendMetrics
};
