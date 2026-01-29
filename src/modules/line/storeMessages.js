/**
 * Store Information Messages for Saramondā LINE Bot
 * ข้อความต่างๆ สำหรับร้าน Saramondā
 */

// Brand Colors
const COLORS = {
    primary: '#c41e3a',      // Crimson Red
    secondary: '#b8860b',    // Gold
    background: '#faf8f5',   // Cream
    dark: '#2d2d2d',
    light: '#666666'
};

/**
 * Welcome Message - เมื่อลูกค้าเพิ่มเพื่อน LINE
 */
function createWelcomeMessage() {
    return {
        type: 'flex',
        altText: '🐟 ยินดีต้อนรับสู่ Saramondā',
        contents: {
            type: 'bubble',
            size: 'mega',
            header: {
                type: 'box',
                layout: 'vertical',
                backgroundColor: COLORS.primary,
                paddingAll: '20px',
                contents: [
                    {
                        type: 'text',
                        text: '🐟 Saramondā 鮭',
                        color: '#ffffff',
                        size: 'xl',
                        weight: 'bold',
                        align: 'center'
                    },
                    {
                        type: 'text',
                        text: 'Norwegian Salmon Sashimi Grade SUP',
                        color: '#ffffff',
                        size: 'xs',
                        align: 'center',
                        margin: 'sm'
                    }
                ]
            },
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
                backgroundColor: COLORS.background,
                paddingAll: '20px',
                contents: [
                    {
                        type: 'text',
                        text: 'ยินดีต้อนรับครับ! 🙏',
                        weight: 'bold',
                        size: 'lg',
                        color: COLORS.dark
                    },
                    {
                        type: 'text',
                        text: 'แซลมอนนอร์เวย์ เกรด SUP สดใหม่',
                        size: 'sm',
                        color: COLORS.light,
                        margin: 'md',
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
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    { type: 'text', text: '🇳🇴', size: 'sm', flex: 0 },
                                    { type: 'text', text: 'นำเข้าจากนอร์เวย์', size: 'sm', color: COLORS.light, margin: 'sm' }
                                ]
                            },
                            {
                                type: 'box',
                                layout: 'horizontal',
                                margin: 'sm',
                                contents: [
                                    { type: 'text', text: '❄️', size: 'sm', flex: 0 },
                                    { type: 'text', text: 'สดใหม่ 48 ชั่วโมง', size: 'sm', color: COLORS.light, margin: 'sm' }
                                ]
                            },
                            {
                                type: 'box',
                                layout: 'horizontal',
                                margin: 'sm',
                                contents: [
                                    { type: 'text', text: '🚚', size: 'sm', flex: 0 },
                                    { type: 'text', text: 'รับสินค้า 16:00-20:00', size: 'sm', color: COLORS.light, margin: 'sm' }
                                ]
                            },
                            {
                                type: 'box',
                                layout: 'horizontal',
                                margin: 'sm',
                                contents: [
                                    { type: 'text', text: '⏰', size: 'sm', flex: 0 },
                                    { type: 'text', text: 'จำกัด 15 ออเดอร์/วัน', size: 'sm', color: COLORS.primary, margin: 'sm', weight: 'bold' }
                                ]
                            }
                        ]
                    }
                ]
            },
            footer: {
                type: 'box',
                layout: 'vertical',
                backgroundColor: COLORS.background,
                paddingAll: '15px',
                contents: [
                    {
                        type: 'button',
                        style: 'primary',
                        color: COLORS.primary,
                        action: {
                            type: 'uri',
                            label: '🛒 สั่งซื้อเลย',
                            uri: 'https://liff.line.me/2008921790-SyMjjGWY'
                        }
                    },
                    {
                        type: 'button',
                        style: 'secondary',
                        margin: 'sm',
                        action: {
                            type: 'message',
                            label: '📋 ดูเมนูและราคา',
                            text: 'ราคา'
                        }
                    }
                ]
            }
        }
    };
}

/**
 * Price Menu - รายการสินค้าและราคา
 */
