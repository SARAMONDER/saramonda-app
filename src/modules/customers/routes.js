/**
 * Customer Routes
 * API endpoints for customer management (LINE Login users)
 */
const express = require('express');
const router = express.Router();
const customerService = require('./service');
const logger = require('../../shared/logger');

/**
 * @route   POST /api/v1/customers/sync
 * @desc    Sync customer from LINE Login
 * @access  Public (with LINE access token)
 */
router.post('/sync', async (req, res) => {
    try {
        const { lineUserId, displayName, pictureUrl } = req.body;
        const accessToken = req.headers.authorization?.replace('Bearer ', '');

        if (!lineUserId) {
            return res.status(400).json({
                success: false,
                error: 'lineUserId is required'
            });
        }

        // Verify LINE access token (optional - for production)
        // const verified = await customerService.verifyLineToken(accessToken);
        // if (!verified) {
        //     return res.status(401).json({ success: false, error: 'Invalid token' });
        // }

        const result = await customerService.syncCustomer({
            lineUserId,
            displayName,
            pictureUrl
        });

        res.json(result);
    } catch (error) {
        logger.error('Customer sync error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to sync customer'
        });
    }
});

/**
 * @route   PUT /api/v1/customers/update
 * @desc    Update customer info (phone, address)
 * @access  Authenticated via LINE token
 */
router.put('/update', async (req, res) => {
    try {
        const { lineUserId, phone, address, deliveryArea } = req.body;

        if (!lineUserId) {
            return res.status(400).json({
                success: false,
                error: 'lineUserId is required'
            });
        }

        const result = await customerService.updateCustomer(lineUserId, {
            phone,
            address,
            deliveryArea
        });

        if (!result.success) {
            return res.status(404).json(result);
        }

        res.json(result);
    } catch (error) {
        logger.error('Customer update error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update customer'
        });
    }
});

/**
 * @route   GET /api/v1/customers/:lineUserId
 * @desc    Get customer by LINE User ID
 * @access  Public (for now)
 */
router.get('/:lineUserId', async (req, res) => {
    try {
        const result = await customerService.getCustomer(req.params.lineUserId);

        if (!result.success) {
            return res.status(404).json(result);
        }

        res.json(result);
    } catch (error) {
        logger.error('Get customer error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get customer'
        });
    }
});

/**
 * @route   GET /api/v1/customers/:lineUserId/orders
 * @desc    Get customer order history
 * @access  Public (for now)
 */
router.get('/:lineUserId/orders', async (req, res) => {
    try {
        const result = await customerService.getCustomerOrders(
            req.params.lineUserId,
            {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 10
            }
        );

        res.json(result);
    } catch (error) {
        logger.error('Get customer orders error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get orders'
        });
    }
});

/**
 * @route   GET /api/v1/customers
 * @desc    Get all customers (admin)
 * @access  Admin only
 */
router.get('/', async (req, res) => {
    try {
        const result = await customerService.getAllCustomers({
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 20,
            deliveryArea: req.query.area
        });

        res.json(result);
    } catch (error) {
        logger.error('Get all customers error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get customers'
        });
    }
});

module.exports = router;
