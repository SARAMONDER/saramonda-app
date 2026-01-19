/**
 * LIFF (LINE Front-end Framework) Integration
 * Handles LINE Login and user profile management
 * 
 * @requires LIFF SDK - Include in HTML: <script src="https://static.line-scdn.net/liff/edge/2/sdk.js"></script>
 */

// LIFF Configuration
const LIFF_CONFIG = {
    liffId: '', // Will be set from .env or config
    lineOaId: '@096lomsu',
    addFriendUrl: 'https://line.me/R/ti/p/@096lomsu'
};

// User state
let currentUser = null;
let isLiffInitialized = false;

/**
 * Initialize LIFF SDK
 * @param {string} liffId - LIFF App ID from LINE Developers Console
 */
async function initializeLiff(liffId) {
    if (!liffId) {
        console.error('LIFF ID is required');
        return false;
    }

    LIFF_CONFIG.liffId = liffId;

    try {
        await liff.init({ liffId: liffId });
        isLiffInitialized = true;
        console.log('✅ LIFF initialized successfully');

        // Check if already logged in
        if (liff.isLoggedIn()) {
            await loadUserProfile();
        }

        return true;
    } catch (error) {
        console.error('❌ LIFF initialization failed:', error);
        return false;
    }
}

/**
 * Login with LINE
 * Redirects to LINE login if not logged in
 */
function loginWithLine() {
    if (!isLiffInitialized) {
        console.error('LIFF not initialized');
        return;
    }

    if (!liff.isLoggedIn()) {
        // Save current URL to redirect back after login
        const redirectUri = window.location.href;
        liff.login({ redirectUri });
    } else {
        loadUserProfile();
    }
}

/**
 * Logout from LINE
 */
function logoutFromLine() {
    if (!isLiffInitialized || !liff.isLoggedIn()) {
        return;
    }

    liff.logout();
    currentUser = null;
    localStorage.removeItem('saramonda_user');

    // Reload page to reset state
    window.location.reload();
}

/**
 * Load user profile from LINE
 */
async function loadUserProfile() {
    if (!liff.isLoggedIn()) {
        return null;
    }

    try {
        const profile = await liff.getProfile();

        currentUser = {
            lineUserId: profile.userId,
            displayName: profile.displayName,
            pictureUrl: profile.pictureUrl || '',
            statusMessage: profile.statusMessage || '',
            accessToken: liff.getAccessToken(),
            isInClient: liff.isInClient(),
            os: liff.getOS(),
            language: liff.getLanguage()
        };

        // Save to localStorage for persistence
        localStorage.setItem('saramonda_user', JSON.stringify(currentUser));

        // Sync with backend
        await syncUserWithBackend(currentUser);

        console.log('✅ User profile loaded:', currentUser.displayName);

        // Dispatch event for UI updates
        window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: currentUser }));

        return currentUser;
    } catch (error) {
        console.error('❌ Failed to load user profile:', error);
        return null;
    }
}

/**
 * Sync user data with backend
 * @param {Object} user - User profile data
 */
