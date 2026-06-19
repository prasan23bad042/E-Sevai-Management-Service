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
    cancel,
    accept
} = require('../controllers/invitationController');

// Accept invitation (Public endpoint, must be declared first to prevent /:centerId clash)
router.post(
    '/accept',
    accept
);

// Create invitation for a center
router.post(
    '/:centerId',
    authenticateUser,
    authorizeRoles(
        'center_owner',
        'platform_admin',
        'manager'
    ),
    create
);

// List invitations for a center
router.get(
    '/:centerId',
    authenticateUser,
    authorizeRoles(
        'center_owner',
        'platform_admin',
        'manager'
    ),
    list
);

// Cancel a pending invitation
router.put(
    '/:invitationId/cancel',
    authenticateUser,
    authorizeRoles(
        'center_owner',
        'platform_admin',
        'manager'
    ),
    cancel
);

module.exports = router;