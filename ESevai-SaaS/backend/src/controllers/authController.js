const {
    registerUser,
    loginUser
} = require('../services/authService');

const register = async (
    req,
    res
) => {

    try {

        const {
            fullName,
            email,
            password
        } = req.body;

        const user =
            await registerUser(
                fullName,
                email,
                password
            );

        res.status(201).json({
            success: true,
            message:
                'Center owner created successfully',
            user
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};

const login = async (
    req,
    res
) => {

    try {

        const {
            email,
            password
        } = req.body;

        const result =
            await loginUser(
                email,
                password
            );

        res.json({
            success: true,
            user: {
                id: result.user.id,
                email: result.user.email,
                role: result.role
            },
            access_token:
                result.session.access_token
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};

const getCurrentUser = async (
    req,
    res
) => {

    try {

        res.json({
            success: true,
            user: req.user
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};

module.exports = {
    register,
    login,
    getCurrentUser
};