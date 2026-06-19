const express = require('express');
const router = express.Router();

const {
    authenticateUser
} = require('../middleware/authMiddleware');

const {
    admin,
    owner,
    manager,
    staff,
    audit,
    applicationTrends,
    revenueTrends
} = require('../controllers/dashboardController');

// All routes require authentication
router.use(authenticateUser);

router.get('/admin', admin);
router.get('/owner', owner);
router.get('/manager', manager);
router.get('/staff', staff);
router.get('/audit', audit);

// Trends Analytics
router.get('/trends/applications', applicationTrends);
router.get('/trends/revenue', revenueTrends);

module.exports = router;
