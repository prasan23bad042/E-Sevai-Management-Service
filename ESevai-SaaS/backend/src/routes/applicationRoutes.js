const express = require('express');
const router = express.Router();

const {
    authenticateUser
} = require('../middleware/authMiddleware');

const {
    authorizeRoles
} = require('../middleware/roleMiddleware');

const {
    create,
    list,
    details,
    assign,
    statusUpdate,
    remarksUpdate,
    timeline,
    dashboard
} = require('../controllers/applicationController');

// 1. Dashboard metrics counters (declared first to bypass parameter clashing)
router.get(
    '/dashboard',
    authenticateUser,
    authorizeRoles('platform_admin', 'center_owner', 'manager', 'staff'),
    dashboard
);

// 2. Get specific application timeline audit logs (declared before GET /:id)
router.get(
    '/:id/timeline',
    authenticateUser,
    authorizeRoles('platform_admin', 'center_owner', 'manager', 'staff'),
    timeline
);

// 3. Create a new application
router.post(
    '/',
    authenticateUser,
    authorizeRoles('platform_admin', 'center_owner', 'manager', 'staff'),
    create
);

// 4. List applications (supports pagination, search, status, and service filters)
router.get(
    '/',
    authenticateUser,
    authorizeRoles('platform_admin', 'center_owner', 'manager', 'staff'),
    list
);

// 5. Get detailed profile of a single application
router.get(
    '/:id',
    authenticateUser,
    authorizeRoles('platform_admin', 'center_owner', 'manager', 'staff'),
    details
);

// 6. Assign a staff member (restricted to owners, managers, and admins)
router.put(
    '/:id/assign',
    authenticateUser,
    authorizeRoles('platform_admin', 'center_owner', 'manager'),
    assign
);

// 7. Update application status (subject to transition guard check and role scoping)
router.put(
    '/:id/status',
    authenticateUser,
    authorizeRoles('platform_admin', 'center_owner', 'manager', 'staff'),
    statusUpdate
);

// 8. Add remarks
router.post(
    '/:id/remarks',
    authenticateUser,
    authorizeRoles('platform_admin', 'center_owner', 'manager', 'staff'),
    remarksUpdate
);

module.exports = router;
