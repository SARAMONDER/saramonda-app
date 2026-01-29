/**
 * Rate Limiting Middleware
 * Prevents abuse and DDoS attacks
 */
const rateLimit = require('express-rate-limit');
const config = require('../config');
const logger = require('../shared/logger');

/**
 * General API rate limiter
 */
const apiLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs, // 15 minutes
    max: config.rateLimit.maxRequests, // 100 requests per window
    message: {
        success: false,
        error: 'Too many requests, please try again later',
        code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        logger.security('Rate limit exceeded', {
            ip: req.ip,
            path: req.path,
            method: req.method
        });
        res.status(options.statusCode).json(options.message);
    }
});

/**
 * Strict limiter for authentication endpoints
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: {
        success: false,
        error: 'Too many login attempts, please try again after 15 minutes',
        code: 'AUTH_RATE_LIMIT'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful logins
    handler: (req, res, next, options) => {
        logger.security('Auth rate limit exceeded', {
            ip: req.ip,
            email: req.body?.email,
            path: req.path
        });
        res.status(options.statusCode).json(options.message);
    }
});

/**
 * Order creation limiter - prevent order spam
 */
const orderLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 orders per minute
    message: {
        success: false,
        error: 'Order limit exceeded, please wait a moment',
        code: 'ORDER_RATE_LIMIT'
    },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * Heavy operations limiter (reports, exports)
 */
const heavyOperationLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // 5 requests per minute
    message: {
        success: false,
        error: 'Please wait before requesting another report',
        code: 'HEAVY_OP_RATE_LIMIT'
    }
});

module.exports = {
    apiLimiter,
    authLimiter,
    orderLimiter,
    heavyOperationLimiter
};
