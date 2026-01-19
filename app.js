// Language Data
const translations = {
    th: {
        products: {
            'trim-a': 'ทริม A - ส่วนท้อง',
            'trim-b': 'ทริม B - ส่วนกลาง',
            'trim-c': 'ทริม C - ส่วนหาง',
            'trim-d': 'ทริม D - รวมหลายส่วน',
            'steak-premium': 'สเต็กพรีเมียม',
            'steak-classic': 'สเต็กคลาสสิก',
            'combo-family': 'ชุดครอบครัว',
            'combo-couple': 'ชุดคู่รัก',
            'arai-teishoku': 'Arai Teishoku Set'
        },
        qty: 'จำนวน',
        alertFill: 'กรุณากรอกข้อมูลให้ครบถ้วน'
    },
    en: {
        products: {
            'trim-a': 'Trim A - Belly',
            'trim-b': 'Trim B - Center',
            'trim-c': 'Trim C - Tail',
            'trim-d': 'Trim D - Mixed',
            'steak-premium': 'Premium Steak',
            'steak-classic': 'Classic Steak',
            'combo-family': 'Family Set',
            'combo-couple': 'Couple Set',
            'arai-teishoku': 'Arai Teishoku Set'
        },
        qty: 'Qty',
        alertFill: 'Please fill in all fields'
    }
};

// Product Data - Base prices (for non-size products)
const products = {
    'trim-a': { hasSize: true, prices: { '200g': 218, '500g': 545, '1kg': 1090 } },
    'trim-b': { hasSize: true, prices: { '200g': 184, '500g': 460, '1kg': 920 } },
    'trim-c': { hasSize: true, prices: { '200g': 144, '500g': 360, '1kg': 720 } },
    'trim-d': { hasSize: true, prices: { '200g': 108, '500g': 270, '1kg': 540 } },
    'steak-premium': { price: 890 },
    'steak-classic': { price: 690 },
    'combo-family': { price: 2490 },
    'combo-couple': { price: 1690 },
    'arai-teishoku': { price: 89 }
};

// Cart state - stores { productId: { size: '500g', qty: 2 } } for size items
// or { productId: qty } for regular items
let cart = {};
let selectedSizes = {}; // Store selected sizes for each product

// Current language
let currentLang = 'th';

// DOM Elements
const html = document.documentElement;
const langBtn = document.getElementById('langBtn');
const langText = document.getElementById('langText');
const cartCount = document.getElementById('cartCount');
const cartSummary = document.getElementById('cartSummary');
const totalPrice = document.getElementById('totalPrice');
const orderModal = document.getElementById('orderModal');
const successModal = document.getElementById('successModal');

// Language Switching
langBtn.addEventListener('click', () => {
    currentLang = currentLang === 'th' ? 'en' : 'th';
    langText.textContent = currentLang === 'th' ? 'EN' : 'TH';
    html.setAttribute('data-lang', currentLang);
    updateAllTexts();
});

function updateAllTexts() {
    document.querySelectorAll('[data-th][data-en]').forEach(el => {
        el.textContent = el.getAttribute(`data-${currentLang}`);
    });
    document.querySelectorAll('[data-placeholder-th][data-placeholder-en]').forEach(el => {
        el.placeholder = el.getAttribute(`data-placeholder-${currentLang}`);
    });
}

// Category Tabs
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const category = btn.dataset.category;
        document.querySelectorAll('.category-group').forEach(group => {
            group.classList.remove('active');
            if (group.dataset.category === category) {
                group.classList.add('active');
            }
        });
    });
});

// Initialize size selectors
document.querySelectorAll('.product-card.has-sizes').forEach(card => {
    const productId = card.dataset.productId;
    const sizeInputs = card.querySelectorAll('input[type="radio"]');
    const priceValue = card.querySelector('.price-value');

    // Set default selected size
    const checkedInput = card.querySelector('input[type="radio"]:checked');
    if (checkedInput) {
        selectedSizes[productId] = checkedInput.value;
    }

    // Listen for size changes
    sizeInputs.forEach(input => {
        input.addEventListener('change', () => {
            selectedSizes[productId] = input.value;
            const price = parseInt(input.dataset.price);
            priceValue.textContent = price.toLocaleString();

            // Update cart if item is in cart
            if (cart[productId]) {
                updateCartUI();
            }
        });
    });
});

