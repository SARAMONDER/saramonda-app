/**
 * Stock Management Service
 * Recipe-based ingredient deduction and inventory tracking
 */
const { v4: uuidv4 } = require('uuid');
const db = require('../../config/database');
const config = require('../../config');
const logger = require('../../shared/logger');
const { auditLog } = require('../audit/service');

/**
 * Get all ingredients with current stock
 */
function getAllIngredients(branchId) {
    const ingredients = db.prepare(`
        SELECT * FROM ingredients 
        WHERE branch_id = ?
        ORDER BY name ASC
    `).all(branchId);

    return { success: true, data: ingredients };
}

/**
 * Get low stock alerts
 */
function getLowStockAlerts(branchId) {
    const alerts = db.prepare(`
        SELECT * FROM ingredients 
        WHERE branch_id = ?
        AND current_stock <= min_stock_level
        ORDER BY (current_stock / NULLIF(min_stock_level, 0)) ASC
    `).all(branchId);

    return { success: true, data: alerts };
}

/**
 * Add ingredient
 */
function addIngredient(data, branchId, userId = null) {
    const { name, unit, costPerUnit = 0, currentStock = 0, minStockLevel = 0, supplierId = null } = data;

    const id = uuidv4();

    try {
        db.prepare(`
            INSERT INTO ingredients (id, branch_id, name, unit, cost_per_unit, current_stock, min_stock_level, supplier_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, branchId, name, unit, costPerUnit, currentStock, minStockLevel, supplierId);

        auditLog('INGREDIENT_CREATE', 'ingredients', id, null, { name, unit }, userId);

        return { success: true, data: { id, name } };
    } catch (error) {
        logger.error('Add ingredient error:', error);
        return { success: false, error: 'Failed to add ingredient', code: 'ADD_INGREDIENT_FAILED' };
    }
}

/**
 * Add recipe (link product to ingredients)
 */
function addRecipe(productId, ingredientId, quantity, userId = null) {
    const id = uuidv4();

    try {
        db.prepare(`
            INSERT INTO recipes (id, product_id, ingredient_id, quantity)
            VALUES (?, ?, ?, ?)
        `).run(id, productId, ingredientId, quantity);

        auditLog('RECIPE_CREATE', 'recipes', id, null, { productId, ingredientId, quantity }, userId);

        return { success: true, data: { id } };
    } catch (error) {
        logger.error('Add recipe error:', error);
        return { success: false, error: 'Failed to add recipe', code: 'ADD_RECIPE_FAILED' };
    }
}

/**
 * Get product recipe
 */
function getProductRecipe(productId) {
    const recipe = db.prepare(`
        SELECT r.*, i.name as ingredient_name, i.unit, i.current_stock, i.cost_per_unit
        FROM recipes r
        JOIN ingredients i ON r.ingredient_id = i.id
        WHERE r.product_id = ?
    `).all(productId);

    return { success: true, data: recipe };
}

/**
 * Deduct stock based on recipe when order is confirmed
 */
function deductByRecipe(productId, quantity, orderId = null, userId = null) {
    const recipe = db.prepare(`
        SELECT r.ingredient_id, r.quantity as recipe_qty, i.name, i.current_stock
        FROM recipes r
        JOIN ingredients i ON r.ingredient_id = i.id
        WHERE r.product_id = ?
    `).all(productId);

    if (recipe.length === 0) {
        logger.warn('No recipe found for product', { productId });
        return { success: true, data: { deducted: [] } };
    }

    const deducted = [];

    const transaction = db.transaction(() => {
        for (const item of recipe) {
            const deductQty = item.recipe_qty * quantity;

            // Update stock
            db.prepare(`
                UPDATE ingredients 
                SET current_stock = current_stock - ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(deductQty, item.ingredient_id);

            // Log transaction
            db.prepare(`
                INSERT INTO stock_transactions (id, branch_id, ingredient_id, type, quantity, reference_type, reference_id, created_by)
                SELECT ?, branch_id, ?, 'deduct', ?, 'order', ?, ?
                FROM ingredients WHERE id = ?
            `).run(uuidv4(), item.ingredient_id, deductQty, orderId, userId, item.ingredient_id);

            deducted.push({
                ingredientId: item.ingredient_id,
                name: item.name,
                quantity: deductQty,
                remainingStock: item.current_stock - deductQty
            });

            // Check for low stock alert
            const updated = db.prepare('SELECT current_stock, min_stock_level FROM ingredients WHERE id = ?')
                .get(item.ingredient_id);

            if (updated.current_stock <= updated.min_stock_level) {
                logger.warn('Low stock alert', {
                    ingredientId: item.ingredient_id,
                    name: item.name,
                    currentStock: updated.current_stock,
                    minLevel: updated.min_stock_level
                });
            }
        }
    });

    try {
        transaction();
        logger.info('Stock deducted by recipe', { productId, quantity, orderId });
        return { success: true, data: { deducted } };
    } catch (error) {
        logger.error('Stock deduction error:', error);
        return { success: false, error: 'Stock deduction failed', code: 'STOCK_DEDUCT_FAILED' };
    }
}

