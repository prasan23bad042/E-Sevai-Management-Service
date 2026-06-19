const supabase = require('../config/supabase');

/**
 * Validates center owner/manager/admin access permissions.
 * @param {string} centerId - The ID of the center.
 * @param {string} userId - The ID of the user requesting access.
 * @param {Array<string>} permittedRoles - The list of roles permitted for this access check.
 * @returns {Object} - { authorized: boolean, role: string }
 */
const checkAccess = async (centerId, userId, permittedRoles = ['platform_admin', 'center_owner', 'manager']) => {
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

        if (!permittedRoles.includes(userRole)) {
            return { authorized: false, role: userRole };
        }

        if (userRole === 'center_owner') {
            const { data: center, error: centerError } = await supabase
                .from('centers')
                .select('owner_id')
                .eq('id', centerId)
                .single();

            if (center && center.owner_id === userId) {
                return { authorized: true, role: userRole };
            }
        }

        if (userRole === 'manager') {
            const { data: staff, error: staffError } = await supabase
                .from('center_staff')
                .select('role, is_active')
                .eq('center_id', centerId)
                .eq('user_id', userId)
                .eq('is_active', true)
                .single();

            if (staff && staff.role === 'manager') {
                return { authorized: true, role: userRole };
            }
        }

        return { authorized: false, role: userRole };
    } catch (error) {
        console.error('Error checking staff permission access:', error);
        return { authorized: false, role: null };
    }
};

/**
 * Finds the center ID associated with a staff member.
 */
const getStaffCenterId = async (staffId) => {
    const { data, error } = await supabase
        .from('center_staff')
        .select('center_id')
        .eq('user_id', staffId)
        .limit(1)
        .single();

    if (error || !data) {
        throw new Error('Staff member not found in center directory');
    }

    return data.center_id;
};

/**
 * Returns all staff and managers for a center.
 */
const getStaffByCenter = async (centerId, performingUserId, filters = {}) => {
    const { authorized } = await checkAccess(centerId, performingUserId, ['platform_admin', 'center_owner', 'manager']);
    if (!authorized) {
        throw new Error('Access Denied: You do not have permission to view staff for this center');
    }

    let query = supabase
        .from('center_staff')
        .select(`
            user_id,
            role,
            is_active,
            joined_at,
            users (
                full_name,
                name,
                email
            )
        `)
        .eq('center_id', centerId);

    // Filter by active status
    if (filters.status === 'active') {
        query = query.eq('is_active', true);
    }

    // Filter by role type
    if (filters.role === 'manager') {
        query = query.eq('role', 'manager');
    } else if (filters.role === 'staff') {
        query = query.eq('role', 'staff');
    }

    const { data, error } = await query.order('joined_at', { ascending: false });

    if (error) {
        throw error;
    }

    return data.map(item => ({
        user_id: item.user_id,
        full_name: item.users?.full_name || item.users?.name || 'N/A',
        email: item.users?.email || 'N/A',
        role: item.role,
        is_active: item.is_active,
        joined_at: item.joined_at
    }));
};

/**
 * Returns detailed staff information.
 */
const getStaffDetails = async (staffId, performingUserId) => {
    const { data: staff, error: staffError } = await supabase
        .from('center_staff')
        .select(`
            user_id,
            role,
            is_active,
            joined_at,
            users (
                full_name,
                name,
                email
            ),
            centers (
                id,
                center_code,
                name,
                district,
                state
            )
        `)
        .eq('user_id', staffId)
        .single();

    if (staffError || !staff) {
        throw new Error('Staff member not found');
    }

    // Authorization checks
    // 1. Staff can view their own profile
    if (performingUserId === staffId) {
        // Authorized
    } else {
        // 2. Center owners and managers of that center can view
        const { authorized } = await checkAccess(staff.centers.id, performingUserId, ['platform_admin', 'center_owner', 'manager']);
        if (!authorized) {
            throw new Error('Access Denied: You do not have permission to view this staff member details');
        }
    }

    return {
        user_profile: {
            user_id: staff.user_id,
            full_name: staff.users?.full_name || staff.users?.name || 'N/A',
            email: staff.users?.email || 'N/A'
        },
        center_information: staff.centers,
        role: staff.role,
        active_status: staff.is_active,
        joined_date: staff.joined_at
    };
};

/**
 * Soft deactivates center staff member.
 */
const deactivateStaffMember = async (staffId, performingUserId) => {
    const centerId = await getStaffCenterId(staffId);

    // Only owner or admin can deactivate
    const { authorized } = await checkAccess(centerId, performingUserId, ['platform_admin', 'center_owner']);
    if (!authorized) {
        throw new Error('Access Denied: Only center owners or platform admins can deactivate staff');
    }

    // Cannot deactivate center owner
    const { data: center } = await supabase
        .from('centers')
        .select('owner_id')
        .eq('id', centerId)
        .single();

    if (center && center.owner_id === staffId) {
        throw new Error('Cannot deactivate the center owner');
    }

    const { data, error } = await supabase
        .from('center_staff')
        .update({ is_active: false })
        .eq('user_id', staffId)
        .select()
        .single();

    if (error) {
        throw error;
    }

    return data;
};

/**
 * Reactivates center staff member.
 */
const reactivateStaffMember = async (staffId, performingUserId) => {
    const centerId = await getStaffCenterId(staffId);

    // Only owner or admin can reactivate
    const { authorized } = await checkAccess(centerId, performingUserId, ['platform_admin', 'center_owner']);
    if (!authorized) {
        throw new Error('Access Denied: Only center owners or platform admins can reactivate staff');
    }

    const { data, error } = await supabase
        .from('center_staff')
        .update({ is_active: true })
        .eq('user_id', staffId)
        .select()
        .single();

    if (error) {
        throw error;
    }

    return data;
};

