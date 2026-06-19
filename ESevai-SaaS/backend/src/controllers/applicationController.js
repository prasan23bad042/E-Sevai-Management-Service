const {
    createApplication,
    getApplications,
    getApplicationById,
    assignStaffMember,
    updateApplicationStatus,
    addApplicationRemarks,
    getApplicationTimeline,
    getApplicationDashboardCounters
} = require('../services/applicationService');

/**
 * Creates a new application.
 */
const create = async (req, res) => {
    try {
        const {
            service_id,
            center_id,
            customer_id,
            customer_name,
            customer_phone,
            customer_email,
            customer_address,
            remarks
        } = req.body;

        if (!service_id || !center_id || !customer_name || !customer_phone) {
            return res.status(400).json({
                success: false,
                message: 'service_id, center_id, customer_name, and customer_phone are required'
            });
        }

        const application = await createApplication(req.user.id, {
            service_id,
            center_id,
            customer_id,
            customer_name,
            customer_phone,
            customer_email,
            customer_address,
            remarks
        });

        res.status(201).json({
            success: true,
            message: 'Application created and submitted successfully',
            data: application
        });
    } catch (error) {
        console.error('Error creating application:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Lists applications based on filters and pagination queries.
 */
const list = async (req, res) => {
    try {
        const {
            status,
            service,
            staff,
            date_start,
            date_end,
            center,
            search,
            page,
            limit
        } = req.query;

        const result = await getApplications(
            req.user.id,
            { status, service, staff, date_start, date_end, center, search },
            { page, limit }
        );

        res.json({
            success: true,
            data: result.applications
        });
    } catch (error) {
        console.error('Error listing applications:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Fetches details of a single application.
 */
const details = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await getApplicationById(id, req.user.id);

        res.json({
            success: true,
            data: {
                application: result.application,
                service: result.service,
                assigned_staff: result.assigned_staff,
                uploaded_documents: result.uploaded_documents,
                timeline: result.timeline,
                checklist: result.application.document_checklist || [],
                activityLogs: (result.timeline || []).map(t => ({
                    id: t.id,
                    action: t.action,
                    performed_by_name: t.users?.full_name || t.users?.name || 'System',
                    notes: t.details?.message || t.details?.notes || '',
                    created_at: t.created_at
                }))
            }
        });
    } catch (error) {
        console.error('Error fetching application details:', error);

        const status = error.message.includes('Access Denied') ? 403 : 404;
        res.status(status).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Assigns staff member to an application.
 */
const assign = async (req, res) => {
    try {
        const { id } = req.params;
        const { assigned_staff_id } = req.body;

        const application = await assignStaffMember(
            id,
            assigned_staff_id,
            req.user.id
        );

        res.json({
            success: true,
            message: 'Staff member assigned successfully',
            data: application
        });
    } catch (error) {
        console.error('Error assigning staff member:', error);

        const status = error.message.includes('Access Denied') ? 403 : 400;
        res.status(status).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Updates application processing status.
 */
const statusUpdate = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, rejection_reason } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'Status is required'
            });
        }

        const application = await updateApplicationStatus(
            id,
            status,
            rejection_reason,
            req.user.id
        );

        res.json({
            success: true,
            message: `Application status updated to ${status} successfully`,
            data: application
        });
    } catch (error) {
        console.error('Error updating status:', error);

        const status = error.message.includes('Access Denied') ? 403 : 400;
        res.status(status).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Appends remarks to application.
 */
const remarksUpdate = async (req, res) => {
    try {
        const { id } = req.params;
        const { remarks } = req.body;

        if (!remarks) {
            return res.status(400).json({
                success: false,
                message: 'remarks is required'
            });
        }

        const application = await addApplicationRemarks(
            id,
            remarks,
            req.user.id
        );

        res.json({
            success: true,
            message: 'Remarks added successfully',
            data: application
        });
    } catch (error) {
        console.error('Error adding remarks:', error);

        const status = error.message.includes('Access Denied') ? 403 : 400;
        res.status(status).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Gets application timeline history logs.
 */
const timeline = async (req, res) => {
    try {
        const { id } = req.params;
        const history = await getApplicationTimeline(id, req.user.id);

        res.json({
            success: true,
            timeline: history
        });
    } catch (error) {
        console.error('Error fetching application timeline:', error);

        const status = error.message.includes('Access Denied') ? 403 : 500;
        res.status(status).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Resolves application counts for the dashboard.
 */
const dashboard = async (req, res) => {
    try {
        const counters = await getApplicationDashboardCounters(req.user.id);

        res.json({
            success: true,
            counters
        });
    } catch (error) {
        console.error('Error loading dashboard counters:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    create,
    list,
    details,
    assign,
    statusUpdate,
    remarksUpdate,
    timeline,
    dashboard
};