async function syncUserWithBackend(user) {
    try {
        const response = await fetch('/api/v1/customers/sync', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${user.accessToken}`
            },
            body: JSON.stringify({
                lineUserId: user.lineUserId,
                displayName: user.displayName,
                pictureUrl: user.pictureUrl
            })
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✅ User synced with backend');

            // Merge backend data with local user
            if (data.data) {
                currentUser = { ...currentUser, ...data.data };
                localStorage.setItem('saramonda_user', JSON.stringify(currentUser));
            }
        }
    } catch (error) {
        console.error('Failed to sync with backend:', error);
        // Continue anyway - offline support
    }
}

/**
 * Get current logged in user
 * @returns {Object|null} Current user or null
 */
function getCurrentUser() {
    if (currentUser) {
        return currentUser;
    }

    // Try to load from localStorage
    const saved = localStorage.getItem('saramonda_user');
    if (saved) {
        currentUser = JSON.parse(saved);
        return currentUser;
    }

    return null;
}

/**
 * Check if user is logged in
 * @returns {boolean}
 */
function isLoggedIn() {
    if (isLiffInitialized && liff.isLoggedIn()) {
        return true;
    }

    return !!getCurrentUser();
}

/**
 * Check if user has added LINE OA as friend
 * @returns {Promise<boolean>}
 */
async function isFriend() {
    if (!isLiffInitialized || !liff.isLoggedIn()) {
        return false;
    }

    try {
        const friendship = await liff.getFriendship();
        return friendship.friendFlag;
    } catch (error) {
        console.error('Failed to check friendship:', error);
        return false;
    }
}

/**
 * Open LINE OA add friend page
 */
function addLineOa() {
    window.open(LIFF_CONFIG.addFriendUrl, '_blank');
}

/**
 * Show popup to invite user to add LINE OA
 * Call this after order success
 */
function showAddLineOaPopup() {
    // Check if already friends
    isFriend().then(isFriendFlag => {
        if (isFriendFlag) {
            console.log('User is already a friend');
            return;
        }

        // Create popup
        const popup = document.createElement('div');
        popup.id = 'add-line-popup';
        popup.className = 'line-popup-overlay';
        popup.innerHTML = `
            <div class="line-popup-content">
                <div class="line-popup-icon">
                    <svg viewBox="0 0 24 24" width="60" height="60" fill="#06C755">
                        <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                    </svg>
                </div>
                <h3 class="line-popup-title">เพิ่มเพื่อน Saramondā</h3>
                <p class="line-popup-text">
                    รับแจ้งเตือนสถานะออเดอร์<br>
                    และโปรโมชั่นพิเศษ
                </p>
                <button class="line-popup-btn line-popup-btn-primary" onclick="addLineOaAndClose()">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="white" style="margin-right: 8px;">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
                    </svg>
                    เพิ่มเพื่อน LINE OA
                </button>
                <button class="line-popup-btn line-popup-btn-secondary" onclick="closeAddLinePopup()">
                    ไว้ทีหลัง
                </button>
            </div>
        `;

        document.body.appendChild(popup);

        // Add styles if not exist
        if (!document.getElementById('line-popup-styles')) {
            const styles = document.createElement('style');
            styles.id = 'line-popup-styles';
            styles.textContent = `
                .line-popup-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.7);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                    animation: fadeIn 0.3s ease;
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .line-popup-content {
                    background: white;
                    border-radius: 20px;
                    padding: 32px 24px;
                    text-align: center;
                    max-width: 320px;
                    width: 90%;
                    animation: slideUp 0.3s ease;
                }
                @keyframes slideUp {
                    from { transform: translateY(50px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .line-popup-icon {
                    margin-bottom: 16px;
                }
                .line-popup-title {
                    font-size: 20px;
                    font-weight: 700;
                    color: #1a1a1a;
                    margin: 0 0 8px 0;
                }
                .line-popup-text {
                    font-size: 14px;
                    color: #666;
                    margin: 0 0 24px 0;
                    line-height: 1.5;
                }
                .line-popup-btn {
                    width: 100%;
                    padding: 14px 20px;
                    border: none;
                    border-radius: 12px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 10px;
                    transition: transform 0.2s, opacity 0.2s;
                }
                .line-popup-btn:hover {
                    transform: scale(1.02);
                }
                .line-popup-btn:active {
                    transform: scale(0.98);
                }
                .line-popup-btn-primary {
                    background: #06C755;
                    color: white;
                }
                .line-popup-btn-secondary {
                    background: #f5f5f5;
                    color: #666;
                }
            `;
            document.head.appendChild(styles);
        }
    });
}

/**
 * Add LINE OA and close popup
 */
function addLineOaAndClose() {
    addLineOa();
    closeAddLinePopup();
}

/**
 * Close add LINE popup
 */
function closeAddLinePopup() {
    const popup = document.getElementById('add-line-popup');
    if (popup) {
        popup.remove();
    }
}

/**
 * Update user info (phone, address)
 * @param {Object} data - User data to update
 */
async function updateUserInfo(data) {
    const user = getCurrentUser();
    if (!user) {
        console.error('No user logged in');
        return null;
    }

    try {
        const response = await fetch('/api/v1/customers/update', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${user.accessToken}`
            },
            body: JSON.stringify({
                lineUserId: user.lineUserId,
                ...data
            })
        });

        if (response.ok) {
            const result = await response.json();
            // Update local user data
            currentUser = { ...currentUser, ...data };
            localStorage.setItem('saramonda_user', JSON.stringify(currentUser));

            console.log('✅ User info updated');
            return result;
        }
    } catch (error) {
        console.error('Failed to update user info:', error);
    }

    return null;
}

/**
 * Create login button HTML
 * @returns {string} HTML string for login button
 */
function createLoginButtonHtml() {
    return `
        <button class="line-login-btn" onclick="loginWithLine()">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="white">
                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
            </svg>
            <span>Login with LINE</span>
        </button>
        <style>
            .line-login-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
                background: #06C755;
                color: white;
                border: none;
                border-radius: 12px;
                padding: 14px 32px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: transform 0.2s, box-shadow 0.2s;
                box-shadow: 0 4px 15px rgba(6, 199, 85, 0.3);
            }
            .line-login-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(6, 199, 85, 0.4);
            }
            .line-login-btn:active {
                transform: translateY(0);
            }
        </style>
    `;
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeLiff,
        loginWithLine,
        logoutFromLine,
        getCurrentUser,
        isLoggedIn,
        isFriend,
        addLineOa,
        showAddLineOaPopup,
        updateUserInfo,
        createLoginButtonHtml,
        LIFF_CONFIG
    };
}
