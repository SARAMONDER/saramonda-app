/**
 * ════════════════════════════════════════════════════════════════════════════════
 *  📱 LINE FLEX MESSAGE TEMPLATES
 *  Saramondā - Beautiful message templates for LINE
 * ════════════════════════════════════════════════════════════════════════════════
 */

// Brand colors (matching index.html)
const COLORS = {
    primary: '#c41e3a',      // Crimson red (main brand color)
    gold: '#b8860b',         // Gold accent
    dark: '#1a1a1a',         // Dark text
    light: '#faf8f5',        // Cream background
    gray: '#666666',         // Gray text
    success: '#22C55E',      // Green success
    salmon: '#FA8072',       // Salmon color
    warning: '#f59e0b',      // Orange warning
    danger: '#EF4444',       // Red danger
    line: '#06C755'          // LINE green
};

/**
 * Welcome message for new followers
 */
function createWelcomeMessage() {
    return {
        type: 'bubble',
        hero: {
            type: 'image',
            url: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&h=400&fit=crop',
            size: 'full',
            aspectRatio: '20:10',
            aspectMode: 'cover'
        },
        body: {
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'text',
                    text: '🐟 ยินดีต้อนรับสู่ Saramondā',
                    weight: 'bold',
                    size: 'xl',
                    color: COLORS.dark
                },
                {
                    type: 'text',
                    text: 'Norwegian Salmon Sashimi Grade SUP',
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
                    spacing: 'sm',
                    contents: [
                        {
                            type: 'box',
                            layout: 'baseline',
                            spacing: 'sm',
                            contents: [
                                { type: 'text', text: '✨', size: 'sm', flex: 0 },
                                { type: 'text', text: 'แล่สดใหม่ทุกวัน ไม่ใช่ของแช่แข็ง', size: 'sm', color: COLORS.gray, flex: 5 }
                            ]
                        },
                        {
                            type: 'box',
                            layout: 'baseline',
                            spacing: 'sm',
                            contents: [
                                { type: 'text', text: '🚚', size: 'sm', flex: 0 },
                                { type: 'text', text: 'จัดส่งรอบเย็น 16:00-20:00', size: 'sm', color: COLORS.gray, flex: 5 }
                            ]
                        },
                        {
                            type: 'box',
                            layout: 'baseline',
                            spacing: 'sm',
                            contents: [
                                { type: 'text', text: '📦', size: 'sm', flex: 0 },
                                { type: 'text', text: 'แพ็คสูญญากาศ เก็บได้ 3-5 วัน', size: 'sm', color: COLORS.gray, flex: 5 }
                            ]
                        }
                    ]
                }
            ]
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
                        label: '🛒 สั่งซื้อเลย',
                        data: 'action=order'
                    }
                },
                {
                    type: 'button',
                    style: 'secondary',
                    action: {
                        type: 'postback',
                        label: '💰 ดูราคา',
                        data: 'action=price'
                    }
                }
            ]
        }
    };
}

/**
 * Order message with LIFF link
 */
function createOrderMessage(liffId, remaining) {
    const liffUrl = `https://liff.line.me/${liffId}`;

    return {
        type: 'bubble',
        body: {
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'text',
                    text: '🛒 สั่งซื้อแซลมอนซาชิมิ',
                    weight: 'bold',
                    size: 'lg',
                    color: COLORS.dark
                },
                {
                    type: 'text',
                    text: `เหลืออีก ${remaining} ออเดอร์วันนี้`,
                    size: 'sm',
                    color: remaining <= 3 ? COLORS.danger : COLORS.success,
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
                            type: 'box',
                            layout: 'horizontal',
                            contents: [
                                { type: 'text', text: '300g', size: 'sm', flex: 2 },
                                { type: 'text', text: '฿329', size: 'sm', flex: 1, align: 'end', color: COLORS.primary }
                            ]
                        },
                        {
                            type: 'box',
                            layout: 'horizontal',
                            contents: [
                                { type: 'text', text: '500g', size: 'sm', flex: 2 },
                                { type: 'text', text: '฿519', size: 'sm', flex: 1, align: 'end', color: COLORS.primary }
                            ]
                        },
                        {
                            type: 'box',
                            layout: 'horizontal',
                            contents: [
                                { type: 'text', text: '1kg', size: 'sm', flex: 2 },
                                { type: 'text', text: '฿989', size: 'sm', flex: 1, align: 'end', color: COLORS.primary }
                            ]
                        }
                    ]
                },
                {
                    type: 'text',
                    text: '🚚 สั่งวันนี้ รับพรุ่งนี้หลัง 16:00',
                    size: 'xs',
                    color: COLORS.gray,
                    margin: 'lg'
                }
            ]
        },
        footer: {
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'button',
                    style: 'primary',
                    color: COLORS.primary,
                    action: {
                        type: 'uri',
                        label: '🛒 เลือกขนาด & สั่งซื้อ',
                        uri: liffUrl
                    }
                }
            ]
        }
    };
}

