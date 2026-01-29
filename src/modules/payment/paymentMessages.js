/**
 * ════════════════════════════════════════════════════════════════════════════════
 *  💳 PAYMENT FLEX MESSAGE TEMPLATES
 *  Saramondā - Beautiful payment messages for LINE
 * ════════════════════════════════════════════════════════════════════════════════
 */

// Brand colors (matching index.html)
const COLORS = {
    primary: '#c41e3a',      // Crimson red
    gold: '#b8860b',         // Gold
    dark: '#1a1a1a',
    light: '#faf8f5',
    gray: '#666666',
    success: '#22C55E',
    danger: '#EF4444',
    warning: '#f59e0b',
    line: '#06C755'
};

/**
 * Payment request message with QR Code
 */
function createPaymentRequestMessage(order, qrCodeUrl) {
    return {
        type: 'bubble',
        header: {
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'text',
                    text: '💳 ชำระเงิน',
                    weight: 'bold',
                    size: 'lg',
                    color: COLORS.light
                },
                {
                    type: 'text',
                    text: `ออเดอร์ #${order.order_number}`,
                    size: 'sm',
                    color: COLORS.light,
                    margin: 'sm'
                }
            ],
            backgroundColor: COLORS.primary,
            paddingAll: 'lg'
        },
        body: {
            type: 'box',
            layout: 'vertical',
            contents: [
                // QR Code
                {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'image',
                            url: qrCodeUrl || 'https://via.placeholder.com/200x200?text=QR+Code',
                            size: 'lg',
                            aspectRatio: '1:1',
                            aspectMode: 'fit'
                        },
                        {
                            type: 'text',
                            text: 'สแกน QR เพื่อชำระเงิน',
                            size: 'xs',
                            color: COLORS.gray,
                            align: 'center',
                            margin: 'sm'
                        }
                    ],
                    paddingAll: 'md',
                    backgroundColor: '#ffffff',
                    cornerRadius: 'md'
                },
                // Amount
                {
                    type: 'box',
                    layout: 'horizontal',
                    margin: 'lg',
                    contents: [
                        { type: 'text', text: '💰 ยอดชำระ', size: 'md', color: COLORS.gray, flex: 2 },
                        {
                            type: 'text',
                            text: `฿${order.total_amount}`,
                            size: 'xl',
                            weight: 'bold',
                            color: COLORS.primary,
                            flex: 3,
                            align: 'end'
                        }
                    ]
                },
                // Separator
                {
                    type: 'separator',
                    margin: 'lg'
                },
                // Bank accounts
                {
                    type: 'box',
                    layout: 'vertical',
                    margin: 'lg',
                    spacing: 'sm',
                    contents: [
                        {
                            type: 'text',
                            text: '🏦 หรือโอนเข้าบัญชี',
                            size: 'sm',
                            weight: 'bold',
                            color: COLORS.dark
                        },
                        {
                            type: 'box',
                            layout: 'horizontal',
                            margin: 'sm',
                            contents: [
                                { type: 'text', text: 'PromptPay', size: 'xs', color: COLORS.gray, flex: 2 },
                                { type: 'text', text: process.env.PROMPTPAY_NUMBER || '0xx-xxx-xxxx', size: 'xs', flex: 3, align: 'end' }
                            ]
                        },
                        {
                            type: 'box',
                            layout: 'horizontal',
                            contents: [
                                { type: 'text', text: 'ชื่อบัญชี', size: 'xs', color: COLORS.gray, flex: 2 },
                                { type: 'text', text: 'SARAMONDA', size: 'xs', flex: 3, align: 'end' }
                            ]
                        }
                    ]
                },
                // Warning
                {
                    type: 'text',
                    text: '⏰ กรุณาชำระภายใน 30 นาที',
                    size: 'xs',
                    color: COLORS.warning,
                    margin: 'lg',
                    align: 'center'
                }
            ],
            paddingAll: 'lg'
        },
        footer: {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
                {
                    type: 'button',
                    style: 'primary',
                    color: COLORS.success,
                    action: {
                        type: 'postback',
                        label: '📸 ส่งสลิปโอนเงิน',
                        data: `action=send_slip&orderId=${order.id}`
                    }
                },
                {
                    type: 'button',
                    style: 'secondary',
                    action: {
                        type: 'postback',
                        label: '❌ ยกเลิกออเดอร์',
                        data: `action=cancel&orderId=${order.id}`
                    },
                    height: 'sm'
                }
            ]
        }
    };
}

/**
 * Slip upload prompt message
 */
