const supabase = require('../config/supabase');
const notificationService = require('./notificationService');

/**
 * Helper to check application role-based access.
 * Platform Admin: Full access
 * Center Owner / Manager: Applications under their center
 * Staff: Applications assigned to them
 */
const checkApplicationAccess = async (applicationId, userId) => {
    try {
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('role')
            .eq('id', userId)
            .single();

        if (userError || !user) {
            return { authorized: false, role: null };
        }

        const userRole = user.role;
        if (userRole === 'platform_admin') {
            return { authorized: true, role: userRole };
        }

        // Fetch application details to check center and assignment
        const { data: app, error: appError } = await supabase
            .from('applications')
            .select('center_id, assigned_staff_id')
            .eq('id', applicationId)
            .single();

        if (appError || !app) {
            return { authorized: false, role: userRole };
        }

        if (userRole === 'center_owner') {
            // Check if user owns the center
            const { data: center } = await supabase
                .from('centers')
                .select('owner_id')
                .eq('id', app.center_id)
                .single();

            if (center && center.owner_id === userId) {
                return { authorized: true, role: userRole };
            }
        }

        if (userRole === 'manager') {
            // Check if user is a manager in the center
            const { data: staff } = await supabase
                .from('center_staff')
                .select('role, is_active')
                .eq('center_id', app.center_id)
                .eq('user_id', userId)
                .eq('is_active', true)
                .single();

            if (staff && staff.role === 'manager') {
                return { authorized: true, role: userRole };
            }
        }

        if (userRole === 'staff') {
            // Staff can only view their own assigned applications
            if (app.assigned_staff_id === userId) {
                return { authorized: true, role: userRole };
            }
        }

        return { authorized: false, role: userRole };
    } catch (err) {
        console.error('Error checking application access:', err);
        return { authorized: false, role: null };
    }
};

/**
 * Helper to log activity.
 */
const logActivity = async (userId, action, entityId, details = {}) => {
    try {
        await supabase
            .from('activity_logs')
            .insert({
                user_id: userId,
                action,
                entity_type: 'application',
                entity_id: entityId,
                details
            });
    } catch (err) {
        console.error('Failed to write activity log:', err.message);
    }
};

/**
 * Trigger notification hook.
 */
const triggerNotification = async (userId, action, applicationNumber, details = {}) => {
    try {
        await notificationService.createNotification(userId, {
            type: `Application ${action}`,
            title: `Application ${action}`,
            message: `Application ${applicationNumber} has been ${action.toLowerCase()}. Details: ${details.message || ''}`,
            category: 'application',
            referenceType: 'application',
            referenceId: details.applicationId || null
        });
    } catch (err) {
        console.error('Failed to create notification record:', err.message);
    }
};

/**
 * State Transition Guard validation.
 */
const VALID_TRANSITIONS = {
    draft: ['submitted', 'cancelled'],
    submitted: ['documents_pending', 'under_verification', 'in_progress', 'cancelled'],
    documents_pending: ['submitted', 'under_verification', 'cancelled'],
    under_verification: ['in_progress', 'approved', 'rejected', 'cancelled'],
    in_progress: ['approved', 'rejected', 'completed', 'cancelled'],
    approved: ['completed', 'cancelled'],
    rejected: ['under_verification', 'cancelled'],
    completed: [],
    cancelled: []
};

const validateStatusTransition = (currentStatus, newStatus) => {
    const allowed = VALID_TRANSITIONS[currentStatus] || [];
    return allowed.includes(newStatus);
};

/**
 * Create a new application.
 */
