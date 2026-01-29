/**
 * Stock Routes
 * API endpoints for inventory management
 */
const express = require('express');
const router = express.Router();
const stockService = require('./service');
const { authenticate, authorize, branchAccess } = require('../../middleware/auth');
const { validate, schemas } = require('../../middleware/validator');
const config = require('../../config');

/**
 * @route   GET /api/v1/stock/ingredients
 * @desc    Get all ingredients
 * @access  Private (Staff+)
 */
router.get('/ingredients',
    authenticate,
    authorize(config.roles.ADMIN, config.roles.MANAGER, config.roles.STAFF),
    branchAccess,
    (req, res) => {
        const result = stockService.getAllIngredients(req.branchId);
        res.json(result);
    }
);

/**
 * @route   GET /api/v1/stock/alerts
 * @desc    Get low stock alerts
 * @access  Private (Staff+)
 */
router.get('/alerts',
    authenticate,
    authorize(config.roles.ADMIN, config.roles.MANAGER, config.roles.STAFF),
    branchAccess,
    (req, res) => {
        const result = stockService.getLowStockAlerts(req.branchId);
        res.json(result);
    }
);

/**
 * @route   POST /api/v1/stock/ingredients
 * @desc    Add new ingredient
 * @access  Private (Manager+)
 */
router.post('/ingredients',
    authenticate,
    authorize(config.roles.ADMIN, config.roles.MANAGER),
    branchAccess,
    (req, res) => {
        const result = stockService.addIngredient(req.body, req.branchId, req.user.id);

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.status(201).json(result);
    }
);

/**
 * @route   POST /api/v1/stock/adjust
 * @desc    Adjust stock (add, remove, waste)
 * @access  Private (Staff+)
 */
router.post('/adjust',
    authenticate,
    authorize(config.roles.ADMIN, config.roles.MANAGER, config.roles.STAFF),
    branchAccess,
    validate(schemas.stockAdjustment),
    (req, res) => {
        const result = stockService.adjustStock(req.body, req.branchId, req.user.id);

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);
    }
);

/**
 * @route   GET /api/v1/stock/history/:ingredientId
 * @desc    Get stock transaction history
 * @access  Private (Staff+)
 */
router.get('/history/:ingredientId',
    authenticate,
    authorize(config.roles.ADMIN, config.roles.MANAGER, config.roles.STAFF),
    (req, res) => {
        const result = stockService.getStockHistory(req.params.ingredientId, {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 50
        });
        res.json(result);
    }
);

/**
 * @route   GET /api/v1/stock/recipe/:productId
 * @desc    Get product recipe (ingredients)
 * @access  Private (Staff+)
 */
router.get('/recipe/:productId',
    authenticate,
    authorize(config.roles.ADMIN, config.roles.MANAGER, config.roles.STAFF, config.roles.KITCHEN),
    (req, res) => {
        const result = stockService.getProductRecipe(req.params.productId);
        res.json(result);
    }
);

/**
 * @route   POST /api/v1/stock/recipe
 * @desc    Add recipe (product-ingredient mapping)
 * @access  Private (Manager+)
 */
router.post('/recipe',
    authenticate,
    authorize(config.roles.ADMIN, config.roles.MANAGER),
    (req, res) => {
        const { productId, ingredientId, quantity } = req.body;
        const result = stockService.addRecipe(productId, ingredientId, quantity, req.user.id);

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.status(201).json(result);
    }
);

/**
 * @route   GET /api/v1/stock/cost/:productId
 * @desc    Calculate product cost from recipe
 * @access  Private (Manager+)
 */
router.get('/cost/:productId',
    authenticate,
    authorize(config.roles.ADMIN, config.roles.MANAGER),
    (req, res) => {
        const result = stockService.calculateProductCost(req.params.productId);
        res.json(result);
    }
);

module.exports = router;
