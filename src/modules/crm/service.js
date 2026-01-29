/**
 * CRM (Customer Relationship Management) Service
 * Points, tiers, coupons, and customer management
 */
const { v4: uuidv4 } = require('uuid');
const db = require('../../config/database');
const config = require('../../config');
const logger = require('../../shared/logger');
const { auditLog } = require('../audit/service');

/**
 * Get member by ID
 */
function getMemberById(memberId) {
    const member = db.prepare(`
        SELECT m.*, u.email as user_email
        FROM members m
        LEFT JOIN users u ON m.user_id = u.id
        WHERE m.id = ?
    `).get(memberId);

    if (!member) {
        return { success: false, error: 'Member not found', code: 'MEMBER_NOT_FOUND' };
    }

    // Get order history
    const orders = db.prepare(`
        SELECT id, order_number, total, points_earned, created_at
        FROM orders
        WHERE member_id = ?
        ORDER BY created_at DESC
        LIMIT 10
    `).all(memberId);

    // Get coupons
    const coupons = db.prepare(`
        SELECT c.code, c.type, c.value, c.min_order_amount, mc.is_used
        FROM member_coupons mc
        JOIN coupons c ON mc.coupon_id = c.id
        WHERE mc.member_id = ?
        ORDER BY mc.created_at DESC
    `).all(memberId);

    return {
        success: true,
        data: {
            ...member,
            tierInfo: config.memberTiers[member.tier],
            recentOrders: orders,
            coupons
        }
    };
}

/**
 * Get member by email or phone
 */
function findMember(email = null, phone = null) {
    let query = 'SELECT * FROM members WHERE ';
    const params = [];

    if (email) {
        query += 'email = ?';
        params.push(email);
    } else if (phone) {
        query += 'phone = ?';
        params.push(phone);
    } else {
        return { success: false, error: 'Email or phone required', code: 'MISSING_IDENTIFIER' };
    }

    const member = db.prepare(query).get(...params);

    if (!member) {
        return { success: false, error: 'Member not found', code: 'MEMBER_NOT_FOUND' };
    }

    return { success: true, data: member };
}

/**
 * Add points to member
 */
