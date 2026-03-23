const router = require('express').Router();
const { ensureAuth } = require('../middleware/auth');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Address = require('../models/Address');
const Coupon = require('../models/Coupon');
const Product = require('../models/Product');
const DeliverySetting = require('../models/DeliverySetting');
const { razorpay } = require('../config/razorpay');
const crypto = require('crypto');

// Order history (API)
router.get('/', ensureAuth, async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id })
            .sort({ createdAt: -1 });
        res.json({ success: true, data: { orders } });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to load orders' });
    }
});

// Order detail (API)
router.get('/:orderId', ensureAuth, async (req, res) => {
    try {
        const order = await Order.findOne({ orderId: req.params.orderId, user: req.user._id });
        if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
        res.json({ success: true, data: { order } });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to load order details' });
    }
});

// Checkout data (API)
router.get('/checkout/data', ensureAuth, async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, error: 'Cart is empty' });
        }

        const addresses = await Address.find({ user: req.user._id });
        const deliverySettings = await DeliverySetting.getSettings();

        res.json({
            success: true,
            data: {
                cart,
                addresses,
                deliverySettings
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to load checkout data' });
    }
});

// Place order (API)
router.post('/place', ensureAuth, async (req, res) => {
    try {
        const { addressId, paymentMethod, couponCode } = req.body;
        const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ error: 'Cart is empty' });
        }

        // Get address
        const address = await Address.findOne({ _id: addressId, user: req.user._id });
        if (!address) return res.status(400).json({ error: 'Please select a delivery address' });

        // Calculate totals
        let subtotal = 0;
        const orderItems = cart.items.map(item => {
            const totalPrice = item.unitPrice * item.quantity;
            subtotal += totalPrice;
            return {
                product: item.product._id,
                title: item.product.title,
                image: item.product.images?.[0] || '',
                variant: item.variant,
                weight: item.weight,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice
            };
        });

        // Delivery charge
        const deliverySettings = await DeliverySetting.getSettings();
        let deliveryCharge = deliverySettings.deliveryCharge;
        if (deliverySettings.freeDeliveryAbove > 0 && subtotal >= deliverySettings.freeDeliveryAbove) {
            deliveryCharge = 0;
        }

        // Apply coupon
        let discount = 0;
        let couponData = {};
        let commissions = {};
        if (couponCode) {
            const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
            if (coupon) {
                const canUse = coupon.canBeUsed(req.user._id);
                if (canUse.valid) {
                    discount = coupon.calculateDiscount(subtotal);
                    couponData = {
                        code: coupon.code,
                        discountType: coupon.discountType,
                        discountValue: coupon.discountValue
                    };
                    commissions = {
                        promoterUPI: coupon.promoterUPI,
                        promoterAmount: coupon.promoterCommission,
                        makerUPI: coupon.makerUPI,
                        makerAmount: coupon.makerCommission,
                        promoterPaid: false,
                        makerPaid: false
                    };
                }
            }
        }

        const totalAmount = subtotal + deliveryCharge - discount;

        // Create order
        const order = new Order({
            user: req.user._id,
            items: orderItems,
            address: {
                fullName: address.fullName,
                phone: address.phone,
                line1: address.line1,
                line2: address.line2,
                city: address.city,
                state: address.state,
                pincode: address.pincode
            },
            subtotal,
            deliveryCharge,
            discount,
            totalAmount,
            coupon: couponData,
            paymentMethod,
            paymentStatus: paymentMethod === 'cod' ? 'pending' : 'pending',
            commissions,
            expectedDelivery: deliverySettings.expectedDeliveryText
        });

        if (paymentMethod === 'online') {
            // Create Razorpay order
            const razorpayOrder = await razorpay.orders.create({
                amount: Math.round(totalAmount * 100), // paise
                currency: 'INR',
                receipt: order.orderId,
                notes: { orderId: order.orderId }
            });
            order.razorpayOrderId = razorpayOrder.id;
            await order.save();

            return res.json({
                success: true,
                paymentMethod: 'online',
                razorpayOrderId: razorpayOrder.id,
                amount: razorpayOrder.amount,
                orderId: order.orderId,
                key: process.env.RAZORPAY_KEY_ID,
                user: { name: req.user.name, email: req.user.email }
            });
        }

        // COD order
        order.status = 'placed';
        await order.save();

        // Track coupon usage
        if (couponCode) {
            const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });
            if (coupon) {
                coupon.usedBy.push({ userId: req.user._id, orderId: order._id, usedAt: new Date() });
                coupon.totalUsed += 1;
                await coupon.save();
            }
        }

        // Update product sold counts
        for (const item of orderItems) {
            await Product.findByIdAndUpdate(item.product, { $inc: { totalSold: item.quantity } });
        }

        // Clear cart
        await Cart.deleteOne({ user: req.user._id });

        // Send confirmation email
        try {
            const { sendEmail } = require('../config/email');
            const { getOrderConfirmationHTML } = require('../utils/emailTemplates');
            await sendEmail({
                to: req.user.email,
                subject: `Order Confirmed - ${order.orderId} | Pretty Pickles`,
                html: getOrderConfirmationHTML(order, req.user)
            });
        } catch (emailErr) {
            console.error('Order email error:', emailErr);
        }

        res.json({ success: true, paymentMethod: 'cod', orderId: order.orderId });
    } catch (err) {
        console.error('Place order error:', err);
        res.status(500).json({ error: 'Failed to place order' });
    }
});

// Reorder (API)
router.post('/reorder/:orderId', ensureAuth, async (req, res) => {
    try {
        const order = await Order.findOne({ orderId: req.params.orderId, user: req.user._id });
        if (!order) return res.status(404).json({ error: 'Order not found' });

        let cart = await Cart.findOne({ user: req.user._id });
        if (!cart) cart = new Cart({ user: req.user._id, items: [] });

        for (const item of order.items) {
            const product = await Product.findById(item.product);
            if (product && product.isActive) {
                cart.items.push({
                    product: item.product,
                    variant: item.variant,
                    weight: item.weight,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice
                });
            }
        }
        await cart.save();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to reorder' });
    }
});

// Return/replace request
router.post('/:orderId/return', ensureAuth, async (req, res) => {
    try {
        const { reason } = req.body;
        const order = await Order.findOne({ orderId: req.params.orderId, user: req.user._id });
        if (!order) return res.status(404).json({ error: 'Order not found' });

        // Check 24-hour refund window
        const deliveredAt = order.deliveredAt || order.createdAt;
        const hoursSince = (Date.now() - new Date(deliveredAt).getTime()) / (1000 * 60 * 60);
        if (hoursSince > 24) {
            return res.status(400).json({ error: 'Return window has expired (24 hours)' });
        }

        order.status = 'returned';
        order.returnRequestedAt = new Date();
        order.returnReason = reason;
        await order.save();

        res.json({ success: true, message: 'Return request submitted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to submit return request' });
    }
});

module.exports = router;
