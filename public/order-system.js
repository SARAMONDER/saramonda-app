/**
 * Saramondā Order System
 * Connected to Backend API
 */

const OrderSystem = {
    // Current cart items (cartId -> {productId, variantId, quantity, price, name, size})
    cart: new Map(),

    // Branch ID
    branchId: 'branch_001',

    /**
     * Add item to cart
     */
    addToCart(productId, variantId, name, size, price, quantity = 1) {
        const cartKey = variantId ? `${productId}_${variantId}` : productId;

        if (this.cart.has(cartKey)) {
            const item = this.cart.get(cartKey);
            item.quantity += quantity;
        } else {
            this.cart.set(cartKey, {
                productId,
                variantId,
                name,
                size,
                price,
                quantity
            });
        }

        this.updateCartUI();
        this.saveCartToLocal();
    },

    /**
     * Update item quantity
     */
    updateQuantity(cartKey, delta) {
        if (this.cart.has(cartKey)) {
            const item = this.cart.get(cartKey);
            item.quantity += delta;

            if (item.quantity <= 0) {
                this.cart.delete(cartKey);
            }

            this.updateCartUI();
            this.saveCartToLocal();
        }
    },

    /**
     * Set item quantity directly
     */
    setQuantity(cartKey, quantity) {
        if (this.cart.has(cartKey)) {
            if (quantity <= 0) {
                this.cart.delete(cartKey);
            } else {
                this.cart.get(cartKey).quantity = quantity;
            }
            this.updateCartUI();
            this.saveCartToLocal();
        }
    },

    /**
     * Get cart total
     */
    getTotal() {
        let total = 0;
        this.cart.forEach(item => {
            total += item.price * item.quantity;
        });
        return total;
    },

    /**
     * Get cart items count
     */
    getItemCount() {
        let count = 0;
        this.cart.forEach(item => {
            count += item.quantity;
        });
        return count;
    },

    /**
     * Clear cart
     */
    clearCart() {
        this.cart.clear();
        this.updateCartUI();
        this.saveCartToLocal();
    },

    /**
     * Update cart UI elements
     */
    updateCartUI() {
        const totalPrice = document.getElementById('totalPrice');
        const cartCount = document.getElementById('cartCount');
        const cartSummary = document.getElementById('cartSummary');

        if (totalPrice) {
            totalPrice.textContent = this.getTotal().toLocaleString();
        }

        if (cartCount) {
            const count = this.getItemCount();
            cartCount.textContent = count;
            cartCount.style.display = count > 0 ? 'flex' : 'none';
        }

        if (cartSummary) {
            cartSummary.classList.toggle('visible', this.getItemCount() > 0);
        }
    },

    /**
     * Save cart to localStorage
     */
    saveCartToLocal() {
        const cartData = {};
        this.cart.forEach((value, key) => {
            cartData[key] = value;
        });
        localStorage.setItem('saramonda_cart', JSON.stringify(cartData));
    },

    /**
     * Load cart from localStorage
     */
    loadCartFromLocal() {
        try {
            const cartData = JSON.parse(localStorage.getItem('saramonda_cart') || '{}');
            this.cart.clear();
            Object.entries(cartData).forEach(([key, value]) => {
                this.cart.set(key, value);
            });
            this.updateCartUI();
        } catch (e) {
            console.error('Error loading cart:', e);
        }
    },

    /**
     * Submit order to API
     */
    async submitOrder(customerInfo) {
        const { name, phone, address = '' } = customerInfo;

        if (this.cart.size === 0) {
            return { success: false, error: 'Cart is empty' };
        }

        // Prepare order items for API
        const items = [];
        this.cart.forEach((item, key) => {
            // Map frontend product IDs to backend product IDs
            const productMapping = {
                'trim-a': 'prod_trim_a',
                'trim-b': 'prod_trim_b',
                'trim-c': 'prod_trim_c',
                'trim-d': 'prod_trim_d',
                'steak-premium': 'prod_salmon_steak',
                'steak-classic': 'prod_salmon_fillet',
                'combo-family': 'prod_sashimi_set',
                'combo-couple': 'prod_sashimi_set',
                'arai-teishoku': 'prod_sashimi_set'
            };

            let mappedProductId = productMapping[item.productId] || item.productId;

            // Map variants
            let variantId = null;
            if (item.size) {
                variantId = `${mappedProductId}_${item.size}`;
            }

            items.push({
                productId: mappedProductId,
                variantId: variantId,
                quantity: item.quantity
            });
        });

        try {
            // Call API to create order
            const result = await window.SaramondaAPI.Orders.create({
                items,
                customerName: name,
                customerPhone: phone,
                customerAddress: address,
                deliveryType: 'pickup',
                paymentMethod: 'cash'
            });

            if (result.success) {
                // Connect WebSocket for real-time updates
                window.SaramondaAPI.connectWebSocket('customer', this.branchId);

                // Clear cart after successful order
                this.clearCart();

                return {
                    success: true,
                    orderId: result.data.orderId,
                    orderNumber: result.data.orderNumber,
                    total: result.data.total,
                    estimatedTime: result.data.estimatedPrepTime
                };
            } else {
                console.error('Order API error:', result.error);
                return { success: false, error: result.error };
            }
        } catch (error) {
            console.error('Order submission error:', error);
            return { success: false, error: 'Network error. Please try again.' };
        }
    },

    /**
     * Get order status from API
     */
    async getOrderStatus(orderId) {
        try {
            const result = await window.SaramondaAPI.Orders.getById(orderId);
            return result;
        } catch (error) {
            console.error('Get order status error:', error);
            return { success: false, error: 'Failed to get order status' };
        }
    },

    /**
     * Initialize order system
     */
    init() {
        this.loadCartFromLocal();

        // Try to connect WebSocket for real-time updates
        if (window.SaramondaAPI) {
            window.SaramondaAPI.connectWebSocket('customer', this.branchId);

            // Listen for order updates
            window.SaramondaAPI.onWebSocketMessage((message) => {
                if (message.type === 'order_status_change') {
                    console.log('Order status updated:', message);
                    // Could show notification here
                }
            });
        }

        console.log('🛒 Order System initialized (connected to API)');
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    OrderSystem.init();
});

// Make available globally
window.OrderSystem = OrderSystem;