/**
 * Promotes staff to manager.
 */
const promoteStaffMember = async (staffId, performingUserId) => {
    const centerId = await getStaffCenterId(staffId);

    // Only owner or admin can promote
    const { authorized } = await checkAccess(centerId, performingUserId, ['platform_admin', 'center_owner']);
    if (!authorized) {
        throw new Error('Access Denied: Only center owners or platform admins can promote staff');
    }

    // 1. Update center_staff table role
    const { error: staffError } = await supabase
        .from('center_staff')
        .update({ role: 'manager' })
        .eq('user_id', staffId);

    if (staffError) throw staffError;

    // 2. Update users table role
    const { error: userError } = await supabase
        .from('users')
        .update({ role: 'manager' })
        .eq('id', staffId);

    if (userError) throw userError;

    // 3. Update user_roles mapping
    const { data: roleData } = await supabase
        .from('roles')
        .select('id')
        .eq('role_name', 'manager')
        .single();

    if (roleData) {
        await supabase
            .from('user_roles')
            .update({ role_id: roleData.id })
            .eq('user_id', staffId);
    }

    return { success: true, staffId, newRole: 'manager' };
};

/**
 * Demotes manager to staff.
 */
const demoteStaffMember = async (staffId, performingUserId) => {
    const centerId = await getStaffCenterId(staffId);

    // Only owner or admin can demote
    const { authorized } = await checkAccess(centerId, performingUserId, ['platform_admin', 'center_owner']);
    if (!authorized) {
        throw new Error('Access Denied: Only center owners or platform admins can demote staff');
    }

    // 1. Update center_staff table role
    const { error: staffError } = await supabase
        .from('center_staff')
        .update({ role: 'staff' })
        .eq('user_id', staffId);

    if (staffError) throw staffError;

    // 2. Update users table role
    const { error: userError } = await supabase
        .from('users')
        .update({ role: 'staff' })
        .eq('id', staffId);

    if (userError) throw userError;

    // 3. Update user_roles mapping
    const { data: roleData } = await supabase
        .from('roles')
        .select('id')
        .eq('role_name', 'staff')
        .single();

    if (roleData) {
        await supabase
            .from('user_roles')
            .update({ role_id: roleData.id })
            .eq('user_id', staffId);
    }

    return { success: true, staffId, newRole: 'staff' };
};

/**
 * Returns dashboard metrics for staff.
 */
const getStaffDashboardMetrics = async (performingUserId) => {
    const { data: user, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', performingUserId)
        .single();

    if (userError || !user) {
        throw new Error('User account not found');
    }

    const role = user.role;

    // Resolve centerId for owners and managers
    let centerId = null;
    if (role === 'center_owner') {
        const { data: center } = await supabase
            .from('centers')
            .select('id')
            .eq('owner_id', performingUserId)
            .limit(1)
            .maybeSingle();
        centerId = center?.id;
    } else if (role === 'manager' || role === 'staff') {
        const { data: staff } = await supabase
            .from('center_staff')
            .select('center_id')
            .eq('user_id', performingUserId)
            .eq('is_active', true)
            .limit(1)
            .maybeSingle();
        centerId = staff?.center_id;
    }

    let assignedCount = 0;
    let completedCount = 0;
    let pendingCount = 0;

    try {
        if (role === 'platform_admin') {
            const { count: assigned } = await supabase
                .from('applications')
                .select('*', { count: 'exact', head: true });
            
            const { count: completed } = await supabase
                .from('applications')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'completed');

            const { count: pending } = await supabase
                .from('applications')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending');

            assignedCount = assigned || 0;
            completedCount = completed || 0;
            pendingCount = pending || 0;

        } else if (role === 'center_owner' || role === 'manager') {
            if (centerId) {
                const { count: assigned } = await supabase
                    .from('applications')
                    .select('*', { count: 'exact', head: true })
                    .eq('center_id', centerId);
                
                const { count: completed } = await supabase
                    .from('applications')
                    .select('*', { count: 'exact', head: true })
                    .eq('center_id', centerId)
                    .eq('status', 'completed');

                const { count: pending } = await supabase
                    .from('applications')
                    .select('*', { count: 'exact', head: true })
                    .eq('center_id', centerId)
                    .eq('status', 'pending');

                assignedCount = assigned || 0;
                completedCount = completed || 0;
                pendingCount = pending || 0;
            }
        } else if (role === 'staff') {
            const { count: assigned } = await supabase
                .from('applications')
                .select('*', { count: 'exact', head: true })
                .eq('assigned_to', performingUserId);
            
            const { count: completed } = await supabase
                .from('applications')
                .select('*', { count: 'exact', head: true })
                .eq('assigned_to', performingUserId)
                .eq('status', 'completed');

            const { count: pending } = await supabase
                .from('applications')
                .select('*', { count: 'exact', head: true })
                .eq('assigned_to', performingUserId)
                .eq('status', 'pending');

            assignedCount = assigned || 0;
            completedCount = completed || 0;
            pendingCount = pending || 0;
        }
    } catch (err) {
        console.warn('Resilient fallback query: Applications table/columns may not be fully initialized yet.', err.message);
        // Default values (0) will be returned
    }

    return {
        assignedApplicationsCount: assignedCount,
        completedApplicationsCount: completedCount,
        pendingApplicationsCount: pendingCount
    };
};

module.exports = {
    getStaffByCenter,
    getStaffDetails,
    deactivateStaffMember,
    reactivateStaffMember,
    promoteStaffMember,
    demoteStaffMember,
    getStaffDashboardMetrics
};
