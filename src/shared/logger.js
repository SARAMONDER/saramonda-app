/**
 * Logger Utility
 * Centralized logging with Winston
 */
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.resolve('./logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for console output
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
        return `[${timestamp}] ${level}: ${message} ${metaStr}`;
    })
);

// Custom format for file output
const fileFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    transports: [
        // Console transport
        new winston.transports.Console({
            format: consoleFormat
        }),
        // File transport - all logs
        new winston.transports.File({
            filename: path.join(logsDir, 'app.log'),
            format: fileFormat,
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 5
        }),
        // File transport - errors only
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            format: fileFormat,
            maxsize: 10 * 1024 * 1024,
            maxFiles: 5
        }),
        // File transport - audit logs
        new winston.transports.File({
            filename: path.join(logsDir, 'audit.log'),
            level: 'info',
            format: fileFormat,
            maxsize: 10 * 1024 * 1024,
            maxFiles: 10
        })
    ]
});

// Helper methods for structured logging
logger.audit = (action, data) => {
    logger.info(`[AUDIT] ${action}`, { audit: true, ...data });
};

logger.security = (event, data) => {
    logger.warn(`[SECURITY] ${event}`, { security: true, ...data });
};

logger.performance = (operation, durationMs, data = {}) => {
    logger.info(`[PERF] ${operation} took ${durationMs}ms`, { performance: true, durationMs, ...data });
};

module.exports = logger;