/**
 * Order full message
 */
function createOrderFullMessage(nextDay) {
    return {
        type: 'bubble',
        body: {
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'text',
                    text: '🚫 ออเดอร์วันนี้เต็มแล้ว',
                    weight: 'bold',
                    size: 'lg',
                    color: COLORS.danger
                },
                {
                    type: 'text',
                    text: 'ขอบคุณที่สนใจสินค้าของเรา',
                    size: 'sm',
                    color: COLORS.gray,
                    margin: 'md'
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
                            text: '📅 รอบถัดไปที่เปิดรับ:',
                            size: 'sm',
                            color: COLORS.gray
                        },
                        {
                            type: 'text',
                            text: nextDay,
                            weight: 'bold',
                            size: 'lg',
                            color: COLORS.primary,
                            margin: 'sm'
                        }
                    ]
                }
            ]
        },
        footer: {
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'button',
                    style: 'secondary',
                    action: {
                        type: 'postback',
                        label: '🔔 แจ้งเตือนเมื่อเปิดรับ',
                        data: 'action=notify_next_day'
                    }
                }
            ]
        }
    };
}

/**
 * Price/Menu message
 */
function createPriceMessage() {
    return {
        type: 'carousel',
        contents: [
            // Regular Sashimi
            {
                type: 'bubble',
                size: 'micro',
                header: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: 'Salmon Sashimi',
                            weight: 'bold',
                            size: 'sm',
                            color: COLORS.light
                        }
                    ],
                    backgroundColor: COLORS.primary,
                    paddingAll: 'md'
                },
                body: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        { type: 'text', text: '300g - ฿329', size: 'sm', margin: 'sm' },
                        { type: 'text', text: '500g - ฿519', size: 'sm', margin: 'sm' },
                        { type: 'text', text: '1kg - ฿989', size: 'sm', margin: 'sm' },
                        {
                            type: 'text',
                            text: '✨ แล่สดใหม่ทุกวัน',
                            size: 'xxs',
                            color: COLORS.gray,
                            margin: 'md'
                        }
                    ],
                    spacing: 'sm',
                    paddingAll: 'md'
                },
                footer: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'button',
                            action: {
                                type: 'postback',
                                label: 'สั่งซื้อ',
                                data: 'action=order'
                            },
                            style: 'primary',
                            color: COLORS.primary,
                            height: 'sm'
                        }
                    ]
                }
            },
            // Fatty Cut
            {
                type: 'bubble',
                size: 'micro',
                header: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: 'Fatty Cut (ส่วนท้อง)',
                            weight: 'bold',
                            size: 'sm',
                            color: COLORS.dark
                        }
                    ],
                    backgroundColor: COLORS.gold,
                    paddingAll: 'md'
                },
                body: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        { type: 'text', text: '300g - ฿399', size: 'sm', margin: 'sm' },
                        { type: 'text', text: '500g - ฿649', size: 'sm', margin: 'sm' },
                        { type: 'text', text: '1kg - ฿1,249', size: 'sm', margin: 'sm' },
                        {
                            type: 'text',
                            text: '🏆 เนื้อนุ่ม ละลายในปาก',
                            size: 'xxs',
                            color: COLORS.gray,
                            margin: 'md'
                        }
                    ],
                    spacing: 'sm',
                    paddingAll: 'md'
                },
                footer: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'button',
                            action: {
                                type: 'postback',
                                label: 'สั่งซื้อ',
                                data: 'action=order'
                            },
                            style: 'primary',
                            color: COLORS.primary,
                            height: 'sm'
                        }
                    ]
                }
            }
        ]
    };
}

