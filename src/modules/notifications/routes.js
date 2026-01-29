/**
 * Notifications Routes
 * LINE Messaging API notifications
 */
const express = require('express');
const router = express.Router();
const lineMessaging = require('../../shared/lineMessaging');
const logger = require('../../shared/logger');

/**
 * POST /api/v1/notifications/test
 * Send test notification
 */
router.post('/test', async (req, res) => {
    try {
        const { message, to } = req.body;

        if (!lineMessaging.isEnabled()) {
            return res.status(400).json({
                success: false,
                error: 'LINE Messaging is not enabled. Check your .env configuration.'
            });
        }

        const result = await lineMessaging.sendTest(to, message);

        if (result.success) {
            res.json({
                success: true,
                message: 'Test notification sent successfully'
            });
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        logger.error('Test notification error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/v1/notifications/status
 * Check LINE Messaging API status
 */
router.get('/status', async (req, res) => {
    try {
        const enabled = lineMessaging.isEnabled();

        if (!enabled) {
            return res.json({
                success: true,
                data: {
                    enabled: false,
                    message: 'LINE Messaging is not configured'
                }
            });
        }

        const botInfo = await lineMessaging.getBotInfo();

        res.json({
            success: true,
            data: {
                enabled: true,
                bot: botInfo.success ? botInfo.data : null,
                error: botInfo.success ? null : botInfo.error
            }
        });
    } catch (error) {
        logger.error('Status check error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/v1/notifications/send
 * Send custom notification (admin only)
 */
router.post('/send', async (req, res) => {
    try {
        const { to, message, type = 'text' } = req.body;

        if (!to || !message) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: to, message'
            });
        }

        if (!lineMessaging.isEnabled()) {
            return res.status(400).json({
                success: false,
                error: 'LINE Messaging is not enabled'
            });
        }

        let result;
        if (type === 'text') {
            result = await lineMessaging.sendTextMessage(to, message);
        } else {
            result = await lineMessaging.sendMessage(to, message);
        }

        if (result.success) {
            res.json({
                success: true,
                message: 'Notification sent successfully'
            });
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        logger.error('Send notification error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/v1/webhook/line
 * LINE Webhook endpoint for receiving messages
 */
router.post('/webhook/line', async (req, res) => {
    try {
        const events = req.body.events || [];

        for (const event of events) {
            logger.info('LINE webhook event:', {
                type: event.type,
                source: event.source
            });

            // Log user/group IDs for setup
            if (event.source) {
                if (event.source.userId) {
                    logger.info(`📱 User ID: ${event.source.userId}`);
                }
                if (event.source.groupId) {
                    logger.info(`👥 Group ID: ${event.source.groupId}`);
                }
                if (event.source.roomId) {
                    logger.info(`🏠 Room ID: ${event.source.roomId}`);
                }
            }

            // Handle message events
            if (event.type === 'message') {
                // Optionally reply to messages
                // await lineMessaging.replyMessage(event.replyToken, { type: 'text', text: 'ได้รับข้อความแล้ว!' });
            }

            // Handle follow events (new followers)
            if (event.type === 'follow') {
                logger.info(`🆕 New follower: ${event.source.userId}`);
            }
        }

        // Always respond with 200 to LINE
        res.status(200).json({ success: true });
    } catch (error) {
        logger.error('LINE webhook error:', error);
        // Still respond with 200 to prevent LINE from retrying
        res.status(200).json({ success: true });
    }
});

module.exports = router;