function addPoints(memberId, orderTotal, orderId = null) {
    const member = db.prepare('SELECT * FROM members WHERE id = ?').get(memberId);

    if (!member) {
        logger.warn('Member not found for points', { memberId });
        return 0;
    }

    // Calculate points (฿1 = 1 point, with tier multiplier)
    const tierMultiplier = config.memberTiers[member.tier]?.pointMultiplier || 1;
    const basePoints = Math.floor(orderTotal);
    const earnedPoints = Math.floor(basePoints * tierMultiplier);

    const transaction = db.transaction(() => {
        // Update member points
        db.prepare(`
            UPDATE members 
            SET points = points + ?, 
                total_points = total_points + ?,
                total_spent = total_spent + ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(earnedPoints, earnedPoints, orderTotal, memberId);

        // Log points transaction
        db.prepare(`
            INSERT INTO points_transactions (id, member_id, order_id, type, points, description)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(uuidv4(), memberId, orderId, 'earn', earnedPoints, `Earned from order`);

        // Check for tier upgrade
        const updatedMember = db.prepare('SELECT total_points, tier FROM members WHERE id = ?').get(memberId);
        const newTier = calculateTier(updatedMember.total_points);

        if (newTier !== updatedMember.tier) {
            db.prepare('UPDATE members SET tier = ? WHERE id = ?').run(newTier, memberId);
            logger.info('Member tier upgraded', { memberId, oldTier: updatedMember.tier, newTier });

            // Could trigger notification here
        }
    });

    try {
        transaction();
        logger.info('Points added', { memberId, earnedPoints, orderTotal });
        return earnedPoints;
    } catch (error) {
        logger.error('Add points error:', error);
        return 0;
    }
}

/**
 * Calculate tier based on total points
 */
function calculateTier(totalPoints) {
    const tiers = Object.entries(config.memberTiers)
        .sort((a, b) => b[1].minPoints - a[1].minPoints);

    for (const [tierName, tierData] of tiers) {
        if (totalPoints >= tierData.minPoints) {
            return tierName;
        }
    }

    return 'BRONZE';
}

/**
 * Redeem points for discount
 */
function redeemPoints(memberId, points, userId = null) {
    const member = db.prepare('SELECT * FROM members WHERE id = ?').get(memberId);

    if (!member) {
        return { success: false, error: 'Member not found', code: 'MEMBER_NOT_FOUND' };
    }

    if (member.points < points) {
        return { success: false, error: 'Insufficient points', code: 'INSUFFICIENT_POINTS' };
    }

    // Points to discount ratio (100 points = ฿10)
    const discountValue = Math.floor(points / 10);

    // Create coupon for member
    const couponCode = `REDEEM${Date.now()}`;
    const couponId = uuidv4();

    const transaction = db.transaction(() => {
        // Create coupon
        db.prepare(`
            INSERT INTO coupons (id, code, type, value, min_order_amount, usage_limit, is_active)
            VALUES (?, ?, 'fixed', ?, 0, 1, 1)
        `).run(couponId, couponCode, discountValue);

        // Assign to member
        db.prepare(`
            INSERT INTO member_coupons (id, member_id, coupon_id)
            VALUES (?, ?, ?)
        `).run(uuidv4(), memberId, couponId);

        // Deduct points
        db.prepare(`
            UPDATE members SET points = points - ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(points, memberId);

        // Log transaction
        db.prepare(`
            INSERT INTO points_transactions (id, member_id, type, points, description)
            VALUES (?, ?, 'redeem', ?, ?)
        `).run(uuidv4(), memberId, -points, `Redeemed for ฿${discountValue} discount`);
    });

    try {
        transaction();

        auditLog('POINTS_REDEEM', 'members', memberId, null, { points, discountValue }, userId);

        return {
            success: true,
            data: {
                couponCode,
                discountValue,
                pointsUsed: points,
                remainingPoints: member.points - points
            }
        };
    } catch (error) {
        logger.error('Redeem points error:', error);
        return { success: false, error: 'Redemption failed', code: 'REDEEM_FAILED' };
    }
}

/**
 * Create and assign coupon to member
 */
function assignCoupon(memberId, couponId) {
    const existing = db.prepare(`
        SELECT id FROM member_coupons 
        WHERE member_id = ? AND coupon_id = ?
    `).get(memberId, couponId);

    if (existing) {
        return { success: false, error: 'Coupon already assigned', code: 'COUPON_EXISTS' };
    }

    db.prepare(`
        INSERT INTO member_coupons (id, member_id, coupon_id)
        VALUES (?, ?, ?)
    `).run(uuidv4(), memberId, couponId);

    return { success: true };
}

/**
 * Validate coupon for member
 */
function validateCoupon(code, memberId = null, orderTotal = 0) {
    const coupon = db.prepare(`
        SELECT * FROM coupons 
        WHERE code = ? AND is_active = 1
        AND (valid_from IS NULL OR valid_from <= datetime('now'))
        AND (valid_until IS NULL OR valid_until >= datetime('now'))
        AND (usage_limit IS NULL OR usage_count < usage_limit)
    `).get(code);

    if (!coupon) {
        return { success: false, error: 'Invalid or expired coupon', code: 'INVALID_COUPON' };
    }

    if (orderTotal < coupon.min_order_amount) {
        return {
            success: false,
            error: `Minimum order amount is ฿${coupon.min_order_amount}`,
            code: 'MIN_ORDER_NOT_MET'
        };
    }

    // Calculate discount
    let discountAmount;
    if (coupon.type === 'fixed') {
        discountAmount = coupon.value;
    } else if (coupon.type === 'percent') {
        discountAmount = orderTotal * (coupon.value / 100);
        if (coupon.max_discount) {
            discountAmount = Math.min(discountAmount, coupon.max_discount);
        }
    }

    return {
        success: true,
        data: {
            couponId: coupon.id,
            code: coupon.code,
            type: coupon.type,
            discountAmount
        }
    };
}

/**
 * Get all members with filters
 */
function getMembers(filters = {}) {
    const { branchId, tier, page = 1, limit = 20 } = filters;

    let query = 'SELECT * FROM members WHERE 1=1';
    const params = [];

    if (branchId) {
        query += ' AND branch_id = ?';
        params.push(branchId);
    }

    if (tier) {
        query += ' AND tier = ?';
        params.push(tier);
    }

    query += ' ORDER BY total_points DESC';
    query += ` LIMIT ? OFFSET ?`;
    params.push(limit, (page - 1) * limit);

    const members = db.prepare(query).all(...params);

    return { success: true, data: members };
}

/**
 * Get repeat customers analysis
 */
function getRepeatCustomers(branchId, minOrders = 2) {
    const customers = db.prepare(`
        SELECT m.*, COUNT(o.id) as order_count, SUM(o.total) as total_spent
        FROM members m
        JOIN orders o ON m.id = o.member_id
        WHERE m.branch_id = ?
        GROUP BY m.id
        HAVING order_count >= ?
        ORDER BY order_count DESC, total_spent DESC
        LIMIT 100
    `).all(branchId, minOrders);

    return { success: true, data: customers };
}

/**
 * Line OA Webhook ready - link Line user to member
 */
function linkLineUser(memberId, lineUserId) {
    db.prepare('UPDATE members SET line_user_id = ? WHERE id = ?').run(lineUserId, memberId);
    logger.info('Line user linked', { memberId, lineUserId });
    return { success: true };
}

module.exports = {
    getMemberById,
    findMember,
    addPoints,
    calculateTier,
    redeemPoints,
    assignCoupon,
    validateCoupon,
    getMembers,
    getRepeatCustomers,
    linkLineUser
};
