/**
 * Products Routes
 * API endpoints for product catalog
 */
const express = require('express');
const router = express.Router();
const productsService = require('./service');
const { authenticate, authorize, branchAccess } = require('../../middleware/auth');
const config = require('../../config');

/**
 * @route   GET /api/v1/products
 * @desc    Get all products (public - for customer app)
 * @access  Public
 */
router.get('/', (req, res) => {
    const branchId = req.query.branch || config.branch.defaultId;
    const result = productsService.getProductsForCustomer(branchId);
    res.json(result);
});

/**
 * @route   GET /api/v1/products/all
 * @desc    Get all products with full details (admin)
 * @access  Private (Staff+)
 */
router.get('/all',
    authenticate,
    authorize(config.roles.ADMIN, config.roles.MANAGER, config.roles.STAFF),
    branchAccess,
    (req, res) => {
        const filters = {
            categoryId: req.query.category,
            isAvailable: req.query.available !== 'false',
            includeVariants: req.query.variants !== 'false'
        };
        const result = productsService.getAllProducts(req.branchId, filters);
        res.json(result);
    }
);

/**
 * @route   GET /api/v1/products/categories
 * @desc    Get all categories
 * @access  Public
 */
router.get('/categories', (req, res) => {
    const branchId = req.query.branch || config.branch.defaultId;
    const result = productsService.getAllCategories(branchId);
    res.json(result);
});

/**
 * @route   GET /api/v1/products/search
 * @desc    Search products
 * @access  Public
 */
router.get('/search', (req, res) => {
    const branchId = req.query.branch || config.branch.defaultId;
    const query = req.query.q || '';

    if (query.length < 2) {
        return res.status(400).json({
            success: false,
            error: 'Search query must be at least 2 characters',
            code: 'INVALID_QUERY'
        });
    }

    const result = productsService.searchProducts(branchId, query);
    res.json(result);
});

/**
 * @route   GET /api/v1/products/:id
 * @desc    Get single product by ID
 * @access  Public
 */
router.get('/:id', (req, res) => {
    const result = productsService.getProductById(req.params.id);

    if (!result.success) {
        return res.status(404).json(result);
    }

    res.json(result);
});

/**
 * @route   POST /api/v1/products
 * @desc    Create new product
 * @access  Private (Manager+)
 */
router.post('/',
    authenticate,
    authorize(config.roles.ADMIN, config.roles.MANAGER),
    branchAccess,
    (req, res) => {
        const result = productsService.createProduct(req.body, req.branchId, req.user.id);

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.status(201).json(result);
    }
);

/**
 * @route   PUT /api/v1/products/:id
 * @desc    Update product
 * @access  Private (Manager+)
 */
router.put('/:id',
    authenticate,
    authorize(config.roles.ADMIN, config.roles.MANAGER),
    (req, res) => {
        const result = productsService.updateProduct(req.params.id, req.body, req.user.id);

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);
    }
);

/**
 * @route   DELETE /api/v1/products/:id
 * @desc    Delete product (soft delete)
 * @access  Private (Manager+)
 */
router.delete('/:id',
    authenticate,
    authorize(config.roles.ADMIN, config.roles.MANAGER),
    (req, res) => {
        const result = productsService.deleteProduct(req.params.id, req.user.id);

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);
    }
);

/**
 * @route   POST /api/v1/products/:id/variants
 * @desc    Add variant to product
 * @access  Private (Manager+)
 */
router.post('/:id/variants',
    authenticate,
    authorize(config.roles.ADMIN, config.roles.MANAGER),
    (req, res) => {
        const result = productsService.addVariant(req.params.id, req.body, req.user.id);

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.status(201).json(result);
    }
);

module.exports = router;
