/**
 * ════════════════════════════════════════════════════════════════════════════════
 *  🎨 LINE RICH MENU CONFIGURATION
 *  Saramondā - Rich Menu setup and management
 * ════════════════════════════════════════════════════════════════════════════════
 */

const logger = require('../../shared/logger');

/**
 * Rich Menu configuration
 * 4 areas: Order, Schedule, Price, Contact
 */
function getRichMenuConfig(liffId) {
    return {
        size: {
            width: 2500,
            height: 1686
        },
        selected: true,
        name: 'Saramonda Main Menu',
        chatBarText: '🐟 เมนู',
        areas: [
            // Top-left: Order
            {
                bounds: { x: 0, y: 0, width: 1250, height: 843 },
                action: {
                    type: 'uri',
                    uri: `https://liff.line.me/${liffId}`,
                    label: 'สั่งซื้อ'
                }
            },
            // Top-right: Schedule
            {
                bounds: { x: 1250, y: 0, width: 1250, height: 843 },
                action: {
                    type: 'postback',
                    data: 'action=schedule',
                    label: 'รอบรับสินค้า'
                }
            },
            // Bottom-left: Price
            {
                bounds: { x: 0, y: 843, width: 1250, height: 843 },
                action: {
                    type: 'postback',
                    data: 'action=price',
                    label: 'ราคา/ขนาด'
                }
            },
            // Bottom-right: Contact
            {
                bounds: { x: 1250, y: 843, width: 1250, height: 843 },
                action: {
                    type: 'message',
                    text: 'ติดต่อร้าน',
                    label: 'ติดต่อร้าน'
                }
            }
        ]
    };
}

/**
 * Create Rich Menu via LINE API
 */
async function createRichMenu(lineClient, liffId) {
    try {
        const config = getRichMenuConfig(liffId);
        const richMenuId = await lineClient.createRichMenu(config);
        logger.info(`Rich Menu created: ${richMenuId}`);
        return richMenuId;
    } catch (error) {
        logger.error('Create Rich Menu error:', error);
        throw error;
    }
}

/**
 * Upload Rich Menu image
 * Note: You need to provide the image file
 */
async function uploadRichMenuImage(lineClient, richMenuId, imagePath) {
    try {
        const fs = require('fs');
        const imageBuffer = fs.readFileSync(imagePath);
        await lineClient.setRichMenuImage(richMenuId, imageBuffer);
        logger.info(`Rich Menu image uploaded for: ${richMenuId}`);
    } catch (error) {
        logger.error('Upload Rich Menu image error:', error);
        throw error;
    }
}

/**
 * Set default Rich Menu for all users
 */
async function setDefaultRichMenu(lineClient, richMenuId) {
    try {
        await lineClient.setDefaultRichMenu(richMenuId);
        logger.info(`Default Rich Menu set: ${richMenuId}`);
    } catch (error) {
        logger.error('Set default Rich Menu error:', error);
        throw error;
    }
}

/**
 * Get current Rich Menu
 */
async function getDefaultRichMenu(lineClient) {
    try {
        const richMenuId = await lineClient.getDefaultRichMenuId();
        return richMenuId;
    } catch (error) {
        logger.error('Get default Rich Menu error:', error);
        return null;
    }
}

/**
 * Delete Rich Menu
 */
async function deleteRichMenu(lineClient, richMenuId) {
    try {
        await lineClient.deleteRichMenu(richMenuId);
        logger.info(`Rich Menu deleted: ${richMenuId}`);
    } catch (error) {
        logger.error('Delete Rich Menu error:', error);
        throw error;
    }
}

module.exports = {
    getRichMenuConfig,
    createRichMenu,
    uploadRichMenuImage,
    setDefaultRichMenu,
    getDefaultRichMenu,
    deleteRichMenu
};