function createPriceMessage() {
    return {
        type: 'flex',
        altText: '📋 เมนูและราคา Saramondā',
        contents: {
            type: 'carousel',
            contents: [
                // Salmon Sashimi (Regular)
                {
                    type: 'bubble',
                    size: 'kilo',
                    header: {
                        type: 'box',
                        layout: 'vertical',
                        backgroundColor: COLORS.primary,
                        paddingAll: '15px',
                        contents: [
                            {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    {
                                        type: 'text',
                                        text: '🐟 แซลมอนซาชิมิ',
                                        color: '#ffffff',
                                        weight: 'bold',
                                        size: 'lg',
                                        flex: 1
                                    },
                                    {
                                        type: 'text',
                                        text: 'ขายดี',
                                        color: '#FFD700',
                                        size: 'xs',
                                        align: 'end',
                                        weight: 'bold'
                                    }
                                ]
                            },
                            {
                                type: 'text',
                                text: 'サーモン刺身 | Salmon Sashimi',
                                color: '#ffffff',
                                size: 'xs',
                                margin: 'sm'
                            }
                        ]
                    },
                    body: {
                        type: 'box',
                        layout: 'vertical',
                        backgroundColor: COLORS.background,
                        paddingAll: '15px',
                        contents: [
                            {
                                type: 'text',
                                text: 'เนื้อนุ่มละมุน สีส้มสวย แล่สดใหม่ทุกวัน',
                                size: 'sm',
                                color: COLORS.light,
                                wrap: true
                            },
                            {
                                type: 'text',
                                text: 'เกรด SUP พร้อมทาน',
                                size: 'xs',
                                color: COLORS.secondary,
                                margin: 'sm',
                                weight: 'bold'
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
                                    createPriceRow('S', '300g', '329'),
                                    createPriceRow('M', '500g', '519'),
                                    createPriceRow('L', '1kg', '989')
                                ]
                            }
                        ]
                    },
                    footer: {
                        type: 'box',
                        layout: 'vertical',
                        paddingAll: '10px',
                        contents: [
                            {
                                type: 'button',
                                style: 'primary',
                                color: COLORS.primary,
                                height: 'sm',
                                action: {
                                    type: 'uri',
                                    label: 'สั่งซื้อ',
                                    uri: 'https://liff.line.me/2008921790-SyMjjGWY'
                                }
                            }
                        ]
                    }
                },
                // Fatty Cut (Premium)
                {
                    type: 'bubble',
                    size: 'kilo',
                    header: {
                        type: 'box',
                        layout: 'vertical',
                        backgroundColor: COLORS.secondary,
                        paddingAll: '15px',
                        contents: [
                            {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    {
                                        type: 'text',
                                        text: '🌟 ส่วนท้อง (Fatty)',
                                        color: '#ffffff',
                                        weight: 'bold',
                                        size: 'lg',
                                        flex: 1
                                    },
                                    {
                                        type: 'text',
                                        text: 'Premium',
                                        color: '#ffffff',
                                        size: 'xs',
                                        align: 'end',
                                        weight: 'bold'
                                    }
                                ]
                            },
                            {
                                type: 'text',
                                text: '大トロ | Fatty Cut Sashimi',
                                color: '#ffffff',
                                size: 'xs',
                                margin: 'sm'
                            }
                        ]
                    },
                    body: {
                        type: 'box',
                        layout: 'vertical',
                        backgroundColor: COLORS.background,
                        paddingAll: '15px',
                        contents: [
                            {
                                type: 'text',
                                text: 'ส่วนท้องปลา เนื้อนุ่มละลายในปาก',
                                size: 'sm',
                                color: COLORS.light,
                                wrap: true
                            },
                            {
                                type: 'text',
                                text: 'ไขมันแทรกสวย รสชาติเข้มข้น',
                                size: 'xs',
                                color: COLORS.secondary,
                                margin: 'sm',
                                weight: 'bold'
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
                                    createPriceRow('S', '300g', '399'),
                                    createPriceRow('M', '500g', '649'),
                                    createPriceRow('L', '1kg', '1,249')
                                ]
                            }
                        ]
                    },
                    footer: {
                        type: 'box',
                        layout: 'vertical',
                        paddingAll: '10px',
                        contents: [
                            {
                                type: 'button',
                                style: 'primary',
                                color: COLORS.secondary,
                                height: 'sm',
                                action: {
                                    type: 'uri',
                                    label: 'สั่งซื้อ',
                                    uri: 'https://liff.line.me/2008921790-SyMjjGWY'
                                }
                            }
                        ]
                    }
                }
            ]
        }
    };
}

