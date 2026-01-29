/**
 * Google Sheets Webhook Client
 * Sends data to Google Apps Script for automatic sheet updates
 */
const logger = require('./logger');
const config = require('../config');

// Configuration
const WEBHOOK_URL = process.env.GOOGLE_SHEETS_WEBHOOK_URL || '';
const WEBHOOK_SECRET = process.env.GOOGLE_SHEETS_WEBHOOK_SECRET || '';
const WEBHOOK_ENABLED = process.env.GOOGLE_SHEETS_ENABLED === 'true';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// Queue for failed webhooks (simple in-memory queue)
const failedQueue = [];

/**
 * Generate HMAC signature for request validation
 */
function generateSignature(payload, secret) {
    const crypto = require('crypto');
    return crypto.createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');
}

/**
 * Send webhook to Google Sheets
 * @param {string} event - Event type (e.g., 'order.created')
 * @param {object} data - Event data
 * @param {number} retryCount - Current retry attempt
 */
async function sendWebhook(event, data, retryCount = 0) {
    if (!WEBHOOK_ENABLED || !WEBHOOK_URL) {
        logger.debug('Google Sheets webhook disabled or URL not configured');
        return { success: true, skipped: true };
    }

    const payload = {
        event,
        timestamp: new Date().toISOString(),
        data,
        source: 'saramonda-backend',
        version: '1.0'
    };

    const signature = generateSignature(payload, WEBHOOK_SECRET);

    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Webhook-Signature': signature,
                'X-Webhook-Event': event
            },
            body: JSON.stringify(payload),
            timeout: 10000 // 10 second timeout
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        logger.info(`[Sheets Webhook] ${event} sent successfully`, {
            event,
            orderId: data.order_id || data.id
        });

        return { success: true, result };

    } catch (error) {
        logger.error(`[Sheets Webhook] Failed to send ${event}`, {
            error: error.message,
            retryCount,
            data: { order_id: data.order_id || data.id }
        });

        // Retry logic
        if (retryCount < MAX_RETRIES) {
            const delay = RETRY_DELAY_MS * Math.pow(2, retryCount); // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, delay));
            return sendWebhook(event, data, retryCount + 1);
        }

        // Add to failed queue for later retry
        failedQueue.push({ event, data, timestamp: Date.now() });
        logger.warn(`[Sheets Webhook] Added to retry queue`, {
            queueSize: failedQueue.length
        });

        return { success: false, error: error.message };
    }
}

// ============================================
// EVENT HELPER FUNCTIONS
// ============================================

/**
 * Send order created event
 */
async function onOrderCreated(order) {
    return sendWebhook('order.created', {
        order_id: order.id,
        order_number: order.order_number,
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        items: order.items.map(item => ({
            product_id: item.product_id,
            product_name: item.product_name,
            variant: item.variant_name || item.variant,
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: item.quantity * item.unit_price
        })),
        subtotal: order.subtotal,
        discount: order.discount_amount || 0,
        vat: order.vat_amount || Math.round(order.subtotal * 0.07),
        total: order.total_amount,
        payment_method: order.payment_method || 'cash',
        status: order.status,
        branch_id: order.branch_id,
        channel: order.channel || 'pos',
        created_at: order.created_at,
        // Delivery fields
        delivery_type: order.delivery_type || 'pickup',
        delivery_address: order.customer_address || order.delivery_address || '',
        delivery_area: order.delivery_area || '',
        delivery_date: order.delivery_date || '',
        delivery_time: order.delivery_time_slot || order.delivery_time || ''
    });
}

/**
 * Send order status changed event
 */
