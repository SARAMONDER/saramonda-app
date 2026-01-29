/**
 * Analytics Routes
 * API endpoints for reports and insights
 */
const express = require('express');
const router = express.Router();
const analyticsService = require('./service');
const { authenticate, authorize, branchAccess } = require('../../middleware/auth');
const { heavyOperationLimiter } = require('../../middleware/rateLimiter');
const config = require('../../config');

/**
 * @route   GET /api/v1/analytics/dashboard
 * @desc    Get dashboard statistics
 * @access  Private (Staff+)
 */
router.get('/dashboard',
    authenticate,
    authorize(config.roles.ADMIN, config.roles.MANAGER, config.roles.STAFF),
    branchAccess,
    (req, res) => {
        const result = analyticsService.getDashboardStats(req.branchId);
        res.json(result);
    }
);

/**
 * @route   GET /api/v1/analytics/top-products
 * @desc    Get top selling products
 * @access  Private (Manager+)
 */
router.get('/top-products',
    authenticate,
    authorize(config.roles.ADMIN, config.roles.MANAGER),
    branchAccess,
    (req, res) => {
        const result = analyticsService.getTopProducts(req.branchId, {
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            limit: parseInt(req.query.limit) || 10
        });
        res.json(result);
    }
);

/**
 * @route   GET /api/v1/analytics/peak-hours
 * @desc    Get peak hours analysis
 * @access  Private (Manager+)
 */
router.get('/peak-hours',
    authenticate,
    authorize(config.roles.ADMIN, config.roles.MANAGER),
    branchAccess,
    (req, res) => {
        const result = analyticsService.getPeakHours(req.branchId, {
            startDate: req.query.startDate,
            endDate: req.query.endDate
        });
        res.json(result);
    }
);

/**
 * @route   GET /api/v1/analytics/peak-days
 * @desc    Get peak days of week
 * @access  Private (Manager+)
 */
router.get('/peak-days',
    authenticate,
    authorize(config.roles.ADMIN, config.roles.MANAGER),
    branchAccess,
    (req, res) => {
        const result = analyticsService.getPeakDays(req.branchId, {
            startDate: req.query.startDate,
            endDate: req.query.endDate
        });
        res.json(result);
    }
);

/**
 * @route   GET /api/v1/analytics/customers
 * @desc    Get customer analytics
 * @access  Private (Manager+)
 */
router.get('/customers',
    authenticate,
    authorize(config.roles.ADMIN, config.roles.MANAGER),
    branchAccess,
    (req, res) => {
        const result = analyticsService.getCustomerAnalytics(req.branchId);
        res.json(result);
    }
);

/**
 * @route   GET /api/v1/analytics/revenue-trend
 * @desc    Get revenue trend
 * @access  Private (Manager+)
 */
router.get('/revenue-trend',
    authenticate,
    authorize(config.roles.ADMIN, config.roles.MANAGER),
    branchAccess,
    (req, res) => {
        const result = analyticsService.getRevenueTrend(
            req.branchId,
            parseInt(req.query.days) || 30
        );
        res.json(result);
    }
);

/**
 * @route   GET /api/v1/analytics/inventory-turnover
 * @desc    Get inventory turnover analysis
 * @access  Private (Manager+)
 */
router.get('/inventory-turnover',
    authenticate,
    authorize(config.roles.ADMIN, config.roles.MANAGER),
    branchAccess,
    heavyOperationLimiter,
    (req, res) => {
        const result = analyticsService.getInventoryTurnover(
            req.branchId,
            parseInt(req.query.days) || 30
        );
        res.json(result);
    }
);

/**
 * @route   GET /api/v1/analytics/order-status
 * @desc    Get order status distribution
 * @access  Private (Staff+)
 */
router.get('/order-status',
    authenticate,
    authorize(config.roles.ADMIN, config.roles.MANAGER, config.roles.STAFF),
    branchAccess,
    (req, res) => {
        const result = analyticsService.getOrderStatusDistribution(req.branchId, {
            startDate: req.query.startDate,
            endDate: req.query.endDate
        });
        res.json(result);
    }
);

module.exports = router;
