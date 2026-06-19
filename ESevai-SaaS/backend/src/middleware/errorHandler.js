const logger = require('../utils/logger');

/**
 * Global Centralized Error Handler Middleware
 * Standardizes API error responses and logs errors with correlation IDs.
 */
const errorHandler = (err, req, res, next) => {
    const status = err.status || 500;
    const errorCode = err.code || 'INTERNAL_ERROR';
    const message = err.message || 'An unexpected error occurred on the server';
    const details = err.details || {};

    // Standard log data
    logger.error(`Error encountered during request processing`, {
        error_code: errorCode,
        error_message: message,
        request_id: req.id,
        user_id: req.user ? req.user.id : undefined,
        status,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });

    res.status(status).json({
        success: false,
        request_id: req.id,
        error: {
            code: errorCode,
            message,
            details
        }
    });
};

module.exports = errorHandler;
