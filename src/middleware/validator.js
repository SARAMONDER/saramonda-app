/**
 * Validation Middleware
 * Server-side input validation using Zod
 */
const { z } = require('zod');
const logger = require('../shared/logger');

/**
 * Create validation middleware from Zod schema
 * @param {z.ZodSchema} schema - Zod schema for validation
 * @param {string} source - 'body', 'query', or 'params'
 */
const validate = (schema, source = 'body') => {
    return (req, res, next) => {
        try {
            const data = req[source];
            const result = schema.safeParse(data);

            if (!result.success) {
                const errors = result.error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message
                }));

                logger.warn('Validation failed', {
                    path: req.path,
                    source,
                    errors
                });

                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    code: 'VALIDATION_ERROR',
                    details: errors
                });
            }

            // Replace request data with validated/transformed data
            req[source] = result.data;
            next();
        } catch (error) {
            logger.error('Validation error:', error);
            return res.status(500).json({
                success: false,
                error: 'Validation processing error',
                code: 'VALIDATION_PROCESSING_ERROR'
            });
        }
    };
};

// ============================================
// COMMON VALIDATION SCHEMAS
// ============================================

// User Registration
const registerSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    phone: z.string().optional()
});

// User Login
const loginSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required')
});

// Order Creation
const orderItemSchema = z.object({
    productId: z.string().min(1, 'Product ID is required'),
    variantId: z.string().optional(),
    quantity: z.number().int().positive('Quantity must be positive'),
    notes: z.string().optional()
});

const createOrderSchema = z.object({
    items: z.array(orderItemSchema).min(1, 'At least one item is required'),
    customerName: z.string().min(2, 'Customer name is required'),
    customerPhone: z.string().optional(),
    customerAddress: z.string().optional(),
    deliveryType: z.enum(['pickup', 'delivery', 'dine_in']).default('pickup'),
    paymentMethod: z.enum(['cash', 'card', 'transfer', 'qr']).default('cash'),
    couponCode: z.string().optional(),
    notes: z.string().optional()
});

// Order Status Update
const updateOrderStatusSchema = z.object({
    status: z.enum(['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled']),
    notes: z.string().optional()
});

// Product Creation
const createProductSchema = z.object({
    categoryId: z.string().optional(),
    name: z.string().min(1, 'Product name is required'),
    nameEn: z.string().optional(),
    description: z.string().optional(),
    basePrice: z.number().positive('Base price must be positive'),
    costPrice: z.number().min(0).optional(),
    hasVariants: z.boolean().default(false),
    prepTimeMinutes: z.number().int().positive().default(10)
});

// Stock Adjustment
const stockAdjustmentSchema = z.object({
    ingredientId: z.string().min(1, 'Ingredient ID is required'),
    type: z.enum(['add', 'remove', 'adjust', 'waste']),
    quantity: z.number().positive('Quantity must be positive'),
    notes: z.string().optional()
});

// Coupon Creation
const createCouponSchema = z.object({
    code: z.string().min(3, 'Coupon code must be at least 3 characters').toUpperCase(),
    type: z.enum(['fixed', 'percent', 'free_shipping']),
    value: z.number().positive('Value must be positive'),
    minOrderAmount: z.number().min(0).default(0),
    maxDiscount: z.number().positive().optional(),
    usageLimit: z.number().int().positive().optional(),
    validFrom: z.string().optional(),
    validUntil: z.string().optional()
});

// Member Update
const updateMemberSchema = z.object({
    name: z.string().min(2).optional(),
    phone: z.string().optional(),
    birthday: z.string().optional()
});

// ID Parameter
const idParamSchema = z.object({
    id: z.string().min(1, 'ID is required')
});

// Pagination Query
const paginationSchema = z.object({
    page: z.string().transform(Number).pipe(z.number().int().positive()).default('1'),
    limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).default('20'),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
});

// Date Range Query
const dateRangeSchema = z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
});

module.exports = {
    validate,
    schemas: {
        register: registerSchema,
        login: loginSchema,
        createOrder: createOrderSchema,
        updateOrderStatus: updateOrderStatusSchema,
        createProduct: createProductSchema,
        stockAdjustment: stockAdjustmentSchema,
        createCoupon: createCouponSchema,
        updateMember: updateMemberSchema,
        idParam: idParamSchema,
        pagination: paginationSchema,
        dateRange: dateRangeSchema
    }
};
