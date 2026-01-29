/**
 * WebSocket Server
 * Real-time updates for Kitchen Display and Order Tracking
 */
const WebSocket = require('ws');
const logger = require('./shared/logger');

let wss = null;
const clients = new Map(); // Track clients by type (kitchen, admin, customer)

/**
 * Initialize WebSocket server
 */
function initWebSocket(server) {
    wss = new WebSocket.Server({ server, path: '/ws' });

    wss.on('connection', (ws, req) => {
        const clientId = generateClientId();
        const clientType = req.url.includes('type=kitchen') ? 'kitchen'
            : req.url.includes('type=admin') ? 'admin'
                : 'customer';

        // Extract branch from query string
        const urlParams = new URLSearchParams(req.url.split('?')[1] || '');
        const branchId = urlParams.get('branch') || 'default';

        // Store client info
        clients.set(clientId, {
            ws,
            type: clientType,
            branchId,
            connectedAt: new Date()
        });

        logger.info('WebSocket client connected', { clientId, clientType, branchId });

        // Send welcome message
        ws.send(JSON.stringify({
            type: 'connected',
            clientId,
            message: 'Connected to Saramonda real-time server'
        }));

        // Handle incoming messages
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data);
                handleClientMessage(clientId, message);
            } catch (error) {
                logger.error('WebSocket message parse error:', error);
            }
        });

        // Handle disconnect
        ws.on('close', () => {
            clients.delete(clientId);
            logger.info('WebSocket client disconnected', { clientId });
        });

        // Handle errors
        ws.on('error', (error) => {
            logger.error('WebSocket error:', { clientId, error: error.message });
            clients.delete(clientId);
        });

        // Heartbeat ping
        ws.isAlive = true;
        ws.on('pong', () => { ws.isAlive = true; });
    });

    // Heartbeat interval to detect dead connections
    setInterval(() => {
        wss.clients.forEach((ws) => {
            if (!ws.isAlive) {
                return ws.terminate();
            }
            ws.isAlive = false;
            ws.ping();
        });
    }, 30000);

    logger.info('WebSocket server initialized');

    return wss;
}

/**
 * Handle incoming client messages
 */
function handleClientMessage(clientId, message) {
    const client = clients.get(clientId);
    if (!client) return;

    switch (message.type) {
        case 'subscribe':
            // Subscribe to specific order updates
            if (message.orderId) {
                client.subscribedOrders = client.subscribedOrders || new Set();
                client.subscribedOrders.add(message.orderId);
            }
            break;

        case 'unsubscribe':
            if (message.orderId && client.subscribedOrders) {
                client.subscribedOrders.delete(message.orderId);
            }
            break;

        case 'ping':
            client.ws.send(JSON.stringify({ type: 'pong' }));
            break;

        default:
            logger.warn('Unknown WebSocket message type', { clientId, type: message.type });
    }
}

/**
 * Broadcast to all clients of a specific type
 */
function broadcast(message, targetType = null, branchId = null) {
    const payload = JSON.stringify(message);

    clients.forEach((client) => {
        if (client.ws.readyState !== WebSocket.OPEN) return;

        // Filter by type if specified
        if (targetType && client.type !== targetType) return;

        // Filter by branch if specified
        if (branchId && client.branchId !== branchId && client.branchId !== 'default') return;

        client.ws.send(payload);
    });
}

/**
 * Send update to kitchen displays
 */
function notifyKitchen(branchId, data) {
    broadcast({
        type: 'kitchen_update',
        timestamp: new Date().toISOString(),
        data
    }, 'kitchen', branchId);

    logger.info('Kitchen notified', { branchId, orderId: data.orderId });
}

/**
 * Notify about new order
 */
function notifyNewOrder(order) {
    // Notify all relevant clients
    broadcast({
        type: 'new_order',
        timestamp: new Date().toISOString(),
        order: {
            id: order.id,
            orderNumber: order.order_number || order.orderNumber,
            status: order.status,
            customerName: order.customer_name || order.customerName,
            total: order.total,
            items: order.items
        }
    }, null, order.branch_id || order.branchId);

    // Play sound on kitchen displays
    broadcast({
        type: 'play_sound',
        sound: 'new_order'
    }, 'kitchen', order.branch_id || order.branchId);
}

/**
 * Notify about order status change
 */
function notifyOrderStatusChange(orderId, oldStatus, newStatus, branchId) {
    broadcast({
        type: 'order_status_change',
        timestamp: new Date().toISOString(),
        data: {
            orderId,
            oldStatus,
            newStatus
        }
    }, null, branchId);

    // If ready, notify admin loudly
    if (newStatus === 'ready') {
        broadcast({
            type: 'play_sound',
            sound: 'order_ready'
        }, 'admin', branchId);
    }
}

/**
 * Notify about low stock alert
 */
function notifyLowStock(ingredient, branchId) {
    broadcast({
        type: 'low_stock_alert',
        timestamp: new Date().toISOString(),
        data: {
            ingredientId: ingredient.id,
            name: ingredient.name,
            currentStock: ingredient.current_stock,
            minLevel: ingredient.min_stock_level
        }
    }, 'admin', branchId);
}

/**
 * Get connection stats
 */
function getConnectionStats() {
    const stats = {
        total: clients.size,
        byType: {},
        byBranch: {}
    };

    clients.forEach((client) => {
        stats.byType[client.type] = (stats.byType[client.type] || 0) + 1;
        stats.byBranch[client.branchId] = (stats.byBranch[client.branchId] || 0) + 1;
    });

    return stats;
}

/**
 * Generate unique client ID
 */
function generateClientId() {
    return 'ws_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

module.exports = {
    initWebSocket,
    broadcast,
    notifyKitchen,
    notifyNewOrder,
    notifyOrderStatusChange,
    notifyLowStock,
    getConnectionStats
};
