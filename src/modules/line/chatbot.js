/**
 * ════════════════════════════════════════════════════════════════════════════════
 *  🤖 LINE CHATBOT HANDLER
 *  Saramondā - Premium Salmon Ordering System
 * ════════════════════════════════════════════════════════════════════════════════
 */

const flexMessages = require('./flexMessages');
const storeMessages = require('./storeMessages');
const paymentMessages = require('../payment/paymentMessages');
const slipVerification = require('../payment/slipVerification');
const logger = require('../../shared/logger');

// Daily order limit
const DAILY_ORDER_LIMIT = parseInt(process.env.DAILY_ORDER_LIMIT) || 15;

// User sessions (in-memory, use Redis for production)
const userSessions = new Map();

/**
 * Main chatbot handler - processes LINE webhook events
 */
async function handleWebhookEvent(event, lineClient, orderService) {
    const userId = event.source.userId;

    try {
        switch (event.type) {
            case 'message':
                if (event.message.type === 'text') {
                    await handleTextMessage(event, lineClient, orderService);
                } else if (event.message.type === 'image') {
                    // Handle slip image
                    await handleImageMessage(event, lineClient, orderService);
                }
                break;

            case 'postback':
                await handlePostback(event, lineClient, orderService);
                break;

            case 'follow':
                await handleFollow(event, lineClient);
                break;

            default:
                logger.info(`Unhandled event type: ${event.type}`);
        }
    } catch (error) {
        logger.error('Chatbot error:', error);
        await replyText(event.replyToken, lineClient,
            '❌ ขออภัย เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    }
}

/**
 * Handle text messages from users
 */
async function handleTextMessage(event, lineClient, orderService) {
    const text = event.message.text.toLowerCase().trim();
    const userId = event.source.userId;

    // Keywords mapping
    const keywords = {
        greeting: ['สวัสดี', 'hello', 'hi', 'หวัดดี', 'ดี'],
        order: ['สั่ง', 'order', 'สั่งซื้อ', 'ซื้อ', 'buy'],
        price: ['ราคา', 'price', 'เมนู', 'menu', 'ขนาด', 'size'],
        about: ['เกี่ยวกับ', 'about', 'ข้อมูล', 'info', 'แบรนด์', 'brand'],
        delivery: ['รอบส่ง', 'รอบรับ', 'delivery', 'จัดส่ง', 'เวลาส่ง'],
        contact: ['ติดต่อ', 'contact', 'โทร', 'call', 'chat'],
        promotion: ['โปร', 'promo', 'โปรโมชั่น', 'promotion', 'ส่วนลด'],
        status: ['สถานะ', 'status', 'ออเดอร์', 'order status', 'เช็ค'],
        cancel: ['ยกเลิก', 'cancel'],
        schedule: ['รอบ', 'เวลา', 'schedule'],
        payment: ['ชำระ', 'จ่าย', 'pay', 'payment', 'โอน', 'สลิป', 'slip'],
        help: ['help', 'ช่วย', 'วิธี', '?']
    };

    // Check which intent matches
    if (matchKeywords(text, keywords.greeting)) {
        await handleGreeting(event, lineClient);
    } else if (matchKeywords(text, keywords.order)) {
        await handleOrderIntent(event, lineClient, orderService);
    } else if (matchKeywords(text, keywords.price)) {
        await handlePriceIntent(event, lineClient);
    } else if (matchKeywords(text, keywords.about)) {
        await handleAboutIntent(event, lineClient);
    } else if (matchKeywords(text, keywords.delivery)) {
        await handleDeliveryIntent(event, lineClient);
    } else if (matchKeywords(text, keywords.contact)) {
        await handleContactIntent(event, lineClient);
    } else if (matchKeywords(text, keywords.promotion)) {
        await handlePromotionIntent(event, lineClient);
    } else if (matchKeywords(text, keywords.status)) {
        await handleStatusIntent(event, lineClient, orderService, userId);
    } else if (matchKeywords(text, keywords.cancel)) {
        await handleCancelIntent(event, lineClient, orderService, userId);
    } else if (matchKeywords(text, keywords.schedule)) {
        await handleScheduleIntent(event, lineClient);
    } else if (matchKeywords(text, keywords.payment)) {
        await handlePaymentRequest(event, lineClient, orderService, null, userId);
    } else if (matchKeywords(text, keywords.help)) {
        await handleHelpIntent(event, lineClient);
    } else {
        await handleDefaultResponse(event, lineClient);
    }
}

/**
 * Handle postback events (button clicks)
 */
async function handlePostback(event, lineClient, orderService) {
    const data = new URLSearchParams(event.postback.data);
    const action = data.get('action');
    const userId = event.source.userId;

    switch (action) {
        case 'order':
            await handleOrderIntent(event, lineClient, orderService);
            break;

        case 'price':
            await handlePriceIntent(event, lineClient);
            break;

        case 'status':
            await handleStatusIntent(event, lineClient, orderService, userId);
            break;

        case 'cancel':
            const orderId = data.get('orderId');
            await handleCancelOrder(event, lineClient, orderService, orderId);
            break;

        case 'select_size':
            const size = data.get('size');
            const price = data.get('price');
            await handleSizeSelection(event, lineClient, userId, size, price);
            break;

        case 'confirm_order':
            await handleConfirmOrder(event, lineClient, orderService, userId);
            break;

        case 'schedule':
            await handleScheduleIntent(event, lineClient);
            break;

        case 'send_slip':
            // Prompt user to send slip image
            const slipOrderId = data.get('orderId');
            await handleSendSlipPrompt(event, lineClient, orderService, slipOrderId, userId);
            break;

        case 'rate':
            // Handle rating submission
            const rateOrderId = data.get('orderId');
            const rating = data.get('rating');
            await handleRating(event, lineClient, orderService, rateOrderId, rating);
            break;

        case 'pay':
            // Show payment info
            const payOrderId = data.get('orderId');
            await handlePaymentRequest(event, lineClient, orderService, payOrderId, userId);
            break;

        default:
            logger.info(`Unknown postback action: ${action}`);
    }
}

/**
 * Handle new follower
 */
async function handleFollow(event, lineClient) {
    // ส่ง Welcome Message + Promotion เมื่อมีคนเพิ่มเพื่อน
    const welcomeMessage = storeMessages.createWelcomeMessage();
    const promoMessage = storeMessages.createPromotionMessage();

    await lineClient.replyMessage(event.replyToken, [
        welcomeMessage,
        promoMessage
    ]);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  INTENT HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Handle order intent - Show LIFF or order options
 */
async function handleOrderIntent(event, lineClient, orderService) {
    // Check daily limit
    const todayOrders = await getTodayOrderCount(orderService);
    const remaining = DAILY_ORDER_LIMIT - todayOrders;

    if (remaining <= 0) {
        // Orders full for today
        const fullMessage = flexMessages.createOrderFullMessage(getTomorrow());
        await replyFlex(event.replyToken, lineClient, 'ออเดอร์เต็ม', fullMessage);
        return;
    }

    // Show order options with LIFF link
    const liffId = process.env.LINE_LIFF_ID || 'your-liff-id';
    const orderMessage = flexMessages.createOrderMessage(liffId, remaining);
    await replyFlex(event.replyToken, lineClient, 'สั่งซื้อ', orderMessage);
}

/**
 * Handle price intent - Show menu and prices
 */
async function handlePriceIntent(event, lineClient) {
    const priceMessage = storeMessages.createPriceMessage();
    await lineClient.replyMessage(event.replyToken, priceMessage);
}

/**
 * Handle greeting - ทักทาย
 */
async function handleGreeting(event, lineClient) {
    const welcomeMessage = storeMessages.createWelcomeMessage();
    await lineClient.replyMessage(event.replyToken, welcomeMessage);
}

/**
 * Handle about intent - เกี่ยวกับร้าน
 */
async function handleAboutIntent(event, lineClient) {
    const aboutMessage = storeMessages.createAboutMessage();
    await lineClient.replyMessage(event.replyToken, aboutMessage);
}

/**
 * Handle delivery intent - รอบจัดส่ง
 */
async function handleDeliveryIntent(event, lineClient) {
    const deliveryMessage = storeMessages.createDeliveryMessage();
    await lineClient.replyMessage(event.replyToken, deliveryMessage);
}

/**
 * Handle contact intent - ติดต่อร้าน
 */
async function handleContactIntent(event, lineClient) {
    const contactMessage = storeMessages.createContactMessage();
    await lineClient.replyMessage(event.replyToken, contactMessage);
}

/**
 * Handle promotion intent - โปรโมชั่น
 */
async function handlePromotionIntent(event, lineClient) {
    const promoMessage = storeMessages.createPromotionMessage();
    await lineClient.replyMessage(event.replyToken, promoMessage);
}

/**
 * Handle status intent - Show user's orders
 */
async function handleStatusIntent(event, lineClient, orderService, userId) {
    try {
        // Get user's recent orders
        const orders = await orderService.getOrdersByLineUserId(userId);

        if (!orders || orders.length === 0) {
            await replyText(event.replyToken, lineClient,
                '📋 คุณยังไม่มีออเดอร์\n\nพิมพ์ "สั่ง" เพื่อเริ่มสั่งซื้อ');
            return;
        }

        const statusMessage = flexMessages.createOrderStatusMessage(orders);
        await replyFlex(event.replyToken, lineClient, 'สถานะออเดอร์', statusMessage);
    } catch (error) {
        logger.error('Status check error:', error);
        await replyText(event.replyToken, lineClient,
            '❌ ไม่สามารถดึงข้อมูลได้ กรุณาลองใหม่');
    }
}

/**
 * Handle cancel intent
 */
async function handleCancelIntent(event, lineClient, orderService, userId) {
    try {
        // Get user's pending orders
        const orders = await orderService.getOrdersByLineUserId(userId, 'pending');

        if (!orders || orders.length === 0) {
            await replyText(event.replyToken, lineClient,
                '📋 คุณไม่มีออเดอร์ที่รอดำเนินการ');
            return;
        }

        const cancelMessage = flexMessages.createCancelOptionsMessage(orders);
        await replyFlex(event.replyToken, lineClient, 'ยกเลิกออเดอร์', cancelMessage);
    } catch (error) {
        logger.error('Cancel intent error:', error);
        await replyText(event.replyToken, lineClient,
            '❌ ไม่สามารถดึงข้อมูลได้ กรุณาลองใหม่');
    }
}

/**
 * Handle delivery schedule intent
 */
async function handleScheduleIntent(event, lineClient) {
    const scheduleMessage = flexMessages.createScheduleMessage();
    await replyFlex(event.replyToken, lineClient, 'รอบจัดส่ง', scheduleMessage);
}

/**
 * Handle help intent
 */
async function handleHelpIntent(event, lineClient) {
    const helpText = `🐟 Saramondā - คำสั่งที่ใช้ได้

📝 สั่งซื้อ:
• พิมพ์ "สั่ง" หรือกดปุ่มสั่งซื้อ

💰 ดูราคา:
• พิมพ์ "ราคา" หรือ "เมนู"

📋 เช็คสถานะ:
• พิมพ์ "สถานะ" หรือ "เช็คออเดอร์"

🚚 รอบจัดส่ง:
• พิมพ์ "รอบส่ง" หรือ "เวลา"

❌ ยกเลิก:
• พิมพ์ "ยกเลิก"

💬 ติดต่อร้าน:
• พิมพ์ข้อความอื่นๆ Admin จะตอบกลับ`;

    await replyText(event.replyToken, lineClient, helpText);
}

/**
 * Default response for unrecognized messages
 */
async function handleDefaultResponse(event, lineClient) {
    const quickReply = {
        type: 'text',
        text: '🐟 สวัสดีค่ะ! ต้องการทำอะไรดีคะ?',
        quickReply: {
            items: [
                {
                    type: 'action',
                    action: {
                        type: 'postback',
                        label: '🛒 สั่งซื้อ',
                        data: 'action=order',
                        displayText: 'สั่งซื้อ'
                    }
                },
                {
                    type: 'action',
                    action: {
                        type: 'postback',
                        label: '💰 ดูราคา',
                        data: 'action=price',
                        displayText: 'ดูราคา'
                    }
                },
                {
                    type: 'action',
                    action: {
                        type: 'postback',
                        label: '📋 เช็คสถานะ',
                        data: 'action=status',
                        displayText: 'เช็คสถานะ'
                    }
                },
                {
                    type: 'action',
                    action: {
                        type: 'postback',
                        label: '🚚 รอบส่ง',
                        data: 'action=schedule',
                        displayText: 'รอบจัดส่ง'
                    }
                }
            ]
        }
    };

    await lineClient.replyMessage(event.replyToken, quickReply);
}

/**
 * Handle order cancellation
 */
async function handleCancelOrder(event, lineClient, orderService, orderId) {
    try {
        await orderService.updateOrderStatus(orderId, 'cancelled');

        const cancelledMessage = {
            type: 'text',
            text: `✅ ยกเลิกออเดอร์เรียบร้อยแล้ว\n\nหากต้องการสั่งใหม่ พิมพ์ "สั่ง"`
        };

        await lineClient.replyMessage(event.replyToken, cancelledMessage);
    } catch (error) {
        logger.error('Cancel order error:', error);
        await replyText(event.replyToken, lineClient,
            '❌ ไม่สามารถยกเลิกได้ กรุณาติดต่อร้าน');
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function matchKeywords(text, keywords) {
    return keywords.some(keyword => text.includes(keyword));
}

async function replyText(replyToken, lineClient, text) {
    await lineClient.replyMessage(replyToken, { type: 'text', text });
}

async function replyFlex(replyToken, lineClient, altText, contents) {
    await lineClient.replyMessage(replyToken, {
        type: 'flex',
        altText,
        contents
    });
}

async function getTodayOrderCount(orderService) {
    try {
        const today = new Date().toISOString().split('T')[0];
        const count = await orderService.getOrderCountByDate(today);
        return count || 0;
    } catch (error) {
        logger.error('Get order count error:', error);
        return 0;
    }
}

function getTomorrow() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toLocaleDateString('th-TH', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short'
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  NOTIFICATION FUNCTIONS (Push Messages)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Send order confirmation to customer
 */
async function sendOrderConfirmation(lineClient, userId, order) {
    try {
        const confirmMessage = flexMessages.createOrderConfirmationMessage(order);
        await lineClient.pushMessage(userId, {
            type: 'flex',
            altText: `✅ ออเดอร์ ${order.order_number} ยืนยันแล้ว`,
            contents: confirmMessage
        });
        logger.info(`Order confirmation sent to ${userId}`);
    } catch (error) {
        logger.error('Send confirmation error:', error);
    }
}

/**
 * Send delivery notification to customer
 */
async function sendDeliveryNotification(lineClient, userId, order) {
    try {
        const deliveryMessage = flexMessages.createDeliveryNotificationMessage(order);
        await lineClient.pushMessage(userId, {
            type: 'flex',
            altText: `🚚 ออเดอร์ ${order.order_number} กำลังจัดส่ง`,
            contents: deliveryMessage
        });
        logger.info(`Delivery notification sent to ${userId}`);
    } catch (error) {
        logger.error('Send delivery notification error:', error);
    }
}

/**
 * Send status update to customer
 */
async function sendStatusUpdate(lineClient, userId, order, status) {
    try {
        const statusMessages = {
            confirmed: '✅ ออเดอร์ได้รับการยืนยันแล้ว',
            preparing: '👨‍🍳 กำลังเตรียมสินค้า',
            ready: '📦 สินค้าพร้อมจัดส่ง',
            delivering: '🚚 กำลังจัดส่ง',
            completed: '✅ จัดส่งสำเร็จ ขอบคุณที่อุดหนุน!',
            cancelled: '❌ ออเดอร์ถูกยกเลิก'
        };

        const message = statusMessages[status] || `สถานะ: ${status}`;

        await lineClient.pushMessage(userId, {
            type: 'text',
            text: `📋 อัพเดทออเดอร์ #${order.order_number}\n\n${message}`
        });
    } catch (error) {
        logger.error('Send status update error:', error);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PAYMENT & SLIP HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Handle image message (slip upload)
 */
async function handleImageMessage(event, lineClient, orderService) {
    const userId = event.source.userId;
    const messageId = event.message.id;

    try {
        // Get user's pending (unpaid) order
        const pendingOrder = await orderService.getPendingPaymentOrder(userId);

        if (!pendingOrder) {
            await replyText(event.replyToken, lineClient,
                '📋 คุณยังไม่มีออเดอร์ที่รอชำระเงิน\n\nพิมพ์ "สั่ง" เพื่อสั่งซื้อ');
            return;
        }

        // Get image content from LINE
        const imageUrl = await getLineImageUrl(lineClient, messageId);

        // Set session to indicate waiting for slip verification
        userSessions.set(userId, {
            state: 'verifying_slip',
            orderId: pendingOrder.id,
            timestamp: Date.now()
        });

        // Acknowledge receipt
        await replyText(event.replyToken, lineClient,
            '📸 ได้รับสลิปแล้ว กำลังตรวจสอบ...');

        // Process slip verification (async)
        const result = await slipVerification.processPaymentSlip(
            imageUrl,
            pendingOrder,
            orderService
        );

        // Clear session
        userSessions.delete(userId);

        // Send result to customer
        if (result.success) {
            // Update order status to paid
            await orderService.updateOrderPaymentStatus(pendingOrder.id, 'paid', {
                slipRef: result.slipData?.transactionId,
                slipAmount: result.slipData?.amount,
                verifiedAt: new Date().toISOString()
            });

            // Send success message
            const successMessage = paymentMessages.createPaymentSuccessMessage(
                pendingOrder,
                result.slipData
            );
            await lineClient.pushMessage(userId, {
                type: 'flex',
                altText: '✅ ชำระเงินสำเร็จ',
                contents: successMessage
            });

            // Notify admin
            await notifyAdminPaymentReceived(lineClient, pendingOrder, result.slipData);

        } else if (result.requiresManual) {
            // Need manual verification
            const pendingMessage = paymentMessages.createPaymentPendingMessage(
                pendingOrder,
                result.matchDetails?.warnings || []
            );
            await lineClient.pushMessage(userId, {
                type: 'flex',
                altText: '⏳ รอตรวจสอบ',
                contents: pendingMessage
            });

            // Notify admin for manual check
            await notifyAdminManualCheck(lineClient, pendingOrder, result);

        } else {
            // Verification failed
            const failedMessage = paymentMessages.createPaymentFailedMessage(result.message);
            await lineClient.pushMessage(userId, {
                type: 'flex',
                altText: '❌ ชำระเงินไม่สำเร็จ',
                contents: failedMessage
            });
        }

    } catch (error) {
        logger.error('Handle image message error:', error);
        await replyText(event.replyToken, lineClient,
            '❌ เกิดข้อผิดพลาดในการตรวจสอบสลิป กรุณาลองใหม่');
    }
}

/**
 * Get LINE image URL from message ID
 */
async function getLineImageUrl(lineClient, messageId) {
    // For Slipok, we can use LINE's content API
    // The URL format for LINE image content
    return `https://api-data.line.me/v2/bot/message/${messageId}/content`;
}

/**
 * Handle payment request - Show QR Code and bank account
 */
async function handlePaymentRequest(event, lineClient, orderService, orderId, userId) {
    try {
        let order;
        if (orderId) {
            order = await orderService.getOrderById(orderId);
        } else {
            // Get latest unpaid order
            order = await orderService.getPendingPaymentOrder(userId);
        }

        if (!order) {
            await replyText(event.replyToken, lineClient,
                '📋 ไม่พบออเดอร์ที่รอชำระเงิน');
            return;
        }

        // Generate PromptPay QR
        const qrCodeUrl = slipVerification.generatePromptPayQR(order.total_amount);

        // Send payment message
        const paymentMessage = paymentMessages.createPaymentRequestMessage(order, qrCodeUrl);
        await replyFlex(event.replyToken, lineClient, 'ชำระเงิน', paymentMessage);

        // Set session
        userSessions.set(userId, {
            state: 'waiting_payment',
            orderId: order.id,
            timestamp: Date.now()
        });

    } catch (error) {
        logger.error('Payment request error:', error);
        await replyText(event.replyToken, lineClient,
            '❌ เกิดข้อผิดพลาด กรุณาลองใหม่');
    }
}

/**
 * Handle send slip prompt
 */
async function handleSendSlipPrompt(event, lineClient, orderService, orderId, userId) {
    try {
        let order;
        if (orderId) {
            order = await orderService.getOrderById(orderId);
        } else {
            order = await orderService.getPendingPaymentOrder(userId);
        }

        if (!order) {
            await replyText(event.replyToken, lineClient,
                '📋 ไม่พบออเดอร์ที่รอชำระเงิน');
            return;
        }

        const promptMessage = paymentMessages.createSlipUploadPromptMessage(order);
        await replyFlex(event.replyToken, lineClient, 'ส่งสลิป', promptMessage);

        // Update session
        userSessions.set(userId, {
            state: 'waiting_slip',
            orderId: order.id,
            timestamp: Date.now()
        });

    } catch (error) {
        logger.error('Send slip prompt error:', error);
        await replyText(event.replyToken, lineClient,
            '❌ เกิดข้อผิดพลาด กรุณาลองใหม่');
    }
}

/**
 * Handle rating submission
 */
async function handleRating(event, lineClient, orderService, orderId, rating) {
    try {
        if (!orderId || !rating) {
            await replyText(event.replyToken, lineClient,
                '❌ ข้อมูลไม่ครบถ้วน');
            return;
        }

        // Save rating
        await orderService.updateOrderRating(orderId, parseInt(rating));

        const stars = '⭐'.repeat(parseInt(rating));
        const thankMessage = parseInt(rating) >= 4
            ? `${stars}\n\nขอบคุณมากๆ เลยค่ะ! 🙏\n\nรีวิวของคุณมีค่ามากสำหรับเรา 💕`
            : `${stars}\n\nขอบคุณสำหรับ feedback ค่ะ 🙏\n\nเราจะปรับปรุงให้ดีขึ้น!`;

        await replyText(event.replyToken, lineClient, thankMessage);

    } catch (error) {
        logger.error('Rating error:', error);
        await replyText(event.replyToken, lineClient,
            '❌ เกิดข้อผิดพลาด กรุณาลองใหม่');
    }
}

/**
 * Send payment request to customer after order
 */
async function sendPaymentRequest(lineClient, userId, order) {
    try {
        const qrCodeUrl = slipVerification.generatePromptPayQR(order.total_amount);
        const paymentMessage = paymentMessages.createPaymentRequestMessage(order, qrCodeUrl);

        await lineClient.pushMessage(userId, {
            type: 'flex',
            altText: `💳 ชำระเงิน ฿${order.total_amount}`,
            contents: paymentMessage
        });

        logger.info(`Payment request sent to ${userId} for order #${order.order_number}`);
    } catch (error) {
        logger.error('Send payment request error:', error);
    }
}

/**
 * Send rating request after delivery completed
 */
async function sendRatingRequest(lineClient, userId, order) {
    try {
        const ratingMessage = paymentMessages.createRatingRequestMessage(order);

        await lineClient.pushMessage(userId, {
            type: 'flex',
            altText: '⭐ ให้คะแนนบริการ',
            contents: ratingMessage
        });

        logger.info(`Rating request sent to ${userId} for order #${order.order_number}`);
    } catch (error) {
        logger.error('Send rating request error:', error);
    }
}

/**
 * Notify admin about payment received
 */
async function notifyAdminPaymentReceived(lineClient, order, slipData) {
    const adminUserId = process.env.LINE_ADMIN_USER_ID;
    if (!adminUserId) return;

    try {
        await lineClient.pushMessage(adminUserId, {
            type: 'text',
            text: `💰 ชำระเงินสำเร็จ\n\n` +
                `📋 Order: #${order.order_number}\n` +
                `💵 ยอด: ฿${slipData?.amount || order.total_amount}\n` +
                `🔖 Ref: ${slipData?.transactionId || '-'}\n` +
                `👤 ลูกค้า: ${order.customer_name}\n` +
                `📱 Tel: ${order.customer_phone}`
        });
    } catch (error) {
        logger.error('Notify admin error:', error);
    }
}

/**
 * Notify admin for manual slip check
 */
async function notifyAdminManualCheck(lineClient, order, result) {
    const adminUserId = process.env.LINE_ADMIN_USER_ID;
    if (!adminUserId) return;

    try {
        const warnings = result.matchDetails?.warnings?.join('\n• ') || 'ตรวจสอบไม่ผ่าน';

        await lineClient.pushMessage(adminUserId, {
            type: 'text',
            text: `⚠️ ต้องการตรวจสอบ Manual\n\n` +
                `📋 Order: #${order.order_number}\n` +
                `💵 ยอดที่ต้องชำระ: ฿${order.total_amount}\n` +
                `👤 ลูกค้า: ${order.customer_name}\n\n` +
                `❗ สาเหตุ:\n• ${warnings}`
        });
    } catch (error) {
        logger.error('Notify admin manual check error:', error);
    }
}

module.exports = {
    handleWebhookEvent,
    sendOrderConfirmation,
    sendDeliveryNotification,
    sendStatusUpdate,
    sendPaymentRequest,
    sendRatingRequest
};
