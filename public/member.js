// ============================================
// MEMBER SYSTEM - Saramondā Premium Salmon
// ============================================

// Member Tiers Configuration
const MEMBER_TIERS = {
    bronze: { name: 'Bronze', nameTh: 'บรอนซ์', minPoints: 0, pointMultiplier: 1, color: '#cd7f32', icon: '🥉' },
    silver: { name: 'Silver', nameTh: 'ซิลเวอร์', minPoints: 1000, pointMultiplier: 1.5, color: '#c0c0c0', icon: '🥈' },
    gold: { name: 'Gold', nameTh: 'โกลด์', minPoints: 5000, pointMultiplier: 2, color: '#ffd700', icon: '🥇' },
    platinum: { name: 'Platinum', nameTh: 'แพลทินัม', minPoints: 15000, pointMultiplier: 3, color: '#e5e4e2', icon: '💎' }
};

// Points Configuration
const POINTS_CONFIG = {
    pointsPerBaht: 0.01, // 1 point per 100 Baht
    pointValue: 1, // 1 point = 1 Baht discount
    minRedeemPoints: 100
};

// Sample Vouchers (in production, this would come from a server)
const VOUCHERS = {
    'WELCOME100': { discount: 100, type: 'fixed', minOrder: 500, usageLimit: 1, description: 'ลด ฿100 สำหรับสมาชิกใหม่', descriptionEn: '฿100 off for new members' },
    'SALMON20': { discount: 20, type: 'percent', minOrder: 1000, maxDiscount: 500, description: 'ลด 20% สูงสุด ฿500', descriptionEn: '20% off, max ฿500' },
    'FREESHIP': { discount: 0, type: 'shipping', minOrder: 0, description: 'ส่งฟรีทุกออเดอร์', descriptionEn: 'Free shipping' },
    'VIP50': { discount: 50, type: 'fixed', minOrder: 300, description: 'ส่วนลด VIP ฿50', descriptionEn: 'VIP ฿50 discount' }
};

// Member State
let memberState = {
    isLoggedIn: false,
    currentUser: null,
    members: {},
    orderHistory: []
};

// Load member data from localStorage
function loadMemberData() {
    const savedData = localStorage.getItem('saramonda_members');
    if (savedData) {
        const parsed = JSON.parse(savedData);
        memberState.members = parsed.members || {};
        memberState.orderHistory = parsed.orderHistory || [];
    }

    const currentSession = localStorage.getItem('saramonda_session');
    if (currentSession) {
        const session = JSON.parse(currentSession);
        if (memberState.members[session.email]) {
            memberState.isLoggedIn = true;
            memberState.currentUser = memberState.members[session.email];
        }
    }

    updateMemberUI();
}

// Save member data to localStorage
function saveMemberData() {
    localStorage.setItem('saramonda_members', JSON.stringify({
        members: memberState.members,
        orderHistory: memberState.orderHistory
    }));
}

// Register new member
function registerMember(name, email, phone, password) {
    if (memberState.members[email]) {
        return { success: false, message: 'อีเมลนี้ถูกใช้งานแล้ว', messageEn: 'Email already registered' };
    }

    const newMember = {
        id: 'M' + Date.now(),
        name: name,
        email: email,
        phone: phone,
        password: password, // In production, hash this!
        points: 100, // Welcome bonus
        totalPoints: 100,
        tier: 'bronze',
        joinDate: new Date().toISOString(),
        usedVouchers: [],
        savedVouchers: ['WELCOME100']
    };

    memberState.members[email] = newMember;
    memberState.currentUser = newMember;
    memberState.isLoggedIn = true;

    // Save session
    localStorage.setItem('saramonda_session', JSON.stringify({ email: email }));
    saveMemberData();

    return { success: true, message: 'สมัครสมาชิกสำเร็จ! รับ 100 แต้มต้อนรับ', messageEn: 'Registration successful! 100 welcome points added' };
}

// Login member
function loginMember(email, password) {
    const member = memberState.members[email];
    if (!member) {
        return { success: false, message: 'ไม่พบอีเมลนี้ในระบบ', messageEn: 'Email not found' };
    }

    if (member.password !== password) {
        return { success: false, message: 'รหัสผ่านไม่ถูกต้อง', messageEn: 'Incorrect password' };
    }

    memberState.currentUser = member;
    memberState.isLoggedIn = true;
    localStorage.setItem('saramonda_session', JSON.stringify({ email: email }));

    return { success: true, message: 'เข้าสู่ระบบสำเร็จ', messageEn: 'Login successful' };
}

// Logout member
function logoutMember() {
    memberState.isLoggedIn = false;
    memberState.currentUser = null;
    localStorage.removeItem('saramonda_session');
    updateMemberUI();
}

// Calculate member tier
function calculateTier(totalPoints) {
    if (totalPoints >= MEMBER_TIERS.platinum.minPoints) return 'platinum';
    if (totalPoints >= MEMBER_TIERS.gold.minPoints) return 'gold';
    if (totalPoints >= MEMBER_TIERS.silver.minPoints) return 'silver';
    return 'bronze';
}