/**
 * Delivery schedule message
 */
function createScheduleMessage() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const formatDate = (date) => date.toLocaleDateString('th-TH', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
    });

    return {
        type: 'bubble',
        body: {
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'text',
                    text: '🚚 รอบจัดส่ง',
                    weight: 'bold',
                    size: 'lg',
                    color: COLORS.dark
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
                            type: 'box',
                            layout: 'horizontal',
                            contents: [
                                { type: 'text', text: '📅', size: 'sm', flex: 0 },
                                { type: 'text', text: 'สั่งวันนี้', size: 'sm', flex: 2, margin: 'sm' },
                                { type: 'text', text: `รับ ${formatDate(tomorrow)}`, size: 'sm', flex: 3, align: 'end', color: COLORS.primary }
                            ]
                        },
                        {
                            type: 'box',
                            layout: 'horizontal',
                            contents: [
                                { type: 'text', text: '⏰', size: 'sm', flex: 0 },
                                { type: 'text', text: 'เวลาส่ง', size: 'sm', flex: 2, margin: 'sm' },
                                { type: 'text', text: '16:00 - 20:00', size: 'sm', flex: 3, align: 'end', color: COLORS.primary }
                            ]
                        },
                        {
                            type: 'box',
                            layout: 'horizontal',
                            contents: [
                                { type: 'text', text: '📍', size: 'sm', flex: 0 },
                                { type: 'text', text: 'พื้นที่ส่ง', size: 'sm', flex: 2, margin: 'sm' },
                                { type: 'text', text: 'กรุงเทพฯ และปริมณฑล', size: 'sm', flex: 3, align: 'end', color: COLORS.gray, wrap: true }
                            ]
                        }
                    ]
                },
                {
                    type: 'text',
                    text: '💡 สั่งก่อน 12:00 รับภายในวันถัดไป',
                    size: 'xs',
                    color: COLORS.gray,
                    margin: 'lg',
                    wrap: true
                }
            ]
        },
        footer: {
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'button',
                    style: 'primary',
                    color: COLORS.primary,
                    action: {
                        type: 'postback',
                        label: '🛒 สั่งซื้อเลย',
                        data: 'action=order'
                    }
                }
            ]
        }
    };
}

/**
 * Order confirmation message
 */
function createOrderConfirmationMessage(order) {
    const items = order.items || [];
    const itemsText = items.map(item =>
        `${item.product_name || item.productName} x${item.quantity}`
    ).join(', ');

    return {
        type: 'bubble',
        header: {
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'text',
                    text: '✅ ยืนยันออเดอร์',
                    weight: 'bold',
                    size: 'lg',
                    color: COLORS.light
                },
                {
                    type: 'text',
                    text: `#${order.order_number}`,
                    size: 'sm',
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
                        { type: 'text', text: '📦 สินค้า', size: 'sm', color: COLORS.gray, flex: 2 },
                        { type: 'text', text: itemsText || 'Salmon Sashimi', size: 'sm', flex: 4, wrap: true }
                    ]
                },
                {
                    type: 'box',
                    layout: 'horizontal',
                    margin: 'md',
                    contents: [
                        { type: 'text', text: '💰 ยอดรวม', size: 'sm', color: COLORS.gray, flex: 2 },
                        { type: 'text', text: `฿${order.total_amount}`, size: 'sm', weight: 'bold', color: COLORS.primary, flex: 4 }
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
                        { type: 'text', text: '📅 วันรับ', size: 'sm', color: COLORS.gray, flex: 2 },
                        { type: 'text', text: order.delivery_date || 'พรุ่งนี้', size: 'sm', flex: 4 }
                    ]
                },
                {
                    type: 'box',
                    layout: 'horizontal',
                    margin: 'md',
                    contents: [
                        { type: 'text', text: '⏰ เวลา', size: 'sm', color: COLORS.gray, flex: 2 },
                        { type: 'text', text: order.delivery_time_slot || '16:00-20:00', size: 'sm', flex: 4 }
                    ]
                },
                {
                    type: 'box',
                    layout: 'horizontal',
                    margin: 'md',
                    contents: [
                        { type: 'text', text: '📍 ที่อยู่', size: 'sm', color: COLORS.gray, flex: 2 },
                        { type: 'text', text: order.customer_address || '-', size: 'sm', flex: 4, wrap: true }
                    ]
                }
            ],
            paddingAll: 'lg'
        },
        footer: {
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'text',
                    text: '📱 เราจะแจ้งเตือนเมื่อสินค้าพร้อมส่ง',
                    size: 'xs',
                    color: COLORS.gray,
                    align: 'center'
                }
            ],
            paddingAll: 'md'
        }
    };
}

