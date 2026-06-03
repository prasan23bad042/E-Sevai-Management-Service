const {
    registerUser
} = require('../services/authService');

const register = async (req, res) => {

    try {

        const {
            fullName,
            email,
            password
        } = req.body;

        const user = await registerUser(
            fullName,
            email,
            password
        );

        res.status(201).json({
            success: true,
            user
        });

    } catch (error) {

        console.log("REGISTER ERROR:");
        console.log(error);

        res.status(500).json({
            success: false,
            message: error.message,
            error: error
        });

    }
};

module.exports = {
    register
};