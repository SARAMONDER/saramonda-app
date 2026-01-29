/**
 * Application Configuration
 * Centralized configuration management
 */
require('dotenv').config();

const config = {
    // Server
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT, 10) || 3000,
    apiVersion: process.env.API_VERSION || 'v1',

    // Security
    jwt: {
        secret: process.env.JWT_SECRET || 'change-this-in-production',
        expiresIn: process.env.JWT_EXPIRES_IN || '15m',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    },
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,

    // Rate Limiting
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100
    },

    // Database
    database: {
        path: process.env.DATABASE_PATH || './database/saramonda.db'
    },

    // Redis
    redis: {
        url: process.env.REDIS_URL || null
    },

    // Backup
    backup: {
        enabled: process.env.BACKUP_ENABLED === 'true',
        cron: process.env.BACKUP_CRON || '0 2 * * *',
        retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS, 10) || 30
    },

    // LINE Messaging API
    line: {
        channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
        channelSecret: process.env.LINE_CHANNEL_SECRET || '',
        notificationEnabled: process.env.LINE_NOTIFICATION_ENABLED === 'true',
        adminUserId: process.env.LINE_ADMIN_USER_ID || '',
        adminGroupId: process.env.LINE_ADMIN_GROUP_ID || ''
    },

    // Branch
    branch: {
        defaultId: process.env.DEFAULT_BRANCH_ID || 'branch_001',
        multiEnabled: process.env.MULTI_BRANCH_ENABLED === 'true'
    },

    // Logging
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        filePath: process.env.LOG_FILE_PATH || './logs'
    },

    // Feature Flags
    features: {
        aiRecommendation: process.env.FEATURE_AI_RECOMMENDATION === 'true',
        dynamicPricing: process.env.FEATURE_DYNAMIC_PRICING === 'true',
        n8nWebhook: process.env.FEATURE_N8N_WEBHOOK === 'true'
    },

    // Order Status Flow
    orderStatus: {
        PENDING: 'pending',
        CONFIRMED: 'confirmed',
        PREPARING: 'preparing',
        READY: 'ready',
        COMPLETED: 'completed',
        CANCELLED: 'cancelled'
    },

    // User Roles
    roles: {
        ADMIN: 'admin',
        MANAGER: 'manager',
        STAFF: 'staff',
        KITCHEN: 'kitchen',
        CUSTOMER: 'customer'
    },

    // Member Tiers
    memberTiers: {
        BRONZE: { name: 'Bronze', minPoints: 0, discount: 0, pointMultiplier: 1 },
        SILVER: { name: 'Silver', minPoints: 5000, discount: 5, pointMultiplier: 1.2 },
        GOLD: { name: 'Gold', minPoints: 15000, discount: 10, pointMultiplier: 1.5 },
        DIAMOND: { name: 'Diamond', minPoints: 50000, discount: 15, pointMultiplier: 2 }
    }
};

module.exports = config;