// Quantity Controls
document.querySelectorAll('.product-card').forEach(card => {
    const productId = card.dataset.productId;
    const qtyValue = card.querySelector('.qty-value');
    const minusBtn = card.querySelector('.qty-btn.minus');
    const plusBtn = card.querySelector('.qty-btn.plus');
    const hasSizes = card.classList.contains('has-sizes');

    minusBtn.addEventListener('click', () => {
        if (cart[productId] && cart[productId] > 0) {
            cart[productId]--;
            if (cart[productId] === 0) delete cart[productId];
            qtyValue.textContent = cart[productId] || 0;
            updateCartUI();
        }
    });

    plusBtn.addEventListener('click', () => {
        cart[productId] = (cart[productId] || 0) + 1;
        qtyValue.textContent = cart[productId];
        updateCartUI();

        // Animation feedback
        plusBtn.style.transform = 'scale(1.15)';
        setTimeout(() => plusBtn.style.transform = '', 150);
    });
});

// Get price for a product (considering size if applicable)
function getProductPrice(productId) {
    const product = products[productId];
    if (product.hasSize) {
        const size = selectedSizes[productId] || '500g';
        return product.prices[size];
    }
    return product.price;
}

// Get size label for a product
function getSizeLabel(productId) {
    const product = products[productId];
    if (product.hasSize) {
        return selectedSizes[productId] || '500g';
    }
    return null;
}

// Update Cart UI
function updateCartUI() {
    const itemCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
    const total = Object.entries(cart).reduce((sum, [id, qty]) => {
        return sum + (getProductPrice(id) * qty);
    }, 0);

    cartCount.textContent = itemCount;
    cartCount.classList.toggle('show', itemCount > 0);

    totalPrice.textContent = total.toLocaleString();
    cartSummary.classList.toggle('show', itemCount > 0);
}

// Open Order Modal
document.getElementById('checkoutBtn').addEventListener('click', openOrderModal);
document.getElementById('cartBtn').addEventListener('click', () => {
    if (Object.keys(cart).length > 0) openOrderModal();
});

function openOrderModal() {
    const orderList = document.getElementById('orderList');
    orderList.innerHTML = '';

    let subtotal = 0;
    const t = translations[currentLang];

    Object.entries(cart).forEach(([id, qty]) => {
        const price = getProductPrice(id);
        const itemTotal = price * qty;
        subtotal += itemTotal;

        let name = t.products[id];
        const sizeLabel = getSizeLabel(id);
        if (sizeLabel) {
            name += ` (${sizeLabel})`;
        }

        orderList.innerHTML += `
            <div class="order-item">
                <div class="order-item-info">
                    <span class="order-item-name">${name}</span>
                    <span class="order-item-qty">${t.qty}: ${qty}</span>
                </div>
                <span class="order-item-price">฿${itemTotal.toLocaleString()}</span>
            </div>
        `;
    });

    document.getElementById('modalSubtotal').textContent = `฿${subtotal.toLocaleString()}`;

    // 🛵 Integrate Delivery System
    if (typeof DeliverySystem !== 'undefined') {
        DeliverySystem.currentLang = currentLang;
        DeliverySystem.updateDeliveryUI(subtotal);
        DeliverySystem.updateDeliveryDates();

        // Update time slots for tomorrow (default selection)
        const dates = DeliverySystem.getDeliveryDates();
        DeliverySystem.updateTimeSlotsUI(dates.tomorrow.dateStr);
    } else {
        // Fallback if DeliverySystem not loaded
        document.getElementById('modalTotal').textContent = `฿${subtotal.toLocaleString()}`;
    }

    orderModal.classList.add('show');
}

// Close Modal
document.getElementById('closeModal').addEventListener('click', () => {
    orderModal.classList.remove('show');
});

// Original Confirm Order - Now handled in member integration section below
/*
document.getElementById('confirmOrder').addEventListener('click', () => {
    const name = document.getElementById('customerName').value;
    const phone = document.getElementById('customerPhone').value;
    const address = document.getElementById('customerAddress').value;

    if (!name || !phone || !address) {
        alert(translations[currentLang].alertFill);
        return;
    }

    orderModal.classList.remove('show');
    setTimeout(() => {
        successModal.classList.add('show');
    }, 300);

    // Reset cart
    cart = {};
    document.querySelectorAll('.qty-value').forEach(el => el.textContent = '0');
    updateCartUI();
});
*/

// Close Success Modal
document.getElementById('closeSuccess').addEventListener('click', () => {
    successModal.classList.remove('show');
    document.getElementById('customerName').value = '';
    document.getElementById('customerPhone').value = '';
    document.getElementById('customerAddress').value = '';
});

// Close modals on overlay click
[orderModal, successModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('show');
    });
});

// Initialize
updateAllTexts();

// ============================================
// MEMBER SYSTEM INTEGRATION
// ============================================

// DOM Elements for Member System
const authModal = document.getElementById('authModal');
const accountModal = document.getElementById('accountModal');
const authTabs = document.querySelectorAll('.auth-tab');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

// Auth Modal Handlers
document.getElementById('closeAuthModal').addEventListener('click', () => {
    authModal.classList.remove('show');
});

document.getElementById('closeAccountModal').addEventListener('click', () => {
    accountModal.classList.remove('show');
});

