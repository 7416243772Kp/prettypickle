const router = require('express').Router();
const { ensureAdmin, ensurePrimaryAdmin, checkAdminSession } = require('../middleware/adminAuth');
const { uploadProductImage, uploadBannerImage } = require('../middleware/upload');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Order = require('../models/Order');
const Coupon = require('../models/Coupon');
const Admin = require('../models/Admin');
const Banner = require('../models/Banner');
const Bundle = require('../models/Bundle');
const DeliverySetting = require('../models/DeliverySetting');
const DeliveryPerson = require('../models/DeliveryPerson');
const User = require('../models/User');
const { createPayout } = require('../config/razorpay');
const fs = require('fs');
const path = require('path');

// Apply admin auth to all routes
router.use(checkAdminSession, ensureAdmin);

// ==================== DASHBOARD ====================
router.get('/dashboard', async (req, res) => {
    try {
        const today = new Date(); today.setHours(0,0,0,0);
        const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
        const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);

        const [todaySales, yesterdaySales, weekSales, monthSales, lastMonthSales, totalSales, totalOrders, recentOrders] = await Promise.all([
            Order.aggregate([{ $match: { createdAt: { $gte: today }, paymentStatus: 'paid' }}, { $group: { _id: null, total: { $sum: '$totalAmount' }}}]),
            Order.aggregate([{ $match: { createdAt: { $gte: yesterday, $lt: today }, paymentStatus: 'paid' }}, { $group: { _id: null, total: { $sum: '$totalAmount' }}}]),
            Order.aggregate([{ $match: { createdAt: { $gte: weekAgo }, paymentStatus: 'paid' }}, { $group: { _id: null, total: { $sum: '$totalAmount' }}}]),
            Order.aggregate([{ $match: { createdAt: { $gte: monthStart }, paymentStatus: 'paid' }}, { $group: { _id: null, total: { $sum: '$totalAmount' }}}]),
            Order.aggregate([{ $match: { createdAt: { $gte: lastMonthStart, $lt: monthStart }, paymentStatus: 'paid' }}, { $group: { _id: null, total: { $sum: '$totalAmount' }}}]),
            Order.aggregate([{ $match: { paymentStatus: 'paid' }}, { $group: { _id: null, total: { $sum: '$totalAmount' }}}]),
            Order.countDocuments(),
            Order.find().sort({ createdAt: -1 }).limit(10)
        ]);

        res.json({
            success: true,
            data: {
                stats: {
                    todaySales: todaySales[0]?.total || 0,
                    yesterdaySales: yesterdaySales[0]?.total || 0,
                    weekSales: weekSales[0]?.total || 0,
                    monthSales: monthSales[0]?.total || 0,
                    lastMonthSales: lastMonthSales[0]?.total || 0,
                    totalSales: totalSales[0]?.total || 0,
                    totalOrders
                },
                recentOrders
            }
        });
    } catch (err) {
        console.error('Dashboard error:', err);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
});