/**
 * Order status message
 */
function createOrderStatusMessage(orders) {
    const statusIcons = {
        pending: '⏳',
        confirmed: '✅',
        preparing: '👨‍🍳',
        ready: '📦',
        delivering: '🚚',
        completed: '✅',
        cancelled: '❌'
    };

    const statusTexts = {
        pending: 'รอยืนยัน',
        confirmed: 'ยืนยันแล้ว',
        preparing: 'กำลังเตรียม',
        ready: 'พร้อมส่ง',
        delivering: 'กำลังจัดส่ง',
        completed: 'จัดส่งแล้ว',
        cancelled: 'ยกเลิก'
    };

    const orderContents = orders.slice(0, 3).map(order => ({
        type: 'box',
        layout: 'horizontal',
        margin: 'md',
        contents: [
            { type: 'text', text: `#${order.order_number}`, size: 'sm', flex: 3 },
            { type: 'text', text: `${statusIcons[order.status] || '📋'} ${statusTexts[order.status] || order.status}`, size: 'sm', flex: 3, align: 'end' }
        ]
    }));

    return {
        type: 'bubble',
        body: {
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'text',
                    text: '📋 ออเดอร์ของคุณ',
                    weight: 'bold',
                    size: 'lg',
                    color: COLORS.dark
                },
                {
                    type: 'separator',
                    margin: 'lg'
                },
                {
                    type: 'box',
                    layout: 'vertical',
                    margin: 'lg',
                    contents: orderContents
                }
            ]
        }
    };
}

/**
 * Cancel options message
 */
function createCancelOptionsMessage(orders) {
    const orderButtons = orders.slice(0, 3).map(order => ({
        type: 'button',
        style: 'secondary',
        action: {
            type: 'postback',
            label: `ยกเลิก #${order.order_number}`,
            data: `action=cancel&orderId=${order.id}`
        },
        height: 'sm',
        margin: 'sm'
    }));

    return {
        type: 'bubble',
        body: {
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'text',
                    text: '❌ เลือกออเดอร์ที่ต้องการยกเลิก',
                    weight: 'bold',
                    size: 'md',
                    color: COLORS.dark,
                    wrap: true
                }
            ]
        },
        footer: {
            type: 'box',
            layout: 'vertical',
            contents: orderButtons
        }
    };
}

/**
 * Delivery notification message
 */
function createDeliveryNotificationMessage(order) {
    return {
        type: 'bubble',
        header: {
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'text',
                    text: '🚚 กำลังจัดส่ง',
                    weight: 'bold',
                    size: 'lg',
                    color: COLORS.light
                }
            ],
            backgroundColor: COLORS.primary,
            paddingAll: 'lg'
        },
        body: {
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'text',
                    text: `ออเดอร์ #${order.order_number}`,
                    weight: 'bold',
                    size: 'md'
                },
                {
                    type: 'text',
                    text: 'สินค้าของคุณกำลังจัดส่ง',
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
                    layout: 'horizontal',
                    margin: 'lg',
                    contents: [
                        { type: 'text', text: '📍 จัดส่งไปยัง', size: 'sm', color: COLORS.gray, flex: 2 },
                        { type: 'text', text: order.customer_address || '-', size: 'sm', flex: 4, wrap: true }
                    ]
                },
                {
                    type: 'text',
                    text: '📞 หากมีข้อสงสัย กรุณาติดต่อร้าน',
                    size: 'xs',
                    color: COLORS.gray,
                    margin: 'lg'
                }
            ],
            paddingAll: 'lg'
        }
    };
}

module.exports = {
    createWelcomeMessage,
    createOrderMessage,
    createOrderFullMessage,
    createPriceMessage,
    createScheduleMessage,
    createOrderConfirmationMessage,
    createOrderStatusMessage,
    createCancelOptionsMessage,
    createDeliveryNotificationMessage
};
