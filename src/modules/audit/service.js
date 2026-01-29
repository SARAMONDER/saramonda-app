/**
 * Audit Log Service
 * Tracks all critical actions for security and compliance
 */
const { v4: uuidv4 } = require('uuid');
const db = require('../../config/database');
const logger = require('../../shared/logger');

/**
 * Log an audit event
 */
function auditLog(action, entityType, entityId, oldData = null, newData = null, userId = null, metadata = {}) {
    const { branchId, ipAddress, userAgent } = metadata;

    try {
        db.prepare(`
            INSERT INTO audit_logs (id, branch_id, user_id, action, entity_type, entity_id, old_data, new_data, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            uuidv4(),
            branchId || null,
            userId,
            action,
            entityType,
            entityId,
            oldData ? JSON.stringify(oldData) : null,
            newData ? JSON.stringify(newData) : null,
            ipAddress || null,
            userAgent || null
        );

        // Also log to file
        logger.audit(action, {
            entityType,
            entityId,
            userId,
            oldData: oldData ? '[DATA]' : null,
            newData: newData ? '[DATA]' : null
        });
    } catch (error) {
        // Don't fail the main operation if audit logging fails
        logger.error('Audit log error:', error);
    }
}

/**
 * Get audit logs with filters
 */
function getAuditLogs(filters = {}) {
    const {
        branchId,
        userId,
        action,
        entityType,
        entityId,
        startDate,
        endDate,
        page = 1,
        limit = 50
    } = filters;

    let query = `
        SELECT al.*, u.name as user_name, u.email as user_email
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE 1=1
    `;
    const params = [];

    if (branchId) {
        query += ' AND al.branch_id = ?';
        params.push(branchId);
    }

    if (userId) {
        query += ' AND al.user_id = ?';
        params.push(userId);
    }

    if (action) {
        query += ' AND al.action = ?';
        params.push(action);
    }

    if (entityType) {
        query += ' AND al.entity_type = ?';
        params.push(entityType);
    }

    if (entityId) {
        query += ' AND al.entity_id = ?';
        params.push(entityId);
    }

    if (startDate) {
        query += ' AND al.created_at >= ?';
        params.push(startDate);
    }

    if (endDate) {
        query += ' AND al.created_at <= ?';
        params.push(endDate);
    }

    query += ' ORDER BY al.created_at DESC';
    query += ` LIMIT ? OFFSET ?`;
    params.push(limit, (page - 1) * limit);

    const logs = db.prepare(query).all(...params);

    // Parse JSON data
    const enrichedLogs = logs.map(log => ({
        ...log,
        old_data: log.old_data ? JSON.parse(log.old_data) : null,
        new_data: log.new_data ? JSON.parse(log.new_data) : null
    }));

    return { success: true, data: enrichedLogs };
}

/**
 * Get audit log for specific entity
 */
function getEntityHistory(entityType, entityId) {
    const logs = db.prepare(`
        SELECT al.*, u.name as user_name
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE al.entity_type = ? AND al.entity_id = ?
        ORDER BY al.created_at ASC
    `).all(entityType, entityId);

    return {
        success: true,
        data: logs.map(log => ({
            ...log,
            old_data: log.old_data ? JSON.parse(log.old_data) : null,
            new_data: log.new_data ? JSON.parse(log.new_data) : null
        }))
    };
}

/**
 * Get user activity log
 */
function getUserActivity(userId, options = {}) {
    const { page = 1, limit = 50 } = options;

    const logs = db.prepare(`
        SELECT * FROM audit_logs
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
    `).all(userId, limit, (page - 1) * limit);

    return { success: true, data: logs };
}

/**
 * Get security events (failed logins, unauthorized access, etc.)
 */
function getSecurityEvents(branchId, options = {}) {
    const { startDate, endDate, limit = 100 } = options;

    let query = `
        SELECT * FROM audit_logs
        WHERE action IN ('LOGIN_FAILED', 'UNAUTHORIZED_ACCESS', 'PASSWORD_CHANGE', 'USER_DISABLED')
    `;
    const params = [];

    if (branchId) {
        query += ' AND branch_id = ?';
        params.push(branchId);
    }

    if (startDate && endDate) {
        query += ' AND created_at BETWEEN ? AND ?';
        params.push(startDate, endDate);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const events = db.prepare(query).all(...params);

    return { success: true, data: events };
}

/**
 * Cleanup old audit logs (for data retention policy)
 */
function cleanupOldLogs(retentionDays = 90) {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

    const result = db.prepare(`
        DELETE FROM audit_logs
        WHERE created_at < ?
    `).run(cutoffDate);

    logger.info('Audit logs cleaned up', { deletedCount: result.changes, retentionDays });

    return { success: true, data: { deletedCount: result.changes } };
}

// Predefined action types for consistency
const AUDIT_ACTIONS = {
    // User actions
    USER_REGISTER: 'USER_REGISTER',
    USER_LOGIN: 'USER_LOGIN',
    USER_LOGOUT: 'USER_LOGOUT',
    LOGIN_FAILED: 'LOGIN_FAILED',
    PASSWORD_CHANGE: 'PASSWORD_CHANGE',
    USER_UPDATE: 'USER_UPDATE',
    USER_DISABLED: 'USER_DISABLED',

    // Order actions
    ORDER_CREATE: 'ORDER_CREATE',
    ORDER_STATUS_UPDATE: 'ORDER_STATUS_UPDATE',
    ORDER_CANCEL: 'ORDER_CANCEL',
    ORDER_MODIFY: 'ORDER_MODIFY',

    // Stock actions
    STOCK_ADJUST: 'STOCK_ADJUST',
    STOCK_DEDUCT: 'STOCK_DEDUCT',
    INGREDIENT_CREATE: 'INGREDIENT_CREATE',
    RECIPE_CREATE: 'RECIPE_CREATE',

    // Finance actions
    PAYMENT_RECORD: 'PAYMENT_RECORD',
    REFUND_PROCESS: 'REFUND_PROCESS',

    // CRM actions
    POINTS_ADD: 'POINTS_ADD',
    POINTS_REDEEM: 'POINTS_REDEEM',
    COUPON_CREATE: 'COUPON_CREATE',
    COUPON_USE: 'COUPON_USE',

    // Admin actions
    PRODUCT_CREATE: 'PRODUCT_CREATE',
    PRODUCT_UPDATE: 'PRODUCT_UPDATE',
    PRODUCT_DELETE: 'PRODUCT_DELETE',
    SETTINGS_UPDATE: 'SETTINGS_UPDATE',
    DATA_EXPORT: 'DATA_EXPORT',
    DATA_IMPORT: 'DATA_IMPORT'
};

module.exports = {
    auditLog,
    getAuditLogs,
    getEntityHistory,
    getUserActivity,
    getSecurityEvents,
    cleanupOldLogs,
    AUDIT_ACTIONS
};
