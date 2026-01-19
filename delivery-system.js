/**
 * 🛵 SARAMONDĀ DELIVERY SYSTEM
 * ============================
 * Handles delivery configuration, fee calculation, time slots, and quota management
 */

// ============================================
// DELIVERY CONFIGURATION
// ============================================

const DeliveryConfig = {
    minOrder: 199,           // ยอดขั้นต่ำ (บาท)
    freeDeliveryAbove: 349,  // ส่งฟรีเมื่อยอดถึง (บาท)
    deliveryFee: 40,         // ค่าจัดส่งปกติ (บาท)
    maxOrdersPerDay: 15,     // รับออเดอร์สูงสุด/วัน
    cutoffTime: '14:00',     // ปิดรับออเดอร์วันถัดไป
    leadDays: 1,             // สั่งล่วงหน้ากี่วัน
    isActive: true           // เปิด/ปิดระบบ Delivery
};

const TimeSlots = [
    {
        id: 'MORNING',
        name: '10:00 - 14:00',
        startTime: '10:00',
        endTime: '14:00',
        maxOrders: 8,
        isActive: true
    },
    {
        id: 'EVENING',
        name: '16:00 - 20:00',
        startTime: '16:00',
        endTime: '20:00',
        maxOrders: 7,
        isActive: true
    }
];

const RiderTypes = [
    { id: 'SELF', name: 'ส่งเอง', icon: '🏍️' },
    { id: 'GRAB', name: 'Grab', icon: '🟢' },
    { id: 'LALAMOVE', name: 'Lalamove', icon: '🟠' }
];

// ============================================
// QUOTA MANAGEMENT (Local Storage based)
// ============================================

const DeliveryQuota = {
    storageKey: 'saramonda_delivery_quota',

    // Get quota data from localStorage
    getQuota() {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
            return JSON.parse(stored);
        }
        // Initialize default quota
        return this.initializeQuota();
    },

    // Initialize quota for next 7 days
    initializeQuota() {
        const quota = {};
        const today = new Date();

        for (let i = 1; i <= 7; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() + i);
            const dateStr = this.formatDate(date);

            quota[dateStr] = {};
            TimeSlots.forEach(slot => {
                quota[dateStr][slot.id] = {
                    maxOrders: slot.maxOrders,
                    bookedOrders: 0,
                    remaining: slot.maxOrders,
                    isAvailable: slot.isActive
                };
            });
        }

        this.saveQuota(quota);
        return quota;
    },

    // Save quota to localStorage
    saveQuota(quota) {
        localStorage.setItem(this.storageKey, JSON.stringify(quota));
    },

    // Format date as YYYY-MM-DD
    formatDate(date) {
        return date.toISOString().split('T')[0];
    },

    // Get available slots for a specific date
    getAvailableSlots(dateStr) {
        const quota = this.getQuota();
        if (!quota[dateStr]) {
            return [];
        }

        return TimeSlots.map(slot => {
            const slotQuota = quota[dateStr][slot.id];
            return {
                ...slot,
                bookedOrders: slotQuota ? slotQuota.bookedOrders : 0,
                remaining: slotQuota ? slotQuota.remaining : slot.maxOrders,
                isAvailable: slotQuota ? slotQuota.isAvailable : slot.isActive
            };
        });
    },

    // Book a time slot (decrease remaining count)
    bookSlot(dateStr, slotId) {
        const quota = this.getQuota();

        if (!quota[dateStr] || !quota[dateStr][slotId]) {
            return { success: false, error: 'Invalid date or slot' };
        }

        const slotQuota = quota[dateStr][slotId];

        if (slotQuota.remaining <= 0) {
            return { success: false, error: 'Slot is full' };
        }

        slotQuota.bookedOrders += 1;
        slotQuota.remaining -= 1;

        if (slotQuota.remaining <= 0) {
            slotQuota.isAvailable = false;
        }

        this.saveQuota(quota);
        return { success: true, remaining: slotQuota.remaining };
    },

    // Check if a slot is available
    isSlotAvailable(dateStr, slotId) {
        const quota = this.getQuota();
        if (!quota[dateStr] || !quota[dateStr][slotId]) {
            return false;
        }
        return quota[dateStr][slotId].remaining > 0;
    },

    // Get total booked orders for a date
    getTotalBookedForDate(dateStr) {
        const quota = this.getQuota();
        if (!quota[dateStr]) {
            return 0;
        }

        return Object.values(quota[dateStr]).reduce((sum, slot) => sum + slot.bookedOrders, 0);
    }
};

