/**
 * ════════════════════════════════════════════════════════════════════════════════
 *  📡 LINE WEBHOOK ROUTES
 *  Saramondā - Handle LINE webhook events
 * ════════════════════════════════════════════════════════════════════════════════
 */

const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { Client } = require('@line/bot-sdk');
const chatbot = require('./chatbot');
const logger = require('../../shared/logger');

// LINE client configuration
const lineConfig = {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET
};

// Create LINE client
let lineClient = null;
if (lineConfig.channelAccessToken && lineConfig.channelSecret) {
    lineClient = new Client(lineConfig);
    logger.info('LINE Bot client initialized');
}

/**
 * Verify LINE signature
 */
function verifySignature(body, signature) {
    if (!lineConfig.channelSecret) return true; // Skip in dev

    const hash = crypto
        .createHmac('sha256', lineConfig.channelSecret)
        .update(body)
        .digest('base64');

    return hash === signature;
}

/**
 * LINE Webhook endpoint
 * POST /webhook/line
 */
router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
    // Get signature from header
    const signature = req.headers['x-line-signature'];

    // Convert body to string if it's a buffer
    const bodyString = Buffer.isBuffer(req.body) ? req.body.toString() : JSON.stringify(req.body);

    // Verify signature (skip in development without secret)
    if (lineConfig.channelSecret && !verifySignature(bodyString, signature)) {
        logger.warn('Invalid LINE signature');
        return res.status(401).json({ error: 'Invalid signature' });
    }

    // Parse body
    let body;
    try {
        body = Buffer.isBuffer(req.body) ? JSON.parse(bodyString) : req.body;
    } catch (error) {
        logger.error('Failed to parse LINE webhook body:', error);
        return res.status(400).json({ error: 'Invalid JSON' });
    }

    // Respond immediately to LINE
    res.status(200).json({ status: 'ok' });

    // Process events asynchronously
    const events = body.events || [];

    for (const event of events) {
        try {
            logger.info(`LINE event received: ${event.type}`, {
                userId: event.source?.userId,
                type: event.type
            });

            // Get order service from app context
            const orderService = req.app.get('orderService');

            // Handle event with chatbot
            await chatbot.handleWebhookEvent(event, lineClient, orderService);

        } catch (error) {
            logger.error('Error processing LINE event:', error);
        }
    }
});

/**
 * Health check for LINE webhook
 * GET /webhook/line
 */
router.get('/', (req, res) => {
    res.json({
        status: 'ok',
        service: 'LINE Webhook',
        timestamp: new Date().toISOString()
    });
});

/**
 * Send push message to user
 */
async function sendPushMessage(userId, message) {
    if (!lineClient) {
        logger.warn('LINE client not configured');
        return false;
    }

    try {
        await lineClient.pushMessage(userId, message);
        return true;
    } catch (error) {
        logger.error('Push message error:', error);
        return false;
    }
}

/**
 * Get LINE client instance
 */
function getLineClient() {
    return lineClient;
}

module.exports = router;
module.exports.sendPushMessage = sendPushMessage;
module.exports.getLineClient = getLineClient;
