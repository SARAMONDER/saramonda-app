/**
 * Audit Log Routes
 * API endpoints for viewing audit logs
 */
const express = require('express');
const router = express.Router();
const auditService = require('./service');
const { authenticate, authorize, branchAccess } = require('../../middleware/auth');
const { heavyOperationLimiter } = require('../../middleware/rateLimiter');
const config = require('../../config');

/**
 * @route   GET /api/v1/audit/logs
 * @desc    Get audit logs with filters
 * @access  Private (Admin only)
 */
router.get('/logs',
    authenticate,
    authorize(config.roles.ADMIN),
    branchAccess,
    heavyOperationLimiter,
    (req, res) => {
        const result = auditService.getAuditLogs({
            branchId: req.branchId,
            userId: req.query.userId,
            action: req.query.action,
            entityType: req.query.entityType,
            entityId: req.query.entityId,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 50
        });
        res.json(result);
    }
);

/**
 * @route   GET /api/v1/audit/entity/:type/:id
 * @desc    Get audit history for specific entity
 * @access  Private (Admin only)
 */
router.get('/entity/:type/:id',
    authenticate,
    authorize(config.roles.ADMIN),
    (req, res) => {
        const result = auditService.getEntityHistory(req.params.type, req.params.id);
        res.json(result);
    }
);

/**
 * @route   GET /api/v1/audit/user/:userId
 * @desc    Get user activity log
 * @access  Private (Admin only)
 */
router.get('/user/:userId',
    authenticate,
    authorize(config.roles.ADMIN),
    (req, res) => {
        const result = auditService.getUserActivity(req.params.userId, {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 50
        });
        res.json(result);
    }
);

/**
 * @route   GET /api/v1/audit/security
 * @desc    Get security events
 * @access  Private (Admin only)
 */
router.get('/security',
    authenticate,
    authorize(config.roles.ADMIN),
    branchAccess,
    (req, res) => {
        const result = auditService.getSecurityEvents(req.branchId, {
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            limit: parseInt(req.query.limit) || 100
        });
        res.json(result);
    }
);

/**
 * @route   POST /api/v1/audit/cleanup
 * @desc    Cleanup old audit logs (for data retention)
 * @access  Private (Admin only)
 */
router.post('/cleanup',
    authenticate,
    authorize(config.roles.ADMIN),
    (req, res) => {
        const retentionDays = parseInt(req.body.retentionDays) || 90;
        const result = auditService.cleanupOldLogs(retentionDays);
        res.json(result);
    }
);

module.exports = router;