// ============================================
// DELIVERY SYSTEM FUNCTIONS
// ============================================

const DeliverySystem = {
    currentLang: 'th',

    // Calculate delivery fee based on subtotal
    calculateDeliveryFee(subtotal) {
        if (subtotal >= DeliveryConfig.freeDeliveryAbove) {
            return 0;
        }
        return DeliveryConfig.deliveryFee;
    },

    // Check if order meets minimum
    isValidMinOrder(subtotal) {
        return subtotal >= DeliveryConfig.minOrder;
    },

    // Get amount needed for free delivery
    getAmountForFreeDelivery(subtotal) {
        if (subtotal >= DeliveryConfig.freeDeliveryAbove) {
            return 0;
        }
        return DeliveryConfig.freeDeliveryAbove - subtotal;
    },

    // Format date for display
    formatDateDisplay(date, lang = 'th') {
        const options = { day: 'numeric', month: 'short' };
        if (lang === 'th') {
            return date.toLocaleDateString('th-TH', options);
        }
        return date.toLocaleDateString('en-US', options);
    },

    // Get delivery dates (tomorrow and day after)
    getDeliveryDates() {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const dayAfter = new Date(today);
        dayAfter.setDate(dayAfter.getDate() + 2);

        return {
            tomorrow: {
                date: tomorrow,
                dateStr: DeliveryQuota.formatDate(tomorrow),
                displayTh: this.formatDateDisplay(tomorrow, 'th'),
                displayEn: this.formatDateDisplay(tomorrow, 'en')
            },
            dayAfter: {
                date: dayAfter,
                dateStr: DeliveryQuota.formatDate(dayAfter),
                displayTh: this.formatDateDisplay(dayAfter, 'th'),
                displayEn: this.formatDateDisplay(dayAfter, 'en')
            }
        };
    },

    // Update delivery UI in modal
    updateDeliveryUI(subtotal) {
        const deliveryFee = this.calculateDeliveryFee(subtotal);
        const amountForFree = this.getAmountForFreeDelivery(subtotal);
        const isValidMin = this.isValidMinOrder(subtotal);

        // Update delivery fee display
        const feeDisplay = document.getElementById('deliveryFeeDisplay');
        if (feeDisplay) {
            if (deliveryFee === 0) {
                feeDisplay.textContent = this.currentLang === 'th' ? 'ฟรี!' : 'Free!';
                feeDisplay.classList.add('free');
            } else {
                feeDisplay.textContent = `฿${deliveryFee}`;
                feeDisplay.classList.remove('free');
            }
        }

        // Update free delivery hint
        const freeHint = document.getElementById('freeDeliveryHint');
        const freeHintText = document.getElementById('freeDeliveryText');
        if (freeHint && amountForFree > 0 && isValidMin) {
            freeHint.style.display = 'flex';
            if (freeHintText) {
                freeHintText.textContent = this.currentLang === 'th'
                    ? `💡 เพิ่มอีก ฿${amountForFree} ส่งฟรี!`
                    : `💡 Add ฿${amountForFree} more for free delivery!`;
            }
        } else if (freeHint) {
            freeHint.style.display = 'none';
        }

        // Update minimum order warning
        const minWarning = document.getElementById('minOrderWarning');
        if (minWarning) {
            minWarning.style.display = isValidMin ? 'none' : 'flex';
        }

        // Update total with delivery fee
        const modalTotal = document.getElementById('modalTotal');
        if (modalTotal) {
            const total = subtotal + deliveryFee;
            modalTotal.textContent = `฿${total.toLocaleString()}`;
        }

        // Update confirm button state
        const confirmBtn = document.getElementById('confirmOrder');
        if (confirmBtn) {
            confirmBtn.disabled = !isValidMin;
            confirmBtn.style.opacity = isValidMin ? '1' : '0.5';
        }
    },

    // Update delivery dates in UI
    updateDeliveryDates() {
        const dates = this.getDeliveryDates();

        // Update tomorrow date
        const tomorrowEl = document.getElementById('tomorrowDate');
        if (tomorrowEl) {
            tomorrowEl.textContent = this.currentLang === 'th'
                ? dates.tomorrow.displayTh
                : dates.tomorrow.displayEn;
        }

        // Update day after date
        const dayAfterEl = document.getElementById('dayAfterDate');
        if (dayAfterEl) {
            dayAfterEl.textContent = this.currentLang === 'th'
                ? dates.dayAfter.displayTh
                : dates.dayAfter.displayEn;
        }
    },

    // Update time slots UI based on selected date
    updateTimeSlotsUI(dateStr) {
        const slots = DeliveryQuota.getAvailableSlots(dateStr);

        // Update morning slot
        const morningSlot = document.querySelector('.time-slot-option input[value="MORNING"]');
        const morningRemaining = document.querySelector('#morningRemaining .remaining-count');
        const morningLabel = morningSlot?.parentElement;

        if (morningSlot && morningRemaining && morningLabel) {
            const mSlot = slots.find(s => s.id === 'MORNING');
            if (mSlot) {
                morningRemaining.textContent = mSlot.remaining;
                if (mSlot.remaining <= 0) {
                    morningLabel.classList.add('full');
                    morningSlot.disabled = true;
                } else {
                    morningLabel.classList.remove('full');
                    morningSlot.disabled = false;
                }
            }
        }

        // Update evening slot
        const eveningSlot = document.querySelector('.time-slot-option input[value="EVENING"]');
        const eveningRemaining = document.querySelector('#eveningRemaining .remaining-count');
        const eveningLabel = eveningSlot?.parentElement;

        if (eveningSlot && eveningRemaining && eveningLabel) {
            const eSlot = slots.find(s => s.id === 'EVENING');
            if (eSlot) {
                eveningRemaining.textContent = eSlot.remaining;
                if (eSlot.remaining <= 0) {
                    eveningLabel.classList.add('full');
                    eveningSlot.disabled = true;
                } else {
                    eveningLabel.classList.remove('full');
                    eveningSlot.disabled = false;
                }
            }
        }

        // Check if all slots are full
        const allFull = slots.every(s => s.remaining <= 0);
        const quotaWarning = document.getElementById('quotaWarning');
        if (quotaWarning) {
            quotaWarning.style.display = allFull ? 'flex' : 'none';
        }
    },

    // Get selected delivery date string
    getSelectedDeliveryDate() {
        const selected = document.querySelector('input[name="deliveryDate"]:checked');
        const dates = this.getDeliveryDates();

        if (selected?.value === 'dayAfter') {
            return dates.dayAfter.dateStr;
        }
        return dates.tomorrow.dateStr;
    },

    // Get selected time slot
    getSelectedTimeSlot() {
        const selected = document.querySelector('input[name="timeSlot"]:checked');
        return selected?.value || 'MORNING';
    },

    // Get time slot display name
    getTimeSlotName(slotId) {
        const slot = TimeSlots.find(s => s.id === slotId);
        return slot ? slot.name : slotId;
    },

    // Initialize delivery system
    init() {
        console.log('🛵 Delivery System initialized');

        // Initialize quota if needed
        DeliveryQuota.getQuota();

        // Update delivery dates
        this.updateDeliveryDates();

        // Setup event listeners for date/time selection
        this.setupEventListeners();
    },

    setupEventListeners() {
        // Listen for date selection changes
        const dateInputs = document.querySelectorAll('input[name="deliveryDate"]');
        dateInputs.forEach(input => {
            input.addEventListener('change', () => {
                const dateStr = this.getSelectedDeliveryDate();
                this.updateTimeSlotsUI(dateStr);
            });
        });

        // Initial update for tomorrow's slots
        const dates = this.getDeliveryDates();
        this.updateTimeSlotsUI(dates.tomorrow.dateStr);
    }
};

// ============================================
// INTEGRATION WITH ORDER SYSTEM
// ============================================

// Override or extend the order submission to include delivery data
function getDeliveryOrderData(subtotal) {
    const deliveryFee = DeliverySystem.calculateDeliveryFee(subtotal);
    const deliveryDate = DeliverySystem.getSelectedDeliveryDate();
    const timeSlot = DeliverySystem.getSelectedTimeSlot();

    return {
        orderType: 'DELIVERY',
        deliveryDate: deliveryDate,
        timeSlot: timeSlot,
        timeSlotName: DeliverySystem.getTimeSlotName(timeSlot),
        deliveryFee: deliveryFee,
        subtotal: subtotal,
        total: subtotal + deliveryFee
    };
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
    window.DeliveryConfig = DeliveryConfig;
    window.DeliverySystem = DeliverySystem;
    window.DeliveryQuota = DeliveryQuota;
    window.TimeSlots = TimeSlots;
    window.RiderTypes = RiderTypes;
    window.getDeliveryOrderData = getDeliveryOrderData;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    DeliverySystem.init();
});