// Close modals on overlay click
[authModal, accountModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('show');
    });
});

// Auth Tab Switching
authTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        authTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const tabName = tab.dataset.tab;
        if (tabName === 'login') {
            loginForm.classList.add('active');
            registerForm.classList.remove('active');
        } else {
            loginForm.classList.remove('active');
            registerForm.classList.add('active');
        }
    });
});

// Login Handler
document.getElementById('loginBtn').addEventListener('click', () => {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');

    if (!email || !password) {
        errorEl.textContent = currentLang === 'th' ? 'กรุณากรอกข้อมูลให้ครบ' : 'Please fill in all fields';
        return;
    }

    const result = loginMember(email, password);
    if (result.success) {
        authModal.classList.remove('show');
        errorEl.textContent = '';
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginPassword').value = '';
        updateMemberUI();
        showAccountPage();
    } else {
        errorEl.textContent = currentLang === 'th' ? result.message : result.messageEn;
    }
});

// Register Handler
document.getElementById('registerBtn').addEventListener('click', () => {
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const phone = document.getElementById('registerPhone').value;
    const password = document.getElementById('registerPassword').value;
    const errorEl = document.getElementById('registerError');

    if (!name || !email || !phone || !password) {
        errorEl.textContent = currentLang === 'th' ? 'กรุณากรอกข้อมูลให้ครบ' : 'Please fill in all fields';
        return;
    }

    const result = registerMember(name, email, phone, password);
    if (result.success) {
        authModal.classList.remove('show');
        errorEl.textContent = '';
        // Clear form
        document.getElementById('registerName').value = '';
        document.getElementById('registerEmail').value = '';
        document.getElementById('registerPhone').value = '';
        document.getElementById('registerPassword').value = '';
        updateMemberUI();
        showAccountPage();
        // Show welcome message
        alert(currentLang === 'th' ? result.message : result.messageEn);
    } else {
        errorEl.textContent = currentLang === 'th' ? result.message : result.messageEn;
    }
});

// Account Button Handler - Now handled in bottom navigation section at end of file
/*
document.querySelector('.nav-item:last-child').addEventListener('click', () => {
    if (memberState.isLoggedIn) {
        showAccountPage();
    } else {
        authModal.classList.add('show');
    }
});
*/

// Show Account Page
function showAccountPage() {
    if (!memberState.isLoggedIn || !memberState.currentUser) {
        authModal.classList.add('show');
        return;
    }

    const user = memberState.currentUser;
    const tier = MEMBER_TIERS[user.tier];

    // Update member card
    document.getElementById('memberName').textContent = user.name;
    document.getElementById('memberEmail').textContent = user.email;
    document.getElementById('memberPoints').textContent = formatPoints(user.points);

    // Update tier badge
    const tierBadge = document.getElementById('memberTierBadge');
    tierBadge.querySelector('.tier-icon').textContent = tier.icon;
    tierBadge.querySelector('.tier-name').textContent = tier.name;

    // Update member card class for styling
    const memberCard = document.getElementById('memberCard');
    memberCard.className = 'member-card ' + user.tier;

    // Update tier progress
    const nextTier = getPointsToNextTier();
    const progressFill = document.getElementById('tierProgressFill');
    const progressText = document.getElementById('tierProgressText');

    if (nextTier.tier) {
        const nextTierData = MEMBER_TIERS[nextTier.tier];
        const currentTierMin = MEMBER_TIERS[user.tier].minPoints;
        const progress = ((user.totalPoints - currentTierMin) / (nextTierData.minPoints - currentTierMin)) * 100;
        progressFill.style.width = Math.min(progress, 100) + '%';

        const progressMsg = currentLang === 'th'
            ? `อีก ${formatPoints(nextTier.points)} แต้มถึง ${nextTierData.name}`
            : `${formatPoints(nextTier.points)} more points to ${nextTierData.name}`;
        progressText.textContent = progressMsg;
    } else {
        progressFill.style.width = '100%';
        progressText.textContent = currentLang === 'th' ? 'ระดับสูงสุดแล้ว! 🎉' : 'Maximum tier reached! 🎉';
    }

    // Mark current tier in benefits list
    document.querySelectorAll('.tier-benefit-item').forEach(item => {
        item.classList.remove('current');
        if (item.classList.contains(user.tier)) {
            item.classList.add('current');
        }
    });

    // Update voucher list
    updateVoucherList();

    // Update order history
    updateOrderHistoryList();

    // Update redeem buttons
    updateRedeemButtons();

    accountModal.classList.add('show');
}