async function onOrderStatusChanged(order, oldStatus, newStatus) {
    const payload = {
        order_id: order.id,
        order_number: order.order_number,
        old_status: oldStatus,
        new_status: newStatus,
        updated_at: new Date().toISOString()
    };

    // If completed, also send completion event
    if (newStatus === 'completed') {
        payload.completed_at = new Date().toISOString();

        // Send order.completed event with full data for revenue tracking
        await sendWebhook('order.completed', {
            order_id: order.id,
            order_number: order.order_number,
            total: order.total_amount,
            subtotal: order.subtotal,
            vat: order.vat_amount,
            payment_method: order.payment_method,
            items: order.items,
            customer_phone: order.customer_phone,
            customer_name: order.customer_name,
            branch_id: order.branch_id,
            completed_at: payload.completed_at
        });
    }

    return sendWebhook('order.status_changed', payload);
}

/**
 * Send customer created event
 */
async function onCustomerCreated(customer) {
    return sendWebhook('customer.created', {
        customer_id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email || null,
        source: customer.source || 'pos',
        created_at: customer.created_at || new Date().toISOString()
    });
}

/**
 * Send customer order event (for CRM tracking)
 */
async function onCustomerOrder(customer, order) {
    return sendWebhook('customer.ordered', {
        customer_id: customer.id,
        customer_phone: customer.phone,
        order_id: order.id,
        order_total: order.total_amount,
        points_earned: order.points_earned || 0,
        total_orders: customer.total_orders || 1,
        total_spent: customer.total_spent || order.total_amount
    });
}

/**
 * Send daily summary
 */
async function sendDailySummary(summaryData) {
    return sendWebhook('daily.summary', {
        date: summaryData.date,
        branch_id: summaryData.branch_id,
        total_orders: summaryData.total_orders,
        total_revenue: summaryData.total_revenue,
        total_vat: summaryData.total_vat,
        payment_breakdown: summaryData.payment_breakdown,
        top_products: summaryData.top_products,
        new_customers: summaryData.new_customers,
        repeat_customers: summaryData.repeat_customers
    });
}

/**
 * Send expense entry
 */
async function onExpenseCreated(expense) {
    return sendWebhook('expense.created', {
        expense_id: expense.id,
        date: expense.date,
        category: expense.category,
        description: expense.description,
        amount: expense.amount,
        payment_method: expense.payment_method,
        receipt_url: expense.receipt_url || null,
        branch_id: expense.branch_id,
        created_by: expense.created_by
    });
}

/**
 * Send menu performance data
 */
async function sendMenuPerformance(performanceData) {
    return sendWebhook('menu.performance', {
        date: performanceData.date,
        branch_id: performanceData.branch_id,
        products: performanceData.products.map(p => ({
            product_id: p.product_id,
            product_name: p.product_name,
            category: p.category,
            quantity_sold: p.quantity_sold,
            revenue: p.revenue,
            avg_order_size: p.avg_order_size
        }))
    });
}

// ============================================
// QUEUE MANAGEMENT
// ============================================

/**
 * Retry failed webhooks from queue
 */
async function retryFailedWebhooks() {
    if (failedQueue.length === 0) return;

    logger.info(`[Sheets Webhook] Retrying ${failedQueue.length} failed webhooks`);

    const toRetry = [...failedQueue];
    failedQueue.length = 0; // Clear queue

    for (const item of toRetry) {
        await sendWebhook(item.event, item.data);
    }
}

/**
 * Get queue status
 */
function getQueueStatus() {
    return {
        enabled: WEBHOOK_ENABLED,
        configured: !!WEBHOOK_URL,
        queueSize: failedQueue.length,
        queueItems: failedQueue.map(f => ({
            event: f.event,
            timestamp: new Date(f.timestamp).toISOString()
        }))
    };
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
    // Core
    sendWebhook,

    // Order Events
    onOrderCreated,
    onOrderStatusChanged,

    // Customer Events
    onCustomerCreated,
    onCustomerOrder,

    // Reporting Events
    sendDailySummary,
    sendMenuPerformance,

    // Expense Events
    onExpenseCreated,

    // Queue Management
    retryFailedWebhooks,
    getQueueStatus,

    // Status
    isEnabled: () => WEBHOOK_ENABLED && !!WEBHOOK_URL
};
