/**
 * Centralized Structured Logger
 * Emits standardized JSON logs suitable for CloudWatch, Datadog, Pino, or Winston.
 */
const log = (level, message, meta = {}) => {
    const logObject = {
        timestamp: new Date().toISOString(),
        level: level.toLowerCase(),
        message: typeof message === 'string' ? message : JSON.stringify(message),
        request_id: meta.requestId || undefined,
        user_id: meta.userId || undefined,
        ...meta
    };
    
    // Remove duplicate fields from metadata
    delete logObject.requestId;
    delete logObject.userId;

    if (level.toLowerCase() === 'error') {
        console.error(JSON.stringify(logObject));
    } else if (level.toLowerCase() === 'warn') {
        console.warn(JSON.stringify(logObject));
    } else {
        console.log(JSON.stringify(logObject));
    }
};

const info = (message, meta) => log('info', message, meta);
const warn = (message, meta) => log('warn', message, meta);
const error = (message, meta) => log('error', message, meta);

module.exports = {
    info,
    warn,
    error
};