function createSlipUploadPromptMessage(order) {
    return {
        type: 'bubble',
        body: {
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'text',
                    text: '📸 ส่งสลิปโอนเงิน',
                    weight: 'bold',
                    size: 'lg',
                    color: COLORS.dark
                },
                {
                    type: 'text',
                    text: `ออเดอร์ #${order.order_number} | ฿${order.total_amount}`,
                    size: 'sm',
                    color: COLORS.gray,
                    margin: 'sm'
                },
                {
                    type: 'separator',
                    margin: 'lg'
                },
                {
                    type: 'box',
                    layout: 'vertical',
                    margin: 'lg',
                    spacing: 'md',
                    contents: [
                        {
                            type: 'text',
                            text: '📌 วิธีส่งสลิป:',
                            size: 'sm',
                            weight: 'bold'
                        },
                        {
                            type: 'text',
                            text: '1. กดปุ่ม 📷 ด้านล่าง',
                            size: 'sm',
                            color: COLORS.gray
                        },
                        {
                            type: 'text',
                            text: '2. ถ่ายหรือเลือกรูปสลิป',
                            size: 'sm',
                            color: COLORS.gray
                        },
                        {
                            type: 'text',
                            text: '3. ระบบจะตรวจสอบอัตโนมัติ',
                            size: 'sm',
                            color: COLORS.gray
                        }
                    ]
                },
                {
                    type: 'text',
                    text: '💡 ถ่ายให้ชัด เห็นยอดเงินและวันที่',
                    size: 'xs',
                    color: COLORS.warning,
                    margin: 'lg',
                    wrap: true
                }
            ],
            paddingAll: 'lg'
        }
    };
}

/**
 * Payment success message
 */
function createPaymentSuccessMessage(order, slipData) {
    return {
        type: 'bubble',
        header: {
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'text',
                    text: '✅ ชำระเงินสำเร็จ',
                    weight: 'bold',
                    size: 'lg',
                    color: COLORS.light
                }
            ],
            backgroundColor: COLORS.success,
            paddingAll: 'lg'
        },
        body: {
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'box',
                    layout: 'horizontal',
                    contents: [
                        { type: 'text', text: '📋 ออเดอร์', size: 'sm', color: COLORS.gray, flex: 2 },
                        { type: 'text', text: `#${order.order_number}`, size: 'sm', weight: 'bold', flex: 3, align: 'end' }
                    ]
                },
                {
                    type: 'box',
                    layout: 'horizontal',
                    margin: 'md',
                    contents: [
                        { type: 'text', text: '💰 ยอดชำระ', size: 'sm', color: COLORS.gray, flex: 2 },
                        { type: 'text', text: `฿${slipData?.amount || order.total_amount}`, size: 'sm', color: COLORS.success, weight: 'bold', flex: 3, align: 'end' }
                    ]
                },
                {
                    type: 'box',
                    layout: 'horizontal',
                    margin: 'md',
                    contents: [
                        { type: 'text', text: '🔖 Ref', size: 'sm', color: COLORS.gray, flex: 2 },
                        { type: 'text', text: slipData?.transactionId || '-', size: 'xs', flex: 3, align: 'end' }
                    ]
                },
                {
                    type: 'separator',
                    margin: 'lg'
                },
                {
                    type: 'box',
                    layout: 'horizontal',
                    margin: 'lg',
                    contents: [
                        { type: 'text', text: '📅 จัดส่ง', size: 'sm', color: COLORS.gray, flex: 2 },
                        { type: 'text', text: order.delivery_date || 'พรุ่งนี้', size: 'sm', flex: 3, align: 'end' }
                    ]
                },
                {
                    type: 'box',
                    layout: 'horizontal',
                    margin: 'md',
                    contents: [
                        { type: 'text', text: '⏰ เวลา', size: 'sm', color: COLORS.gray, flex: 2 },
                        { type: 'text', text: order.delivery_time_slot || '16:00-20:00', size: 'sm', flex: 3, align: 'end' }
                    ]
                },
                {
                    type: 'text',
                    text: '🐟 ขอบคุณที่อุดหนุน Saramondā!',
                    size: 'sm',
                    color: COLORS.primary,
                    margin: 'xl',
                    align: 'center',
                    weight: 'bold'
                }
            ],
            paddingAll: 'lg'
        }
    };
}

/**
 * Payment pending review message
 */
function createPaymentPendingMessage(order, warnings = []) {
    const warningContents = warnings.map(w => ({
        type: 'text',
        text: `• ${w}`,
        size: 'xs',
        color: COLORS.warning,
        wrap: true
    }));

    return {
        type: 'bubble',
        header: {
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'text',
                    text: '⏳ รอตรวจสอบ',
                    weight: 'bold',
                    size: 'lg',
                    color: COLORS.dark
                }
            ],
            backgroundColor: COLORS.warning,
            paddingAll: 'lg'
        },
        body: {
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'text',
                    text: 'Admin กำลังตรวจสอบการชำระเงิน',
                    size: 'sm',
                    color: COLORS.gray,
                    wrap: true
                },
                {
                    type: 'separator',
                    margin: 'lg'
                },
                {
                    type: 'box',
                    layout: 'vertical',
                    margin: 'lg',
                    contents: [
                        {
                            type: 'text',
                            text: '⚠️ ข้อสังเกต:',
                            size: 'xs',
                            weight: 'bold',
                            margin: 'sm'
                        },
                        ...warningContents
                    ]
                },
                {
                    type: 'text',
                    text: '📱 เราจะแจ้งผลภายใน 5-10 นาที',
                    size: 'xs',
                    color: COLORS.gray,
                    margin: 'lg',
                    wrap: true
                }
            ],
            paddingAll: 'lg'
        }
    };
}

