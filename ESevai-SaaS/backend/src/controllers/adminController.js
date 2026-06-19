const {
    getAllCenters,
    approveCenter
} = require('../services/adminService');

const getCenters = async (
    req,
    res
) => {

    try {

        const centers =
            await getAllCenters();

        res.json({
            success: true,
            data: centers
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};

const approve = async (
    req,
    res
) => {

    try {

        const center =
            await approveCenter(
                req.params.id
            );

        res.json({
            success: true,
            data: center
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};

module.exports = {
    getCenters,
    approve
};