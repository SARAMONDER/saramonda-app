/**
 * ════════════════════════════════════════════════════════════════════════════════
 *  💳 SLIP VERIFICATION SERVICE
 *  Saramondā - Automatic bank slip reading & verification
 * ════════════════════════════════════════════════════════════════════════════════
 * 
 *  Supports:
 *  - Slipok.com API (recommended for Thai banks)
 *  - Manual verification fallback
 * 
 *  Flow:
 *  1. Customer sends slip image via LINE
 *  2. Bot downloads image and sends to Slipok API
 *  3. API returns: amount, date, time, sender, receiver
 *  4. Bot matches with pending order
 *  5. If matched → auto confirm payment
 *  6. If not matched → notify admin for manual check
 */

const axios = require('axios');
const logger = require('../../shared/logger');

// Configuration
const SLIPOK_API_URL = 'https://api.slipok.com/api/line/apikey';
const SLIPOK_BRANCH_ID = process.env.SLIPOK_BRANCH_ID || '';
const SLIPOK_API_KEY = process.env.SLIPOK_API_KEY || '';

// Bank account to match
const SHOP_ACCOUNTS = [
    {
        bank: 'KBANK',
        accountNumber: process.env.BANK_ACCOUNT_KBANK || '',
        accountName: 'SARAMONDA'
    },
    {
        bank: 'SCB',
        accountNumber: process.env.BANK_ACCOUNT_SCB || '',
        accountName: 'SARAMONDA'
    },
    {
        bank: 'PROMPTPAY',
        accountNumber: process.env.PROMPTPAY_NUMBER || '',
        accountName: 'SARAMONDA'
    }
];

/**
 * Verify slip using Slipok API
 * @param {string} imageUrl - URL of slip image from LINE
 * @returns {object} Verification result
 */
