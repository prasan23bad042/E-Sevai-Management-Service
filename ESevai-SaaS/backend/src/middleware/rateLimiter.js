const logger = require('../utils/logger');

// Stores request timestamps grouped by IP
const rateLimitMap = new Map();

/**
 * Custom In-Memory Rate Limiter Middleware
 * Default: 100 requests per 15 minutes window.
 */
const rateLimiter = (options = {}) => {
    const windowMs = options.windowMs || 15 * 60 * 1000; // 15 mins
    const max = options.max || 100;
    const message = options.message || 'Too many requests, please try again later.';

    // Cleanup interval to prevent memory leaks
    setInterval(() => {
        const now = Date.now();
        for (const [ip, entry] of rateLimitMap.entries()) {
            if (now - entry.windowStart > windowMs) {
                rateLimitMap.delete(ip);
            }
        }
    }, windowMs);

    return (req, res, next) => {
        const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const now = Date.now();

        if (!rateLimitMap.has(ip)) {
            rateLimitMap.set(ip, {
                windowStart: now,
                count: 1
            });
            return next();
        }

        const entry = rateLimitMap.get(ip);
        if (now - entry.windowStart > windowMs) {
            // Reset window
            entry.windowStart = now;
            entry.count = 1;
            rateLimitMap.set(ip, entry);
            return next();
        }

        entry.count += 1;
        rateLimitMap.set(ip, entry);

        if (entry.count > max) {
            logger.warn(`Rate limit exceeded for IP: ${ip}`, {
                ip,
                request_id: req.id,
                count: entry.count,
                max
            });

            res.setHeader('Retry-After', Math.ceil((windowMs - (now - entry.windowStart)) / 1000));
            return res.status(429).json({
                success: false,
                request_id: req.id,
                error: {
                    code: 'RATE_LIMIT_EXCEEDED',
                    message
                }
            });
        }

        next();
    };
};

module.exports = rateLimiter;
