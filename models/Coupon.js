const mongoose = require('mongoose');

const couponUsageSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    },
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
    },
    usedAt: {
        type: Date,
        default: Date.now
    }
}, { _id: false });

const couponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    // Discount configuration
    discountType: {
        type: String,
        enum: ['percentage', 'flat'],
        required: true
    },
    discountValue: {
        type: Number,
        required: true,
        min: 0
    },
    maxDiscountAmount: {
        type: Number,
        default: 0 // 0 means no cap (for percentage discounts)
    },
    // Scope: which products/categories this coupon applies to
    scope: {
        type: String,
        enum: ['universal', 'category', 'product'],
        default: 'universal'
    },
    applicableProducts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    }],
    applicableCategories: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    }],
    // Usage rules
    usageType: {
        type: String,
        enum: [
            'once_per_user',            // Can only use once total
            'once_per_product_per_user', // Once per product, but usable on all products
            'limited',                   // Limited total uses per user (maxUsesPerUser)
            'unlimited'                  // No limit
        ],
        default: 'once_per_user'
    },
    maxUsesPerUser: {
        type: Number,
        default: 1 // For 'limited' usage type
    },
    // Commission details
    promoterUPI: {
        type: String,
        default: '',
        trim: true
    },
    promoterCommission: {
        type: Number,
        default: 0 // Fixed amount per order
    },
    makerUPI: {
        type: String,
        default: '',
        trim: true
    },
    makerCommission: {
        type: Number,
        default: 0 // Fixed amount per order
    },
    // Usage tracking
    usedBy: [couponUsageSchema],
    totalUsed: {
        type: Number,
        default: 0
    },
    // Status
    isActive: {
        type: Boolean,
        default: true
    },
    expiresAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Check if coupon can be used by a user for a product
couponSchema.methods.canBeUsed = function(userId, productId) {
    if (!this.isActive) return { valid: false, reason: 'Coupon is inactive' };
    if (this.expiresAt && new Date() > this.expiresAt) return { valid: false, reason: 'Coupon has expired' };

    const userUsages = this.usedBy.filter(u => u.userId.toString() === userId.toString());

    switch (this.usageType) {
        case 'once_per_user':
            if (userUsages.length >= 1) return { valid: false, reason: 'Coupon already used' };
            break;
        case 'once_per_product_per_user':
            if (productId) {
                const productUsage = userUsages.find(u => u.productId && u.productId.toString() === productId.toString());
                if (productUsage) return { valid: false, reason: 'Coupon already used for this product' };
            }
            break;
        case 'limited':
            if (userUsages.length >= this.maxUsesPerUser) return { valid: false, reason: `Coupon usage limit reached (max ${this.maxUsesPerUser})` };
            break;
        case 'unlimited':
            break;
    }

    return { valid: true };
};

// Calculate discount amount
couponSchema.methods.calculateDiscount = function(subtotal) {
    let discount = 0;
    if (this.discountType === 'percentage') {
        discount = (subtotal * this.discountValue) / 100;
        if (this.maxDiscountAmount > 0) {
            discount = Math.min(discount, this.maxDiscountAmount);
        }
    } else {
        discount = Math.min(this.discountValue, subtotal);
    }
    return Math.round(discount * 100) / 100;
};

module.exports = mongoose.model('Coupon', couponSchema);
