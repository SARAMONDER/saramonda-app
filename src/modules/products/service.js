/**
 * Products Service
 * Product catalog management and retrieval
 */
const { v4: uuidv4 } = require('uuid');
const db = require('../../config/database');
const logger = require('../../shared/logger');
const { auditLog } = require('../audit/service');

/**
 * Get all products with optional filters
 */
function getAllProducts(branchId, filters = {}) {
    try {
        const { categoryId, isAvailable = true, includeVariants = true } = filters;

        let query = `SELECT * FROM products WHERE branch_id = ?`;
        const params = [branchId];

        if (categoryId) {
            query += ` AND category_id = ?`;
            params.push(categoryId);
        }

        if (isAvailable !== null) {
            query += ` AND is_available = ?`;
            params.push(isAvailable ? 1 : 0);
        }

        query += ` ORDER BY sort_order ASC, name ASC`;

        const products = db.prepare(query).all(...params);

        // Include variants if requested
        if (includeVariants) {
            for (const product of products) {
                if (product.has_variants) {
                    product.variants = db.prepare(
                        `SELECT * FROM product_variants WHERE product_id = ? AND is_available = 1 ORDER BY price_modifier ASC`
                    ).all(product.id);
                } else {
                    product.variants = [];
                }
            }
        }

        return { success: true, data: products };
    } catch (error) {
        logger.error('Get products error:', error);
        return { success: false, error: 'Failed to get products', code: 'PRODUCTS_FETCH_FAILED' };
    }
}

/**
 * Get product by ID
 */
function getProductById(productId) {
    try {
        const product = db.prepare(`SELECT * FROM products WHERE id = ?`).get(productId);

        if (!product) {
            return { success: false, error: 'Product not found', code: 'PRODUCT_NOT_FOUND' };
        }

        // Get variants
        product.variants = db.prepare(
            `SELECT * FROM product_variants WHERE product_id = ? ORDER BY price_modifier ASC`
        ).all(productId);

        // Get category info
        product.category = db.prepare(`SELECT * FROM categories WHERE id = ?`).get(product.category_id);

        return { success: true, data: product };
    } catch (error) {
        logger.error('Get product error:', error);
        return { success: false, error: 'Failed to get product', code: 'PRODUCT_FETCH_FAILED' };
    }
}

/**
 * Get all categories
 */
function getAllCategories(branchId) {
    try {
        const categories = db.prepare(
            `SELECT * FROM categories WHERE branch_id = ? AND is_active = 1 ORDER BY sort_order ASC`
        ).all(branchId);

        // Get product count per category
        for (const cat of categories) {
            const countResult = db.prepare(
                `SELECT COUNT(*) as count FROM products WHERE category_id = ? AND is_available = 1`
            ).get(cat.id);
            cat.productCount = countResult?.count || 0;
        }

        return { success: true, data: categories };
    } catch (error) {
        logger.error('Get categories error:', error);
        return { success: false, error: 'Failed to get categories', code: 'CATEGORIES_FETCH_FAILED' };
    }
}

/**
 * Create new product
 */
