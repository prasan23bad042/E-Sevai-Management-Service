const express = require('express');
const cors = require('cors');
require('dotenv').config();

// 1. Pre-validate environment variables
const validateEnv = require('./config/validateEnv');
validateEnv();

// Import Routes
const authRoutes = require('./routes/authRoutes');
const centerRoutes = require('./routes/centerRoutes');
const adminRoutes = require('./routes/adminRoutes');
const invitationRoutes = require('./routes/invitationRoutes');
const staffRoutes = require('./routes/staffRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const documentRoutes = require('./routes/documentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const reportRoutes = require('./routes/reportRoutes');
const docsRoutes = require('./routes/docsRoutes');

// Import Hardening Middleware
const correlationId = require('./middleware/correlationId');
const securityHeaders = require('./middleware/securityHeaders');
const rateLimiter = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Global Middlewares
app.use(cors());
app.use(express.json());
app.use(correlationId);
app.use(securityHeaders);

// Custom Rate Limiters
const authLimiter = rateLimiter({ max: 50, windowMs: 15 * 60 * 1000, message: 'Too many authentication attempts. Please try again after 15 minutes.' });
const apiLimiter = rateLimiter({ max: 500, windowMs: 15 * 60 * 1000 });

// Base Route
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'ESevai Backend Running'
    });
});

// Health Check Endpoint (Monitoring database & storage connection states)
app.get('/health', async (req, res) => {
    try {
        const supabase = require('./config/supabase');
        
        // 1. Verify Database
        const { data: dbCheck, error: dbError } = await supabase.from('users').select('id').limit(1);
        const dbStatus = (!dbError && dbCheck) ? 'connected' : 'error';

        // 2. Verify Storage
        let storageStatus = 'connected';
        try {
            const { data: buckets, error: storageError } = await supabase.storage.listBuckets();
            if (storageError || !buckets) storageStatus = 'error';
        } catch (err) {
            storageStatus = 'error';
        }

        const healthy = dbStatus === 'connected' && storageStatus === 'connected';

        res.status(healthy ? 200 : 503).json({
            status: healthy ? 'healthy' : 'degraded',
            database: dbStatus,
            storage: storageStatus,
            version: '1.0.0',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            database: 'error',
            storage: 'error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Swagger / OpenAPI documentation
app.use('/api/docs', authLimiter, docsRoutes);

// Versioned v1 Module Routes (Applying global API limiters)
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/centers', apiLimiter, centerRoutes);
app.use('/api/v1/admin', apiLimiter, adminRoutes);
app.use('/api/v1/invitations', apiLimiter, invitationRoutes);
app.use('/api/v1/staff', apiLimiter, staffRoutes);
app.use('/api/v1/services', apiLimiter, serviceRoutes);
app.use('/api/v1/applications', apiLimiter, applicationRoutes);
app.use('/api/v1/documents', apiLimiter, documentRoutes);
app.use('/api/v1/payments', apiLimiter, paymentRoutes);
app.use('/api/v1/notifications', apiLimiter, notificationRoutes);
app.use('/api/v1/dashboard', apiLimiter, dashboardRoutes);
app.use('/api/v1/reports', apiLimiter, reportRoutes);

// Backward Compatibility Routing Fallback (optional routing checks)
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/centers', apiLimiter, centerRoutes);
app.use('/api/admin', apiLimiter, adminRoutes);
app.use('/api/invitations', apiLimiter, invitationRoutes);
app.use('/api/staff', apiLimiter, staffRoutes);
app.use('/api/services', apiLimiter, serviceRoutes);
app.use('/api/applications', apiLimiter, applicationRoutes);
app.use('/api/documents', apiLimiter, documentRoutes);
app.use('/api/payments', apiLimiter, paymentRoutes);
app.use('/api/notifications', apiLimiter, notificationRoutes);
app.use('/api/dashboard', apiLimiter, dashboardRoutes);
app.use('/api/reports', apiLimiter, reportRoutes);

// Catch-All 404 Route
app.use((req, res, next) => {
    const err = new Error(`Resource not found: ${req.originalUrl}`);
    err.status = 404;
    err.code = 'NOT_FOUND';
    next(err);
});

// Centralized error handler boundary
app.use(errorHandler);

module.exports = app;