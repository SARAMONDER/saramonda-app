/**
 * Saramondā API Client
 * Connects Frontend to Backend API Server
 */

// Auto-detect environment based on hostname
const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

// Configure API URLs based on environment
// ⚠️ IMPORTANT: Update PRODUCTION_API_URL before deploying!
const PRODUCTION_API_URL = 'https://your-api-url.railway.app/api/v1';
const PRODUCTION_WS_URL = 'wss://your-api-url.railway.app/ws';

const API_BASE_URL = isProduction ? PRODUCTION_API_URL : 'http://localhost:3000/api/v1';
const WS_URL = isProduction ? PRODUCTION_WS_URL : 'ws://localhost:3000/ws';

console.log(`🌐 Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
console.log(`🔗 API URL: ${API_BASE_URL}`);

// Token management
let accessToken = localStorage.getItem('saramonda_access_token');
let refreshToken = localStorage.getItem('saramonda_refresh_token');
let currentUser = JSON.parse(localStorage.getItem('saramonda_user') || 'null');

// WebSocket connection
let ws = null;
let wsReconnectTimeout = null;
const wsListeners = new Set();

/**
 * Save tokens to localStorage
 */
function saveTokens(access, refresh, user) {
    accessToken = access;
    refreshToken = refresh;
    currentUser = user;
    localStorage.setItem('saramonda_access_token', access);
    localStorage.setItem('saramonda_refresh_token', refresh);
    localStorage.setItem('saramonda_user', JSON.stringify(user));
}

/**
 * Clear tokens (logout)
 */
function clearTokens() {
    accessToken = null;
    refreshToken = null;
    currentUser = null;
    localStorage.removeItem('saramonda_access_token');
    localStorage.removeItem('saramonda_refresh_token');
    localStorage.removeItem('saramonda_user');
}

/**
 * Make API request with auth headers
 */
async function apiRequest(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers
        });

        const data = await response.json();

        // Handle token expiration
        if (response.status === 401 && data.code === 'TOKEN_EXPIRED' && refreshToken) {
            const refreshed = await refreshAccessToken();
            if (refreshed) {
                // Retry original request
                headers['Authorization'] = `Bearer ${accessToken}`;
                const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
                    ...options,
                    headers
                });
                return await retryResponse.json();
            }
        }

        return data;
    } catch (error) {
        console.error('API request error:', error);
        return { success: false, error: error.message, code: 'NETWORK_ERROR' };
    }
}

/**
 * Refresh access token
 */
async function refreshAccessToken() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
        });

        const data = await response.json();
        if (data.success) {
            accessToken = data.data.accessToken;
            localStorage.setItem('saramonda_access_token', accessToken);
            return true;
        }

        // Refresh failed, clear tokens
        clearTokens();
        return false;
    } catch (error) {
        clearTokens();
        return false;
    }
}

// ============================================
// AUTH API
// ============================================

const AuthAPI = {
    async login(email, password) {
        const result = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        if (result.success) {
            saveTokens(result.data.accessToken, result.data.refreshToken, result.data.user);
        }
        return result;
    },

    async register(email, password, name, phone) {
        const result = await apiRequest('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password, name, phone })
        });

        if (result.success) {
            saveTokens(result.data.accessToken, result.data.refreshToken, result.data.user);
        }
        return result;
    },

    async logout() {
        await apiRequest('/auth/logout', {
            method: 'POST',
            body: JSON.stringify({ refreshToken })
        });
        clearTokens();
        disconnectWebSocket();
    },

    async getMe() {
        return await apiRequest('/auth/me');
    },

    isLoggedIn() {
        return !!accessToken;
    },

    getUser() {
        return currentUser;
    }
};

// ============================================
// ORDERS API
// ============================================

const OrdersAPI = {
    async create(orderData) {
        return await apiRequest('/orders', {
            method: 'POST',
            body: JSON.stringify(orderData)
        });
    },

    async getAll(filters = {}) {
        const params = new URLSearchParams(filters);
        return await apiRequest(`/orders?${params}`);
    },

    async getById(orderId) {
        return await apiRequest(`/orders/${orderId}`);
    },

    async getKitchenOrders() {
        return await apiRequest('/orders/kitchen');
    },

    async updateStatus(orderId, status, notes = '') {
        return await apiRequest(`/orders/${orderId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status, notes })
        });
    },

    async cancel(orderId, reason = '') {
        return await apiRequest(`/orders/${orderId}/cancel`, {
            method: 'POST',
            body: JSON.stringify({ reason })
        });
    }
};

// ============================================
// PRODUCTS API
// ============================================

const ProductsAPI = {
    async getAll() {
        return await apiRequest('/products');
    },

    async getById(productId) {
        return await apiRequest(`/products/${productId}`);
    }
};

// ============================================
// CRM API
// ============================================

const CrmAPI = {
    async validateCoupon(code, orderTotal) {
        return await apiRequest('/crm/coupon/validate', {
            method: 'POST',
            body: JSON.stringify({ code, orderTotal })
        });
    },

    async getMember(memberId) {
        return await apiRequest(`/crm/members/${memberId}`);
    }
};

// ============================================
// ANALYTICS API
// ============================================

const AnalyticsAPI = {
    async getDashboard() {
        return await apiRequest('/analytics/dashboard');
    },

    async getTopProducts(limit = 10) {
        return await apiRequest(`/analytics/top-products?limit=${limit}`);
    },

    async getRevenueTrend(days = 30) {
        return await apiRequest(`/analytics/revenue-trend?days=${days}`);
    }
};

// ============================================
// WEBSOCKET FOR REAL-TIME UPDATES
// ============================================

function connectWebSocket(type = 'customer', branchId = 'branch_001') {
    if (ws && ws.readyState === WebSocket.OPEN) return;

    try {
        ws = new WebSocket(`${WS_URL}?type=${type}&branch=${branchId}`);

        ws.onopen = () => {
            console.log('🔌 WebSocket connected');
            if (wsReconnectTimeout) {
                clearTimeout(wsReconnectTimeout);
                wsReconnectTimeout = null;
            }
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                wsListeners.forEach(listener => listener(message));
            } catch (e) {
                console.error('WebSocket message parse error:', e);
            }
        };

        ws.onclose = () => {
            console.log('🔌 WebSocket disconnected');
            // Auto-reconnect after 5 seconds
            wsReconnectTimeout = setTimeout(() => {
                connectWebSocket(type, branchId);
            }, 5000);
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    } catch (error) {
        console.error('WebSocket connection error:', error);
    }
}

function disconnectWebSocket() {
    if (ws) {
        ws.close();
        ws = null;
    }
    if (wsReconnectTimeout) {
        clearTimeout(wsReconnectTimeout);
        wsReconnectTimeout = null;
    }
}

function onWebSocketMessage(callback) {
    wsListeners.add(callback);
    return () => wsListeners.delete(callback);
}

function sendWebSocketMessage(message) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
    }
}

// ============================================
// EXPORT
// ============================================

window.SaramondaAPI = {
    Auth: AuthAPI,
    Orders: OrdersAPI,
    Products: ProductsAPI,
    Crm: CrmAPI,
    Analytics: AnalyticsAPI,

    // WebSocket
    connectWebSocket,
    disconnectWebSocket,
    onWebSocketMessage,
    sendWebSocketMessage,

    // Helpers
    isLoggedIn: AuthAPI.isLoggedIn,
    getUser: AuthAPI.getUser,

    // Base URL for debugging
    API_BASE_URL,
    WS_URL
};

console.log('🍣 Saramondā API Client loaded');
