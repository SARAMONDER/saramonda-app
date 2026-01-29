/**
 * Authentication Middleware
 * JWT verification and user extraction
 */
const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../config/database');
const logger = require('../shared/logger');

/**
 * Verify JWT token and attach user to request
 */
const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
        }

        const token = authHeader.split(' ')[1];

        try {
            const decoded = jwt.verify(token, config.jwt.secret);

            // Get user from database
            const user = db.prepare(`
                SELECT id, email, name, role, branch_id, is_active 
                FROM users WHERE id = ?
            `).get(decoded.userId);

            if (!user) {
                return res.status(401).json({
                    success: false,
                    error: 'User not found',
                    code: 'USER_NOT_FOUND'
                });
            }

            if (!user.is_active) {
                return res.status(403).json({
                    success: false,
                    error: 'Account is disabled',
                    code: 'ACCOUNT_DISABLED'
                });
            }

            // Attach user to request
            req.user = {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                branchId: user.branch_id
            };

            next();
        } catch (jwtError) {
            if (jwtError.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    error: 'Token expired',
                    code: 'TOKEN_EXPIRED'
                });
            }
            throw jwtError;
        }
    } catch (error) {
        logger.error('Authentication error:', error);
        return res.status(401).json({
            success: false,
            error: 'Invalid token',
            code: 'INVALID_TOKEN'
        });
    }
};

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        req.user = null;
        return next();
    }

    authenticate(req, res, next);
};

/**
 * Role-based access control middleware
 * @param {...string} allowedRoles - Roles that can access the route
 */
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            logger.security('Unauthorized access attempt', {
                userId: req.user.id,
                role: req.user.role,
                requiredRoles: allowedRoles,
                path: req.path
            });

            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
                code: 'FORBIDDEN'
            });
        }

        next();
    };
};

/**
 * Branch access control - ensures user can only access their branch data
 */
const branchAccess = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required',
            code: 'AUTH_REQUIRED'
        });
    }

    // Admins can access all branches
    if (req.user.role === config.roles.ADMIN) {
        return next();
    }

    // Get branch from request (params, query, or body)
    const requestBranchId = req.params.branchId || req.query.branchId || req.body.branchId;

    if (requestBranchId && requestBranchId !== req.user.branchId) {
        logger.security('Cross-branch access attempt', {
            userId: req.user.id,
            userBranch: req.user.branchId,
            requestedBranch: requestBranchId
        });

        return res.status(403).json({
            success: false,
            error: 'Access to this branch is not allowed',
            code: 'BRANCH_ACCESS_DENIED'
        });
    }

    // Set branch ID for the request
    req.branchId = req.user.branchId || config.branch.defaultId;
    next();
};

module.exports = {
    authenticate,
    optionalAuth,
    authorize,
    branchAccess
};
