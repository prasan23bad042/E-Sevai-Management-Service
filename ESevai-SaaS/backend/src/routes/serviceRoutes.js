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
    update,
    activate,
    deactivate,
    seed
} = require('../controllers/serviceController');

// 1. Seed master services catalog (must be declared first to prevent /:id parameter clash)
router.post(
    '/seed',
    authenticateUser,
    authorizeRoles('platform_admin'),
    seed
);

// 2. Create a new service catalog entry
router.post(
    '/',
    authenticateUser,
    authorizeRoles('platform_admin'),
    create
);

// 3. List services (supports category, active, search filters, and page/limit pagination)
router.get(
    '/',
    authenticateUser,
    authorizeRoles('platform_admin', 'center_owner', 'manager', 'staff'),
    list
);

// 4. Get specific service profile details
router.get(
    '/:id',
    authenticateUser,
    authorizeRoles('platform_admin', 'center_owner', 'manager', 'staff'),
    details
);

// 5. Update a service entry
router.put(
    '/:id',
    authenticateUser,
    authorizeRoles('platform_admin'),
    update
);

// 6. Activate a service
router.put(
    '/:id/activate',
    authenticateUser,
    authorizeRoles('platform_admin'),
    activate
);

// 7. Deactivate a service
router.put(
    '/:id/deactivate',
    authenticateUser,
    authorizeRoles('platform_admin'),
    deactivate
);

module.exports = router;
