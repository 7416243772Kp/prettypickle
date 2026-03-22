const router = require('express').Router();
const DeliveryPerson = require('../models/DeliveryPerson');
const Order = require('../models/Order');
const { loginLimiter } = require('../middleware/rateLimiter');

// Delivery login page
router.get('/login', (req, res) => {
    res.render('delivery/login', {
        layout: 'layouts/delivery',
        title: 'Delivery Login',
        error: null
    });
});

// Delivery login submit
router.post('/login', loginLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;
        const person = await DeliveryPerson.findOne({ email, isActive: true });
        if (!person || !(await person.comparePassword(password))) {
            return res.render('delivery/login', {
                layout: 'layouts/delivery',
                title: 'Delivery Login',
                error: 'Invalid credentials'
            });
        }
        req.session.deliveryPersonId = person._id;
        res.redirect('/delivery/scan');
    } catch (err) {
        res.render('delivery/login', {
            layout: 'layouts/delivery', title: 'Delivery Login',
            error: 'Something went wrong'
        });
    }
});

// Delivery auth middleware
const ensureDelivery = async (req, res, next) => {
    if (req.session && req.session.deliveryPersonId) {
        req.deliveryPerson = await DeliveryPerson.findById(req.session.deliveryPersonId);
        if (req.deliveryPerson && req.deliveryPerson.isActive) return next();
    }
    res.redirect('/delivery/login');
};

// QR Scanner page
router.get('/scan', ensureDelivery, (req, res) => {
    res.render('delivery/scan', {
        layout: 'layouts/delivery',
        title: 'Scan QR Code',
        pageScript: 'scanner.js'
    });
});

// Lookup order by QR code (API)
router.get('/api/order/:qrCode', ensureDelivery, async (req, res) => {
    try {
        const order = await Order.findOne({ qrCode: req.params.qrCode }).populate('user', 'name');
        if (!order) return res.status(404).json({ error: 'Order not found' });
        res.json({
            orderId: order.orderId,
            status: order.status,
            items: order.items,
            totalAmount: order.totalAmount,
            paymentMethod: order.paymentMethod,
            paymentStatus: order.paymentStatus,
            customerName: order.address.fullName,
            address: order.address,
            adminUPI: process.env.ADMIN_UPI_ID
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch order' });
    }
});

// Mark order as delivered + paid (API)
router.post('/api/order/:qrCode/complete', ensureDelivery, async (req, res) => {
    try {
        const { paymentType } = req.body; // 'upi', 'cash', 'cancel'
        const order = await Order.findOne({ qrCode: req.params.qrCode });
        if (!order) return res.status(404).json({ error: 'Order not found' });

        if (paymentType === 'cancel') {
            order.status = 'cancelled';
            order.cancelledAt = new Date();
            await order.save();
            return res.json({ success: true, message: 'Order cancelled' });
        }

        order.status = 'delivered';
        order.deliveredAt = new Date();
        order.paymentStatus = 'paid';
        order.deliveryPerson = req.deliveryPerson._id;
        await order.save();

        res.json({ success: true, message: `Order delivered. Payment: ${paymentType}` });
    } catch (err) {
        res.status(500).json({ error: 'Failed to complete order' });
    }
});

// Mark as shipped (API - when scanning during dispatch)
router.post('/api/order/:qrCode/ship', ensureDelivery, async (req, res) => {
    try {
        const order = await Order.findOne({ qrCode: req.params.qrCode });
        if (!order) return res.status(404).json({ error: 'Order not found' });
        order.status = 'shipped';
        await order.save();
        res.json({ success: true, message: 'Order marked as shipped' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update order' });
    }
});

// Delivery logout
router.get('/logout', (req, res) => {
    delete req.session.deliveryPersonId;
    res.redirect('/delivery/login');
});

module.exports = router;