// Update Voucher List
function updateVoucherList() {
    const voucherList = document.getElementById('voucherList');
    const user = memberState.currentUser;

    if (!user || !user.savedVouchers || user.savedVouchers.length === 0) {
        voucherList.innerHTML = `<p class="empty-message" data-th="ยังไม่มีคูปอง" data-en="No vouchers yet">${currentLang === 'th' ? 'ยังไม่มีคูปอง' : 'No vouchers yet'}</p>`;
        return;
    }

    voucherList.innerHTML = user.savedVouchers.map(code => {
        const voucher = VOUCHERS[code];
        if (!voucher) return '';

        let discountText = '';
        if (voucher.type === 'fixed') {
            discountText = `฿${voucher.discount}`;
        } else if (voucher.type === 'percent') {
            discountText = `${voucher.discount}%`;
        } else {
            discountText = '🚚';
        }

        return `
            <div class="voucher-card">
                <div class="voucher-left">
                    <div class="voucher-code">${code}</div>
                    <div class="voucher-discount">${discountText}</div>
                </div>
                <div class="voucher-right">
                    <div class="voucher-desc">${currentLang === 'th' ? voucher.description : voucher.descriptionEn}</div>
                    <div class="voucher-min">${currentLang === 'th' ? `ขั้นต่ำ ฿${voucher.minOrder}` : `Min. ฿${voucher.minOrder}`}</div>
                </div>
            </div>
        `;
    }).join('');
}

