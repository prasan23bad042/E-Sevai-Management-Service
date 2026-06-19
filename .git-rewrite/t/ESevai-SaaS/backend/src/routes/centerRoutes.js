const express = require('express');

const router = express.Router();

const {
    create
} = require('../controllers/centerController');

const {
    authenticateUser
} = require('../middleware/authMiddleware');

router.post(
    '/',
    authenticateUser,
    create
);

module.exports = router;