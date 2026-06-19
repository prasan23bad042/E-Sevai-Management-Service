const crypto = require('crypto');

/**
 * Request Correlation ID Middleware
 * Inspects incoming 'X-Request-ID' headers or generates a new one.
 * Binds it to the request context (req.id) and returns it in the response.
 */
const correlationId = (req, res, next) => {
    const headerName = 'X-Request-ID';
    const existingId = req.header(headerName);
    
    // Generate new correlation UUID if none is supplied
    const requestId = existingId || `req_${crypto.randomUUID().replace(/-/g, '')}`;
    
    req.id = requestId;
    res.setHeader(headerName, requestId);
    
    next();
};

module.exports = correlationId;
