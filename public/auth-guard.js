/**
 * Auth Guard - Saramondā Protected Pages
 * Protects Admin, Kitchen, and other staff pages
 */

(function () {
    'use strict';

    const AUTH_CONFIG = {
        loginPage: 'login.html',
        storageKeys: {
            accessToken: 'saramonda_access_token',
            refreshToken: 'saramonda_refresh_token',
            user: 'saramonda_user'
        },
        roles: {
            admin: ['admin', 'manager'],
            kitchen: ['kitchen', 'admin', 'manager', 'staff'],
            staff: ['staff', 'admin', 'manager', 'kitchen'],
            pos: ['staff', 'admin', 'manager', 'kitchen']
        }
    };

    /**
     * Get current user from localStorage
     */
    function getCurrentUser() {
        try {
            const userJson = localStorage.getItem(AUTH_CONFIG.storageKeys.user);
            return userJson ? JSON.parse(userJson) : null;
        } catch (e) {
            console.error('Error parsing user data:', e);
            return null;
        }
    }

    /**
     * Get access token
     */
    function getAccessToken() {
        return localStorage.getItem(AUTH_CONFIG.storageKeys.accessToken);
    }

    /**
     * Check if user is authenticated
     */
    function isAuthenticated() {
        return !!(getAccessToken() && getCurrentUser());
    }

    /**
     * Check if user has required role
     */
    function hasRole(requiredRoles) {
        const user = getCurrentUser();
        if (!user || !user.role) return false;
        return requiredRoles.includes(user.role);
    }

    /**
     * Redirect to login page
     */
    function redirectToLogin(message = '') {
        const currentPage = encodeURIComponent(window.location.href);
        const loginUrl = AUTH_CONFIG.loginPage + (message ? `?message=${encodeURIComponent(message)}&returnUrl=${currentPage}` : `?returnUrl=${currentPage}`);
        window.location.href = loginUrl;
    }

    /**
     * Show access denied message and redirect
     */
    function showAccessDenied(requiredRoles) {
        const user = getCurrentUser();
        const userRole = user ? user.role : 'guest';

        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'auth-guard-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(26, 26, 46, 0.98);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            font-family: 'Noto Sans Thai', sans-serif;
        `;

        overlay.innerHTML = `
            <div style="
                text-align: center;
                color: white;
                padding: 40px;
                max-width: 400px;
            ">
                <div style="font-size: 4rem; margin-bottom: 20px;">🔒</div>
                <h2 style="margin-bottom: 15px; font-size: 1.5rem;">
                    ไม่มีสิทธิ์เข้าถึง
                </h2>
                <p style="color: #94a3b8; margin-bottom: 30px; font-size: 0.95rem;">
                    หน้านี้ต้องการสิทธิ์ที่สูงกว่า<br>
                    Role ปัจจุบัน: <strong>${userRole}</strong><br>
                    ต้องการ: <strong>${requiredRoles.join(' หรือ ')}</strong>
                </p>
                <div style="display: flex; gap: 15px; justify-content: center;">
                    <button onclick="window.location.href='login.html'" style="
                        background: linear-gradient(135deg, #FF6B35, #F7931E);
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 8px;
                        font-size: 1rem;
                        cursor: pointer;
                        font-family: inherit;
                    ">เข้าสู่ระบบใหม่</button>
                    <button onclick="window.location.href='index.html'" style="
                        background: rgba(255,255,255,0.1);
                        color: white;
                        border: 1px solid rgba(255,255,255,0.2);
                        padding: 12px 24px;
                        border-radius: 8px;
                        font-size: 1rem;
                        cursor: pointer;
                        font-family: inherit;
                    ">กลับหน้าหลัก</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
    }

    /**
     * Protect page with role check
     */
    function protectPage(requiredRoles) {
        // Check authentication first
        if (!isAuthenticated()) {
            redirectToLogin('กรุณาเข้าสู่ระบบก่อน');
            return false;
        }

        // Then check role
        if (!hasRole(requiredRoles)) {
            showAccessDenied(requiredRoles);
            return false;
        }

        return true;
    }

    /**
     * Logout and redirect
     */
    function logout() {
        localStorage.removeItem(AUTH_CONFIG.storageKeys.accessToken);
        localStorage.removeItem(AUTH_CONFIG.storageKeys.refreshToken);
        localStorage.removeItem(AUTH_CONFIG.storageKeys.user);
        window.location.href = AUTH_CONFIG.loginPage;
    }

    // Export to global
    window.AuthGuard = {
        getCurrentUser,
        getAccessToken,
        isAuthenticated,
        hasRole,
        redirectToLogin,
        protectPage,
        logout,
        roles: AUTH_CONFIG.roles
    };

    console.log('🔐 Auth Guard loaded');
})();