// Helper: สร้างแถวราคา
function createPriceRow(size, weight, price) {
    return {
        type: 'box',
        layout: 'horizontal',
        margin: 'md',
        contents: [
            {
                type: 'box',
                layout: 'horizontal',
                flex: 1,
                contents: [
                    {
                        type: 'text',
                        text: size,
                        size: 'md',
                        weight: 'bold',
                        color: COLORS.primary,
                        flex: 0
                    },
                    {
                        type: 'text',
                        text: weight,
                        size: 'sm',
                        color: COLORS.light,
                        margin: 'sm'
                    }
                ]
            },
            {
                type: 'text',
                text: `฿${price}`,
                size: 'lg',
                weight: 'bold',
                color: COLORS.dark,
                align: 'end'
            }
        ]
    };
}

/**
 * About Us Message - เกี่ยวกับร้าน
 */
function createAboutMessage() {
    return {
        type: 'flex',
        altText: 'ℹ️ เกี่ยวกับ Saramondā',
        contents: {
            type: 'bubble',
            size: 'mega',
            header: {
                type: 'box',
                layout: 'vertical',
                backgroundColor: COLORS.primary,
                paddingAll: '20px',
                contents: [
                    {
                        type: 'text',
                        text: '🐟 Saramondā 鮭',
                        color: '#ffffff',
                        size: 'xl',
                        weight: 'bold',
                        align: 'center'
                    },
                    {
                        type: 'text',
                        text: 'เกี่ยวกับเรา',
                        color: '#ffffff',
                        size: 'sm',
                        align: 'center',
                        margin: 'sm'
                    }
                ]
            },
            body: {
                type: 'box',
                layout: 'vertical',
                backgroundColor: COLORS.background,
                paddingAll: '20px',
                contents: [
                    {
                        type: 'text',
                        text: '🇳🇴 Norwegian Salmon',
                        weight: 'bold',
                        size: 'md',
                        color: COLORS.dark
                    },
                    {
                        type: 'text',
                        text: 'แซลมอนนอร์เวย์คุณภาพสูง นำเข้าโดยตรง เกรด SUP (Superior) ซึ่งเป็นเกรดสูงสุดสำหรับการทำซาชิมิ',
                        size: 'sm',
                        color: COLORS.light,
                        margin: 'md',
                        wrap: true
                    },
                    {
                        type: 'separator',
                        margin: 'lg'
                    },
                    {
                        type: 'text',
                        text: '✨ จุดเด่นของเรา',
                        weight: 'bold',
                        size: 'md',
                        color: COLORS.dark,
                        margin: 'lg'
                    },
                    {
                        type: 'box',
                        layout: 'vertical',
                        margin: 'md',
                        contents: [
                            {
                                type: 'text',
                                text: '• สดใหม่ภายใน 48 ชั่วโมง',
                                size: 'sm',
                                color: COLORS.light
                            },
                            {
                                type: 'text',
                                text: '• เกรด SUP คุณภาพระดับร้านอาหารญี่ปุ่น',
                                size: 'sm',
                                color: COLORS.light,
                                margin: 'sm',
                                wrap: true
                            },
                            {
                                type: 'text',
                                text: '• แล่สดใหม่ทุกวัน พร้อมทานเป็นซาชิมิ',
                                size: 'sm',
                                color: COLORS.light,
                                margin: 'sm',
                                wrap: true
                            },
                            {
                                type: 'text',
                                text: '• จำกัด 15 ออเดอร์/วัน เพื่อคุณภาพ',
                                size: 'sm',
                                color: COLORS.primary,
                                margin: 'sm',
                                weight: 'bold'
                            }
                        ]
                    },
                    {
                        type: 'separator',
                        margin: 'lg'
                    },
                    {
                        type: 'text',
                        text: '🚚 การจัดส่ง',
                        weight: 'bold',
                        size: 'md',
                        color: COLORS.dark,
                        margin: 'lg'
                    },
                    {
                        type: 'text',
                        text: 'รับสินค้า 16:00-20:00 ทุกวัน\nพื้นที่: กรุงเทพฯ และปริมณฑล\nค่าส่ง ฿40 (ฟรีเมื่อสั่ง ฿500+)',
                        size: 'sm',
                        color: COLORS.light,
                        margin: 'md',
                        wrap: true
                    }
                ]
            },
            footer: {
                type: 'box',
                layout: 'horizontal',
                paddingAll: '15px',
                contents: [
                    {
                        type: 'button',
                        style: 'primary',
                        color: COLORS.primary,
                        flex: 1,
                        action: {
                            type: 'message',
                            label: '📋 ดูราคา',
                            text: 'ราคา'
                        }
                    },
                    {
                        type: 'button',
                        style: 'secondary',
                        flex: 1,
                        margin: 'sm',
                        action: {
                            type: 'uri',
                            label: '🛒 สั่งซื้อ',
                            uri: 'https://liff.line.me/2008921790-SyMjjGWY'
                        }
                    }
                ]
            }
        }
    };
}