function createProduct(productData, branchId, userId) {
    try {
        const {
            categoryId,
            name,
            nameEn = null,
            description = null,
            basePrice,
            costPrice = 0,
            imageUrl = null,
            hasVariants = false,
            prepTimeMinutes = 10,
            variants = []
        } = productData;

        const productId = uuidv4();

        db.prepare(`
            INSERT INTO products (id, branch_id, category_id, name, name_en, description, base_price, cost_price, image_url, has_variants, prep_time_minutes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(productId, branchId, categoryId, name, nameEn, description, basePrice, costPrice, imageUrl, hasVariants ? 1 : 0, prepTimeMinutes);

        // Create variants if provided
        if (hasVariants && variants.length > 0) {
            for (const variant of variants) {
                db.prepare(`
                    INSERT INTO product_variants (id, product_id, name, price_modifier)
                    VALUES (?, ?, ?, ?)
                `).run(uuidv4(), productId, variant.name, variant.priceModifier || 0);
            }
        }

        auditLog('PRODUCT_CREATE', 'products', productId, null, productData, userId);
        logger.info('Product created', { productId, name });

        return { success: true, data: { productId, name } };
    } catch (error) {
        logger.error('Create product error:', error);
        return { success: false, error: 'Failed to create product: ' + error.message, code: 'PRODUCT_CREATE_FAILED' };
    }
}

/**
 * Update product
 */
function updateProduct(productId, updates, userId) {
    try {
        const product = db.prepare(`SELECT * FROM products WHERE id = ?`).get(productId);
        
        if (!product) {
            return { success: false, error: 'Product not found', code: 'PRODUCT_NOT_FOUND' };
        }

        const allowedFields = ['name', 'name_en', 'description', 'base_price', 'cost_price', 'image_url', 'is_available', 'sort_order', 'prep_time_minutes'];
        const updateParts = [];
        const params = [];

        for (const [key, value] of Object.entries(updates)) {
            const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            if (allowedFields.includes(dbKey)) {
                updateParts.push(`${dbKey} = ?`);
                params.push(value);
            }
        }

        if (updateParts.length === 0) {
            return { success: false, error: 'No valid fields to update', code: 'NO_VALID_FIELDS' };
        }

        updateParts.push('updated_at = CURRENT_TIMESTAMP');
        params.push(productId);

        db.prepare(`UPDATE products SET ${updateParts.join(', ')} WHERE id = ?`).run(...params);

        auditLog('PRODUCT_UPDATE', 'products', productId, product, updates, userId);
        logger.info('Product updated', { productId });

        return { success: true, data: { productId } };
    } catch (error) {
        logger.error('Update product error:', error);
        return { success: false, error: 'Failed to update product', code: 'PRODUCT_UPDATE_FAILED' };
    }
}

/**
 * Delete product (soft delete)
 */
function deleteProduct(productId, userId) {
    try {
        const product = db.prepare(`SELECT * FROM products WHERE id = ?`).get(productId);
        
        if (!product) {
            return { success: false, error: 'Product not found', code: 'PRODUCT_NOT_FOUND' };
        }

        db.prepare(`UPDATE products SET is_available = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(productId);

        auditLog('PRODUCT_DELETE', 'products', productId, product, null, userId);
        logger.info('Product deleted', { productId });

        return { success: true };
    } catch (error) {
        logger.error('Delete product error:', error);
        return { success: false, error: 'Failed to delete product', code: 'PRODUCT_DELETE_FAILED' };
    }
}

/**
 * Add product variant
 */
function addVariant(productId, variantData, userId) {
    try {
        const product = db.prepare(`SELECT * FROM products WHERE id = ?`).get(productId);
        
        if (!product) {
            return { success: false, error: 'Product not found', code: 'PRODUCT_NOT_FOUND' };
        }

        const variantId = uuidv4();
        db.prepare(`
            INSERT INTO product_variants (id, product_id, name, price_modifier)
            VALUES (?, ?, ?, ?)
        `).run(variantId, productId, variantData.name, variantData.priceModifier || 0);

        // Update product to have variants
        db.prepare(`UPDATE products SET has_variants = 1 WHERE id = ?`).run(productId);

        logger.info('Variant added', { productId, variantId });

        return { success: true, data: { variantId } };
    } catch (error) {
        logger.error('Add variant error:', error);
        return { success: false, error: 'Failed to add variant', code: 'VARIANT_ADD_FAILED' };
    }
}

/**
 * Search products
 */
function searchProducts(branchId, query) {
    try {
        const searchTerm = `%${query}%`;
        const products = db.prepare(`
            SELECT * FROM products 
            WHERE branch_id = ? AND is_available = 1 
            AND (name LIKE ? OR name_en LIKE ? OR description LIKE ?)
            ORDER BY name ASC
        `).all(branchId, searchTerm, searchTerm, searchTerm);

        return { success: true, data: products };
    } catch (error) {
        logger.error('Search products error:', error);
        return { success: false, error: 'Search failed', code: 'SEARCH_FAILED' };
    }
}

/**
 * Get products for customer (public, no auth needed)
 */
function getProductsForCustomer(branchId) {
    try {
        // Get categories with products
        const categories = db.prepare(`
            SELECT * FROM categories WHERE branch_id = ? AND is_active = 1 ORDER BY sort_order ASC
        `).all(branchId);

        const result = [];

        for (const cat of categories) {
            const products = db.prepare(`
                SELECT id, name, name_en, description, base_price, image_url, has_variants, prep_time_minutes
                FROM products 
                WHERE category_id = ? AND is_available = 1 
                ORDER BY sort_order ASC
            `).all(cat.id);

            // Get variants for each product
            for (const product of products) {
                if (product.has_variants) {
                    product.variants = db.prepare(`
                        SELECT id, name, price_modifier 
                        FROM product_variants 
                        WHERE product_id = ? AND is_available = 1
                        ORDER BY price_modifier ASC
                    `).all(product.id);
                }
            }

            if (products.length > 0) {
                result.push({
                    ...cat,
                    products
                });
            }
        }

        return { success: true, data: result };
    } catch (error) {
        logger.error('Get products for customer error:', error);
        return { success: false, error: 'Failed to get products', code: 'PRODUCTS_FETCH_FAILED' };
    }
}

module.exports = {
    getAllProducts,
    getProductById,
    getAllCategories,
    createProduct,
    updateProduct,
    deleteProduct,
    addVariant,
    searchProducts,
    getProductsForCustomer
};