const createApplication = async (userId, applicationData) => {
    const {
        service_id,
        center_id,
        customer_id,
        customer_name,
        customer_phone,
        customer_email,
        customer_address,
        remarks
    } = applicationData;

    // 1. Fetch Service Catalog Details for SLA and Snapshot
    const { data: service, error: serviceError } = await supabase
        .from('services')
        .select('*')
        .eq('id', service_id)
        .single();

    if (serviceError || !service) {
        throw new Error('Selected service not found in catalog');
    }

    if (!service.is_active) {
        throw new Error('Selected service is currently inactive and cannot accept new applications');
    }

    // 2. Generate APP-YYYY-000001 sequential number
    const currentYear = new Date().getFullYear();
    const startDate = `${currentYear}-01-01T00:00:00.000Z`;
    const endDate = `${currentYear + 1}-01-01T00:00:00.000Z`;

    const { count, error: countError } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate)
        .lt('created_at', endDate);

    if (countError) throw countError;
    const nextSeq = (count || 0) + 1;
    const applicationNumber = `APP-${currentYear}-${String(nextSeq).padStart(6, '0')}`;

    // 3. Document checklist mapping
    const checklist = (service.required_documents || []).map(doc => ({
        document_name: doc.name,
        mandatory: doc.mandatory || false,
        status: 'pending',
        document_id: null
    }));

    // 4. Calculate SLA due date
    const submittedAt = new Date();
    const slaDays = parseInt(service.sla_days) || 15;
    const dueDate = new Date(submittedAt.getTime() + slaDays * 24 * 60 * 60 * 1000);

    // 5. Create service snapshot
    const serviceSnapshot = {
        service_name: service.service_name,
        service_category: service.service_category,
        government_fee: service.government_fee,
        service_charge: service.service_charge,
        total_fee: service.total_fee,
        estimated_processing_days: service.estimated_processing_days,
        sla_days: service.sla_days
    };

    // 6. Insert Application
    const { data, error } = await supabase
        .from('applications')
        .insert({
            application_number: applicationNumber,
            center_id,
            service_id,
            customer_id: customer_id || null,
            customer_name,
            customer_phone,
            customer_email,
            customer_address,
            status: 'submitted',
            remarks: remarks || null,
            service_snapshot: serviceSnapshot,
            document_checklist: checklist,
            due_date: dueDate.toISOString(),
            submitted_at: submittedAt.toISOString()
        })
        .select()
        .single();

    if (error) throw error;

    // 7. Audit log & notifications
    await logActivity(userId, 'Application Created', data.id, { application_number: applicationNumber });
    await triggerNotification(userId, 'Created', applicationNumber, { message: 'Your application has been received.', applicationId: data.id });

    return data;
};

/**
 * Fetch paginated list of applications with role checks and filters.
 */
const getApplications = async (userId, filters = {}, pagination = {}) => {
    // Determine user role and center scope
    const { data: user } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

    const role = user?.role;

    const page = parseInt(pagination.page) || 1;
    const limit = parseInt(pagination.limit) || 10;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
        .from('applications')
        .select('*, services(service_name), centers(name)', { count: 'exact' });

    // Scope rules
    if (role === 'staff') {
        // Staff see assigned only
        query = query.eq('assigned_staff_id', userId);
    } else if (role === 'center_owner' || role === 'manager') {
        // Owners/managers see their center only
        let centerId = null;
        if (role === 'center_owner') {
            const { data: center } = await supabase
                .from('centers')
                .select('id')
                .eq('owner_id', userId)
                .limit(1)
                .maybeSingle();
            centerId = center?.id;
        } else {
            const { data: staff } = await supabase
                .from('center_staff')
                .select('center_id')
                .eq('user_id', userId)
                .eq('is_active', true)
                .limit(1)
                .maybeSingle();
            centerId = staff?.center_id;
        }

        if (centerId) {
            query = query.eq('center_id', centerId);
        } else {
            // No center mapped, yield empty
            return { applications: [], total: 0, page, limit, pages: 0 };
        }
    }

    // Apply query filters
    if (filters.status) {
        query = query.eq('status', filters.status);
    }
    if (filters.service) {
        query = query.eq('service_id', filters.service);
    }
    if (filters.staff) {
        query = query.eq('assigned_staff_id', filters.staff);
    }
    if (filters.center && role === 'platform_admin') {
        // Only admins can override center filters
        query = query.eq('center_id', filters.center);
    }
    if (filters.date_start) {
        query = query.gte('submitted_at', filters.date_start);
    }
    if (filters.date_end) {
        query = query.lte('submitted_at', filters.date_end);
    }

    // Search query
    if (filters.search) {
        query = query.or(`application_number.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%,customer_email.ilike.%${filters.search}%,customer_phone.ilike.%${filters.search}%`);
    }

    const { data, count, error } = await query
        .order('submitted_at', { ascending: false })
        .range(from, to);

    if (error) throw error;

    const total = count || 0;
    const pages = Math.ceil(total / limit);

    return {
        applications: data || [],
        total,
        page,
        limit,
        pages
    };
};

/**
 * Gets details of a specific application.
 */