/**
 * Adjust stock manually
 */
function adjustStock(data, branchId, userId = null) {
    const { ingredientId, type, quantity, notes } = data;

    const ingredient = db.prepare('SELECT * FROM ingredients WHERE id = ? AND branch_id = ?')
        .get(ingredientId, branchId);

    if (!ingredient) {
        return { success: false, error: 'Ingredient not found', code: 'INGREDIENT_NOT_FOUND' };
    }

    const oldStock = ingredient.current_stock;
    let newStock;

    switch (type) {
        case 'add':
            newStock = oldStock + quantity;
            break;
        case 'remove':
        case 'waste':
            newStock = oldStock - quantity;
            break;
        case 'adjust':
            newStock = quantity; // Direct set
            break;
        default:
            return { success: false, error: 'Invalid adjustment type', code: 'INVALID_TYPE' };
    }

    if (newStock < 0) {
        return { success: false, error: 'Cannot have negative stock', code: 'NEGATIVE_STOCK' };
    }

    const transaction = db.transaction(() => {
        // Update stock
        db.prepare(`
            UPDATE ingredients SET current_stock = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(newStock, ingredientId);

        // Log transaction
        db.prepare(`
            INSERT INTO stock_transactions (id, branch_id, ingredient_id, type, quantity, notes, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(uuidv4(), branchId, ingredientId, type, quantity, notes, userId);
    });

    try {
        transaction();

        auditLog('STOCK_ADJUST', 'ingredients', ingredientId,
            { stock: oldStock },
            { stock: newStock, type, quantity },
            userId
        );

        logger.info('Stock adjusted', { ingredientId, type, quantity, oldStock, newStock });

        return {
            success: true,
            data: {
                ingredientId,
                oldStock,
                newStock,
                adjustment: type === 'adjust' ? newStock - oldStock : (type === 'add' ? quantity : -quantity)
            }
        };
    } catch (error) {
        logger.error('Stock adjustment error:', error);
        return { success: false, error: 'Stock adjustment failed', code: 'ADJUST_FAILED' };
    }
}

/**
 * Get stock transactions history
 */
function getStockHistory(ingredientId, options = {}) {
    const { page = 1, limit = 50 } = options;

    const transactions = db.prepare(`
        SELECT st.*, u.name as created_by_name, i.name as ingredient_name
        FROM stock_transactions st
        LEFT JOIN users u ON st.created_by = u.id
        JOIN ingredients i ON st.ingredient_id = i.id
        WHERE st.ingredient_id = ?
        ORDER BY st.created_at DESC
        LIMIT ? OFFSET ?
    `).all(ingredientId, limit, (page - 1) * limit);

    return { success: true, data: transactions };
}

/**
 * Calculate cost for a product based on recipe
 */
function calculateProductCost(productId) {
    const recipe = db.prepare(`
        SELECT r.quantity, i.cost_per_unit
        FROM recipes r
        JOIN ingredients i ON r.ingredient_id = i.id
        WHERE r.product_id = ?
    `).all(productId);

    const totalCost = recipe.reduce((sum, item) => {
        return sum + (item.quantity * item.cost_per_unit);
    }, 0);

    return { success: true, data: { productId, cost: totalCost } };
}

module.exports = {
    getAllIngredients,
    getLowStockAlerts,
    addIngredient,
    addRecipe,
    getProductRecipe,
    deductByRecipe,
    adjustStock,
    getStockHistory,
    calculateProductCost
};
