const express = require('express');
const router = express.Router();

const {
    authenticateUser
} = require('../middleware/authMiddleware');

const {
    authorizeRoles
} = require('../middleware/roleMiddleware');

const {
    applicationsReport,
    revenueReport,
    centersPerformanceReport,
    staffPerformanceReport,
    serviceUsageReport,
    slaBreachReport,
    scheduleReport
} = require('../controllers/reportController');

// All report routes require user authentication
router.use(authenticateUser);

router.get(
    '/applications',
    authorizeRoles('platform_admin', 'center_owner', 'manager', 'staff'),
    applicationsReport
);

router.get(
    '/revenue',
    authorizeRoles('platform_admin', 'center_owner', 'manager'),
    revenueReport
);

router.get(
    '/centers',
    authorizeRoles('platform_admin', 'center_owner', 'manager'),
    centersPerformanceReport
);

router.get(
    '/staff',
    authorizeRoles('platform_admin', 'center_owner', 'manager'),
    staffPerformanceReport
);

router.get(
    '/services',
    authorizeRoles('platform_admin', 'center_owner', 'manager'),
    serviceUsageReport
);

router.get(
    '/sla',
    authorizeRoles('platform_admin', 'center_owner', 'manager', 'staff'),
    slaBreachReport
);

// Schedule reports
router.post(
    '/schedule',
    authorizeRoles('platform_admin', 'center_owner', 'manager'),
    scheduleReport
);

module.exports = router;
