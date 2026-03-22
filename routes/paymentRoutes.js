const router = require('express').Router();
const crypto = require('crypto');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const { ensureAuth } = require('../middleware/auth');

// Verify Razorpay payment
router.post('/verify', ensureAuth, async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

        // Verify signature
        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ error: 'Payment verification failed' });
        }

        // Update order
        const order = await Order.findOne({ orderId });
        if (!order) return res.status(404).json({ error: 'Order not found' });

        order.paymentStatus = 'paid';
        order.razorpayPaymentId = razorpay_payment_id;
        order.status = 'placed';
        await order.save();

        // Track coupon usage
        if (order.coupon && order.coupon.code) {
            const coupon = await Coupon.findOne({ code: order.coupon.code });
            if (coupon) {
                coupon.usedBy.push({ userId: req.user._id, orderId: order._id, usedAt: new Date() });
                coupon.totalUsed += 1;
                await coupon.save();
            }
        }

        // Update product sold counts
        for (const item of order.items) {
            await Product.findByIdAndUpdate(item.product, { $inc: { totalSold: item.quantity } });
        }

        // Clear cart
        await Cart.deleteOne({ user: req.user._id });

        // Send confirmation email
        try {
            const { sendEmail } = require('../config/email');
            const { getOrderConfirmationHTML } = require('../utils/emailTemplates');
            const user = await require('../models/User').findById(req.user._id);
            await sendEmail({
                to: user.email,
                subject: `Order Confirmed - ${order.orderId} | Pretty Pickles`,
                html: getOrderConfirmationHTML(order, user)
            });
        } catch (emailErr) {
            console.error('Payment email error:', emailErr);
        }

        res.json({ success: true, orderId: order.orderId });
    } catch (err) {
        console.error('Payment verify error:', err);
        res.status(500).json({ error: 'Payment verification failed' });
    }
});

// Apply coupon (API - for checkout)
router.post('/apply-coupon', ensureAuth, async (req, res) => {
    try {
        const { code, subtotal } = req.body;
        const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
        if (!coupon) return res.status(404).json({ error: 'Invalid coupon code' });

        const canUse = coupon.canBeUsed(req.user._id);
        if (!canUse.valid) return res.status(400).json({ error: canUse.reason });

        const discount = coupon.calculateDiscount(subtotal);
        res.json({
            success: true,
            discount,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            code: coupon.code
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to apply coupon' });
    }
});

// Razorpay webhook (no CSRF, no auth)
router.post('/webhook', async (req, res) => {
    try {
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
        if (webhookSecret) {
            const signature = req.headers['x-razorpay-signature'];
            const expectedSignature = crypto
                .createHmac('sha256', webhookSecret)
                .update(JSON.stringify(req.body))
                .digest('hex');
            if (expectedSignature !== signature) {
                return res.status(400).json({ error: 'Invalid webhook signature' });
            }
        }

        const event = req.body.event;
        const payload = req.body.payload;

        if (event === 'payment.captured') {
            const paymentId = payload.payment.entity.id;
            const order = await Order.findOne({ razorpayPaymentId: paymentId });
            if (order) {
                order.paymentStatus = 'paid';
                await order.save();
            }
        }

        res.json({ status: 'ok' });
    } catch (err) {
        console.error('Webhook error:', err);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

module.exports = router;
