/**
 * Custom Security Headers Middleware
 * Standardizes browser HTTP response security protections (Helmet equivalents).
 */
const securityHeaders = (req, res, next) => {
    // 1. Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // 2. Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // 3. Control referrer information sent in headers
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // 4. Force HTTPS transport communication (HSTS)
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    
    // 5. Basic Content-Security-Policy (CSP)
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data: https:; font-src 'self' https:;");

    // 6. Disable download file options in IE
    res.setHeader('X-Download-Options', 'noopen');

    // 7. X-XSS Protection for legacy browsers
    res.setHeader('X-XSS-Protection', '1; mode=block');

    next();
};

module.exports = securityHeaders;
