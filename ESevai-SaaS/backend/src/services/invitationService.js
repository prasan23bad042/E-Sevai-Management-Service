const supabase = require('../config/supabase');
const crypto = require('crypto');
const notificationService = require('./notificationService');

/**
 * Verifies if the current user has admin/owner/manager access to a specific center.
 * @param {string} centerId - ID of the center
 * @param {string} userId - ID of the user requesting access
 * @returns {boolean} - true if authorized, false otherwise
 */
const checkCenterAccess = async (centerId, userId) => {
    try {
        // 1. Check if the user is a platform admin
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('role')
            .eq('id', userId)
            .single();

        if (user && user.role === 'platform_admin') {
            return true;
        }

        // 2. Check if the user is the owner of the center
        const { data: center, error: centerError } = await supabase
            .from('centers')
            .select('owner_id')
            .eq('id', centerId)
            .single();

        if (center && center.owner_id === userId) {
            return true;
        }

        // 3. Check if the user is a manager in the center staff
        const { data: staff, error: staffError } = await supabase
            .from('center_staff')
            .select('role, is_active')
            .eq('center_id', centerId)
            .eq('user_id', userId)
            .eq('is_active', true)
            .single();

        if (staff && staff.role === 'manager') {
            return true;
        }

        return false;
    } catch (error) {
        console.error('Error checking center access:', error);
        return false;
    }
};

/**
 * Creates an invitation for a center.
 */
const createInvitation = async (
    centerId,
    invitedBy,
    inviteData
) => {
    const {
        email,
        phone,
        inviteType
    } = inviteData;

    // Check if the user has authorization to invite to this center
    const hasAccess = await checkCenterAccess(centerId, invitedBy);
    if (!hasAccess) {
        throw new Error('Access Denied: You do not have permission to create invitations for this center');
    }

    // Validate invite type
    if (inviteType !== 'manager' && inviteType !== 'staff') {
        throw new Error('Invalid invite type. Must be manager or staff');
    }

    // Prevent duplicate active invitations (status = pending and expires_at > now)
    const nowString = new Date().toISOString();
    
    // Check by email
    const { data: existingEmailInvite, error: emailCheckError } = await supabase
        .from('center_invitations')
        .select('id')
        .eq('center_id', centerId)
        .eq('email', email)
        .eq('status', 'pending')
        .gt('expires_at', nowString);

    if (emailCheckError) throw emailCheckError;
    if (existingEmailInvite && existingEmailInvite.length > 0) {
        throw new Error('An active pending invitation already exists for this email');
    }

    // Check by phone if provided
    if (phone) {
        const { data: existingPhoneInvite, error: phoneCheckError } = await supabase
            .from('center_invitations')
            .select('id')
            .eq('center_id', centerId)
            .eq('phone', phone)
            .eq('status', 'pending')
            .gt('expires_at', nowString);

        if (phoneCheckError) throw phoneCheckError;
        if (existingPhoneInvite && existingPhoneInvite.length > 0) {
            throw new Error('An active pending invitation already exists for this phone number');
        }
    }

    // Token Generation
    const token = crypto.randomBytes(32).toString('hex');

    // 7 days expiry
    const expiresAt = new Date(
        Date.now() +
        7 * 24 * 60 * 60 * 1000
    ).toISOString();

    const {
        data,
        error
    } = await supabase
        .from('center_invitations')
        .insert({
            center_id: centerId,
            invited_by: invitedBy,
            invite_type: inviteType,
            email,
            phone: phone || null,
            invitation_token: token,
            status: 'pending',
            expires_at: expiresAt
        })
        .select()
        .single();

    if (error) {
        throw error;
    }

    // Trigger Notification for the inviter
    try {
        await notificationService.createNotification(invitedBy, {
            type: 'Staff Invitation Sent',
            title: 'Staff Invitation Sent',
            message: `An onboarding invitation (${inviteType}) has been sent to ${email}.`,
            category: 'staff',
            priority: 'low',
            referenceType: 'center',
            referenceId: centerId
        });
    } catch (err) {
        console.error('Failed to create invitation notification:', err.message);
    }

    return data;
};

/**
 * Lists invitations for a center.
 */