const getApplicationById = async (applicationId, userId) => {
    const { authorized } = await checkApplicationAccess(applicationId, userId);
    if (!authorized) {
        throw new Error('Access Denied: You do not have permission to view this application');
    }

    // Fetch application, service profile, and assigned staff profile
    const { data: app, error: appError } = await supabase
        .from('applications')
        .select(`
            *,
            services (
                id,
                service_code,
                service_name,
                service_category
            ),
            assigned_staff:users!applications_assigned_staff_id_fkey (
                id,
                email,
                full_name,
                name
            )
        `)
        .eq('id', applicationId)
        .single();

    if (appError || !app) {
        throw new Error('Application not found');
    }

    // Fetch documents
    const { data: documents } = await supabase
        .from('documents')
        .select('*')
        .eq('application_id', applicationId);

    // Fetch timeline audit logs
    const { data: timeline } = await supabase
        .from('activity_logs')
        .select('id, action, created_at, details, users(full_name, name)')
        .eq('entity_type', 'application')
        .eq('entity_id', applicationId)
        .order('created_at', { ascending: true });

    return {
        application: app,
        service: app.services,
        assigned_staff: app.assigned_staff,
        uploaded_documents: documents || [],
        timeline: timeline || []
    };
};

/**
 * Assigns staff to an application.
 */
const assignStaffMember = async (applicationId, assignedStaffId, performingUserId) => {
    const { data: app, error: appError } = await supabase
        .from('applications')
        .select('id, application_number, center_id, assigned_staff_id')
        .eq('id', applicationId)
        .single();

    if (appError || !app) {
        throw new Error('Application not found');
    }

    // Only manager, owner, or admin can assign
    const { data: performingUser } = await supabase
        .from('users')
        .select('role')
        .eq('id', performingUserId)
        .single();

    const role = performingUser?.role;
    if (role !== 'platform_admin') {
        if (role === 'center_owner') {
            const { data: center } = await supabase
                .from('centers')
                .select('owner_id')
                .eq('id', app.center_id)
                .single();
            if (!center || center.owner_id !== performingUserId) {
                throw new Error('Access Denied: You do not own the center for this application');
            }
        } else if (role === 'manager') {
            const { data: staff } = await supabase
                .from('center_staff')
                .select('role, is_active')
                .eq('center_id', app.center_id)
                .eq('user_id', performingUserId)
                .eq('is_active', true)
                .single();
            if (!staff || staff.role !== 'manager') {
                throw new Error('Access Denied: You are not a manager for this center');
            }
        } else {
            throw new Error('Access Denied: Only managers, owners, and admins can assign staff');
        }
    }

    // Verify target staff is active in the same center
    if (assignedStaffId) {
        const { data: targetStaff, error: targetStaffError } = await supabase
            .from('center_staff')
            .select('role, is_active')
            .eq('center_id', app.center_id)
            .eq('user_id', assignedStaffId)
            .eq('is_active', true)
            .single();

        if (targetStaffError || !targetStaff) {
            throw new Error('Target staff member is not active or does not belong to this center');
        }
    }

    const previousStaffId = app.assigned_staff_id;

    const { data, error } = await supabase
        .from('applications')
        .update({
            assigned_staff_id: assignedStaffId || null,
            updated_at: new Date().toISOString()
        })
        .eq('id', applicationId)
        .select()
        .single();

    if (error) throw error;

    // Log assignment or reassignment
    if (previousStaffId) {
        await logActivity(performingUserId, 'Staff Reassigned', applicationId, {
            previous_staff_id: previousStaffId,
            new_staff_id: assignedStaffId,
            application_number: app.application_number
        });
    } else {
        await logActivity(performingUserId, 'Staff Assigned', applicationId, {
            assigned_staff_id: assignedStaffId,
            application_number: app.application_number
        });
    }

    if (assignedStaffId) {
        await triggerNotification(assignedStaffId, 'Assigned', app.application_number, {
            message: 'You have been assigned a new application for processing.',
            applicationId: applicationId
        });
    }

    return data;
};

/**
 * Updates application processing status.
 */
