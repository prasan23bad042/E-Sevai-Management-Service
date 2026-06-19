const express = require('express');

const router = express.Router();

const {
    authenticateUser
} = require('../middleware/authMiddleware');

const {
    authorizeRoles
} = require('../middleware/roleMiddleware');

const {
    getCenters,
    approve
} = require('../controllers/adminController');

router.get(
    '/centers',
    authenticateUser,
    authorizeRoles('platform_admin'),
    getCenters
);

router.put(
    '/centers/:id/approve',
    authenticateUser,
    authorizeRoles('platform_admin'),
    approve
);

module.exports = router;

router.get(
    '/debug-centers',
    async (req, res) => {

        const supabase =
            require('../config/supabase');

        const { data, error } =
            await supabase
                .from('centers')
                .select('*');

        res.json({
            data,
            error
        });

    }
);