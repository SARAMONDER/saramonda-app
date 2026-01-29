/**
 * Finance System Service
 * Payment processing, cost analysis, and P&L reports
 */
const { v4: uuidv4 } = require('uuid');
const db = require('../../config/database');
const config = require('../../config');
const logger = require('../../shared/logger');
const { auditLog } = require('../audit/service');

/**
 * Record payment for order
 */
function recordPayment(orderId, paymentData, userId = null) {
    const { amount, paymentMethod, transactionRef = null } = paymentData;

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    if (!order) {
        return { success: false, error: 'Order not found', code: 'ORDER_NOT_FOUND' };
    }

    const paymentId = uuidv4();

    try {
        db.prepare(`
            INSERT INTO payments (id, order_id, branch_id, amount, payment_method, payment_status, transaction_ref)
            VALUES (?, ?, ?, ?, ?, 'completed', ?)
        `).run(paymentId, orderId, order.branch_id, amount, paymentMethod, transactionRef);

        // Update order payment status
        db.prepare(`
            UPDATE orders SET payment_status = 'paid', payment_method = ?
            WHERE id = ?
        `).run(paymentMethod, orderId);

        auditLog('PAYMENT_RECORD', 'payments', paymentId, null, { amount, paymentMethod }, userId);

        logger.info('Payment recorded', { paymentId, orderId, amount, paymentMethod });

        return { success: true, data: { paymentId } };
    } catch (error) {
        logger.error('Payment record error:', error);
        return { success: false, error: 'Failed to record payment', code: 'PAYMENT_FAILED' };
    }
}

/**
 * Get daily summary (P&L)
 */
function getDailySummary(branchId, date) {
    // Try to get existing summary
    let summary = db.prepare(`
        SELECT * FROM daily_summary 
        WHERE branch_id = ? AND date = ?
    `).get(branchId, date);

    if (!summary) {
        // Calculate fresh
        summary = calculateDailySummary(branchId, date);
    }

    return { success: true, data: summary };
}

/**
 * Calculate and store daily summary
 */