/**
 * Payment failed message
 */
function createPaymentFailedMessage(reason) {
    return {
        type: 'bubble',
        header: {
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'text',
                    text: '❌ ชำระเงินไม่สำเร็จ',
                    weight: 'bold',
                    size: 'lg',
                    color: COLORS.light
                }
            ],
            backgroundColor: COLORS.danger,
            paddingAll: 'lg'
        },
        body: {
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'text',
                    text: reason || 'ไม่สามารถตรวจสอบสลิปได้',
                    size: 'sm',
                    color: COLORS.gray,
                    wrap: true
                },
                {
                    type: 'text',
                    text: '💡 กรุณาถ่ายสลิปใหม่ให้ชัดเจน หรือติดต่อร้าน',
                    size: 'xs',
                    color: COLORS.gray,
                    margin: 'lg',
                    wrap: true
                }
            ],
            paddingAll: 'lg'
        },
        footer: {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
                {
                    type: 'button',
                    style: 'primary',
                    color: COLORS.primary,
                    action: {
                        type: 'postback',
                        label: '📸 ส่งสลิปใหม่',
                        data: 'action=send_slip'
                    }
                },
                {
                    type: 'button',
                    style: 'secondary',
                    action: {
                        type: 'uri',
                        label: '💬 ติดต่อร้าน',
                        uri: 'https://line.me/R/ti/p/@096lomsu'
                    },
                    height: 'sm'
                }
            ]
        }
    };
}

/**
 * Rating request message (after delivery completed)
 */
function createRatingRequestMessage(order) {
    return {
        type: 'bubble',
        body: {
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'text',
                    text: '⭐ ให้คะแนนบริการ',
                    weight: 'bold',
                    size: 'lg',
                    color: COLORS.dark,
                    align: 'center'
                },
                {
                    type: 'text',
                    text: `ออเดอร์ #${order.order_number}`,
                    size: 'sm',
                    color: COLORS.gray,
                    align: 'center',
                    margin: 'sm'
                },
                {
                    type: 'separator',
                    margin: 'lg'
                },
                {
                    type: 'text',
                    text: 'สินค้าและบริการเป็นอย่างไรบ้างคะ?',
                    size: 'sm',
                    color: COLORS.gray,
                    margin: 'lg',
                    align: 'center'
                },
                {
                    type: 'box',
                    layout: 'horizontal',
                    margin: 'lg',
                    justifyContent: 'center',
                    spacing: 'md',
                    contents: [
                        { type: 'text', text: '⭐', size: '3xl', action: { type: 'postback', data: `action=rate&orderId=${order.id}&rating=1` } },
                        { type: 'text', text: '⭐', size: '3xl', action: { type: 'postback', data: `action=rate&orderId=${order.id}&rating=2` } },
                        { type: 'text', text: '⭐', size: '3xl', action: { type: 'postback', data: `action=rate&orderId=${order.id}&rating=3` } },
                        { type: 'text', text: '⭐', size: '3xl', action: { type: 'postback', data: `action=rate&orderId=${order.id}&rating=4` } },
                        { type: 'text', text: '⭐', size: '3xl', action: { type: 'postback', data: `action=rate&orderId=${order.id}&rating=5` } }
                    ]
                },
                {
                    type: 'text',
                    text: '🙏 ขอบคุณสำหรับ feedback!',
                    size: 'xs',
                    color: COLORS.gray,
                    margin: 'lg',
                    align: 'center'
                }
            ],
            paddingAll: 'lg'
        },
        footer: {
            type: 'box',
            layout: 'horizontal',
            spacing: 'sm',
            contents: [
                {
                    type: 'button',
                    style: 'primary',
                    color: COLORS.gold,
                    action: {
                        type: 'postback',
                        label: '😍 5 ดาว',
                        data: `action=rate&orderId=${order.id}&rating=5`
                    },
                    flex: 1
                },
                {
                    type: 'button',
                    style: 'secondary',
                    action: {
                        type: 'postback',
                        label: '😐 ปานกลาง',
                        data: `action=rate&orderId=${order.id}&rating=3`
                    },
                    flex: 1
                }
            ]
        }
    };
}

module.exports = {
    createPaymentRequestMessage,
    createSlipUploadPromptMessage,
    createPaymentSuccessMessage,
    createPaymentPendingMessage,
    createPaymentFailedMessage,
    createRatingRequestMessage,
    COLORS
};
