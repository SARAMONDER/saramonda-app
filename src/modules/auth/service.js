/**
 * Authentication Module
 * Handles user registration, login, and token management
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../../config/database');
const config = require('../../config');
const logger = require('../../shared/logger');
const { auditLog } = require('../audit/service');

/**
 * Generate JWT access token
 */
function generateAccessToken(userId) {
    return jwt.sign(
        { userId, type: 'access' },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
    );
}

/**
 * Generate refresh token
 */
function generateRefreshToken(userId) {
    const token = jwt.sign(
        { userId, type: 'refresh', jti: uuidv4() },
        config.jwt.secret,
        { expiresIn: config.jwt.refreshExpiresIn }
    );

    // Store refresh token in database
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare(`
        INSERT INTO refresh_tokens (id, user_id, token, expires_at)
        VALUES (?, ?, ?, ?)
    `).run(uuidv4(), userId, token, expiresAt);

    return token;
}

/**
 * Register new user
 */
async function register(userData, branchId = null) {
    const { email, password, name, phone, role = 'customer' } = userData;

    // Check if email already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
        return {
            success: false,
            error: 'Email already registered',
            code: 'EMAIL_EXISTS'
        };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, config.bcryptRounds);

    // Create user
    const userId = uuidv4();
    const insertUser = db.prepare(`
        INSERT INTO users (id, branch_id, email, password_hash, name, phone, role)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    try {
        insertUser.run(userId, branchId || config.branch.defaultId, email, passwordHash, name, phone, role);

        // If customer, create member record
        if (role === 'customer') {
            const memberId = uuidv4();
            db.prepare(`
                INSERT INTO members (id, user_id, branch_id, name, email, phone)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(memberId, userId, branchId || config.branch.defaultId, name, email, phone);
        }

        // Generate tokens
        const accessToken = generateAccessToken(userId);
        const refreshToken = generateRefreshToken(userId);

        // Audit log
        auditLog('USER_REGISTER', 'users', userId, null, { email, name, role });

        logger.info('User registered successfully', { userId, email, role });

        return {
            success: true,
            data: {
                user: { id: userId, email, name, role },
                accessToken,
                refreshToken
            }
        };
    } catch (error) {
        logger.error('Registration error:', error);
        return {
            success: false,
            error: 'Registration failed',
            code: 'REGISTRATION_FAILED'
        };
    }
}

/**
 * Login user
 */
async function login(email, password, ipAddress = null) {
    // Find user
    const user = db.prepare(`
        SELECT id, email, password_hash, name, role, branch_id, is_active
        FROM users WHERE email = ?
    `).get(email);

    if (!user) {
        logger.security('Login attempt with unknown email', { email, ip: ipAddress });
        return {
            success: false,
            error: 'Invalid email or password',
            code: 'INVALID_CREDENTIALS'
        };
    }

    if (!user.is_active) {
        return {
            success: false,
            error: 'Account is disabled',
            code: 'ACCOUNT_DISABLED'
        };
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
        logger.security('Failed login attempt', { email, ip: ipAddress });
        return {
            success: false,
            error: 'Invalid email or password',
            code: 'INVALID_CREDENTIALS'
        };
    }

    // Update last login
    db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Audit log
    auditLog('USER_LOGIN', 'users', user.id, null, { ip: ipAddress });

    logger.info('User logged in', { userId: user.id, email, role: user.role });

    return {
        success: true,
        data: {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                branchId: user.branch_id
            },
            accessToken,
            refreshToken
        }
    };
}

/**
 * Refresh access token
 */
function refreshAccessToken(refreshToken) {
    try {
        const decoded = jwt.verify(refreshToken, config.jwt.secret);

        if (decoded.type !== 'refresh') {
            return { success: false, error: 'Invalid token type', code: 'INVALID_TOKEN' };
        }

        // Check if token exists in database
        const storedToken = db.prepare(`
            SELECT * FROM refresh_tokens 
            WHERE token = ? AND expires_at > datetime('now')
        `).get(refreshToken);

        if (!storedToken) {
            return { success: false, error: 'Invalid or expired refresh token', code: 'INVALID_REFRESH_TOKEN' };
        }

        // Generate new access token
        const newAccessToken = generateAccessToken(decoded.userId);

        return {
            success: true,
            data: { accessToken: newAccessToken }
        };
    } catch (error) {
        logger.error('Token refresh error:', error);
        return { success: false, error: 'Invalid refresh token', code: 'INVALID_REFRESH_TOKEN' };
    }
}

/**
 * Logout user (invalidate refresh token)
 */
function logout(refreshToken, userId) {
    db.prepare('DELETE FROM refresh_tokens WHERE token = ? OR user_id = ?').run(refreshToken, userId);
    auditLog('USER_LOGOUT', 'users', userId, null, null);
    return { success: true };
}

/**
 * Change password
 */
async function changePassword(userId, currentPassword, newPassword) {
    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId);

    if (!user) {
        return { success: false, error: 'User not found', code: 'USER_NOT_FOUND' };
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
        return { success: false, error: 'Current password is incorrect', code: 'INVALID_PASSWORD' };
    }

    const newPasswordHash = await bcrypt.hash(newPassword, config.bcryptRounds);
    db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(newPasswordHash, userId);

    // Invalidate all refresh tokens
    db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(userId);

    auditLog('PASSWORD_CHANGE', 'users', userId, null, null);

    return { success: true };
}

module.exports = {
    register,
    login,
    refreshAccessToken,
    logout,
    changePassword,
    generateAccessToken,
    generateRefreshToken
};
