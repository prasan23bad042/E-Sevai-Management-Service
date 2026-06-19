const {
    createInvitation,
    getInvitations,
    cancelInvitation,
    acceptInvitation
} = require('../services/invitationService');

/**
 * Creates a new invitation for a center.
 */
const create = async (
    req,
    res
) => {
    try {
        const { centerId } = req.params;
        const { email, inviteType, phone } = req.body;

        if (!email || !inviteType) {
            return res.status(400).json({
                success: false,
                message: 'Email and inviteType are required'
            });
        }

        const invitation = await createInvitation(
            centerId,
            req.user.id,
            { email, inviteType, phone }
        );

        res.status(201).json({
            success: true,
            message: 'Invitation created successfully',
            data: invitation
        });

    } catch (error) {
        console.error('Error creating invitation:', error);

        const status = error.message.includes('Access Denied') ? 403 : 400;
        res.status(status).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Lists all invitations for a center.
 */
const list = async (
    req,
    res
) => {
    try {
        const { centerId } = req.params;
        const { status } = req.query;

        const invitations = await getInvitations(
            centerId,
            req.user.id,
            status
        );

        res.json({
            success: true,
            data: invitations
        });

    } catch (error) {
        console.error('Error listing invitations:', error);

        const status = error.message.includes('Access Denied') ? 403 : 500;
        res.status(status).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Cancels a pending invitation.
 */
const cancel = async (
    req,
    res
) => {
    try {
        const { invitationId } = req.params;

        const invitation = await cancelInvitation(
            invitationId,
            req.user.id
        );

        res.json({
            success: true,
            message: 'Invitation cancelled successfully',
            data: invitation
        });

    } catch (error) {
        console.error('Error cancelling invitation:', error);

        const status = error.message.includes('Access Denied') ? 403 : 400;
        res.status(status).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Accepts an invitation and registers a new manager/staff user.
 */
const accept = async (
    req,
    res
) => {
    try {
        const { token, fullName, password } = req.body;

        if (!token || !fullName || !password) {
            return res.status(400).json({
                success: false,
                message: 'Token, fullName, and password are required'
            });
        }

        const result = await acceptInvitation(
            token,
            fullName,
            password
        );

        res.json({
            success: true,
            message: 'Invitation accepted successfully. User registered.',
            data: result
        });

    } catch (error) {
        console.error('Error accepting invitation:', error);

        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    create,
    list,
    cancel,
    accept
};