// Add points after purchase
function addPoints(orderTotal) {
    if (!memberState.isLoggedIn || !memberState.currentUser) return 0;

    const tier = MEMBER_TIERS[memberState.currentUser.tier];
    const basePoints = Math.floor(orderTotal * POINTS_CONFIG.pointsPerBaht);
    const earnedPoints = Math.floor(basePoints * tier.pointMultiplier);

    memberState.currentUser.points += earnedPoints;
    memberState.currentUser.totalPoints += earnedPoints;
    memberState.currentUser.tier = calculateTier(memberState.currentUser.totalPoints);

    // Update in members object
    memberState.members[memberState.currentUser.email] = memberState.currentUser;
    saveMemberData();

    return earnedPoints;
}

// Redeem points
function redeemPoints(points) {
    if (!memberState.isLoggedIn || !memberState.currentUser) {
        return { success: false, discount: 0 };
    }

    if (points < POINTS_CONFIG.minRedeemPoints) {
        return { success: false, message: `ต้องใช้ขั้นต่ำ ${POINTS_CONFIG.minRedeemPoints} แต้ม` };
    }

    if (memberState.currentUser.points < points) {
        return { success: false, message: 'แต้มไม่เพียงพอ' };
    }

    const discount = points * POINTS_CONFIG.pointValue;
    return { success: true, discount: discount, points: points };
}

// Apply voucher
function applyVoucher(code, orderTotal) {
    const voucher = VOUCHERS[code.toUpperCase()];

    if (!voucher) {
        return { success: false, message: 'โค้ดไม่ถูกต้อง', messageEn: 'Invalid voucher code' };
    }

    if (orderTotal < voucher.minOrder) {
        return { success: false, message: `ยอดขั้นต่ำ ฿${voucher.minOrder}`, messageEn: `Minimum order ฿${voucher.minOrder}` };
    }

    // Check if voucher already used
    if (memberState.isLoggedIn && memberState.currentUser) {
        if (memberState.currentUser.usedVouchers.includes(code.toUpperCase())) {
            return { success: false, message: 'โค้ดนี้ถูกใช้แล้ว', messageEn: 'Voucher already used' };
        }
    }

    let discount = 0;
    if (voucher.type === 'fixed') {
        discount = voucher.discount;
    } else if (voucher.type === 'percent') {
        discount = Math.floor(orderTotal * voucher.discount / 100);
        if (voucher.maxDiscount) {
            discount = Math.min(discount, voucher.maxDiscount);
        }
    }

    return {
        success: true,
        discount: discount,
        code: code.toUpperCase(),
        description: voucher.description
    };
}

// Record order
function recordOrder(orderDetails, total, earnedPoints) {
    const order = {
        id: 'ORD' + Date.now(),
        date: new Date().toISOString(),
        items: orderDetails,
        total: total,
        pointsEarned: earnedPoints,
        memberEmail: memberState.currentUser?.email || null
    };

    memberState.orderHistory.unshift(order);
    saveMemberData();

    return order;
}

// Get member orders
function getMemberOrders() {
    if (!memberState.isLoggedIn || !memberState.currentUser) return [];
    return memberState.orderHistory.filter(o => o.memberEmail === memberState.currentUser.email);
}

// Update UI based on member state
function updateMemberUI() {
    const accountBtn = document.querySelector('.nav-item:last-child');
    const accountBtnLabel = accountBtn?.querySelector('span');

    if (memberState.isLoggedIn && memberState.currentUser) {
        if (accountBtnLabel) {
            accountBtnLabel.setAttribute('data-th', 'บัญชี');
            accountBtnLabel.setAttribute('data-en', 'Account');
        }
        // Add member indicator
        if (!accountBtn?.querySelector('.member-indicator')) {
            const indicator = document.createElement('span');
            indicator.className = 'member-indicator';
            indicator.textContent = MEMBER_TIERS[memberState.currentUser.tier].icon;
            accountBtn?.appendChild(indicator);
        }
    } else {
        const indicator = accountBtn?.querySelector('.member-indicator');
        if (indicator) indicator.remove();
    }
}

// Format points display
function formatPoints(points) {
    return points.toLocaleString();
}

// Get points to next tier
function getPointsToNextTier() {
    if (!memberState.currentUser) return null;

    const currentTotal = memberState.currentUser.totalPoints;
    const currentTier = memberState.currentUser.tier;

    if (currentTier === 'platinum') return { tier: null, points: 0 };

    const tiers = ['bronze', 'silver', 'gold', 'platinum'];
    const currentIndex = tiers.indexOf(currentTier);
    const nextTier = tiers[currentIndex + 1];
    const pointsNeeded = MEMBER_TIERS[nextTier].minPoints - currentTotal;

    return { tier: nextTier, points: pointsNeeded };
}

// Initialize member system
document.addEventListener('DOMContentLoaded', () => {
    loadMemberData();
});