// Update Order History List
function updateOrderHistoryList() {
    const historyList = document.getElementById('orderHistoryList');
    const orders = getMemberOrders();

    if (orders.length === 0) {
        historyList.innerHTML = `<p class="empty-message" data-th="ยังไม่มีประวัติการสั่งซื้อ" data-en="No order history yet">${currentLang === 'th' ? 'ยังไม่มีประวัติการสั่งซื้อ' : 'No order history yet'}</p>`;
        return;
    }

    historyList.innerHTML = orders.slice(0, 10).map(order => {
        const date = new Date(order.date);
        const dateStr = date.toLocaleDateString(currentLang === 'th' ? 'th-TH' : 'en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });

        return `
            <div class="order-history-item">
                <div class="order-history-header">
                    <span class="order-id">#${order.id}</span>
                    <span class="order-date">${dateStr}</span>
                </div>
                <div class="order-total">
                    <span class="order-amount">฿${order.total.toLocaleString()}</span>
                    <span class="order-points-earned">+${order.pointsEarned} ⭐</span>
                </div>
            </div>
        `;
    }).join('');
}

// Update Redeem Buttons
function updateRedeemButtons() {
    const user = memberState.currentUser;
    if (!user) return;

    document.querySelectorAll('.redeem-option').forEach(btn => {
        const points = parseInt(btn.dataset.points);
        btn.disabled = user.points < points;
    });
}

// Quick Action Buttons
document.getElementById('redeemPointsBtn').addEventListener('click', () => {
    document.getElementById('voucherSection').style.display = 'none';
    document.getElementById('orderHistorySection').style.display = 'none';
    document.getElementById('redeemSection').style.display = 'block';
});

document.getElementById('myVouchersBtn').addEventListener('click', () => {
    document.getElementById('redeemSection').style.display = 'none';
    document.getElementById('orderHistorySection').style.display = 'none';
    document.getElementById('voucherSection').style.display = 'block';
    updateVoucherList();
});

document.getElementById('orderHistoryBtn').addEventListener('click', () => {
    document.getElementById('voucherSection').style.display = 'none';
    document.getElementById('redeemSection').style.display = 'none';
    document.getElementById('orderHistorySection').style.display = 'block';
    updateOrderHistoryList();
});

// Redeem Points Options
document.querySelectorAll('.redeem-option').forEach(btn => {
    btn.addEventListener('click', () => {
        const points = parseInt(btn.dataset.points);
        const result = redeemPoints(points);

        if (result.success) {
            // Deduct points
            memberState.currentUser.points -= points;
            memberState.members[memberState.currentUser.email] = memberState.currentUser;
            saveMemberData();

            // Add as discount voucher
            const voucherCode = 'REDEEM' + Date.now();
            VOUCHERS[voucherCode] = {
                discount: result.discount,
                type: 'fixed',
                minOrder: 0,
                description: `ส่วนลด ฿${result.discount} จากการแลกแต้ม`,
                descriptionEn: `฿${result.discount} discount from points`
            };
            memberState.currentUser.savedVouchers.push(voucherCode);
            saveMemberData();

            // Update UI
            document.getElementById('memberPoints').textContent = formatPoints(memberState.currentUser.points);
            updateRedeemButtons();
            updateVoucherList();

            alert(currentLang === 'th'
                ? `แลก ${points} แต้มเป็นส่วนลด ฿${result.discount} สำเร็จ!`
                : `Redeemed ${points} points for ฿${result.discount} discount!`);
        } else {
            alert(currentLang === 'th' ? result.message : result.messageEn);
        }
    });
});

// Add Voucher
document.getElementById('addVoucherBtn').addEventListener('click', () => {
    const input = document.getElementById('voucherCodeInput');
    const code = input.value.toUpperCase().trim();

    if (!code) return;

    const voucher = VOUCHERS[code];
    if (!voucher) {
        alert(currentLang === 'th' ? 'โค้ดไม่ถูกต้อง' : 'Invalid voucher code');
        return;
    }

    if (memberState.currentUser.savedVouchers.includes(code)) {
        alert(currentLang === 'th' ? 'คุณมีคูปองนี้แล้ว' : 'You already have this voucher');
        return;
    }

    if (memberState.currentUser.usedVouchers.includes(code)) {
        alert(currentLang === 'th' ? 'คุณใช้คูปองนี้แล้ว' : 'You already used this voucher');
        return;
    }

    memberState.currentUser.savedVouchers.push(code);
    memberState.members[memberState.currentUser.email] = memberState.currentUser;
    saveMemberData();

    input.value = '';
    updateVoucherList();
    alert(currentLang === 'th' ? 'เพิ่มคูปองสำเร็จ!' : 'Voucher added!');
});

// Logout Handler
document.getElementById('logoutBtn').addEventListener('click', () => {
    logoutMember();
    accountModal.classList.remove('show');
    alert(currentLang === 'th' ? 'ออกจากระบบสำเร็จ' : 'Logged out successfully');
});

// Override Confirm Order to include points and send to backend API
const originalConfirmHandler = document.getElementById('confirmOrder');
originalConfirmHandler.removeEventListener('click', () => { }); // Clear existing

document.getElementById('confirmOrder').addEventListener('click', async () => {
    const name = document.getElementById('customerName').value;
    const phone = document.getElementById('customerPhone').value;
    const address = document.getElementById('customerAddress').value;

    if (!name || !phone || !address) {
        alert(translations[currentLang].alertFill);
        return;
    }

    // Calculate subtotal
    const subtotal = Object.entries(cart).reduce((sum, [id, qty]) => {
        return sum + (getProductPrice(id) * qty);
    }, 0);

    // 🛵 Validate minimum order
    if (typeof DeliverySystem !== 'undefined' && !DeliverySystem.isValidMinOrder(subtotal)) {
        alert(currentLang === 'th'
            ? `ยอดขั้นต่ำในการสั่งคือ ฿${DeliveryConfig.minOrder}`
            : `Minimum order is ฿${DeliveryConfig.minOrder}`);
        return;
    }

    // 🛵 Get delivery data
    let deliveryData = {
        orderType: 'DELIVERY',
        deliveryDate: '',
        timeSlot: 'MORNING',
        timeSlotName: '10:00 - 14:00',
        deliveryFee: 40,
        subtotal: subtotal,
        total: subtotal + 40
    };

    if (typeof getDeliveryOrderData === 'function') {
        deliveryData = getDeliveryOrderData(subtotal);
    }

    // Build order items for OrderSystem
    Object.entries(cart).forEach(([id, qty]) => {
        const sizeLabel = getSizeLabel(id);
        const price = getProductPrice(id);

        // Map frontend product IDs to backend product IDs
        const productIdMapping = {
            'trim-a': 'trim-a',
            'trim-b': 'trim-b',
            'trim-c': 'trim-c',
            'trim-d': 'trim-d',
            'karubi-don': 'karubi-don',
            'rosu-garlic-don': 'rosu-garlic-don',
            'harami-spicy-don': 'harami-spicy-don',
            'horumon-don': 'horumon-don',
            'liver-don': 'liver-don',
            'combo-family': 'combo-family',
            'combo-couple': 'combo-couple',
            'arai-teishoku': 'arai-teishoku'
        };

        const mappedId = productIdMapping[id] || id;
        const variantId = sizeLabel ? `${mappedId}_${sizeLabel}` : null;
        const productName = translations[currentLang].products[id] || id;

        // Add to OrderSystem cart
        OrderSystem.cart.set(variantId || mappedId, {
            productId: mappedId,
            variantId: variantId,
            name: productName,
            size: sizeLabel,
            price: price,
            quantity: qty
        });
    });

    // Show loading state
    const confirmBtn = document.getElementById('confirmOrder');
    const originalText = confirmBtn.textContent;
    confirmBtn.textContent = currentLang === 'th' ? 'กำลังดำเนินการ...' : 'Processing...';
    confirmBtn.disabled = true;

    try {
        // 🛵 Book the time slot
        if (typeof DeliveryQuota !== 'undefined') {
            const bookResult = DeliveryQuota.bookSlot(deliveryData.deliveryDate, deliveryData.timeSlot);
            if (!bookResult.success) {
                alert(currentLang === 'th'
                    ? `ช่วงเวลานี้เต็มแล้ว กรุณาเลือกช่วงเวลาอื่น`
                    : `This time slot is full. Please select another time.`);
                confirmBtn.textContent = originalText;
                confirmBtn.disabled = false;
                return;
            }
        }

        // Submit order through API with delivery data
        const result = await OrderSystem.submitOrder({
            name: name,
            phone: phone,
            address: address,
            // 🛵 Include delivery data
            orderType: deliveryData.orderType,
            deliveryDate: deliveryData.deliveryDate,
            timeSlot: deliveryData.timeSlot,
            timeSlotName: deliveryData.timeSlotName,
            deliveryFee: deliveryData.deliveryFee,
            subtotal: deliveryData.subtotal,
            total: deliveryData.total
        });

        if (result.success) {
            // Add points if logged in (using member system)
            let earnedPoints = 0;
            if (memberState.isLoggedIn && memberState.currentUser) {
                earnedPoints = addPoints(total);

                // Record order in member history
                const orderItems = Object.entries(cart).map(([id, qty]) => ({
                    productId: id,
                    quantity: qty,
                    price: getProductPrice(id),
                    size: getSizeLabel(id)
                }));
                recordOrder(orderItems, total, earnedPoints);
            }

            orderModal.classList.remove('show');

            // Show points earned
            if (earnedPoints > 0) {
                document.getElementById('pointsEarnedDisplay').style.display = 'flex';
                document.getElementById('earnedPointsValue').textContent = earnedPoints;
            } else {
                document.getElementById('pointsEarnedDisplay').style.display = 'none';
            }

            // Show success with order number
            setTimeout(() => {
                successModal.classList.add('show');

                // Update success modal with order info
                const successContent = successModal.querySelector('.success-content');
                if (successContent) {
                    const orderInfo = successContent.querySelector('p');
                    if (orderInfo) {
                        orderInfo.innerHTML = `
                            <div style="font-size: 1rem; color: var(--primary); margin-bottom: 10px; font-weight: 600;">
                                หมายเลขออเดอร์: #${result.orderNumber}
                            </div>
                            <div style="font-size: 0.9rem; color: var(--gray);">
                                ${currentLang === 'th'
                                ? 'ขอบคุณสำหรับการสั่งซื้อ! เราจะติดต่อกลับเพื่อยืนยันออเดอร์'
                                : 'Thank you! We will contact you to confirm your order.'}
                            </div>
                            <div style="font-size: 0.85rem; color: var(--accent); margin-top: 8px;">
                                ⏱️ ${currentLang === 'th' ? 'เวลาโดยประมาณ:' : 'Estimated time:'} ${result.estimatedTime || 15} นาที
                            </div>
                        `;
                    }
                }
            }, 300);

            // Reset cart
            cart = {};
            document.querySelectorAll('.qty-value').forEach(el => el.textContent = '0');
            updateCartUI();

            console.log('✅ Order submitted successfully:', result);

        } else {
            // Show error
            alert(currentLang === 'th'
                ? `เกิดข้อผิดพลาด: ${result.error}`
                : `Error: ${result.error}`);
        }

    } catch (error) {
        console.error('Order submission error:', error);
        alert(currentLang === 'th'
            ? 'ไม่สามารถส่งออเดอร์ได้ กรุณาลองใหม่อีกครั้ง'
            : 'Could not submit order. Please try again.');
    } finally {
        // Restore button state
        confirmBtn.textContent = originalText;
        confirmBtn.disabled = false;
    }
});

// Update member UI on load
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        updateMemberUI();
    }, 100);
});