const updateApplicationStatus = async (applicationId, newStatus, rejectionReason, performingUserId) => {
    const { data: app, error: appError } = await supabase
        .from('applications')
        .select('*')
        .eq('id', applicationId)
        .single();

    if (appError || !app) {
        throw new Error('Application not found');
    }

    // Validate access
    const { authorized, role } = await checkApplicationAccess(applicationId, performingUserId);
    if (!authorized) {
        throw new Error('Access Denied: You do not have permissions to update status of this application');
    }

    // Check status transition
    const isValid = validateStatusTransition(app.status, newStatus);
    if (!isValid) {
        throw new Error(`Invalid status transition from "${app.status}" to "${newStatus}"`);
    }

    // Validation for rejection reason
    if (newStatus === 'rejected' && !rejectionReason) {
        throw new Error('rejection_reason is required when rejecting an application');
    }

    const updatePayload = {
        status: newStatus,
        updated_at: new Date().toISOString()
    };

    if (newStatus === 'approved') {
        updatePayload.approved_at = new Date().toISOString();
    } else if (newStatus === 'rejected') {
        updatePayload.rejected_at = new Date().toISOString();
        updatePayload.rejection_reason = rejectionReason;
    } else if (newStatus === 'completed') {
        updatePayload.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
        .from('applications')
        .update(updatePayload)
        .eq('id', applicationId)
        .select()
        .single();

    if (error) throw error;

    // Log status transition and notify
    await logActivity(performingUserId, 'Status Changed', applicationId, {
        from: app.status,
        to: newStatus,
        rejection_reason: rejectionReason || null,
        application_number: app.application_number
    });

    await triggerNotification(performingUserId, newStatus.toUpperCase(), app.application_number, {
        message: `Status updated to ${newStatus}.`,
        applicationId: applicationId
    });

    return data;
};

/**
 * Adds remarks.
 */
const addApplicationRemarks = async (applicationId, remarksText, performingUserId) => {
    const { data: app, error: appError } = await supabase
        .from('applications')
        .select('id, application_number, remarks')
        .eq('id', applicationId)
        .single();

    if (appError || !app) {
        throw new Error('Application not found');
    }

    // Validate access
    const { authorized } = await checkApplicationAccess(applicationId, performingUserId);
    if (!authorized) {
        throw new Error('Access Denied: You do not have permissions to add remarks to this application');
    }

    // Update the remarks field
    const { data, error } = await supabase
        .from('applications')
        .update({
            remarks: remarksText,
            updated_at: new Date().toISOString()
        })
        .eq('id', applicationId)
        .select()
        .single();

    if (error) throw error;

    // Add activity log to preserve comments history
    await logActivity(performingUserId, 'Remark Added', applicationId, {
        remarks: remarksText,
        application_number: app.application_number
    });

    return data;
};

/**
 * Resolves the timeline events list.
 */
const getApplicationTimeline = async (applicationId, userId) => {
    const { authorized } = await checkApplicationAccess(applicationId, userId);
    if (!authorized) {
        throw new Error('Access Denied: You do not have permission to view this timeline');
    }

    const { data, error } = await supabase
        .from('activity_logs')
        .select(`
            id,
            action,
            created_at,
            details,
            users (
                id,
                email,
                full_name,
                name
            )
        `)
        .eq('entity_type', 'application')
        .eq('entity_id', applicationId)
        .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
};

/**
 * Computes status dashboard metrics.
 */
const getApplicationDashboardCounters = async (userId) => {
    const { data: user, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

    if (userError || !user) {
        throw new Error('User not found');
    }

    const role = user.role;

    // Build the scoping parameters
    let centerId = null;
    if (role === 'center_owner') {
        const { data: center } = await supabase
            .from('centers')
            .select('id')
            .eq('owner_id', userId)
            .limit(1)
            .maybeSingle();
        centerId = center?.id;
    } else if (role === 'manager' || role === 'staff') {
        const { data: staff } = await supabase
            .from('center_staff')
            .select('center_id')
            .eq('user_id', userId)
            .eq('is_active', true)
            .limit(1)
            .maybeSingle();
        centerId = staff?.center_id;
    }

    // Date calculations for "Today"
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const getCounts = async (statusFilter = null, onlyToday = false) => {
        let query = supabase.from('applications').select('*', { count: 'exact', head: true });

        // Scoping
        if (role === 'staff') {
            query = query.eq('assigned_staff_id', userId);
        } else if (role === 'center_owner' || role === 'manager') {
            if (centerId) {
                query = query.eq('center_id', centerId);
            } else {
                return 0; // Unmapped owner/manager returns 0
            }
        }

        if (statusFilter) {
            query = query.eq('status', statusFilter);
        }
        if (onlyToday) {
            query = query.gte('submitted_at', todayStart.toISOString());
        }

        const { count, error } = await query;
        if (error) throw error;
        return count || 0;
    };

    // Calculate Pending (submitted, documents_pending, under_verification)
    const submittedCount = await getCounts('submitted');
    const docPendingCount = await getCounts('documents_pending');
    const underVerificationCount = await getCounts('under_verification');
    const pendingSum = submittedCount + docPendingCount + underVerificationCount;

    const inProgressSum = await getCounts('in_progress');
    const approvedSum = await getCounts('approved');
    const rejectedSum = await getCounts('rejected');
    const completedSum = await getCounts('completed');
    const todaySum = await getCounts(null, true);

    return {
        pending: pendingSum,
        inProgress: inProgressSum,
        approved: approvedSum,
        rejected: rejectedSum,
        completed: completedSum,
        today: todaySum
    };
};

module.exports = {
    createApplication,
    getApplications,
    getApplicationById,
    assignStaffMember,
    updateApplicationStatus,
    addApplicationRemarks,
    getApplicationTimeline,
    getApplicationDashboardCounters
};
