const supabase = require('../config/supabase');

const authenticateUser = async (
    req,
    res,
    next
) => {

    try {

        const authHeader =
            req.headers.authorization;

        if (!authHeader) {

            return res.status(401).json({
                success: false,
                message: 'Access token required'
            });

        }

        const token =
            authHeader.replace(
                'Bearer ',
                ''
            );

        const {
            data,
            error
        } = await supabase.auth.getUser(
            token
        );

        if (error) {

            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });

        }

        req.user = data.user;

        next();

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }

};

module.exports = {
    authenticateUser
};