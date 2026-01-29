/**
 * Authentication Routes
 * API endpoints for authentication
 */
const express = require('express');
const router = express.Router();
const authService = require('./service');
const { authenticate } = require('../../middleware/auth');
const { authLimiter } = require('../../middleware/rateLimiter');
const { validate, schemas } = require('../../middleware/validator');

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post('/register',
    authLimiter,
    validate(schemas.register),
    async (req, res) => {
        const result = await authService.register(req.body);

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.status(201).json(result);
    }
);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login',
    authLimiter,
    validate(schemas.login),
    async (req, res) => {
        const { email, password } = req.body;
        const ipAddress = req.ip;

        const result = await authService.login(email, password, ipAddress);

        if (!result.success) {
            return res.status(401).json(result);
        }

        res.json(result);
    }
);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({
            success: false,
            error: 'Refresh token is required',
            code: 'MISSING_REFRESH_TOKEN'
        });
    }

    const result = authService.refreshAccessToken(refreshToken);

    if (!result.success) {
        return res.status(401).json(result);
    }

    res.json(result);
});

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticate, (req, res) => {
    const { refreshToken } = req.body;
    const result = authService.logout(refreshToken, req.user.id);
    res.json(result);
});

/**
 * @route   POST /api/v1/auth/change-password
 * @desc    Change password
 * @access  Private
 */
router.post('/change-password', authenticate, async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({
            success: false,
            error: 'Current and new password are required',
            code: 'MISSING_PASSWORDS'
        });
    }

    if (newPassword.length < 8) {
        return res.status(400).json({
            success: false,
            error: 'New password must be at least 8 characters',
            code: 'WEAK_PASSWORD'
        });
    }

    const result = await authService.changePassword(req.user.id, currentPassword, newPassword);

    if (!result.success) {
        return res.status(400).json(result);
    }

    res.json(result);
});

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get('/me', authenticate, (req, res) => {
    res.json({
        success: true,
        data: req.user
    });
});

module.exports = router;
