const {
    createCenter,
    getMyCenter
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
            data: center
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};

const myCenter = async (
    req,
    res
) => {

    try {

        const center =
            await getMyCenter(
                req.user.id
            );

        res.json({
            success: true,
            data: center[0] || null
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
    create,
    myCenter
};