const getInvitations = async (
    centerId,
    userId,
    statusFilter = null
) => {
    // Check if the user has authorization to view invitations for this center
    const hasAccess = await checkCenterAccess(centerId, userId);
    if (!hasAccess) {
        throw new Error('Access Denied: You do not have permission to view invitations for this center');
    }

    let query = supabase
        .from('center_invitations')
        .select('*')
        .eq('center_id', centerId);

    if (statusFilter) {
        query = query.eq('status', statusFilter);
    }

    const {
        data,
        error
    } = await query.order('created_at', {
        ascending: false
    });

    if (error) {
        throw error;
    }

    return data;
};

/**
 * Cancels a pending invitation.
 */
const cancelInvitation = async (
    invitationId,
    userId
) => {
    // 1. Fetch invitation
    const { data: invitation, error: getError } = await supabase
        .from('center_invitations')
        .select('*')
        .eq('id', invitationId)
        .single();

    if (getError || !invitation) {
        throw new Error('Invitation not found');
    }

    // 2. Check authorization
    const hasAccess = await checkCenterAccess(invitation.center_id, userId);
    if (!hasAccess) {
        throw new Error('Access Denied: You do not have permission to cancel this invitation');
    }

    // 3. Prevent cancelling accepted invitations
    if (invitation.status === 'accepted') {
        throw new Error('Cannot cancel an already accepted invitation');
    }

    if (invitation.status === 'cancelled') {
        throw new Error('Invitation is already cancelled');
    }

    // 4. Update status
    const { data, error } = await supabase
        .from('center_invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId)
        .select()
        .single();

    if (error) {
        throw error;
    }

    return data;
};

/**
 * Accepts an invitation and registers the user.
 */
const acceptInvitation = async (
    token,
    fullName,
    password
) => {
    // 1. Validate invitation token
    const { data: invitation, error: getError } = await supabase
        .from('center_invitations')
        .select('*')
        .eq('invitation_token', token)
        .single();

    if (getError || !invitation) {
        throw new Error('Invalid or expired invitation token');
    }

    // 2. Check invitation status
    if (invitation.status !== 'pending') {
        throw new Error(`Invitation is already ${invitation.status}`);
    }

    // 3. Check expiry
    if (new Date(invitation.expires_at) < new Date()) {
        await supabase
            .from('center_invitations')
            .update({ status: 'expired' })
            .eq('id', invitation.id);
        throw new Error('Invitation has expired');
    }

    // 4. Create Supabase Auth User
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: invitation.email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName }
    });

    if (authError) {
        throw authError;
    }

    const userId = authData.user.id;

    try {
        // Wait 1 second for the asynchronous DB trigger (if any) to create the user profile
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Create/Update the user record in public.users table
        const { error: userUpdateError } = await supabase
            .from('users')
            .upsert({
                id: userId,
                email: invitation.email,
                full_name: fullName,
                name: fullName, // support both naming conventions in schema
                role: invitation.invite_type
            });

        if (userUpdateError) throw userUpdateError;

        // Get the role ID for role assignment
        const { data: roleData, error: roleError } = await supabase
            .from('roles')
            .select('id')
            .eq('role_name', invitation.invite_type)
            .single();

        if (roleError) throw roleError;

        // Assign role in user_roles
        const { error: userRoleError } = await supabase
            .from('user_roles')
            .insert({
                user_id: userId,
                role_id: roleData.id
            });

        if (userRoleError) throw userRoleError;

        // Insert into center_staff table
        const { error: staffError } = await supabase
            .from('center_staff')
            .insert({
                center_id: invitation.center_id,
                user_id: userId,
                role: invitation.invite_type,
                is_active: true,
                joined_at: new Date().toISOString()
            });

        if (staffError) throw staffError;

        // Update invitation status
        const { error: invitationUpdateError } = await supabase
            .from('center_invitations')
            .update({
                status: 'accepted',
                accepted_at: new Date().toISOString()
            })
            .eq('id', invitation.id);

        if (invitationUpdateError) throw invitationUpdateError;

        return {
            success: true,
            userId,
            email: invitation.email,
            role: invitation.invite_type,
            centerId: invitation.center_id
        };

    } catch (dbError) {
        // Rollback auth user creation if DB insert fails to prevent orphaned Auth users
        console.error('Accept invitation database updates failed. Performing auth rollback...', dbError);
        await supabase.auth.admin.deleteUser(userId);
        throw dbError;
    }
};

module.exports = {
    createInvitation,
    getInvitations,
    cancelInvitation,
    acceptInvitation
};