function calculateDailySummary(branchId, date) {
    const orders = db.prepare(`
        SELECT * FROM orders 
        WHERE branch_id = ? 
        AND date(created_at) = ?
        AND status = 'completed'
    `).all(branchId, date);

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const discountsGiven = orders.reduce((sum, o) => sum + o.discount_amount, 0);
    const taxCollected = orders.reduce((sum, o) => sum + o.tax_amount, 0);

    // Calculate total cost from order items
    const orderIds = orders.map(o => `'${o.id}'`).join(',');
    let totalCost = 0;

    if (orderIds) {
        const costResult = db.prepare(`
            SELECT SUM(cost_price) as total_cost
            FROM order_items
            WHERE order_id IN (${orderIds})
        `).get();
        totalCost = costResult?.total_cost || 0;
    }

    const grossProfit = totalRevenue - totalCost;
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue * 100) : 0;

    // Payment breakdown
    const cashSales = orders.filter(o => o.payment_method === 'cash').reduce((sum, o) => sum + o.total, 0);
    const cardSales = orders.filter(o => o.payment_method === 'card').reduce((sum, o) => sum + o.total, 0);
    const otherSales = totalRevenue - cashSales - cardSales;

    const summary = {
        id: uuidv4(),
        branch_id: branchId,
        date,
        total_orders: totalOrders,
        total_revenue: totalRevenue,
        total_cost: totalCost,
        gross_profit: grossProfit,
        gross_margin: grossMargin.toFixed(2),
        cash_sales: cashSales,
        card_sales: cardSales,
        other_sales: otherSales,
        discounts_given: discountsGiven,
        tax_collected: taxCollected
    };

    // Store summary
    try {
        db.prepare(`
            INSERT OR REPLACE INTO daily_summary 
            (id, branch_id, date, total_orders, total_revenue, total_cost, gross_profit, gross_margin,
             cash_sales, card_sales, other_sales, discounts_given, tax_collected, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).run(
            summary.id, branchId, date, totalOrders, totalRevenue, totalCost, grossProfit, grossMargin,
            cashSales, cardSales, otherSales, discountsGiven, taxCollected
        );
    } catch (error) {
        logger.error('Store daily summary error:', error);
    }

    return summary;
}

/**
 * Get monthly P&L report
 */
function getMonthlyReport(branchId, year, month) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

    const summaries = db.prepare(`
        SELECT * FROM daily_summary
        WHERE branch_id = ? AND date >= ? AND date <= ?
        ORDER BY date ASC
    `).all(branchId, startDate, endDate);

    // Calculate monthly totals
    const monthlyTotals = {
        totalOrders: summaries.reduce((sum, s) => sum + s.total_orders, 0),
        totalRevenue: summaries.reduce((sum, s) => sum + s.total_revenue, 0),
        totalCost: summaries.reduce((sum, s) => sum + s.total_cost, 0),
        grossProfit: summaries.reduce((sum, s) => sum + s.gross_profit, 0),
        cashSales: summaries.reduce((sum, s) => sum + s.cash_sales, 0),
        cardSales: summaries.reduce((sum, s) => sum + s.card_sales, 0),
        discountsGiven: summaries.reduce((sum, s) => sum + s.discounts_given, 0),
        taxCollected: summaries.reduce((sum, s) => sum + s.tax_collected, 0)
    };

    monthlyTotals.avgOrderValue = monthlyTotals.totalOrders > 0
        ? (monthlyTotals.totalRevenue / monthlyTotals.totalOrders).toFixed(2)
        : 0;
    monthlyTotals.grossMargin = monthlyTotals.totalRevenue > 0
        ? (monthlyTotals.grossProfit / monthlyTotals.totalRevenue * 100).toFixed(2)
        : 0;

    return {
        success: true,
        data: {
            year,
            month,
            branchId,
            dailySummaries: summaries,
            monthlyTotals
        }
    };
}

/**
 * Get menu cost analysis
 */
function getMenuCostAnalysis(branchId) {
    const products = db.prepare(`
        SELECT p.id, p.name, p.base_price, p.cost_price,
               (p.base_price - p.cost_price) as profit,
               CASE WHEN p.base_price > 0 
                    THEN ((p.base_price - p.cost_price) / p.base_price * 100) 
                    ELSE 0 END as margin
        FROM products p
        WHERE p.branch_id = ?
        ORDER BY margin DESC
    `).all(branchId);

    return { success: true, data: products };
}

/**
 * Get revenue breakdown by category
 */
function getRevenueByCategory(branchId, startDate, endDate) {
    const breakdown = db.prepare(`
        SELECT c.name as category, 
               COUNT(DISTINCT o.id) as order_count,
               SUM(oi.total_price) as revenue,
               SUM(oi.cost_price) as cost
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        JOIN products p ON oi.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE o.branch_id = ? 
        AND date(o.created_at) BETWEEN ? AND ?
        AND o.status = 'completed'
        GROUP BY c.id
        ORDER BY revenue DESC
    `).all(branchId, startDate, endDate);

    return { success: true, data: breakdown };
}

/**
 * Get payment method breakdown
 */
function getPaymentBreakdown(branchId, startDate, endDate) {
    const breakdown = db.prepare(`
        SELECT payment_method,
               COUNT(*) as count,
               SUM(amount) as total
        FROM payments
        WHERE branch_id = ?
        AND date(created_at) BETWEEN ? AND ?
        AND payment_status = 'completed'
        GROUP BY payment_method
        ORDER BY total DESC
    `).all(branchId, startDate, endDate);

    return { success: true, data: breakdown };
}

/**
 * Generate end-of-day cash report
 */
function generateCashReport(branchId, date) {
    const cashOrders = db.prepare(`
        SELECT * FROM orders
        WHERE branch_id = ?
        AND date(created_at) = ?
        AND payment_method = 'cash'
        AND status = 'completed'
    `).all(branchId, date);

    const totalCash = cashOrders.reduce((sum, o) => sum + o.total, 0);
    const orderCount = cashOrders.length;

    return {
        success: true,
        data: {
            date,
            branchId,
            cashOrderCount: orderCount,
            totalCashReceived: totalCash,
            orders: cashOrders.map(o => ({
                orderNumber: o.order_number,
                total: o.total,
                time: o.created_at
            }))
        }
    };
}

module.exports = {
    recordPayment,
    getDailySummary,
    calculateDailySummary,
    getMonthlyReport,
    getMenuCostAnalysis,
    getRevenueByCategory,
    getPaymentBreakdown,
    generateCashReport
};
