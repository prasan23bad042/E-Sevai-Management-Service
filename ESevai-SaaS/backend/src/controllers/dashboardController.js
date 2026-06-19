const {
    getAdminDashboardMetrics,
    getOwnerDashboardMetrics,
    getManagerDashboardMetrics,
    getStaffDashboardMetrics,
    getAuditDashboardMetrics,
    getApplicationTrendMetrics,
    getRevenueTrendMetrics
} = require('../services/dashboardService');

const admin = async (req, res) => {
    try {
        if (req.user.role !== 'platform_admin') {
            return res.status(403).json({ success: false, message: 'Access Denied: Admin role required' });
        }
        const result = await getAdminDashboardMetrics(req.user.id);
        const metrics = result.data;

        res.json({
            success: true,
            data: {
                totalCenters: metrics.centers.total,
                pendingCenters: metrics.centers.pending,
                totalApplications: metrics.applications.total,
                totalServices: metrics.topServices.length,
                ...metrics
            },
            cached_at: result.cached_at
        });
    } catch (error) {
        console.error('Error loading admin dashboard:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const owner = async (req, res) => {
    try {
        if (req.user.role !== 'center_owner' && req.user.role !== 'platform_admin') {
            return res.status(403).json({ success: false, message: 'Access Denied: Owner role required' });
        }
        const result = await getOwnerDashboardMetrics(req.user.id);
        const metrics = result.data;

        res.json({
            success: true,
            data: {
                stats: {
                    activeStaffCount: metrics.active_staff,
                    totalAppsCount: metrics.applications.today + metrics.applications.pending + metrics.applications.completed,
                    revenueCollected: metrics.revenue.month.total_revenue,
                    pendingPaymentsCount: metrics.verification_queue_length
                },
                ...metrics
            },
            cached_at: result.cached_at
        });
    } catch (error) {
        console.error('Error loading owner dashboard:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const manager = async (req, res) => {
    try {
        if (req.user.role !== 'manager' && req.user.role !== 'platform_admin') {
            return res.status(403).json({ success: false, message: 'Access Denied: Manager role required' });
        }
        const result = await getManagerDashboardMetrics(req.user.id);
        const metrics = result.data;

        res.json({
            success: true,
            data: {
                stats: {
                    staffCount: metrics.applications.assigned_total,
                    unassignedApps: metrics.applications.assigned_total - metrics.applications.completed,
                    pendingReviewsCount: metrics.pending_document_reviews,
                    slaBreachCount: metrics.rejected_documents_count
                },
                ...metrics
            },
            cached_at: result.cached_at
        });
    } catch (error) {
        console.error('Error loading manager dashboard:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const staff = async (req, res) => {
    try {
        if (req.user.role !== 'staff' && req.user.role !== 'platform_admin') {
            return res.status(403).json({ success: false, message: 'Access Denied: Staff role required' });
        }
        const result = await getStaffDashboardMetrics(req.user.id);
        const metrics = result.data;

        res.json({
            success: true,
            data: {
                stats: {
                    assignedCount: metrics.assigned_applications,
                    draftsCount: metrics.pending_applications,
                    awaitingUploads: metrics.pending_applications,
                    activeAlerts: metrics.today_activity_timeline.length
                },
                ...metrics
            },
            cached_at: result.cached_at
        });
    } catch (error) {
        console.error('Error loading staff dashboard:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const audit = async (req, res) => {
    try {
        const result = await getAuditDashboardMetrics(req.user.id);
        res.json({ success: true, audit: result });
    } catch (error) {
        console.error('Error loading audit dashboard:', error);
        const code = error.message.includes('Access Denied') ? 403 : 500;
        res.status(code).json({ success: false, message: error.message });
    }
};

const applicationTrends = async (req, res) => {
    try {
        const result = await getApplicationTrendMetrics(req.user.id);
        res.json({ success: true, trends: result });
    } catch (error) {
        console.error('Error loading application trends:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const revenueTrends = async (req, res) => {
    try {
        const result = await getRevenueTrendMetrics(req.user.id);
        res.json({ success: true, trends: result });
    } catch (error) {
        console.error('Error loading revenue trends:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    admin,
    owner,
    manager,
    staff,
    audit,
    applicationTrends,
    revenueTrends
};
