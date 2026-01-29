/**
 * CRM Routes
 * API endpoints for customer relationship management
 */
const express = require('express');
const router = express.Router();
const crmService = require('./service');
const { authenticate, authorize, branchAccess } = require('../../middleware/auth');
const config = require('../../config');

/**
 * @route   GET /api/v1/crm/members
 * @desc    Get all members
 * @access  Private (Staff+)
 */
router.get('/members',
    authenticate,
    authorize(config.roles.ADMIN, config.roles.MANAGER, config.roles.STAFF),
    branchAccess,
    (req, res) => {
        const result = crmService.getMembers({
            branchId: req.branchId,
            tier: req.query.tier,
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 20
        });
        res.json(result);
    }
);

/**
 * @route   GET /api/v1/crm/members/:id
 * @desc    Get member details
 * @access  Private (Staff+)
 */
router.get('/members/:id',
    authenticate,
    authorize(config.roles.ADMIN, config.roles.MANAGER, config.roles.STAFF),
    (req, res) => {
        const result = crmService.getMemberById(req.params.id);

        if (!result.success) {
            return res.status(404).json(result);
        }

        res.json(result);
    }
);

/**
 * @route   GET /api/v1/crm/members/find
 * @desc    Find member by email or phone
 * @access  Private (Staff+)
 */
router.get('/find',
    authenticate,
    authorize(config.roles.ADMIN, config.roles.MANAGER, config.roles.STAFF),
    (req, res) => {
        const result = crmService.findMember(req.query.email, req.query.phone);

        if (!result.success) {
            return res.status(404).json(result);
        }

        res.json(result);
    }
);

/**
 * @route   POST /api/v1/crm/points/redeem
 * @desc    Redeem points for discount
 * @access  Private (Customer or Staff+)
 */
router.post('/points/redeem',
    authenticate,
    (req, res) => {
        const { memberId, points } = req.body;

        // Customers can only redeem their own points
        if (req.user.role === config.roles.CUSTOMER) {
            // Get member linked to user
            const member = crmService.findMember(req.user.email);
            if (!member.success || member.data.id !== memberId) {
                return res.status(403).json({
                    success: false,
                    error: 'Cannot redeem points for another member',
                    code: 'FORBIDDEN'
                });
            }
        }

        const result = crmService.redeemPoints(memberId, points, req.user.id);

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);
    }
);

/**
 * @route   POST /api/v1/crm/coupon/validate
 * @desc    Validate coupon code
 * @access  Public
 */
router.post('/coupon/validate', (req, res) => {
    const { code, memberId, orderTotal } = req.body;
    const result = crmService.validateCoupon(code, memberId, orderTotal);

    if (!result.success) {
        return res.status(400).json(result);
    }

    res.json(result);
});

/**
 * @route   POST /api/v1/crm/coupon/assign
 * @desc    Assign coupon to member
 * @access  Private (Staff+)
 */
router.post('/coupon/assign',
    authenticate,
    authorize(config.roles.ADMIN, config.roles.MANAGER, config.roles.STAFF),
    (req, res) => {
        const { memberId, couponId } = req.body;
        const result = crmService.assignCoupon(memberId, couponId);

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);
    }
);

/**
 * @route   GET /api/v1/crm/repeat-customers
 * @desc    Get repeat customer analysis
 * @access  Private (Manager+)
 */
router.get('/repeat-customers',
    authenticate,
    authorize(config.roles.ADMIN, config.roles.MANAGER),
    branchAccess,
    (req, res) => {
        const result = crmService.getRepeatCustomers(
            req.branchId,
            parseInt(req.query.minOrders) || 2
        );
        res.json(result);
    }
);

/**
 * @route   POST /api/v1/crm/line/link
 * @desc    Link Line user ID to member (for Line OA webhook)
 * @access  Webhook (with verification)
 */
router.post('/line/link', (req, res) => {
    const { memberId, lineUserId, signature } = req.body;

    // TODO: Verify Line signature
    // For now, simplified implementation

    const result = crmService.linkLineUser(memberId, lineUserId);
    res.json(result);
});

module.exports = router;
