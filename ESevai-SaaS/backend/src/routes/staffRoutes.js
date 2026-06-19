const express = require('express');
const router = express.Router();

const {
    authenticateUser
} = require('../middleware/authMiddleware');

const {
    authorizeRoles
} = require('../middleware/roleMiddleware');

const {
    listStaff,
    getStaff,
    deactivateStaff,
    reactivateStaff,
    promoteStaff,
    demoteStaff,
    getDashboard
} = require('../controllers/staffController');

// 1. Staff dashboard counts (must be declared first to prevent /:centerId param clashing)
router.get(
    '/dashboard',
    authenticateUser,
    authorizeRoles('platform_admin', 'center_owner', 'manager', 'staff'),
    getDashboard
);

// 2. Get specific staff details
router.get(
    '/member/:staffId',
    authenticateUser,
    authorizeRoles('platform_admin', 'center_owner', 'manager', 'staff'),
    getStaff
);

// 3. Deactivate a staff member
router.put(
    '/member/:staffId/deactivate',
    authenticateUser,
    authorizeRoles('platform_admin', 'center_owner'),
    deactivateStaff
);

// 4. Reactivate a staff member
router.put(
    '/member/:staffId/reactivate',
    authenticateUser,
    authorizeRoles('platform_admin', 'center_owner'),
    reactivateStaff
);

// 5. Promote a staff member to manager
router.put(
    '/member/:staffId/promote',
    authenticateUser,
    authorizeRoles('platform_admin', 'center_owner'),
    promoteStaff
);

// 6. Demote a manager to staff
router.put(
    '/member/:staffId/demote',
    authenticateUser,
    authorizeRoles('platform_admin', 'center_owner'),
    demoteStaff
);

// 7. List center staff (filters status/role are supported via query parameters)
router.get(
    '/:centerId',
    authenticateUser,
    authorizeRoles('platform_admin', 'center_owner', 'manager'),
    listStaff
);

module.exports = router;
