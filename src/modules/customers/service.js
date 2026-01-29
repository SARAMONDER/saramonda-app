/**
 * Customer Service
 * Business logic for customer management (LINE Login users)
 */
const { v4: uuidv4 } = require('uuid');
const db = require('../../config/database');
const logger = require('../../shared/logger');
const googleSheets = require('../../shared/googleSheets');

/**
 * Sync customer from LINE Login
 * Creates new customer or updates existing
 */
async function syncCustomer({ lineUserId, displayName, pictureUrl }) {
    try {
        // Check if customer exists
        const existing = db.prepare(`
            SELECT * FROM customers WHERE line_user_id = ?
        `).get(lineUserId);

        const now = new Date().toISOString();

        if (existing) {
            // Update existing customer
            db.prepare(`
                UPDATE customers 
                SET display_name = ?,
                    picture_url = ?,
                    last_login = ?,
                    updated_at = ?
                WHERE line_user_id = ?
            `).run(displayName, pictureUrl, now, now, lineUserId);

            logger.info('Customer login:', { lineUserId, displayName });

            return {
                success: true,
                isNew: false,
                data: {
                    ...existing,
                    displayName,
                    pictureUrl,
                    lastLogin: now
                }
            };
        }

        // Create new customer
        const customerId = uuidv4();

        db.prepare(`
            INSERT INTO customers (
                id, line_user_id, display_name, picture_url,
                order_count, total_spend, created_at, last_login, updated_at
            ) VALUES (?, ?, ?, ?, 0, 0, ?, ?, ?)
        `).run(customerId, lineUserId, displayName, pictureUrl, now, now, now);

        logger.info('New customer created:', { customerId, lineUserId, displayName });

        // Sync to Google Sheets
        if (googleSheets.isEnabled()) {
            googleSheets.onCustomerCreated({
                id: customerId,
                name: displayName,
                phone: null,
                email: null,
                source: 'line',
                created_at: now
            }).catch(err => logger.error('Google Sheets customer sync error:', err));
        }

        return {
            success: true,
            isNew: true,
            data: {
                id: customerId,
                lineUserId,
                displayName,
                pictureUrl,
                orderCount: 0,
                totalSpend: 0,
                createdAt: now
            }
        };
    } catch (error) {
        logger.error('Sync customer error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Update customer info (phone, address)
 */
async function updateCustomer(lineUserId, data) {
    try {
        const existing = db.prepare(`
            SELECT * FROM customers WHERE line_user_id = ?
        `).get(lineUserId);

        if (!existing) {
            return {
                success: false,
                error: 'Customer not found'
            };
        }

        const updates = [];
        const values = [];

        if (data.phone) {
            updates.push('phone = ?');
            values.push(data.phone);
        }
        if (data.address) {
            updates.push('address = ?');
            values.push(data.address);
        }
        if (data.deliveryArea) {
            updates.push('delivery_area = ?');
            values.push(data.deliveryArea);
        }

        if (updates.length === 0) {
            return {
                success: true,
                data: existing
            };
        }

        updates.push('updated_at = ?');
        values.push(new Date().toISOString());
        values.push(lineUserId);

        db.prepare(`
            UPDATE customers SET ${updates.join(', ')} WHERE line_user_id = ?
        `).run(...values);

        const updated = db.prepare(`
            SELECT * FROM customers WHERE line_user_id = ?
        `).get(lineUserId);

        logger.info('Customer updated:', { lineUserId, updates: data });

        // Sync to Google Sheets
        if (googleSheets.isEnabled()) {
            googleSheets.sendWebhook('customer.updated', {
                line_user_id: lineUserId,
                phone: data.phone,
                address: data.address,
                updated_at: new Date().toISOString()
            }).catch(err => logger.error('Google Sheets customer update error:', err));
        }

        return {
            success: true,
            data: updated
        };
    } catch (error) {
        logger.error('Update customer error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get customer by LINE User ID
 */
async function getCustomer(lineUserId) {
    try {
        const customer = db.prepare(`
            SELECT * FROM customers WHERE line_user_id = ?
        `).get(lineUserId);

        if (!customer) {
            return {
                success: false,
                error: 'Customer not found'
            };
        }

        return {
            success: true,
            data: {
                id: customer.id,
                lineUserId: customer.line_user_id,
                displayName: customer.display_name,
                pictureUrl: customer.picture_url,
                phone: customer.phone,
                address: customer.address,
                deliveryArea: customer.delivery_area,
                orderCount: customer.order_count,
                totalSpend: customer.total_spend,
                lastOrderDate: customer.last_order_date,
                createdAt: customer.created_at
            }
        };
    } catch (error) {
        logger.error('Get customer error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get customer order history
 */
async function getCustomerOrders(lineUserId, { page = 1, limit = 10 }) {
    try {
        const customer = db.prepare(`
            SELECT id FROM customers WHERE line_user_id = ?
        `).get(lineUserId);

        if (!customer) {
            return {
                success: false,
                error: 'Customer not found'
            };
        }

        const offset = (page - 1) * limit;

        const orders = db.prepare(`
            SELECT * FROM orders 
            WHERE customer_line_id = ?
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `).all(lineUserId, limit, offset);

        const total = db.prepare(`
            SELECT COUNT(*) as count FROM orders WHERE customer_line_id = ?
        `).get(lineUserId);

        return {
            success: true,
            data: orders,
            pagination: {
                page,
                limit,
                total: total?.count || 0,
                totalPages: Math.ceil((total?.count || 0) / limit)
            }
        };
    } catch (error) {
        logger.error('Get customer orders error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get all customers (admin)
 */
async function getAllCustomers({ page = 1, limit = 20, deliveryArea }) {
    try {
        const offset = (page - 1) * limit;
        let whereClause = '';
        const params = [];

        if (deliveryArea) {
            whereClause = 'WHERE delivery_area = ?';
            params.push(deliveryArea);
        }

        const customers = db.prepare(`
            SELECT * FROM customers 
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `).all(...params, limit, offset);

        const total = db.prepare(`
            SELECT COUNT(*) as count FROM customers ${whereClause}
        `).get(...params);

        return {
            success: true,
            data: customers.map(c => ({
                id: c.id,
                lineUserId: c.line_user_id,
                displayName: c.display_name,
                pictureUrl: c.picture_url,
                phone: c.phone,
                address: c.address,
                deliveryArea: c.delivery_area,
                orderCount: c.order_count,
                totalSpend: c.total_spend,
                lastOrderDate: c.last_order_date,
                createdAt: c.created_at
            })),
            pagination: {
                page,
                limit,
                total: total?.count || 0,
                totalPages: Math.ceil((total?.count || 0) / limit)
            }
        };
    } catch (error) {
        logger.error('Get all customers error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Update customer stats after order
 */
async function updateCustomerStats(lineUserId, orderTotal) {
    try {
        const now = new Date().toISOString();

        db.prepare(`
            UPDATE customers 
            SET order_count = order_count + 1,
                total_spend = total_spend + ?,
                last_order_date = ?,
                updated_at = ?
            WHERE line_user_id = ?
        `).run(orderTotal, now, now, lineUserId);

        logger.info('Customer stats updated:', { lineUserId, orderTotal });
    } catch (error) {
        logger.error('Update customer stats error:', error);
    }
}

/**
 * Verify LINE access token
 */
async function verifyLineToken(accessToken) {
    try {
        const response = await fetch('https://api.line.me/oauth2/v2.1/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `access_token=${accessToken}`
        });

        if (!response.ok) {
            return false;
        }

        const data = await response.json();
        // Optionally verify client_id matches your channel
        return true;
    } catch (error) {
        logger.error('Verify LINE token error:', error);
        return false;
    }
}

module.exports = {
    syncCustomer,
    updateCustomer,
    getCustomer,
    getCustomerOrders,
    getAllCustomers,
    updateCustomerStats,
    verifyLineToken
};
