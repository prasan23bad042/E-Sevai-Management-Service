const express = require('express');

const router = express.Router();

const {
    register,
    login,
    getCurrentUser
} = require('../controllers/authController');

const {
    authenticateUser
} = require('../middleware/authMiddleware');

router.get('/ping', (req, res) => {

    res.json({
        success: true,
        message: 'Auth Module Working'
    });

});

const {
    authorizeRoles
} = require('../middleware/roleMiddleware');

router.get(
    '/admin-test',
    authenticateUser,
    authorizeRoles('platform_admin'),
    (req, res) => {

        res.json({
            success: true,
            message:
                'Platform Admin Access Granted',
            roles: req.roles
        });

    }
);

router.post(
    '/register',
    register
);

router.post(
    '/login',
    login
);

router.get(
    '/me',
    authenticateUser,
    getCurrentUser
);

router.get(
    '/debug-roles',
    authenticateUser,
    async (req, res) => {

        const supabase =
            require('../config/supabase');

        const { data, error } =
            await supabase
                .from('user_roles')
                .select('*');

        res.json({
            data,
            error
        });

    }
);

module.exports = router;