// ============================================
// SEARCH FUNCTIONALITY
// ============================================

// Product search data
const searchableProducts = [
    { id: 'trim-a', name: 'ทริม A - ส่วนท้อง', nameEn: 'Trim A - Belly', category: 'sashimi', categoryTh: 'ซาชิมิ', price: 545, image: 'images/trim-a.png', keywords: ['ท้อง', 'belly', 'ไขมัน', 'นุ่ม', 'อร่อย', 'trim a'] },
    { id: 'trim-b', name: 'ทริม B - ส่วนกลาง', nameEn: 'Trim B - Center', category: 'sashimi', categoryTh: 'ซาชิมิ', price: 460, image: 'images/trim-b.png', keywords: ['กลาง', 'center', 'แน่น', 'trim b'] },
    { id: 'trim-c', name: 'ทริม C - ส่วนหาง', nameEn: 'Trim C - Tail', category: 'sashimi', categoryTh: 'ซาชิมิ', price: 360, image: 'images/trim-c.png', keywords: ['หาง', 'tail', 'แน่น', 'ย่าง', 'trim c'] },
    { id: 'trim-d', name: 'ทริม D - รวมหลายส่วน', nameEn: 'Trim D - Mixed', category: 'sashimi', categoryTh: 'ซาชิมิ', price: 270, image: 'images/trim-d.png', keywords: ['รวม', 'mixed', 'คุ้ม', 'ทำอาหาร', 'trim d'] },
    { id: 'steak-premium', name: 'สเต็กพรีเมียม', nameEn: 'Premium Steak', category: 'steak', categoryTh: 'สเต็ก', price: 890, image: 'images/steak-premium.png', keywords: ['premium', 'พรีเมียม', 'หนา', 'ย่าง', 'อบ'] },
    { id: 'steak-classic', name: 'สเต็กคลาสสิก', nameEn: 'Classic Steak', category: 'steak', categoryTh: 'สเต็ก', price: 690, image: 'images/steak-classic.png', keywords: ['classic', 'คลาสสิก', 'ทอด', 'ง่าย'] },
    { id: 'combo-family', name: 'ชุดครอบครัว', nameEn: 'Family Set', category: 'combo', categoryTh: 'ชุดเซ็ต', price: 2490, image: 'images/combo-family.png', keywords: ['family', 'ครอบครัว', 'ใหญ่', 'คุ้ม', '4-6', 'set'] },
    { id: 'combo-couple', name: 'ชุดคู่รัก', nameEn: 'Couple Set', category: 'combo', categoryTh: 'ชุดเซ็ต', price: 1690, image: 'images/combo-couple.png', keywords: ['couple', 'คู่', 'รัก', '2', 'set'] },
    { id: 'arai-teishoku', name: 'Arai Teishoku Set', nameEn: 'Arai Teishoku Set', category: 'combo', categoryTh: 'ชุดเซ็ต', price: 89, image: 'images/arai-teishoku.png', keywords: ['arai', 'teishoku', 'ดงบุริ', 'ข้าว', 'ซุป'] }
];

