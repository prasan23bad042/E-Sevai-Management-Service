const supabase = require('../config/supabase');

const authorizeRoles = (...allowedRoles) => {

    return async (
        req,
        res,
        next
    ) => {

        try {

            const userId = req.user.id;

            const {
                data,
                error
            } = await supabase
                .from('users')
                .select('role')
                .eq('id', userId)
                .single();

            if (error) {
                throw error;
            }

            const userRole =
                data.role;

            console.log(
                "USER ROLE =",
                userRole
            );

            if (
                !allowedRoles.includes(
                    userRole
                )
            ) {

                return res.status(403).json({
                    success: false,
                    message: 'Access Denied'
                });

            }

            req.roles = [userRole];

            next();

        } catch (error) {

            console.log(error);

            return res.status(500).json({
                success: false,
                message: error.message
            });

        }

    };

};

module.exports = {
    authorizeRoles
};