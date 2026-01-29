/**
 * Analytics Engine Service
 * Reports, insights, and business intelligence
 */
const db = require('../../config/database');
const logger = require('../../shared/logger');

/**
 * Get top selling products
 */
function getTopProducts(branchId, options = {}) {
    const { startDate, endDate, limit = 10 } = options;

    let query = `
        SELECT oi.product_id, oi.product_name,
               SUM(oi.quantity) as total_quantity,
               SUM(oi.total_price) as total_revenue,
               COUNT(DISTINCT oi.order_id) as order_count
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE o.branch_id = ?
        AND o.status = 'completed'
    `;
    const params = [branchId];

    if (startDate && endDate) {
        query += ' AND date(o.created_at) BETWEEN ? AND ?';
        params.push(startDate, endDate);
    }

    query += `
        GROUP BY oi.product_id
        ORDER BY total_quantity DESC
        LIMIT ?
    `;
    params.push(limit);

    const products = db.prepare(query).all(...params);

    return { success: true, data: products };
}

/**
 * Get peak hours analysis
 */
function getPeakHours(branchId, options = {}) {
    const { startDate, endDate } = options;

    let query = `
        SELECT strftime('%H', created_at) as hour,
               COUNT(*) as order_count,
               SUM(total) as total_revenue,
               AVG(total) as avg_order_value
        FROM orders
        WHERE branch_id = ?
        AND status = 'completed'
    `;
    const params = [branchId];

    if (startDate && endDate) {
        query += ' AND date(created_at) BETWEEN ? AND ?';
        params.push(startDate, endDate);
    }

    query += `
        GROUP BY hour
        ORDER BY hour ASC
    `;

    const hours = db.prepare(query).all(...params);

    // Find peak hour
    const peakHour = hours.reduce((max, h) =>
        h.order_count > (max?.order_count || 0) ? h : max,
        null
    );

    return {
        success: true,
        data: {
            hourlyBreakdown: hours,
            peakHour: peakHour?.hour || null,
            peakHourOrders: peakHour?.order_count || 0
        }
    };
}

/**
 * Get peak days of week
 */
function getPeakDays(branchId, options = {}) {
    const { startDate, endDate } = options;

    let query = `
        SELECT strftime('%w', created_at) as day_of_week,
               COUNT(*) as order_count,
               SUM(total) as total_revenue
        FROM orders
        WHERE branch_id = ?
        AND status = 'completed'
    `;
    const params = [branchId];

    if (startDate && endDate) {
        query += ' AND date(created_at) BETWEEN ? AND ?';
        params.push(startDate, endDate);
    }

    query += `
        GROUP BY day_of_week
        ORDER BY day_of_week ASC
    `;

    const days = db.prepare(query).all(...params);

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const enrichedDays = days.map(d => ({
        ...d,
        dayName: dayNames[parseInt(d.day_of_week)]
    }));

    return { success: true, data: enrichedDays };
}

/**
 * Get customer analytics
 */
function getCustomerAnalytics(branchId) {
    // Total customers
    const totalMembers = db.prepare(`
        SELECT COUNT(*) as count FROM members WHERE branch_id = ?
    `).get(branchId);

    // New customers this month
    const newThisMonth = db.prepare(`
        SELECT COUNT(*) as count FROM members 
        WHERE branch_id = ?
        AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
    `).get(branchId);

    // Tier distribution
    const tierDistribution = db.prepare(`
        SELECT tier, COUNT(*) as count
        FROM members
        WHERE branch_id = ?
        GROUP BY tier
    `).all(branchId);

    // Average order value by tier
    const avgByTier = db.prepare(`
        SELECT m.tier, AVG(o.total) as avg_order_value, COUNT(o.id) as order_count
        FROM orders o
        JOIN members m ON o.member_id = m.id
        WHERE o.branch_id = ? AND o.status = 'completed'
        GROUP BY m.tier
    `).all(branchId);

    // Repeat customer rate
    const repeatCustomers = db.prepare(`
        SELECT COUNT(*) as count
        FROM (
            SELECT member_id
            FROM orders
            WHERE branch_id = ? AND member_id IS NOT NULL AND status = 'completed'
            GROUP BY member_id
            HAVING COUNT(*) > 1
        )
    `).get(branchId);

    const totalWithOrders = db.prepare(`
        SELECT COUNT(DISTINCT member_id) as count
        FROM orders
        WHERE branch_id = ? AND member_id IS NOT NULL AND status = 'completed'
    `).get(branchId);

    const repeatRate = totalWithOrders.count > 0
        ? (repeatCustomers.count / totalWithOrders.count * 100).toFixed(2)
        : 0;

    return {
        success: true,
        data: {
            totalMembers: totalMembers.count,
            newThisMonth: newThisMonth.count,
            tierDistribution,
            avgOrderByTier: avgByTier,
            repeatCustomerRate: repeatRate
        }
    };
}