// ==================== PRODUCTS ====================
router.get('/products', async (req, res) => {
    try {
        const products = await Product.find().populate('category').sort({ createdAt: -1 });
        const categories = await Category.find({ isActive: true });
        res.json({ success: true, data: { products, categories } });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

router.get('/products/new', async (req, res) => {
    try {
        const categories = await Category.find({ isActive: true });
        res.json({ success: true, data: { product: null, categories } });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch form data' });
    }
});

router.get('/products/edit/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        const categories = await Category.find({ isActive: true });
        if (!product) return res.status(404).json({ error: 'Product not found' });
        res.json({ success: true, data: { product, categories } });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});

router.post('/products/save', uploadProductImage, async (req, res) => {
    try {
        const { id, title, description, category, type, hasVariants, variants, basePrices, stock, metaTitle, metaDescription } = req.body;
        const productData = { title, description, category, type, stock: parseInt(stock) || 0, metaTitle, metaDescription };

        productData.hasVariants = hasVariants === 'true';
        if (productData.hasVariants && variants) {
            productData.variants = JSON.parse(variants);
        } else if (basePrices) {
            productData.basePrices = JSON.parse(basePrices);
        }

        if (req.files && req.files.length > 0) {
            productData.images = req.files.map(f => f.filename);
        }

        if (id) {
            const existing = await Product.findById(id);
            if (existing && !productData.images) productData.images = existing.images;
            await Product.findByIdAndUpdate(id, productData);
        } else {
            await Product.create(productData);
        }
        res.json({ success: true, redirect: '/admin/products' });
    } catch (err) {
        console.error('Save product error:', err);
        res.status(500).json({ error: 'Failed to save product' });
    }
});

router.delete('/products/:id', async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (product && product.images) {
            product.images.forEach(img => {
                const imgPath = path.join(__dirname, '..', 'public', 'images', 'uploads', img);
                if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
            });
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

// ==================== CATEGORIES ====================
router.get('/categories', async (req, res) => {
    try {
        const categories = await Category.find().sort({ displayOrder: 1 });
        res.json({ success: true, data: { categories } });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

router.post('/categories/save', async (req, res) => {
    try {
        const { id, name, description, displayOrder } = req.body;
        if (id) {
            await Category.findByIdAndUpdate(id, { name, description, displayOrder: parseInt(displayOrder) || 0 });
        } else {
            await Category.create({ name, description, displayOrder: parseInt(displayOrder) || 0 });
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save category' });
    }
});

router.delete('/categories/:id', async (req, res) => {
    try {
        const productCount = await Product.countDocuments({ category: req.params.id });
        if (productCount > 0) return res.status(400).json({ error: `Category has ${productCount} products. Remove them first.` });
        await Category.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete category' });
    }
});

// ==================== ORDERS ====================
router.get('/orders', async (req, res) => {
    try {
        const status = req.query.status || '';
        const query = status ? { status } : {};
        const orders = await Order.find(query).populate('user', 'name email').sort({ createdAt: -1 });
        res.json({ success: true, data: { orders, currentStatus: status } });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

router.get('/orders/:id', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id).populate('user', 'name email avatar');
        if (!order) return res.status(404).json({ error: 'Order not found' });
        res.json({ success: true, data: { order } });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch order details' });
    }
});

router.put('/orders/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        order.status = status;
        if (status === 'delivered') order.deliveredAt = new Date();
        if (status === 'cancelled') order.cancelledAt = new Date();
        await order.save();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update order' });
    }
});

// ==================== COUPONS ====================
router.get('/coupons', async (req, res) => {
    try {
        const coupons = await Coupon.find().sort({ createdAt: -1 });
        res.json({ success: true, data: { coupons } });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch coupons' });
    }
});

router.get('/coupons/new', async (req, res) => {
    try {
        const products = await Product.find({ isActive: true });
        const categories = await Category.find({ isActive: true });
        res.json({ success: true, data: { products, categories, coupon: null } });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch coupon configs' });
    }
});

router.get('/coupons/edit/:id', async (req, res) => {
    try {
        const coupon = await Coupon.findById(req.params.id);
        const products = await Product.find({ isActive: true });
        const categories = await Category.find({ isActive: true });
        if (!coupon) return res.status(404).json({ error: 'Coupon not found' });
        res.json({ success: true, data: { coupon, products, categories } });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch coupon' });
    }
});

router.post('/coupons/save', async (req, res) => {
    try {
        const { id, code, discountType, discountValue, maxDiscountAmount, scope, applicableProducts, applicableCategories,
                usageType, maxUsesPerUser, promoterUPI, promoterCommission, makerUPI, makerCommission, expiresAt } = req.body;
        const data = {
            code: code.toUpperCase(),
            discountType, discountValue: parseFloat(discountValue),
            maxDiscountAmount: parseFloat(maxDiscountAmount) || 0,
            scope,
            applicableProducts: applicableProducts ? typeof applicableProducts === 'string' ? JSON.parse(applicableProducts) : applicableProducts : [],
            applicableCategories: applicableCategories ? typeof applicableCategories === 'string' ? JSON.parse(applicableCategories) : applicableCategories : [],
            usageType, maxUsesPerUser: parseInt(maxUsesPerUser) || 1,
            promoterUPI, promoterCommission: parseFloat(promoterCommission) || 0,
            makerUPI, makerCommission: parseFloat(makerCommission) || 0,
            expiresAt: expiresAt || null
        };
        if (id) {
            await Coupon.findByIdAndUpdate(id, data);
        } else {
            await Coupon.create(data);
        }
        res.json({ success: true, redirect: '/admin/coupons' });
    } catch (err) {
        console.error('Save coupon error:', err);
        res.status(500).json({ error: 'Failed to save coupon' });
    }
});

router.delete('/coupons/:id', async (req, res) => {
    try {
        await Coupon.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete coupon' });
    }
});

// ==================== PROMOTERS (Commission Payouts) ====================
router.get('/promoters', async (req, res) => {
    try {
        // Get all orders with unpaid commissions
        const pendingOrders = await Order.find({
            'commissions.promoterUPI': { $ne: '' },
            paymentStatus: 'paid'
        });

        // Aggregate by promoter/maker UPI
        const promoterMap = {};
        const makerMap = {};
        for (const order of pendingOrders) {
            const c = order.commissions;
            if (c.promoterUPI && !c.promoterPaid) {
                if (!promoterMap[c.promoterUPI]) promoterMap[c.promoterUPI] = { upi: c.promoterUPI, amount: 0, orders: [] };
                promoterMap[c.promoterUPI].amount += c.promoterAmount;
                promoterMap[c.promoterUPI].orders.push(order.orderId);
            }
            if (c.makerUPI && !c.makerPaid) {
                if (!makerMap[c.makerUPI]) makerMap[c.makerUPI] = { upi: c.makerUPI, amount: 0, orders: [] };
                makerMap[c.makerUPI].amount += c.makerAmount;
                makerMap[c.makerUPI].orders.push(order.orderId);
            }
        }
        res.json({ 
            success: true, 
            data: { 
                promoters: Object.values(promoterMap), 
                makers: Object.values(makerMap) 
            }
        });
    } catch (err) {
        console.error('Promoters error:', err);
        res.status(500).json({ error: 'Failed to fetch promoters' });
    }
});

// Pay promoter/maker via RazorpayX
router.post('/promoters/pay', async (req, res) => {
    try {
        const { upi, amount, type } = req.body; // type: 'promoter' or 'maker'
        const result = await createPayout({
            amount: parseFloat(amount),
            upiId: upi,
            purpose: type === 'promoter' ? 'Commission - Promoter' : 'Commission - Pickle Maker',
            referenceId: `${type}_${Date.now()}`
        });

        if (result.success) {
            // Mark orders as paid
            const field = type === 'promoter' ? 'commissions.promoterPaid' : 'commissions.makerPaid';
            const dateField = type === 'promoter' ? 'commissions.promoterPaidAt' : 'commissions.makerPaidAt';
            const upiField = type === 'promoter' ? 'commissions.promoterUPI' : 'commissions.makerUPI';
            await Order.updateMany(
                { [upiField]: upi, paymentStatus: 'paid', [field]: false },
                { $set: { [field]: true, [dateField]: new Date() } }
            );
            res.json({ success: true, payout: result.payout });
        } else {
            res.status(500).json({ error: result.error || 'Payout failed' });
        }
    } catch (err) {
        console.error('Payout error:', err);
        res.status(500).json({ error: 'Failed to process payout' });
    }
});

// ==================== BUNDLES ====================
router.get('/bundles', async (req, res) => {
    try {
        const bundles = await Bundle.find().populate('products.product').sort({ createdAt: -1 });
        const products = await Product.find({ isActive: true });
        res.json({ success: true, data: { bundles, products } });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch bundles' });
    }
});

router.post('/bundles/save', async (req, res) => {
    try {
        const { id, name, description, products, bundlePrice, originalPrice } = req.body;
        const data = { name, description, products: JSON.parse(products), bundlePrice: parseFloat(bundlePrice), originalPrice: parseFloat(originalPrice) || 0 };
        if (id) { await Bundle.findByIdAndUpdate(id, data); } else { await Bundle.create(data); }
        res.json({ success: true, redirect: '/admin/bundles' });
    } catch (err) { res.status(500).json({ error: 'Failed to save bundle' }); }
});

router.delete('/bundles/:id', async (req, res) => {
    try { await Bundle.findByIdAndDelete(req.params.id); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: 'Failed to delete' }); }
});

// ==================== BANNERS ====================
router.get('/banners', async (req, res) => {
    try {
        const banners = await Banner.find().sort({ displayOrder: 1 });
        res.json({ success: true, data: { banners } });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch banners' });
    }
});

router.post('/banners/save', uploadBannerImage, async (req, res) => {
    try {
        const { id, link, position, displayOrder, isScrolling, scrollText, isActive } = req.body;
        const data = { link, position, displayOrder: parseInt(displayOrder) || 0, isScrolling: isScrolling === 'true', scrollText, isActive: isActive !== 'false' };
        if (req.file) data.image = req.file.filename;
        if (id) {
            if (!data.image) { const existing = await Banner.findById(id); data.image = existing?.image; }
            await Banner.findByIdAndUpdate(id, data);
        } else {
            if (!data.image) return res.status(400).json({ error: 'Image required' });
            await Banner.create(data);
        }
        res.json({ success: true, redirect: '/admin/banners' });
    } catch (err) { res.status(500).json({ error: 'Failed to save banner' }); }
});

router.delete('/banners/:id', async (req, res) => {
    try { const b = await Banner.findByIdAndDelete(req.params.id);
        if (b?.image) { const p = path.join(__dirname,'..','public','images','uploads',b.image); if(fs.existsSync(p)) fs.unlinkSync(p); }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Failed to delete' }); }
});

// ==================== DELIVERY SETTINGS ====================
router.get('/delivery', async (req, res) => {
    try {
        const settings = await DeliverySetting.getSettings();
        const deliveryPersons = await DeliveryPerson.find();
        res.json({ success: true, data: { settings, deliveryPersons } });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch delivery configs' });
    }
});

router.post('/delivery/settings', async (req, res) => {
    try {
        const { deliveryCharge, freeDeliveryAbove, expectedDeliveryText } = req.body;
        const settings = await DeliverySetting.getSettings();
        settings.deliveryCharge = parseFloat(deliveryCharge) || 0;
        settings.freeDeliveryAbove = parseFloat(freeDeliveryAbove) || 0;
        settings.expectedDeliveryText = expectedDeliveryText || '1-2 weeks';
        await settings.save();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Failed to update settings' }); }
});

router.post('/delivery/person', async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        await DeliveryPerson.create({ name, email, password, phone });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Failed to add delivery person' }); }
});

// ==================== ANALYTICS ====================
router.get('/analytics', async (req, res) => {
    try {
        const [topCustomers, topProducts, categoryStats] = await Promise.all([
            Order.aggregate([
                { $match: { paymentStatus: 'paid' } },
                { $group: { _id: '$user', totalSpent: { $sum: '$totalAmount' }, orderCount: { $sum: 1 } } },
                { $sort: { totalSpent: -1 } },
                { $limit: 20 },
                { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
                { $unwind: '$user' }
            ]),
            Product.find().sort({ totalSold: -1 }).limit(20).populate('category'),
            Category.aggregate([
                { $lookup: { from: 'products', localField: '_id', foreignField: 'category', as: 'products' } },
                { $project: { name: 1, totalProducts: { $size: '$products' }, totalSold: { $sum: '$products.totalSold' } } },
                { $sort: { totalSold: -1 } }
            ])
        ]);

        const neverBought = await Product.find({ totalSold: 0, isActive: true }).populate('category');

        res.json({
            success: true,
            data: {
                topCustomers: topCustomers.map(c => ({
                    userId: c._id,
                    name: c.user?.name || 'Unknown',
                    email: c.user?.email || '',
                    totalSpent: c.totalSpent,
                    orderCount: c.orderCount
                })),
                topProducts,
                categoryStats,
                neverBought
            }
        });
    } catch (err) {
        console.error('Analytics error:', err);
        res.render('admin/analytics', { layout: 'layouts/admin', title: 'Analytics', topCustomers: [], topProducts: [], categoryStats: [], neverBought: [] });
    }
});

// ==================== SETTINGS ====================
router.get('/settings', async (req, res) => {
    res.render('admin/settings', { layout: 'layouts/admin', title: 'Settings', pageScript: 'settings.js' });
});

// ==================== ADMIN MANAGEMENT (Primary Only) ====================
router.get('/admins', ensurePrimaryAdmin, async (req, res) => {
    const admins = await Admin.find().select('-password -totpSecret');
    res.render('admin/admins', { layout: 'layouts/admin', title: 'Manage Admins', admins, pageScript: 'admins.js' });
});

router.post('/admins/add', ensurePrimaryAdmin, async (req, res) => {
    try {
        const { name, email, password } = req.body;
        await Admin.create({ name, email, password, role: 'secondary' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.code === 11000 ? 'Email already exists' : 'Failed to add admin' });
    }
});

router.delete('/admins/:id', ensurePrimaryAdmin, async (req, res) => {
    try {
        const admin = await Admin.findById(req.params.id);
        if (!admin) return res.status(404).json({ error: 'Admin not found' });
        if (admin.role === 'primary') return res.status(400).json({ error: 'Cannot delete primary admin' });
        await Admin.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Failed to delete admin' }); }
});

// Transfer primary role
router.post('/admins/transfer/:id', ensurePrimaryAdmin, async (req, res) => {
    try {
        const newPrimary = await Admin.findById(req.params.id);
        if (!newPrimary) return res.status(404).json({ error: 'Admin not found' });
        await Admin.updateOne({ role: 'primary' }, { role: 'secondary' });
        newPrimary.role = 'primary';
        await newPrimary.save();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Failed to transfer' }); }
});

// Logout from all browsers (Primary only)
router.post('/admins/logout-all', ensurePrimaryAdmin, async (req, res) => {
    try {
        const admins = await Admin.find();
        for (const admin of admins) {
            await admin.invalidateAllSessions();
        }
        // Clear all admin sessions from MongoDB
        const MongoStore = require('connect-mongo');
        res.json({ success: true, message: 'All admin sessions invalidated' });
    } catch (err) { res.status(500).json({ error: 'Failed to logout all' }); }
});

module.exports = router;
