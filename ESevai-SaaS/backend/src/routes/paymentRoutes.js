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
    pay,
    cancel,
    refund,
    details,
    list,
    generateReceipt,
    downloadReceipt,
    dailyRevenue,
    monthlyRevenue,
    centerRevenue,
    serviceRevenue,
    closingReport,
    customerPayments
} = require('../controllers/paymentController');

// 1. Analytics & Reconciliation reports (must be declared first to prevent ID clashes)
router.get(
    '/analytics/daily',
    authenticateUser,
    authorizeRoles('platform_admin', 'center_owner', 'manager', 'staff'),
    dailyRevenue
);

router.get(
    '/analytics/monthly',
    authenticateUser,
    authorizeRoles('platform_admin', 'center_owner', 'manager', 'staff'),
    monthlyRevenue
);

router.get(
    '/analytics/center',
    authenticateUser,
    authorizeRoles('platform_admin', 'center_owner', 'manager'),
    centerRevenue
);

router.get(
    '/analytics/service',
    authenticateUser,
    authorizeRoles('platform_admin', 'center_owner', 'manager'),
    serviceRevenue
);

router.get(
    '/closing/daily',
    authenticateUser,
    authorizeRoles('platform_admin', 'center_owner', 'manager'),
    closingReport
);

// 2. Customer payment logs
router.get(
    '/customer/:customerId',
    authenticateUser,
    authorizeRoles('platform_admin', 'center_owner', 'manager', 'staff'),
    customerPayments
);

// 3. Initiate payment request
router.post(
    '/',
    authenticateUser,
    authorizeRoles('platform_admin', 'center_owner', 'manager', 'staff'),
    create
);

// 4. List payments (supports paginated filter sets)
router.get(
    '/',
    authenticateUser,
    authorizeRoles('platform_admin', 'center_owner', 'manager', 'staff'),
    list
);

// 5. Generate receipt record
router.post(
    '/:id/receipt',
    authenticateUser,
    authorizeRoles('platform_admin', 'center_owner', 'manager', 'staff'),
    generateReceipt
);

// 6. Download receipt PDF signed URL link
router.get(
    '/:id/receipt',
    authenticateUser,
    authorizeRoles('platform_admin', 'center_owner', 'manager', 'staff'),
    downloadReceipt
);

// 7. Get specific payment metadata profile
router.get(
    '/:id',
    authenticateUser,
    authorizeRoles('platform_admin', 'center_owner', 'manager', 'staff'),
    details
);

// 8. Record payment completion
router.put(
    '/:id/pay',
    authenticateUser,
    authorizeRoles('platform_admin', 'center_owner', 'manager', 'staff'),
    pay
);

// 9. Cancel pending payment request
router.put(
    '/:id/cancel',
    authenticateUser,
    authorizeRoles('platform_admin', 'center_owner', 'manager'),
    cancel
);

// 10. Issue payment refund/reversal
router.put(
    '/:id/refund',
    authenticateUser,
    authorizeRoles('platform_admin', 'center_owner'),
    refund
);

module.exports = router;
