const logger = require('../utils/logger');

/**
 * Validates critical environment variables required for startup.
 * Halts backend boot if variables are missing.
 */
const validateEnv = () => {
    const required = [
        'SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY'
    ];

    const missing = [];
    required.forEach(key => {
        if (!process.env[key] || process.env[key].trim() === '') {
            missing.push(key);
        }
    });

    if (missing.length > 0) {
        logger.error(`CRITICAL STARTUP FAILURE: Missing required environment variables`, {
            missing_keys: missing,
            action: 'HALT_BOOT'
        });
        // Exit process immediately to fail container/hosting boot
        process.exit(1);
    }

    logger.info('Environment variables validation check succeeded');
};

module.exports = validateEnv;
