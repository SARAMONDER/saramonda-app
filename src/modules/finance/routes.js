/**
 * Finance Routes
 * API endpoints for financial management
 */
const express = require('express');
const router = express.Router();
const financeService = require('./service');
const { authenticate, authorize, branchAccess } = require('../../middleware/auth');
const { heavyOperationLimiter } = require('../../middleware/rateLimiter');
const config = require('../../config');

/**
 * @route   POST /api/v1/finance/payment
 * @desc    Record payment for order
 * @access  Private (Staff+)
 */
router.post('/payment',
    authenticate,
    authorize(config.roles.ADMIN, config.roles.MANAGER, config.roles.STAFF),
    (req, res) => {
        const { orderId, ...paymentData } = req.body;
        const result = financeService.recordPayment(orderId, paymentData, req.user.id);

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);
    }
);

/**
 * @route   GET /api/v1/finance/daily-summary
 * @desc    Get daily P&L summary
 * @access  Private (Manager+)
 */
router.get('/daily-summary',
    authenticate,
    authorize(config.roles.ADMIN, config.roles.MANAGER),
    branchAccess,
    (req, res) => {
        const date = req.query.date || new Date().toISOString().split('T')[0];
        const result = financeService.getDailySummary(req.branchId, date);
        res.json(result);
    }
);

/**
 * @route   GET /api/v1/finance/monthly-report
 * @desc    Get monthly P&L report
 * @access  Private (Manager+)
 */
router.get('/monthly-report',
    authenticate,
    authorize(config.roles.ADMIN, config.roles.MANAGER),
    branchAccess,
    heavyOperationLimiter,
    (req, res) => {
        const now = new Date();
        const year = parseInt(req.query.year) || now.getFullYear();
        const month = parseInt(req.query.month) || now.getMonth() + 1;

        const result = financeService.getMonthlyReport(req.branchId, year, month);
        res.json(result);
    }
);

/**
 * @route   GET /api/v1/finance/menu-costs
 * @desc    Get menu cost analysis
 * @access  Private (Manager+)
 */
router.get('/menu-costs',
    authenticate,
    authorize(config.roles.ADMIN, config.roles.MANAGER),
    branchAccess,
    (req, res) => {
        const result = financeService.getMenuCostAnalysis(req.branchId);
        res.json(result);
    }
);

/**
 * @route   GET /api/v1/finance/revenue-by-category
 * @desc    Get revenue breakdown by category
 * @access  Private (Manager+)
 */
router.get('/revenue-by-category',
    authenticate,
    authorize(config.roles.ADMIN, config.roles.MANAGER),
    branchAccess,
    (req, res) => {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                error: 'startDate and endDate are required',
                code: 'MISSING_DATES'
            });
        }

        const result = financeService.getRevenueByCategory(req.branchId, startDate, endDate);
        res.json(result);
    }
);

/**
 * @route   GET /api/v1/finance/payment-breakdown
 * @desc    Get payment method breakdown
 * @access  Private (Manager+)
 */
router.get('/payment-breakdown',
    authenticate,
    authorize(config.roles.ADMIN, config.roles.MANAGER),
    branchAccess,
    (req, res) => {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                error: 'startDate and endDate are required',
                code: 'MISSING_DATES'
            });
        }

        const result = financeService.getPaymentBreakdown(req.branchId, startDate, endDate);
        res.json(result);
    }
);

/**
 * @route   GET /api/v1/finance/cash-report
 * @desc    Generate end-of-day cash report
 * @access  Private (Manager+)
 */
router.get('/cash-report',
    authenticate,
    authorize(config.roles.ADMIN, config.roles.MANAGER),
    branchAccess,
    (req, res) => {
        const date = req.query.date || new Date().toISOString().split('T')[0];
        const result = financeService.generateCashReport(req.branchId, date);
        res.json(result);
    }
);

module.exports = router;