// DOM elements for search
const searchModal = document.getElementById('searchModal');
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const filterChips = document.querySelectorAll('.filter-chip');

let currentFilter = 'all';

// Open search modal
document.getElementById('navSearch').addEventListener('click', () => {
    searchModal.classList.add('show');
    setTimeout(() => searchInput.focus(), 300);
    showAllProducts();
    updateNavActive('navSearch');
});

// Close search modal
document.getElementById('closeSearchModal').addEventListener('click', () => {
    searchModal.classList.remove('show');
    updateNavActive('navHome');
});

searchModal.addEventListener('click', (e) => {
    if (e.target === searchModal) {
        searchModal.classList.remove('show');
        updateNavActive('navHome');
    }
});

// Search input handler
searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    clearSearchBtn.classList.toggle('show', query.length > 0);
    performSearch(query);
});

// Clear search
clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearSearchBtn.classList.remove('show');
    showAllProducts();
    searchInput.focus();
});

// Filter chips handler
filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
        filterChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        currentFilter = chip.dataset.filter;
        performSearch(searchInput.value.trim());
    });
});

// Perform search
function performSearch(query) {
    let results = searchableProducts;

    // Filter by category
    if (currentFilter !== 'all') {
        results = results.filter(p => p.category === currentFilter);
    }

    // Filter by query
    if (query) {
        const lowerQuery = query.toLowerCase();
        results = results.filter(p => {
            return p.name.toLowerCase().includes(lowerQuery) ||
                p.nameEn.toLowerCase().includes(lowerQuery) ||
                p.keywords.some(k => k.toLowerCase().includes(lowerQuery));
        });
    }

    renderSearchResults(results);
}

// Show all products
function showAllProducts() {
    let results = searchableProducts;
    if (currentFilter !== 'all') {
        results = results.filter(p => p.category === currentFilter);
    }
    renderSearchResults(results);
}

// Render search results
function renderSearchResults(results) {
    if (results.length === 0) {
        searchResults.innerHTML = `
            <div class="no-results">
                <div class="no-results-icon">🔍</div>
                <p data-th="ไม่พบสินค้าที่ค้นหา" data-en="No products found">${currentLang === 'th' ? 'ไม่พบสินค้าที่ค้นหา' : 'No products found'}</p>
            </div>
        `;
        return;
    }

    searchResults.innerHTML = results.map(product => `
        <div class="search-result-item" data-product-id="${product.id}">
            <div class="result-image">
                <img src="${product.image}" alt="${currentLang === 'th' ? product.name : product.nameEn}" loading="lazy">
            </div>
            <div class="result-info">
                <div class="result-name">${currentLang === 'th' ? product.name : product.nameEn}</div>
                <div class="result-category">${currentLang === 'th' ? product.categoryTh : product.category}</div>
            </div>
            <div class="result-price">฿${product.price.toLocaleString()}</div>
        </div>
    `).join('');

    // Add click handlers to results
    document.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
            const productId = item.dataset.productId;
            goToProduct(productId);
        });
    });
}