async function verifySlipWithSlipok(imageUrl) {
    try {
        if (!SLIPOK_API_KEY) {
            logger.warn('Slipok API key not configured, using manual verification');
            return { success: false, error: 'API_NOT_CONFIGURED', requiresManual: true };
        }

        const response = await axios.post(SLIPOK_API_URL, {
            url: imageUrl,
            log: true
        }, {
            headers: {
                'x-authorization': SLIPOK_API_KEY,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });

        const data = response.data;

        if (data.success) {
            return {
                success: true,
                data: {
                    transactionId: data.data.transRef,
                    amount: parseFloat(data.data.amount),
                    date: data.data.transDate,
                    time: data.data.transTime,
                    senderBank: data.data.sendingBank,
                    senderName: data.data.sender?.displayName || data.data.sender?.name,
                    senderAccount: data.data.sender?.account?.value,
                    receiverBank: data.data.receivingBank,
                    receiverName: data.data.receiver?.displayName || data.data.receiver?.name,
                    receiverAccount: data.data.receiver?.account?.value,
                    qrCode: data.data.qrData
                }
            };
        } else {
            return {
                success: false,
                error: data.message || 'VERIFICATION_FAILED',
                requiresManual: true
            };
        }

    } catch (error) {
        logger.error('Slipok verification error:', error.message);
        return {
            success: false,
            error: error.message,
            requiresManual: true
        };
    }
}

/**
 * Match slip with pending order
 * @param {object} slipData - Verified slip data
 * @param {object} order - Order to match against
 * @returns {object} Match result
 */
function matchSlipWithOrder(slipData, order) {
    const result = {
        isMatch: false,
        matchDetails: {
            amountMatch: false,
            accountMatch: false,
            dateValid: false
        },
        warnings: []
    };

    // 1. Check amount (allow 1 baht tolerance for rounding)
    const expectedAmount = parseFloat(order.total_amount);
    const slipAmount = parseFloat(slipData.amount);
    const amountDiff = Math.abs(expectedAmount - slipAmount);

    if (amountDiff <= 1) {
        result.matchDetails.amountMatch = true;
    } else {
        result.warnings.push(`ยอดไม่ตรง: สลิป ฿${slipAmount} / ออเดอร์ ฿${expectedAmount}`);
    }

    // 2. Check receiver account
    const receiverAccount = slipData.receiverAccount?.replace(/\D/g, '') || '';
    const accountMatched = SHOP_ACCOUNTS.some(acc => {
        const shopAccount = acc.accountNumber.replace(/\D/g, '');
        return receiverAccount.includes(shopAccount) || shopAccount.includes(receiverAccount);
    });

    if (accountMatched) {
        result.matchDetails.accountMatch = true;
    } else {
        result.warnings.push('เลขบัญชีผู้รับไม่ตรงกับร้าน');
    }

    // 3. Check date (slip should be within last 24 hours)
    try {
        const today = new Date();
        const slipDate = parseSlipDate(slipData.date, slipData.time);
        const hoursDiff = (today - slipDate) / (1000 * 60 * 60);

        if (hoursDiff >= 0 && hoursDiff <= 24) {
            result.matchDetails.dateValid = true;
        } else if (hoursDiff > 24) {
            result.warnings.push('สลิปเก่ากว่า 24 ชั่วโมง');
        }
    } catch (e) {
        result.warnings.push('ไม่สามารถตรวจสอบวันที่ได้');
    }

    // Overall match
    result.isMatch = result.matchDetails.amountMatch &&
        result.matchDetails.accountMatch &&
        result.matchDetails.dateValid;

    return result;
}

/**
 * Parse slip date/time string to Date object
 */
function parseSlipDate(dateStr, timeStr) {
    // Slipok returns date as "DD/MM/YYYY" or "YYYY-MM-DD"
    // and time as "HH:MM" or "HH:MM:SS"
    let date;

    if (dateStr.includes('/')) {
        const [day, month, year] = dateStr.split('/');
        date = new Date(`${year}-${month}-${day}T${timeStr || '00:00'}:00`);
    } else {
        date = new Date(`${dateStr}T${timeStr || '00:00'}:00`);
    }

    return date;
}

/**
 * Check if slip has been used before (prevent duplicate)
 * @param {string} transactionId - Transaction reference from slip
 * @param {object} db - Database instance
 */
async function isSlipAlreadyUsed(transactionId, orderService) {
    if (!transactionId) return false;

    try {
        const existingOrder = await orderService.getOrderBySlipRef(transactionId);
        return !!existingOrder;
    } catch (error) {
        logger.error('Check duplicate slip error:', error);
        return false;
    }
}

/**
 * Process payment slip from customer
 * Main function called when customer sends slip image
 */
async function processPaymentSlip(imageUrl, order, orderService) {
    const result = {
        success: false,
        status: null,
        message: '',
        slipData: null,
        requiresManual: false
    };

    try {
        // Step 1: Verify slip with Slipok
        logger.info(`Processing slip for order #${order.order_number}`);
        const verification = await verifySlipWithSlipok(imageUrl);

        if (!verification.success) {
            result.status = 'VERIFICATION_FAILED';
            result.message = 'ไม่สามารถอ่านสลิปได้ กรุณาถ่ายใหม่ให้ชัดเจน หรือรอ Admin ตรวจสอบ';
            result.requiresManual = true;
            return result;
        }

        result.slipData = verification.data;

        // Step 2: Check for duplicate slip
        const isDuplicate = await isSlipAlreadyUsed(verification.data.transactionId, orderService);
        if (isDuplicate) {
            result.status = 'DUPLICATE_SLIP';
            result.message = 'สลิปนี้ถูกใช้ไปแล้ว กรุณาส่งสลิปใหม่';
            return result;
        }

        // Step 3: Match with order
        const matchResult = matchSlipWithOrder(verification.data, order);

        if (matchResult.isMatch) {
            // Auto-approve payment
            result.success = true;
            result.status = 'APPROVED';
            result.message = `✅ ชำระเงินสำเร็จ\n\nยอด: ฿${verification.data.amount}\nเลขอ้างอิง: ${verification.data.transactionId}`;
        } else {
            // Need manual review
            result.status = 'NEEDS_REVIEW';
            result.message = `⚠️ รอ Admin ตรวจสอบ\n\n${matchResult.warnings.join('\n')}`;
            result.requiresManual = true;
            result.matchDetails = matchResult;
        }

        return result;

    } catch (error) {
        logger.error('Process slip error:', error);
        result.status = 'ERROR';
        result.message = 'เกิดข้อผิดพลาด กรุณาลองใหม่หรือติดต่อร้าน';
        result.requiresManual = true;
        return result;
    }
}

/**
 * Generate QR Code for PromptPay payment
 * @param {number} amount - Amount to pay
 * @returns {string} QR Code image URL
 */
function generatePromptPayQR(amount) {
    const promptPayId = process.env.PROMPTPAY_NUMBER || '';
    if (!promptPayId) return null;

    // Use PromptPay QR generator API
    // Option 1: promptpay.io
    const qrUrl = `https://promptpay.io/${promptPayId}/${amount}.png`;

    return qrUrl;
}

module.exports = {
    verifySlipWithSlipok,
    matchSlipWithOrder,
    processPaymentSlip,
    isSlipAlreadyUsed,
    generatePromptPayQR,
    SHOP_ACCOUNTS
};
