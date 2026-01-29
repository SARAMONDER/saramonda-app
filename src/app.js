/**
 * Saramondā Restaurant System
 * Main Application Entry Point
 */
const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

// Local imports
const config = require('./config');
const logger = require('./shared/logger');
const { initWebSocket, getConnectionStats } = require('./websocket');
const { initBackupService } = require('./backup');
const { apiLimiter } = require('./middleware/rateLimiter');

// Module routes
const authRoutes = require('./modules/auth/routes');
const orderRoutes = require('./modules/orders/routes');

// Initialize Express
const app = express();
const server = http.createServer(app);

// ============================================
// MIDDLEWARE CONFIGURATION
// ============================================

// Security headers
app.use(helmet({
    contentSecurityPolicy: false, // Disable for API
    crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
    origin: config.env === 'production'
        ? ['https://your-domain.com']
        : ['http://localhost:3000', 'http://localhost:8080', 'http://127.0.0.1:3000', 'http://127.0.0.1:8080', 'null'], // null for file:// protocol
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;

        // Log slow requests
        if (duration > 1000) {
            logger.warn('Slow request', {
                method: req.method,
                path: req.path,
                duration,
                status: res.statusCode
            });
        }

        // Log all requests in development
        if (config.env === 'development') {
            logger.info(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
        }
    });

    next();
});

// Rate limiting
app.use('/api', apiLimiter);

// ============================================
// API ROUTES
// ============================================

const apiPrefix = `/api/${config.apiVersion}`;

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: require('../package.json').version,
        environment: config.env,
        websocket: getConnectionStats()
    });
});

// Auth routes
app.use(`${apiPrefix}/auth`, authRoutes);

// Order routes
app.use(`${apiPrefix}/orders`, orderRoutes);

// Products routes
app.use(`${apiPrefix}/products`, require('./modules/products/routes'));

// Stock routes (simplified inline for now)
app.use(`${apiPrefix}/stock`, require('./modules/stock/routes'));

// CRM routes
app.use(`${apiPrefix}/crm`, require('./modules/crm/routes'));

// Finance routes
app.use(`${apiPrefix}/finance`, require('./modules/finance/routes'));

// Analytics routes
app.use(`${apiPrefix}/analytics`, require('./modules/analytics/routes'));

// Audit routes
app.use(`${apiPrefix}/audit`, require('./modules/audit/routes'));

// Notifications routes (LINE Messaging API)
app.use(`${apiPrefix}/notifications`, require('./modules/notifications/routes'));

// Customer routes (LINE Login users)
app.use(`${apiPrefix}/customers`, require('./modules/customers/routes'));

// LINE Webhook for Chatbot (separate from notifications)
app.use('/webhook/line', require('./modules/line/routes'));

// LINE Webhook (legacy - for notifications)
app.use(`${apiPrefix}/webhook`, require('./modules/notifications/routes'));

// Set order service in app context for chatbot
const orderService = require('./modules/orders/service');
app.set('orderService', orderService);

// ============================================
// STATIC FILE SERVING (Frontend)
// ============================================

// Serve static files from 'public' folder
app.use(express.static(path.join(__dirname, '../..')));

// Catch-all: Serve index.html for any non-API routes (SPA support)
app.get('*', (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api') || req.path.startsWith('/webhook') || req.path === '/health') {
        return next();
    }

    const indexPath = path.join(__dirname, '../../index.html');
    res.sendFile(indexPath, (err) => {
        if (err) {
            next(); // If file not found, go to 404 handler
        }
    });
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        code: 'NOT_FOUND',
        path: req.path
    });
});

// Global error handler
app.use((err, req, res, next) => {
    logger.error('Unhandled error:', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method
    });

    // Don't expose internal errors in production
    const message = config.env === 'production'
        ? 'Internal server error'
        : err.message;

    res.status(err.status || 500).json({
        success: false,
        error: message,
        code: err.code || 'INTERNAL_ERROR',
        ...(config.env === 'development' && { stack: err.stack })
    });
});

// Initialize database, then start server
const db = require('./config/database');

// Wait for DB init then start
(async () => {
    await db.ensureReady();

    // Initialize WebSocket
    initWebSocket(server);

    // Initialize backup service
    initBackupService();

    // Start server
    server.listen(config.port, () => {
        logger.info(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🍣 Saramondā Restaurant System                           ║
║                                                            ║
║   Server running on port ${config.port}                           ║
║   Environment: ${config.env.padEnd(15)}                        ║
║   API Version: ${config.apiVersion.padEnd(15)}                        ║
║                                                            ║
║   API Endpoint: http://localhost:${config.port}${apiPrefix}         ║
║   WebSocket: ws://localhost:${config.port}/ws                      ║
║   Health Check: http://localhost:${config.port}/health              ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `);
    });
})(); // Close async IIFE

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
        logger.info('Server closed');
        process.exit(0);
    });
});

process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection:', reason);
});

module.exports = { app, server };

