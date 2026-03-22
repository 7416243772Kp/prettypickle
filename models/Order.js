const mongoose = require('mongoose');
const crypto = require('crypto');

const orderItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    title: String,
    image: String,
    variant: {
        type: String,
        default: '' // 'Bone', 'Boneless', or empty
    },
    weight: {
        type: String,
        required: true // '250g', '500g', etc.
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
        max: 100
    },
    unitPrice: {
        type: Number,
        required: true
    },
    totalPrice: {
        type: Number,
        required: true
    }
}, { _id: false });

const commissionSchema = new mongoose.Schema({
    promoterUPI: { type: String, default: '' },
    promoterAmount: { type: Number, default: 0 },
    makerUPI: { type: String, default: '' },
    makerAmount: { type: Number, default: 0 },
    promoterPaid: { type: Boolean, default: false },
    makerPaid: { type: Boolean, default: false },
    promoterPaidAt: Date,
    makerPaidAt: Date,
    promoterPayoutId: String,
    makerPayoutId: String
}, { _id: false });

const orderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        unique: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    items: [orderItemSchema],
    // Embedded address (snapshot at time of order)
    address: {
        fullName: String,
        phone: String,
        line1: String,
        line2: String,
        city: String,
        state: String,
        pincode: String
    },
    // Pricing
    subtotal: {
        type: Number,
        required: true
    },
    deliveryCharge: {
        type: Number,
        default: 0
    },
    discount: {
        type: Number,
        default: 0
    },
    totalAmount: {
        type: Number,
        required: true
    },
    // Coupon
    coupon: {
        code: { type: String, default: '' },
        discountType: { type: String, default: '' },
        discountValue: { type: Number, default: 0 }
    },
    // Payment
    paymentMethod: {
        type: String,
        enum: ['online', 'cod'],
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded'],
        default: 'pending'
    },
    razorpayOrderId: String,
    razorpayPaymentId: String,
    // Order status
    status: {
        type: String,
        enum: ['placed', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned'],
        default: 'placed',
        index: true
    },
    // QR code for delivery scanning
    qrCode: {
        type: String,
        unique: true
    },
    // Commission tracking
    commissions: commissionSchema,
    // Delivery
    deliveryPerson: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DeliveryPerson'
    },
    deliveredAt: Date,
    cancelledAt: Date,
    returnRequestedAt: Date,
    returnReason: String,
    // Expected delivery
    expectedDelivery: {
        type: String,
        default: '1-2 weeks'
    }
}, {
    timestamps: true
});

// Generate unique order ID (PP-XXXXXX)
orderSchema.pre('validate', function(next) {
    if (!this.orderId) {
        this.orderId = 'PP-' + Date.now().toString(36).toUpperCase() + crypto.randomBytes(2).toString('hex').toUpperCase();
    }
    if (!this.qrCode) {
        this.qrCode = crypto.randomBytes(16).toString('hex');
    }
    next();
});

// Indexes
orderSchema.index({ orderId: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'coupon.code': 1 });

module.exports = mongoose.model('Order', orderSchema);
