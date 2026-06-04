const {
    createCenter
} = require('../services/centerService');

const create = async (
    req,
    res
) => {

    try {

        const center =
            await createCenter(
                req.user.id,
                req.body
            );

        res.status(201).json({
            success: true,
            center
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};

module.exports = {
    create
};