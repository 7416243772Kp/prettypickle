const router = require('express').Router();
const Product = require('../models/Product');
const Category = require('../models/Category');
const Banner = require('../models/Banner');

// Home page data API
router.get('/home', async (req, res) => {
    try {
        const topBanners = await Banner.find({ isActive: true, position: 'top', isScrolling: false })
            .sort({ displayOrder: 1 });
        const bottomBanners = await Banner.find({ isActive: true, position: 'bottom', isScrolling: false })
            .sort({ displayOrder: 1 });
        const scrollingBanner = await Banner.findOne({ isActive: true, isScrolling: true });

        const categories = await Category.find({ isActive: true }).sort({ displayOrder: 1 });

        const bestSellersByCategory = [];
        for (const category of categories) {
            const products = await Product.find({
                category: category._id,
                isActive: true
            })
            .sort({ totalSold: -1 })
            .limit(5);

            if (products.length > 0) {
                bestSellersByCategory.push({
                    category,
                    products
                });
            }
        }

        const menuProducts = await Product.find({ isActive: true })
            .populate('category')
            .sort({ createdAt: -1 })
            .limit(20);

        res.json({
            success: true,
            data: {
                topBanners,
                bottomBanners,
                scrollingBanner,
                categories,
                bestSellersByCategory,
                menuProducts
            }
        });
    } catch (err) {
        console.error('Home page API error:', err);
        res.status(500).json({ success: false, error: 'Failed to load home page data' });
    }
});

// Search API
router.get('/search', async (req, res) => {
    try {
        const query = req.query.q || '';
        let products = [];
        if (query.trim()) {
            products = await Product.find({
                $text: { $search: query },
                isActive: true
            })
            .populate('category')
            .limit(50);
        }
        res.json({ success: true, data: { query, products } });
    } catch (err) {
        console.error('Search API error:', err);
        res.status(500).json({ success: false, error: 'Failed to search products' });
    }
});

// Categories listing API
router.get('/categories', async (req, res) => {
    try {
        const categories = await Category.find({ isActive: true }).sort({ displayOrder: 1 });
        res.json({ success: true, data: { categories } });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to load categories' });
    }
});

// Category page API
router.get('/category/:slug', async (req, res) => {
    try {
        const category = await Category.findOne({ slug: req.params.slug, isActive: true });
        if (!category) {
            return res.status(404).json({ success: false, error: 'Category not found' });
        }
        const products = await Product.find({ category: category._id, isActive: true })
            .sort({ totalSold: -1 });
        res.json({ success: true, data: { category, products } });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to load category products' });
    }
});

// Contact form API integration
router.post('/contact', async (req, res) => {
    try {
        const { email, message } = req.body;
        const { sendEmail } = require('../config/email');
        await sendEmail({
            to: process.env.SMTP2GO_FROM_EMAIL || 'admin@prettypickles.com',
            subject: `Contact Form: ${email}`,
            html: `<p><strong>From:</strong> ${email}</p><p>${message}</p>`
        });
        res.json({ success: true, message: 'Your message has been sent successfully!' });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to send message. Please try again.' });
    }
});

module.exports = router;