/**
 * Delivery Schedule Message - รอบจัดส่ง
 */
function createDeliveryMessage() {
    return {
        type: 'flex',
        altText: '🚚 รอบรับสินค้า',
        contents: {
            type: 'bubble',
            size: 'mega',
            header: {
                type: 'box',
                layout: 'vertical',
                backgroundColor: COLORS.secondary,
                paddingAll: '20px',
                contents: [
                    {
                        type: 'text',
                        text: '🚚 รอบรับสินค้า',
                        color: '#ffffff',
                        size: 'xl',
                        weight: 'bold',
                        align: 'center'
                    }
                ]
            },
            body: {
                type: 'box',
                layout: 'vertical',
                backgroundColor: COLORS.background,
                paddingAll: '20px',
                contents: [
                    {
                        type: 'box',
                        layout: 'horizontal',
                        contents: [
                            {
                                type: 'text',
                                text: '⏰',
                                size: 'xxl',
                                flex: 0
                            },
                            {
                                type: 'box',
                                layout: 'vertical',
                                margin: 'lg',
                                contents: [
                                    {
                                        type: 'text',
                                        text: 'เวลารับสินค้า',
                                        size: 'sm',
                                        color: COLORS.light
                                    },
                                    {
                                        type: 'text',
                                        text: '16:00 - 20:00',
                                        size: 'xl',
                                        weight: 'bold',
                                        color: COLORS.dark
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        type: 'separator',
                        margin: 'lg'
                    },
                    {
                        type: 'text',
                        text: '📍 พื้นที่จัดส่ง',
                        weight: 'bold',
                        size: 'md',
                        color: COLORS.dark,
                        margin: 'lg'
                    },
                    {
                        type: 'text',
                        text: '• กรุงเทพมหานคร\n• นนทบุรี\n• ปทุมธานี\n• สมุทรปราการ',
                        size: 'sm',
                        color: COLORS.light,
                        margin: 'md',
                        wrap: true
                    },
                    {
                        type: 'separator',
                        margin: 'lg'
                    },
                    {
                        type: 'text',
                        text: '💰 ค่าจัดส่ง',
                        weight: 'bold',
                        size: 'md',
                        color: COLORS.dark,
                        margin: 'lg'
                    },
                    {
                        type: 'box',
                        layout: 'horizontal',
                        margin: 'md',
                        contents: [
                            {
                                type: 'text',
                                text: 'ปกติ',
                                size: 'sm',
                                color: COLORS.light,
                                flex: 1
                            },
                            {
                                type: 'text',
                                text: '฿40',
                                size: 'sm',
                                color: COLORS.dark,
                                weight: 'bold',
                                align: 'end'
                            }
                        ]
                    },
                    {
                        type: 'box',
                        layout: 'horizontal',
                        margin: 'sm',
                        contents: [
                            {
                                type: 'text',
                                text: 'สั่ง ฿500+ ',
                                size: 'sm',
                                color: COLORS.light,
                                flex: 1
                            },
                            {
                                type: 'text',
                                text: 'ฟรี! 🎉',
                                size: 'sm',
                                color: COLORS.primary,
                                weight: 'bold',
                                align: 'end'
                            }
                        ]
                    },
                    {
                        type: 'box',
                        layout: 'vertical',
                        margin: 'lg',
                        backgroundColor: '#fff3cd',
                        cornerRadius: 'md',
                        paddingAll: '10px',
                        contents: [
                            {
                                type: 'text',
                                text: '⚠️ กรุณาสั่งก่อน 10:00 น.',
                                size: 'sm',
                                color: '#856404',
                                weight: 'bold'
                            },
                            {
                                type: 'text',
                                text: 'เพื่อรับสินค้าในวันเดียวกัน',
                                size: 'xs',
                                color: '#856404',
                                margin: 'sm'
                            }
                        ]
                    }
                ]
            },
            footer: {
                type: 'box',
                layout: 'vertical',
                paddingAll: '15px',
                contents: [
                    {
                        type: 'button',
                        style: 'primary',
                        color: COLORS.primary,
                        action: {
                            type: 'uri',
                            label: '🛒 สั่งซื้อเลย',
                            uri: 'https://liff.line.me/2008921790-SyMjjGWY'
                        }
                    }
                ]
            }
        }
    };
}

/**
 * Contact Message - ติดต่อร้าน
 */
function createContactMessage() {
    return {
        type: 'flex',
        altText: '📞 ติดต่อ Saramondā',
        contents: {
            type: 'bubble',
            size: 'kilo',
            header: {
                type: 'box',
                layout: 'vertical',
                backgroundColor: COLORS.primary,
                paddingAll: '20px',
                contents: [
                    {
                        type: 'text',
                        text: '📞 ติดต่อเรา',
                        color: '#ffffff',
                        size: 'xl',
                        weight: 'bold',
                        align: 'center'
                    }
                ]
            },
            body: {
                type: 'box',
                layout: 'vertical',
                backgroundColor: COLORS.background,
                paddingAll: '20px',
                contents: [
                    {
                        type: 'box',
                        layout: 'horizontal',
                        margin: 'md',
                        contents: [
                            { type: 'text', text: '💬', size: 'lg', flex: 0 },
                            {
                                type: 'box',
                                layout: 'vertical',
                                margin: 'lg',
                                contents: [
                                    { type: 'text', text: 'LINE Official', size: 'sm', color: COLORS.light },
                                    { type: 'text', text: '@096lomsu', size: 'md', weight: 'bold', color: '#06C755' }
                                ]
                            }
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
                            { type: 'text', text: '🕐', size: 'lg', flex: 0 },
                            {
                                type: 'box',
                                layout: 'vertical',
                                margin: 'lg',
                                contents: [
                                    { type: 'text', text: 'เวลาทำการ', size: 'sm', color: COLORS.light },
                                    { type: 'text', text: '08:00 - 18:00 น.', size: 'md', weight: 'bold', color: COLORS.dark }
                                ]
                            }
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
                            { type: 'text', text: '🚚', size: 'lg', flex: 0 },
                            {
                                type: 'box',
                                layout: 'vertical',
                                margin: 'lg',
                                contents: [
                                    { type: 'text', text: 'รับสินค้า', size: 'sm', color: COLORS.light },
                                    { type: 'text', text: '16:00 - 20:00 น.', size: 'md', weight: 'bold', color: COLORS.dark }
                                ]
                            }
                        ]
                    }
                ]
            },
            footer: {
                type: 'box',
                layout: 'vertical',
                paddingAll: '15px',
                contents: [
                    {
                        type: 'text',
                        text: 'พิมพ์ข้อความหาเราได้เลยครับ 😊',
                        size: 'sm',
                        color: COLORS.light,
                        align: 'center'
                    }
                ]
            }
        }
    };
}

/**
 * Promotion Message - โปรโมชั่น Opening
 */
function createPromotionMessage() {
    return {
        type: 'flex',
        altText: '🎉 โปรโมชั่นเปิดร้าน Saramondā',
        contents: {
            type: 'bubble',
            size: 'mega',
            header: {
                type: 'box',
                layout: 'vertical',
                backgroundColor: COLORS.primary,
                paddingAll: '20px',
                contents: [
                    {
                        type: 'text',
                        text: '🎉 GRAND OPENING',
                        color: '#FFD700',
                        size: 'xl',
                        weight: 'bold',
                        align: 'center'
                    },
                    {
                        type: 'text',
                        text: 'โปรโมชั่นเปิดร้านใหม่!',
                        color: '#ffffff',
                        size: 'sm',
                        align: 'center',
                        margin: 'sm'
                    }
                ]
            },
            body: {
                type: 'box',
                layout: 'vertical',
                backgroundColor: COLORS.background,
                paddingAll: '20px',
                contents: [
                    {
                        type: 'box',
                        layout: 'horizontal',
                        contents: [
                            { type: 'text', text: '⭐', size: 'xl', flex: 0 },
                            {
                                type: 'box',
                                layout: 'vertical',
                                margin: 'lg',
                                contents: [
                                    { type: 'text', text: 'TOP 5 ออเดอร์แรก', size: 'md', weight: 'bold', color: COLORS.dark },
                                    { type: 'text', text: "รับ Chef's Priority Cut ฟรี!", size: 'sm', color: COLORS.primary, weight: 'bold' }
                                ]
                            }
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
                            { type: 'text', text: '🐟', size: 'xl', flex: 0 },
                            {
                                type: 'box',
                                layout: 'vertical',
                                margin: 'lg',
                                contents: [
                                    { type: 'text', text: 'สั่ง 500g+', size: 'md', weight: 'bold', color: COLORS.dark },
                                    { type: 'text', text: 'รับเนื้อเพิ่มฟรี!', size: 'sm', color: COLORS.primary, weight: 'bold' }
                                ]
                            }
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
                            { type: 'text', text: '🌅', size: 'xl', flex: 0 },
                            {
                                type: 'box',
                                layout: 'vertical',
                                margin: 'lg',
                                contents: [
                                    { type: 'text', text: 'สั่งก่อน 10:00', size: 'md', weight: 'bold', color: COLORS.dark },
                                    { type: 'text', text: 'รับ Wasabi Premium ฟรี!', size: 'sm', color: COLORS.primary, weight: 'bold' }
                                ]
                            }
                        ]
                    },
                    {
                        type: 'box',
                        layout: 'vertical',
                        margin: 'xl',
                        backgroundColor: '#fff3cd',
                        cornerRadius: 'md',
                        paddingAll: '15px',
                        contents: [
                            {
                                type: 'text',
                                text: '⏰ จำกัด 15 ออเดอร์/วัน',
                                size: 'sm',
                                color: '#856404',
                                weight: 'bold',
                                align: 'center'
                            }
                        ]
                    }
                ]
            },
            footer: {
                type: 'box',
                layout: 'vertical',
                paddingAll: '15px',
                contents: [
                    {
                        type: 'button',
                        style: 'primary',
                        color: COLORS.primary,
                        action: {
                            type: 'uri',
                            label: '🛒 สั่งซื้อเลย!',
                            uri: 'https://liff.line.me/2008921790-SyMjjGWY'
                        }
                    }
                ]
            }
        }
    };
}

module.exports = {
    createWelcomeMessage,
    createPriceMessage,
    createAboutMessage,
    createDeliveryMessage,
    createContactMessage,
    createPromotionMessage,
    COLORS
};
