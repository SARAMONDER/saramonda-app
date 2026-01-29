/**
 * Order Routes
 * API endpoints for order management
 */
const express = require('express');
const router = express.Router();
const orderService = require('./service');
const { authenticate, authorize, branchAccess } = require('../../middleware/auth');
const { orderLimiter } = require('../../middleware/rateLimiter');
const { validate, schemas } = require('../../middleware/validator');
const config = require('../../config');

/**
 * @route   POST /api/v1/orders
 * @desc    Create new order
 * @access  Public (with optional auth for member benefits)
 */
router.post('/',
    orderLimiter,
    validate(schemas.createOrder),
    (req, res) => {
        const userId = req.user?.id || null;
        const branchId = req.body.branchId || config.branch.defaultId;

        const result = orderService.createOrder(req.body, userId, branchId);

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.status(201).json(result);
    }
);

/**
 * @route   GET /api/v1/orders
 * @desc    Get all orders (with filters)
 * @access  Public for development, Private in production
 */
router.get('/',
    (req, res) => {
        const filters = {
            branchId: req.query.branchId || config.branch.defaultId,
            status: req.query.status,
            date: req.query.date,
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 50
        };

        const result = orderService.getOrders(filters);
        res.json(result);
    }
);

/**
 * @route   GET /api/v1/orders/kitchen
 * @desc    Get orders for kitchen display
 * @access  Public for development (kitchen display)
 */
router.get('/kitchen',
    (req, res) => {
        const branchId = req.query.branchId || config.branch.defaultId;
        const result = orderService.getKitchenOrders(branchId);
        res.json(result);
    }
);

/**
 * @route   GET /api/v1/orders/:id
 * @desc    Get order by ID
 * @access  Public
 */
router.get('/:id', (req, res) => {
    const result = orderService.getOrderById(req.params.id);

    if (!result.success) {
        return res.status(404).json(result);
    }

    res.json(result);
});

/**
 * @route   PATCH /api/v1/orders/:id/status
 * @desc    Update order status
 * @access  Public for development (kitchen display)
 */
router.patch('/:id/status',
    validate(schemas.updateOrderStatus),
    (req, res) => {
        const { status, notes } = req.body;
        // Use system user for demo
        const result = orderService.updateOrderStatus(req.params.id, status, 'system', notes);

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);
    }
);

/**
 * @route   POST /api/v1/orders/:id/cancel
 * @desc    Cancel order
 * @access  Private (Staff+)
 */
router.post('/:id/cancel',
    authenticate,
    authorize(config.roles.ADMIN, config.roles.MANAGER, config.roles.STAFF),
    (req, res) => {
        const result = orderService.updateOrderStatus(
            req.params.id,
            'cancelled',
            req.user.id,
            req.body.reason || 'Cancelled by staff'
        );

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);
    }
);

module.exports = router;
