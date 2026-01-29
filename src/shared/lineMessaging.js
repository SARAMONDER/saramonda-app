/**
 * LINE Messaging API Service
 * Send notifications via LINE Messaging API (replaces LINE Notify)
 * 
 * Documentation: https://developers.line.biz/en/docs/messaging-api/
 */

const config = require('../config');
const logger = require('./logger');

// LINE Messaging API endpoints
const LINE_API_BASE = 'https://api.line.me/v2/bot';

/**
 * Check if LINE Messaging is enabled
 */
function isEnabled() {
    return !!(
        config.line?.channelAccessToken &&
        config.line?.notificationEnabled
    );
}

/**
 * Get channel access token from config
 */
function getAccessToken() {
    return config.line?.channelAccessToken || process.env.LINE_CHANNEL_ACCESS_TOKEN;
}

/**
 * Send message via LINE Messaging API
 * @param {string} to - User ID, Group ID, or Room ID
 * @param {Array} messages - Array of message objects
 */
async function sendMessage(to, messages) {
    if (!isEnabled()) {
        logger.warn('LINE Messaging is not enabled');
        return { success: false, error: 'LINE Messaging not enabled' };
    }

    const token = getAccessToken();
    if (!token) {
        logger.error('LINE Channel Access Token not configured');
        return { success: false, error: 'Access token not configured' };
    }

    try {
        const response = await fetch(`${LINE_API_BASE}/message/push`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                to,
                messages: Array.isArray(messages) ? messages : [messages]
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            logger.error('LINE API error:', { status: response.status, body: errorBody });
            return { success: false, error: `LINE API error: ${response.status}`, details: errorBody };
        }

        logger.info('LINE message sent successfully', { to });
        return { success: true };
    } catch (error) {
        logger.error('LINE Messaging error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Send text message
 * @param {string} to - Recipient ID
 * @param {string} text - Message text
 */
async function sendTextMessage(to, text) {
    return sendMessage(to, [{
        type: 'text',
        text
    }]);
}

/**
 * Send Flex Message (rich card layout)
 * @param {string} to - Recipient ID
 * @param {string} altText - Alt text for notifications
 * @param {object} contents - Flex message contents
 */
async function sendFlexMessage(to, altText, contents) {
    return sendMessage(to, [{
        type: 'flex',
        altText,
        contents
    }]);
}

/**
 * Broadcast message to all followers (works with Free account)
 * @param {Array} messages - Array of message objects
 */
async function broadcastMessage(messages) {
    if (!isEnabled()) {
        logger.warn('LINE Messaging is not enabled');
        return { success: false, error: 'LINE Messaging not enabled' };
    }

    const token = getAccessToken();
    if (!token) {
        logger.error('LINE Channel Access Token not configured');
        return { success: false, error: 'Access token not configured' };
    }

    try {
        const response = await fetch(`${LINE_API_BASE}/message/broadcast`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                messages: Array.isArray(messages) ? messages : [messages]
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            logger.error('LINE Broadcast error:', { status: response.status, body: errorBody });
            return { success: false, error: `LINE API error: ${response.status}`, details: errorBody };
        }

        logger.info('LINE broadcast sent successfully');
        return { success: true };
    } catch (error) {
        logger.error('LINE Broadcast error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Broadcast text message to all followers
 * @param {string} text - Message text
 */
async function broadcastTextMessage(text) {
    return broadcastMessage([{
        type: 'text',
        text
    }]);
}

/**
 * Broadcast Flex Message to all followers
 * @param {string} altText - Alt text for notifications
 * @param {object} contents - Flex message contents
 */
async function broadcastFlexMessage(altText, contents) {
    return broadcastMessage([{
        type: 'flex',
        altText,
        contents
    }]);
}

/**
 * Build order notification Flex Message
 * @param {object} order - Order data
 * @param {string} type - 'new' | 'confirmed' | 'preparing' | 'ready' | 'delivering' | 'completed' | 'cancelled'
 */
function buildOrderFlexMessage(order, type = 'new') {
    const statusEmoji = {
        new: '🔔',
        pending: '🔔',
        confirmed: '✅',
        preparing: '👨‍🍳',
        ready: '📦',
        delivering: '🚚',
        completed: '✅',
        cancelled: '❌'
    };

    const statusText = {
        new: 'ออเดอร์ใหม่!',
        pending: 'ออเดอร์ใหม่!',
        confirmed: 'ยืนยันแล้ว!',
        preparing: 'กำลังเตรียม',
        ready: 'เตรียมเสร็จแล้ว!',
        delivering: 'กำลังจัดส่ง!',
        completed: 'จัดส่งสำเร็จ!',
        cancelled: 'ยกเลิกแล้ว'
    };

    const statusColor = {
        new: '#FF6B35',
        pending: '#FF6B35',
        confirmed: '#4CAF50',
        preparing: '#2196F3',
        ready: '#9C27B0',
        delivering: '#FF9800',
        completed: '#4CAF50',
        cancelled: '#F44336'
    };

    const emoji = statusEmoji[type] || '📋';
    const title = statusText[type] || 'อัปเดตสถานะ';
    const color = statusColor[type] || '#888888';

    // Build items list
    const itemsText = order.items?.map(item =>
        `• ${item.product_name || item.productName}${item.variant_name || item.variantName ? ` (${item.variant_name || item.variantName})` : ''} x${item.quantity}`
    ).join('\n') || 'ไม่มีรายการ';

    // Calculate total
    const total = order.total_amount || order.total || 0;

    return {
        type: 'bubble',
        size: 'mega',
        header: {
            type: 'box',
            layout: 'vertical',
            backgroundColor: color,
            paddingAll: 'lg',
            contents: [
                {
                    type: 'text',
                    text: `${emoji} ${title}`,
                    color: '#FFFFFF',
                    weight: 'bold',
                    size: 'xl'
                }
            ]
        },
        body: {
            type: 'box',
            layout: 'vertical',
            contents: [
                // Order number
                {
                    type: 'text',
                    text: `📋 ${order.order_number || order.orderNumber || 'N/A'}`,
                    weight: 'bold',
                    size: 'lg',
                    margin: 'none'
                },
                // Separator
                {
                    type: 'separator',
                    margin: 'lg'
                },
                // Customer info (only for admin notifications)
                ...(type === 'new' || type === 'pending' ? [
                    {
                        type: 'box',
                        layout: 'vertical',
                        margin: 'lg',
                        contents: [
                            {
                                type: 'text',
                                text: `👤 ${order.customer_name || order.customerName || 'ลูกค้า'}`,
                                size: 'md'
                            },
                            ...(order.customer_phone || order.customerPhone ? [{
                                type: 'text',
                                text: `📞 ${order.customer_phone || order.customerPhone}`,
                                size: 'sm',
                                color: '#888888',
                                margin: 'sm'
                            }] : []),
                            ...(order.customer_address || order.customerAddress ? [{
                                type: 'text',
                                text: `📍 ${order.customer_address || order.customerAddress}`,
                                size: 'sm',
                                color: '#888888',
                                margin: 'sm',
                                wrap: true
                            }] : [])
                        ]
                    },
                    {
                        type: 'separator',
                        margin: 'lg'
                    }
                ] : []),
                // Items
                {
                    type: 'box',
                    layout: 'vertical',
                    margin: 'lg',
                    contents: [
                        {
                            type: 'text',
                            text: '📦 รายการ:',
                            weight: 'bold',
                            size: 'sm',
                            color: '#555555'
                        },
                        {
                            type: 'text',
                            text: itemsText,
                            size: 'sm',
                            margin: 'sm',
                            wrap: true
                        }
                    ]
                },
                // Separator
                {
                    type: 'separator',
                    margin: 'lg'
                },
                // Total
                {
                    type: 'box',
                    layout: 'horizontal',
                    margin: 'lg',
                    contents: [
                        {
                            type: 'text',
                            text: '💰 รวมทั้งหมด:',
                            weight: 'bold',
                            flex: 1
                        },
                        {
                            type: 'text',
                            text: `฿${total.toLocaleString()}`,
                            weight: 'bold',
                            color: color,
                            align: 'end'
                        }
                    ]
                },
                // Delivery info (if applicable)
                ...(order.delivery_date || order.deliveryDate ? [
                    {
                        type: 'box',
                        layout: 'vertical',
                        margin: 'lg',
                        contents: [
                            {
                                type: 'text',
                                text: `📅 ${order.delivery_date || order.deliveryDate}`,
                                size: 'sm',
                                color: '#888888'
                            },
                            ...(order.delivery_time_slot || order.deliveryTimeSlot ? [{
                                type: 'text',
                                text: `⏰ ${order.delivery_time_slot || order.deliveryTimeSlot}`,
                                size: 'sm',
                                color: '#888888',
                                margin: 'sm'
                            }] : [])
                        ]
                    }
                ] : [])
            ]
        },
        footer: {
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'text',
                    text: `🕐 ${new Date().toLocaleString('th-TH')}`,
                    size: 'xs',
                    color: '#AAAAAA',
                    align: 'center'
                }
            ]
        }
    };
}

/**
 * Notify admin about new order (uses broadcast for Free account compatibility)
 * @param {object} order - Order data
 */
async function notifyNewOrder(order) {
    const flexContent = buildOrderFlexMessage(order, 'new');

    // Try push first if admin ID is configured, otherwise fallback to broadcast
    const adminId = config.line?.adminUserId ||
        config.line?.adminGroupId ||
        process.env.LINE_ADMIN_USER_ID ||
        process.env.LINE_ADMIN_GROUP_ID;

    if (adminId) {
        const result = await sendFlexMessage(adminId, `🔔 ออเดอร์ใหม่! ${order.order_number || order.orderNumber}`, flexContent);
        if (result.success) return result;
        // If push failed, fallback to broadcast
        logger.warn('Push failed, falling back to broadcast');
    }

    // Use broadcast (works with Free account)
    return broadcastFlexMessage(`🔔 ออเดอร์ใหม่! ${order.order_number || order.orderNumber}`, flexContent);
}

/**
 * Notify customer about order status change
 * @param {object} order - Order data
 * @param {string} status - New status
 */
async function notifyCustomer(order, status) {
    const customerId = order.customer_line_id || order.customerLineId;

    if (!customerId) {
        logger.debug('Customer LINE ID not available, skipping notification');
        return { success: false, error: 'Customer LINE ID not available' };
    }

    const flexContent = buildOrderFlexMessage(order, status);
    const statusLabels = {
        confirmed: 'ยืนยันแล้ว',
        preparing: 'กำลังเตรียม',
        ready: 'เตรียมเสร็จแล้ว',
        delivering: 'กำลังจัดส่ง',
        completed: 'จัดส่งสำเร็จ',
        cancelled: 'ยกเลิก'
    };

    const label = statusLabels[status] || status;
    return sendFlexMessage(customerId, `📋 ${order.order_number || order.orderNumber} - ${label}`, flexContent);
}

/**
 * Notify admin about order status change
 * @param {object} order - Order data  
 * @param {string} oldStatus - Previous status
 * @param {string} newStatus - New status
 */
async function notifyAdminStatusChange(order, oldStatus, newStatus) {
    const orderNumber = order.order_number || order.orderNumber;
    const text = `📋 ${orderNumber}\n🔄 สถานะ: ${oldStatus} → ${newStatus}`;

    // Try push first if admin ID is configured
    const adminId = config.line?.adminUserId ||
        config.line?.adminGroupId ||
        process.env.LINE_ADMIN_USER_ID ||
        process.env.LINE_ADMIN_GROUP_ID;

    if (adminId) {
        const result = await sendTextMessage(adminId, text);
        if (result.success) return result;
    }

    // Fallback to broadcast
    return broadcastTextMessage(text);
}

/**
 * Send test notification
 * @param {string} to - Recipient ID (optional, uses admin ID if not provided)
 * @param {string} message - Test message
 */
async function sendTest(to, message = 'ทดสอบการแจ้งเตือน LINE ✅') {
    // If specific recipient provided, try push
    if (to) {
        return sendTextMessage(to, message);
    }

    // Try push to admin first
    const adminId = config.line?.adminUserId ||
        config.line?.adminGroupId ||
        process.env.LINE_ADMIN_USER_ID ||
        process.env.LINE_ADMIN_GROUP_ID;

    if (adminId) {
        const result = await sendTextMessage(adminId, message);
        if (result.success) return result;
    }

    // Fallback to broadcast
    return broadcastTextMessage(message);
}

/**
 * Get bot info (for testing connection)
 */
async function getBotInfo() {
    const token = getAccessToken();
    if (!token) {
        return { success: false, error: 'Access token not configured' };
    }

    try {
        const response = await fetch(`${LINE_API_BASE}/info`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorBody = await response.text();
            return { success: false, error: `LINE API error: ${response.status}`, details: errorBody };
        }

        const data = await response.json();
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

module.exports = {
    isEnabled,
    sendMessage,
    sendTextMessage,
    sendFlexMessage,
    broadcastMessage,
    broadcastTextMessage,
    broadcastFlexMessage,
    buildOrderFlexMessage,
    notifyNewOrder,
    notifyCustomer,
    notifyAdminStatusChange,
    sendTest,
    getBotInfo
};
