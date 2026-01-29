/**
 * Order Engine Service
 * Core order processing with server-side price calculation
 */
const { v4: uuidv4 } = require('uuid');
const db = require('../../config/database');
const config = require('../../config');
const logger = require('../../shared/logger');
const googleSheets = require('../../shared/googleSheets');
const lineMessaging = require('../../shared/lineMessaging');

/**
 * Generate order number (SAR-MMDD-XXX)
 */
function generateOrderNumber(branchId) {
    const now = new Date();
    const dateStr = `${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

    const today = now.toISOString().split('T')[0];
    const count = db.prepare(`SELECT COUNT(*) as count FROM orders WHERE branch_id = ? AND date(created_at) = ?`).get(branchId, today);

    const sequence = String((count?.count || 0) + 1).padStart(3, '0');
    return `SAR-${dateStr}-${sequence}`;
}

/**
 * Calculate price server-side (SECURITY: Never trust client prices)
 */
function calculateOrderPrice(items) {
    let subtotal = 0;
    let totalCost = 0;
    const calculatedItems = [];

    for (const item of items) {
        const product = db.prepare(`SELECT id, name, name_en, base_price, cost_price FROM products WHERE id = ? AND is_available = 1`).get(item.productId);

        if (!product) {
            return { success: false, error: `Product not found: ${item.productId}`, code: 'PRODUCT_NOT_FOUND' };
        }

        let unitPrice = product.base_price || 0;
        let variantName = null;

        if (item.variantId) {
            const variant = db.prepare(`SELECT name, price_modifier FROM product_variants WHERE id = ? AND product_id = ?`).get(item.variantId, item.productId);
            if (variant) {
                unitPrice += variant.price_modifier || 0;
                variantName = variant.name;
            }
        }

        const itemTotal = unitPrice * item.quantity;
        const itemCost = (product.cost_price || 0) * item.quantity;

        subtotal += itemTotal;
        totalCost += itemCost;

        calculatedItems.push({
            productId: product.id,
            variantId: item.variantId || null,
            productName: product.name,
            variantName,
            quantity: item.quantity,
            unitPrice,
            totalPrice: itemTotal,
            costPrice: itemCost,
            notes: item.notes || null
        });
    }

    const taxAmount = subtotal * 0.07;
    const total = subtotal + taxAmount;

    return {
        success: true,
        data: { items: calculatedItems, subtotal, discountAmount: 0, taxAmount, total, totalCost }
    };
}

/**
 * Create new order
 */
function createOrder(orderData, userId = null, branchId = null) {
    try {
        const {
            items,
            customerName,
            customerPhone,
            customerAddress,
            deliveryType = 'pickup',
            paymentMethod = 'cash',
            notes
        } = orderData;

        const effectiveBranchId = branchId || config.branch.defaultId || 'branch_001';

        // Calculate prices server-side
        const priceCalc = calculateOrderPrice(items);
        if (!priceCalc.success) {
            return priceCalc;
        }

        const { items: calculatedItems, subtotal, discountAmount, taxAmount, total } = priceCalc.data;

        const orderId = uuidv4();
        const orderNumber = generateOrderNumber(effectiveBranchId);
        const estimatedPrepTime = 10 + (items.length * 2);

        // Insert order
        db.prepare(`INSERT INTO orders (id, order_number, branch_id, customer_name, customer_phone, customer_address, status, subtotal, discount_amount, tax_amount, total, payment_method, notes, priority, estimated_prep_time, delivery_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(orderId, orderNumber, effectiveBranchId, customerName, customerPhone || null, customerAddress || null, 'pending', subtotal, discountAmount, taxAmount, total, paymentMethod, notes || null, 'normal', estimatedPrepTime, deliveryType);

        // Insert order items
        for (const item of calculatedItems) {
            db.prepare(`INSERT INTO order_items (id, order_id, product_id, variant_id, product_name, variant_name, quantity, unit_price, total_price, cost_price, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
                .run(uuidv4(), orderId, item.productId, item.variantId, item.productName, item.variantName, item.quantity, item.unitPrice, item.totalPrice, item.costPrice, item.notes);
        }

        // Add initial status history
        db.prepare(`INSERT INTO order_status_history (id, order_id, status, changed_by, notes) VALUES (?, ?, ?, ?, ?)`)
            .run(uuidv4(), orderId, 'pending', userId, 'Order created');

        logger.info('Order created', { orderId, orderNumber, total });

        // Send to Google Sheets (async, non-blocking)
        if (googleSheets.isEnabled()) {
            googleSheets.onOrderCreated({
                id: orderId,
                order_number: orderNumber,
                customer_name: customerName,
                customer_phone: customerPhone,
                items: calculatedItems.map(item => ({
                    product_id: item.productId,
                    product_name: item.productName,
                    variant_name: item.variantName,
                    quantity: item.quantity,
                    unit_price: item.unitPrice
                })),
                subtotal,
                discount_amount: discountAmount,
                vat_amount: taxAmount,
                total_amount: total,
                payment_method: paymentMethod,
                status: 'pending',
                branch_id: effectiveBranchId,
                channel: orderData.channel || 'api',
                created_at: new Date().toISOString(),
                // Delivery fields
                delivery_type: deliveryType,
                customer_address: customerAddress,
                delivery_area: orderData.deliveryArea || '',
                delivery_date: orderData.deliveryDate || '',
                delivery_time_slot: orderData.deliveryTimeSlot || ''
            }).catch(err => logger.error('Google Sheets webhook error:', err));
        }

        // Send LINE notification to admin (async, non-blocking)
        if (lineMessaging.isEnabled()) {
            lineMessaging.notifyNewOrder({
                order_number: orderNumber,
                customer_name: customerName,
                customer_phone: customerPhone,
                customer_address: customerAddress,
                items: calculatedItems.map(item => ({
                    product_name: item.productName,
                    variant_name: item.variantName,
                    quantity: item.quantity
                })),
                total_amount: total,
                delivery_type: deliveryType,
                delivery_date: orderData.deliveryDate,
                delivery_time_slot: orderData.deliveryTimeSlot
            }).catch(err => logger.error('LINE notification error:', err));
        }

        return {
            success: true,
            data: {
                orderId,
                orderNumber,
                status: 'pending',
                subtotal,
                discountAmount,
                taxAmount,
                total,
                estimatedPrepTime,
                items: calculatedItems
            }
        };
    } catch (error) {
        logger.error('Order creation error:', error);
        return { success: false, error: 'Failed to create order: ' + error.message, code: 'ORDER_CREATE_FAILED' };
    }
}

/**
 * Update order status
 */
function updateOrderStatus(orderId, newStatus, userId = null, notes = null) {
    try {
        const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);

        if (!order) {
            return { success: false, error: 'Order not found', code: 'ORDER_NOT_FOUND' };
        }

        const oldStatus = order.status;

        const validTransitions = {
            pending: ['confirmed', 'cancelled'],
            confirmed: ['preparing', 'cancelled'],
            preparing: ['ready', 'cancelled'],
            ready: ['completed', 'cancelled'],
            completed: [],
            cancelled: []
        };

        if (!validTransitions[oldStatus]?.includes(newStatus)) {
            return { success: false, error: `Cannot transition from ${oldStatus} to ${newStatus}`, code: 'INVALID_STATUS_TRANSITION' };
        }

        const completedAt = newStatus === 'completed' ? new Date().toISOString() : null;

        db.prepare(`UPDATE orders SET status = ?, completed_at = ? WHERE id = ?`).run(newStatus, completedAt, orderId);
        db.prepare(`INSERT INTO order_status_history (id, order_id, status, changed_by, notes) VALUES (?, ?, ?, ?, ?)`).run(uuidv4(), orderId, newStatus, userId, notes);

        logger.info('Order status updated', { orderId, oldStatus, newStatus });

        // Send to Google Sheets (async, non-blocking)
        if (googleSheets.isEnabled()) {
            const orderData = getOrderById(orderId);
            if (orderData.success) {
                googleSheets.onOrderStatusChanged(
                    orderData.data,
                    oldStatus,
                    newStatus
                ).catch(err => logger.error('Google Sheets webhook error:', err));
            }
        }

        // Send LINE notifications (async, non-blocking)
        if (lineMessaging.isEnabled()) {
            const orderData = getOrderById(orderId);
            if (orderData.success) {
                // Notify admin about status change
                lineMessaging.notifyAdminStatusChange(
                    orderData.data,
                    oldStatus,
                    newStatus
                ).catch(err => logger.error('LINE admin notification error:', err));

                // Notify customer about status change (if they have LINE ID)
                lineMessaging.notifyCustomer(
                    orderData.data,
                    newStatus
                ).catch(err => logger.error('LINE customer notification error:', err));
            }
        }

        return { success: true, data: { orderId, oldStatus, newStatus } };
    } catch (error) {
        logger.error('Order status update error:', error);
        return { success: false, error: 'Failed to update order status', code: 'STATUS_UPDATE_FAILED' };
    }
}

/**
 * Get order by ID
 */
function getOrderById(orderId) {
    const order = db.prepare(`SELECT * FROM orders WHERE id = ?`).get(orderId);

    if (!order) {
        return { success: false, error: 'Order not found', code: 'ORDER_NOT_FOUND' };
    }

    const items = db.prepare(`SELECT * FROM order_items WHERE order_id = ?`).all(orderId);
    const statusHistory = db.prepare(`SELECT * FROM order_status_history WHERE order_id = ? ORDER BY created_at ASC`).all(orderId);

    return { success: true, data: { ...order, items, statusHistory } };
}

/**
 * Get orders with filters
 */
function getOrders(filters = {}) {
    const { branchId, status, page = 1, limit = 20 } = filters;

    let orders = [];

    if (branchId && status) {
        orders = db.prepare('SELECT * FROM orders WHERE branch_id = ? AND status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?').all(branchId, status, limit, (page - 1) * limit);
    } else if (branchId) {
        orders = db.prepare('SELECT * FROM orders WHERE branch_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?').all(branchId, limit, (page - 1) * limit);
    } else if (status) {
        orders = db.prepare('SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?').all(status, limit, (page - 1) * limit);
    } else {
        orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, (page - 1) * limit);
    }

    return { success: true, data: { orders, pagination: { page, limit, total: orders.length, totalPages: 1 } } };
}

/**
 * Get active orders for kitchen
 */
function getKitchenOrders(branchId) {
    const orders = db.prepare(`SELECT * FROM orders WHERE branch_id = ? AND status IN ('pending', 'confirmed', 'preparing', 'ready') ORDER BY created_at ASC`).all(branchId);

    for (const order of orders) {
        order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    }

    return { success: true, data: orders };
}

/**
 * Get orders by LINE User ID (for chatbot)
 */
function getOrdersByLineUserId(lineUserId, status = null) {
    try {
        let sql = `
            SELECT o.*, 
                   (SELECT json_group_array(json_object(
                       'product_name', oi.product_name,
                       'variant_name', oi.variant_name,
                       'quantity', oi.quantity,
                       'unit_price', oi.unit_price
                   ))
                   FROM order_items oi WHERE oi.order_id = o.id) as items_json
            FROM orders o
            WHERE o.line_user_id = ?
        `;
        const params = [lineUserId];

        if (status) {
            sql += ' AND o.status = ?';
            params.push(status);
        }

        sql += ' ORDER BY o.created_at DESC LIMIT 10';

        const orders = db.prepare(sql).all(...params);

        return orders.map(order => ({
            ...order,
            items: order.items_json ? JSON.parse(order.items_json) : []
        }));
    } catch (error) {
        logger.error('Get orders by LINE user ID error:', error);
        return [];
    }
}

/**
 * Get order count by date (for daily limit)
 */
function getOrderCountByDate(date) {
    try {
        const result = db.prepare(`
            SELECT COUNT(*) as count 
            FROM orders 
            WHERE date(created_at) = ? 
            AND status != 'cancelled'
        `).get(date);
        return result?.count || 0;
    } catch (error) {
        logger.error('Get order count error:', error);
        return 0;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PAYMENT FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get pending payment order for a LINE user
 * Returns the most recent unpaid order
 */
function getPendingPaymentOrder(lineUserId) {
    try {
        const order = db.prepare(`
            SELECT o.*, 
                   (SELECT json_group_array(json_object(
                       'product_name', oi.product_name,
                       'variant_name', oi.variant_name,
                       'quantity', oi.quantity,
                       'unit_price', oi.unit_price
                   ))
                   FROM order_items oi WHERE oi.order_id = o.id) as items_json
            FROM orders o
            WHERE o.line_user_id = ?
            AND o.payment_status = 'pending'
            AND o.status NOT IN ('cancelled', 'completed')
            ORDER BY o.created_at DESC
            LIMIT 1
        `).get(lineUserId);

        if (!order) return null;

        return {
            ...order,
            items: order.items_json ? JSON.parse(order.items_json) : [],
            total_amount: order.total
        };
    } catch (error) {
        logger.error('Get pending payment order error:', error);
        return null;
    }
}

/**
 * Update order payment status
 */
function updateOrderPaymentStatus(orderId, paymentStatus, paymentData = {}) {
    try {
        const { slipRef, slipAmount, verifiedAt } = paymentData;

        db.prepare(`
            UPDATE orders 
            SET payment_status = ?,
                slip_ref = ?,
                slip_amount = ?,
                payment_verified_at = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(
            paymentStatus,
            slipRef || null,
            slipAmount || null,
            verifiedAt || null,
            orderId
        );

        // If paid, auto-confirm the order
        if (paymentStatus === 'paid') {
            const order = db.prepare('SELECT status FROM orders WHERE id = ?').get(orderId);
            if (order && order.status === 'pending') {
                db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('confirmed', orderId);
                db.prepare(`
                    INSERT INTO order_status_history (id, order_id, status, changed_by, notes) 
                    VALUES (?, ?, ?, ?, ?)
                `).run(uuidv4(), orderId, 'confirmed', 'system', 'Auto-confirmed after payment verification');

                logger.info('Order auto-confirmed after payment', { orderId });
            }
        }

        logger.info('Order payment status updated', { orderId, paymentStatus, slipRef });

        return { success: true, data: { orderId, paymentStatus } };
    } catch (error) {
        logger.error('Update payment status error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update order rating
 */
function updateOrderRating(orderId, rating) {
    try {
        db.prepare(`
            UPDATE orders 
            SET customer_rating = ?,
                rated_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(rating, orderId);

        logger.info('Order rating updated', { orderId, rating });

        return { success: true, data: { orderId, rating } };
    } catch (error) {
        logger.error('Update rating error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get order by slip reference (to prevent duplicate usage)
 */
function getOrderBySlipRef(slipRef) {
    try {
        if (!slipRef) return null;

        const order = db.prepare(`
            SELECT * FROM orders 
            WHERE slip_ref = ?
            LIMIT 1
        `).get(slipRef);

        return order || null;
    } catch (error) {
        logger.error('Get order by slip ref error:', error);
        return null;
    }
}

/**
 * Get orders pending manual payment verification
 */
function getPendingManualVerification() {
    try {
        const orders = db.prepare(`
            SELECT o.*, 
                   (SELECT json_group_array(json_object(
                       'product_name', oi.product_name,
                       'quantity', oi.quantity
                   ))
                   FROM order_items oi WHERE oi.order_id = o.id) as items_json
            FROM orders o
            WHERE o.payment_status = 'pending_review'
            ORDER BY o.created_at DESC
        `).all();

        return orders.map(order => ({
            ...order,
            items: order.items_json ? JSON.parse(order.items_json) : []
        }));
    } catch (error) {
        logger.error('Get pending manual verification error:', error);
        return [];
    }
}

/**
 * Cancel unpaid orders older than specified hours
 */
function cancelUnpaidOrders(hoursOld = 24) {
    try {
        const cutoffTime = new Date();
        cutoffTime.setHours(cutoffTime.getHours() - hoursOld);
        const cutoffString = cutoffTime.toISOString();

        const result = db.prepare(`
            UPDATE orders 
            SET status = 'cancelled',
                cancel_reason = 'ไม่ชำระเงินภายในเวลากำหนด',
                updated_at = CURRENT_TIMESTAMP
            WHERE payment_status = 'pending'
            AND status = 'pending'
            AND created_at < ?
        `).run(cutoffString);

        if (result.changes > 0) {
            logger.info(`Cancelled ${result.changes} unpaid orders older than ${hoursOld} hours`);
        }

        return { success: true, cancelled: result.changes };
    } catch (error) {
        logger.error('Cancel unpaid orders error:', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    createOrder,
    updateOrderStatus,
    getOrderById,
    getOrders,
    getKitchenOrders,
    calculateOrderPrice,
    generateOrderNumber,
    getOrdersByLineUserId,
    getOrderCountByDate,
    // Payment functions
    getPendingPaymentOrder,
    updateOrderPaymentStatus,
    updateOrderRating,
    getOrderBySlipRef,
    getPendingManualVerification,
    cancelUnpaidOrders
};