/**
 * Get revenue trend
 */
function getRevenueTrend(branchId, days = 30) {
    const trend = db.prepare(`
        SELECT date(created_at) as date,
               COUNT(*) as order_count,
               SUM(total) as revenue
        FROM orders
        WHERE branch_id = ?
        AND status = 'completed'
        AND created_at >= date('now', '-' || ? || ' days')
        GROUP BY date(created_at)
        ORDER BY date ASC
    `).all(branchId, days);

    return { success: true, data: trend };
}

/**
 * Get inventory turnover
 */
function getInventoryTurnover(branchId, days = 30) {
    const usage = db.prepare(`
        SELECT i.id, i.name, i.current_stock,
               COALESCE(SUM(ABS(st.quantity)), 0) as total_used
        FROM ingredients i
        LEFT JOIN stock_transactions st ON i.id = st.ingredient_id 
            AND st.type IN ('deduct', 'waste')
            AND st.created_at >= date('now', '-' || ? || ' days')
        WHERE i.branch_id = ?
        GROUP BY i.id
        ORDER BY total_used DESC
    `).all(days, branchId);

    // Calculate turnover rate
    const enriched = usage.map(item => ({
        ...item,
        turnoverRate: item.current_stock > 0
            ? (item.total_used / item.current_stock * 100).toFixed(2)
            : 0
    }));

    return { success: true, data: enriched };
}

/**
 * Get order status distribution
 */
function getOrderStatusDistribution(branchId, options = {}) {
    const { startDate, endDate } = options;

    let query = `
        SELECT status, COUNT(*) as count
        FROM orders
        WHERE branch_id = ?
    `;
    const params = [branchId];

    if (startDate && endDate) {
        query += ' AND date(created_at) BETWEEN ? AND ?';
        params.push(startDate, endDate);
    }

    query += ' GROUP BY status';

    const distribution = db.prepare(query).all(...params);

    return { success: true, data: distribution };
}

/**
 * Get comprehensive dashboard stats
 */
function getDashboardStats(branchId) {
    const today = new Date().toISOString().split('T')[0];

    // Today's stats
    const todayStats = db.prepare(`
        SELECT 
            COUNT(*) as orders,
            COALESCE(SUM(total), 0) as revenue,
            COALESCE(AVG(total), 0) as avg_order
        FROM orders
        WHERE branch_id = ? AND date(created_at) = ? AND status = 'completed'
    `).get(branchId, today);

    // Pending orders
    const pending = db.prepare(`
        SELECT COUNT(*) as count
        FROM orders
        WHERE branch_id = ? AND status = 'pending'
    `).get(branchId);

    // Preparing orders
    const preparing = db.prepare(`
        SELECT COUNT(*) as count
        FROM orders
        WHERE branch_id = ? AND status IN ('confirmed', 'preparing')
    `).get(branchId);

    // Ready orders
    const ready = db.prepare(`
        SELECT COUNT(*) as count
        FROM orders
        WHERE branch_id = ? AND status = 'ready'
    `).get(branchId);

    // Low stock alerts
    const lowStock = db.prepare(`
        SELECT COUNT(*) as count
        FROM ingredients
        WHERE branch_id = ? AND current_stock <= min_stock_level
    `).get(branchId);

    // Compare to yesterday
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const yesterdayStats = db.prepare(`
        SELECT COALESCE(SUM(total), 0) as revenue
        FROM orders
        WHERE branch_id = ? AND date(created_at) = ? AND status = 'completed'
    `).get(branchId, yesterday);

    const revenueChange = yesterdayStats.revenue > 0
        ? ((todayStats.revenue - yesterdayStats.revenue) / yesterdayStats.revenue * 100).toFixed(2)
        : 100;

    return {
        success: true,
        data: {
            today: {
                orders: todayStats.orders,
                revenue: todayStats.revenue,
                avgOrderValue: todayStats.avg_order
            },
            pending: pending.count,
            preparing: preparing.count,
            ready: ready.count,
            lowStockAlerts: lowStock.count,
            revenueChangePercent: parseFloat(revenueChange)
        }
    };
}

module.exports = {
    getTopProducts,
    getPeakHours,
    getPeakDays,
    getCustomerAnalytics,
    getRevenueTrend,
    getInventoryTurnover,
    getOrderStatusDistribution,
    getDashboardStats
};
