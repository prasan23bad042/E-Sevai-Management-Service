const {
    getStaffByCenter,
    getStaffDetails,
    deactivateStaffMember,
    reactivateStaffMember,
    promoteStaffMember,
    demoteStaffMember,
    getStaffDashboardMetrics
} = require('../services/staffService');

/**
 * Lists center staff based on centerId, with status and role filters.
 */
const listStaff = async (req, res) => {
    try {
        const { centerId } = req.params;
        const { status, role } = req.query;

        const staffList = await getStaffByCenter(
            centerId,
            req.user.id,
            { status, role }
        );

        res.json({
            success: true,
            data: staffList
        });
    } catch (error) {
        console.error('Error in listStaff controller:', error);

        const status = error.message.includes('Access Denied') ? 403 : 400;
        res.status(status).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Gets detailed profile details of a staff member.
 */
const getStaff = async (req, res) => {
    try {
        const { staffId } = req.params;

        const staffDetails = await getStaffDetails(
            staffId,
            req.user.id
        );

        res.json({
            success: true,
            data: staffDetails
        });
    } catch (error) {
        console.error('Error in getStaff controller:', error);

        const status = error.message.includes('Access Denied') ? 403 : 400;
        res.status(status).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Deactivates a staff member (Soft deactivation).
 */
const deactivateStaff = async (req, res) => {
    try {
        const { staffId } = req.params;

        const result = await deactivateStaffMember(
            staffId,
            req.user.id
        );

        res.json({
            success: true,
            message: 'Staff member deactivated successfully',
            data: result
        });
    } catch (error) {
        console.error('Error in deactivateStaff controller:', error);

        const status = error.message.includes('Access Denied') ? 403 : 400;
        res.status(status).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Reactivates a staff member.
 */
const reactivateStaff = async (req, res) => {
    try {
        const { staffId } = req.params;

        const result = await reactivateStaffMember(
            staffId,
            req.user.id
        );

        res.json({
            success: true,
            message: 'Staff member reactivated successfully',
            data: result
        });
    } catch (error) {
        console.error('Error in reactivateStaff controller:', error);

        const status = error.message.includes('Access Denied') ? 403 : 400;
        res.status(status).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Promotes a staff member to manager.
 */
const promoteStaff = async (req, res) => {
    try {
        const { staffId } = req.params;

        const result = await promoteStaffMember(
            staffId,
            req.user.id
        );

        res.json({
            success: true,
            message: 'Staff member promoted to manager successfully',
            data: result
        });
    } catch (error) {
        console.error('Error in promoteStaff controller:', error);

        const status = error.message.includes('Access Denied') ? 403 : 400;
        res.status(status).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Demotes a manager to staff.
 */
const demoteStaff = async (req, res) => {
    try {
        const { staffId } = req.params;

        const result = await demoteStaffMember(
            staffId,
            req.user.id
        );

        res.json({
            success: true,
            message: 'Manager demoted to staff successfully',
            data: result
        });
    } catch (error) {
        console.error('Error in demoteStaff controller:', error);

        const status = error.message.includes('Access Denied') ? 403 : 400;
        res.status(status).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Retrieves counts of applications for staff dashboard.
 */
const getDashboard = async (req, res) => {
    try {
        const metrics = await getStaffDashboardMetrics(
            req.user.id
        );

        res.json({
            success: true,
            metrics
        });
    } catch (error) {
        console.error('Error in getDashboard controller:', error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    listStaff,
    getStaff,
    deactivateStaff,
    reactivateStaff,
    promoteStaff,
    demoteStaff,
    getDashboard
};