// Go to product
function goToProduct(productId) {
    searchModal.classList.remove('show');

    // Determine category
    let category = 'sashimi';
    if (productId.includes('steak')) category = 'steak';
    else if (productId.includes('combo') || productId === 'arai-teishoku') category = 'combo';

    // Switch to correct category tab
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.category === category) {
            btn.classList.add('active');
        }
    });

    document.querySelectorAll('.category-group').forEach(group => {
        group.classList.remove('active');
        if (group.dataset.category === category) {
            group.classList.add('active');
        }
    });

    // Scroll to product
    setTimeout(() => {
        const productCard = document.querySelector(`[data-product-id="${productId}"]`);
        if (productCard) {
            productCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Highlight effect
            productCard.style.boxShadow = '0 0 0 3px var(--accent)';
            setTimeout(() => {
                productCard.style.boxShadow = '';
            }, 2000);
        }
    }, 300);

    updateNavActive('navHome');
}

// ============================================
// ORDER HISTORY FUNCTIONALITY
// ============================================

const historyModal = document.getElementById('historyModal');

// Open history modal
document.getElementById('navHistory').addEventListener('click', () => {
    showOrderHistory();
    updateNavActive('navHistory');
});

// Close history modal
document.getElementById('closeHistoryModal').addEventListener('click', () => {
    historyModal.classList.remove('show');
    updateNavActive('navHome');
});

historyModal.addEventListener('click', (e) => {
    if (e.target === historyModal) {
        historyModal.classList.remove('show');
        updateNavActive('navHome');
    }
});

// Show order history
function showOrderHistory() {
    const historyList = document.getElementById('historyList');
    const emptyHistory = document.getElementById('emptyHistory');

    // Get orders (from member system if logged in, or local storage)
    let orders = [];
    if (memberState.isLoggedIn && memberState.currentUser) {
        orders = getMemberOrders();
    } else {
        // Try to get orders from localStorage for non-logged-in users
        const savedOrders = localStorage.getItem('saramonda_guest_orders');
        if (savedOrders) {
            orders = JSON.parse(savedOrders);
        }
    }

    // Update stats
    const totalOrders = orders.length;
    const totalSpent = orders.reduce((sum, o) => sum + o.total, 0);
    const totalPoints = orders.reduce((sum, o) => sum + (o.pointsEarned || 0), 0);

    document.getElementById('totalOrdersCount').textContent = totalOrders;
    document.getElementById('totalSpentAmount').textContent = `฿${totalSpent.toLocaleString()}`;
    document.getElementById('totalPointsEarned').textContent = totalPoints;

    if (orders.length === 0) {
        historyList.innerHTML = '';
        historyList.appendChild(emptyHistory);
        emptyHistory.style.display = 'block';
    } else {
        emptyHistory.style.display = 'none';
        historyList.innerHTML = orders.map(order => {
            const date = new Date(order.date);
            const dateStr = date.toLocaleDateString(currentLang === 'th' ? 'th-TH' : 'en-US', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            // Build items list
            const itemsHtml = order.items ? order.items.map(item => {
                const productName = translations[currentLang].products[item.productId] || item.productId;
                const sizeStr = item.size ? ` (${item.size})` : '';
                return `
                    <div class="history-item-row">
                        <span>${productName}${sizeStr} x${item.quantity}</span>
                        <span>฿${(item.price * item.quantity).toLocaleString()}</span>
                    </div>
                `;
            }).join('') : '<div class="history-item-row"><span>-</span></div>';

            return `
                <div class="history-order-item">
                    <div class="history-order-header">
                        <span class="history-order-id">#${order.id}</span>
                        <span class="history-order-date">${dateStr}</span>
                    </div>
                    <div class="history-order-body">
                        <div class="history-order-items">
                            ${itemsHtml}
                        </div>
                        <div class="history-order-footer">
                            <span class="history-order-total">฿${order.total.toLocaleString()}</span>
                            ${order.pointsEarned ? `<span class="history-order-points">+${order.pointsEarned} ⭐</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    historyModal.classList.add('show');
}

// ============================================
// BOTTOM NAVIGATION HANDLERS
// ============================================

// Home button
document.getElementById('navHome').addEventListener('click', () => {
    // Close all modals
    searchModal.classList.remove('show');
    historyModal.classList.remove('show');
    accountModal.classList.remove('show');
    authModal.classList.remove('show');

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    updateNavActive('navHome');
});

// Account button (update existing handler to use ID)
document.getElementById('navAccount').addEventListener('click', () => {
    if (memberState.isLoggedIn) {
        showAccountPage();
    } else {
        authModal.classList.add('show');
    }
    updateNavActive('navAccount');
});

// Update active nav item
function updateNavActive(activeId) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.getElementById(activeId).classList.add('active');
}
