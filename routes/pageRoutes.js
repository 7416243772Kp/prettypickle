const router = require('express').Router();
const Product = require('../models/Product');
const Category = require('../models/Category');
const Banner = require('../models/Banner');
const DeliverySetting = require('../models/DeliverySetting');

// Home page
router.get('/', async (req, res) => {
    try {
        // Get active banners
        const topBanners = await Banner.find({ isActive: true, position: 'top', isScrolling: false })
            .sort({ displayOrder: 1 });
        const bottomBanners = await Banner.find({ isActive: true, position: 'bottom', isScrolling: false })
            .sort({ displayOrder: 1 });
        const scrollingBanner = await Banner.findOne({ isActive: true, isScrolling: true });

        // Get active categories
        const categories = await Category.find({ isActive: true }).sort({ displayOrder: 1 });

        // Get best sellers per category (top 5 by totalSold)
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

        // Get products for the menu (default: first category or all)
        const menuProducts = await Product.find({ isActive: true })
            .populate('category')
            .sort({ createdAt: -1 })
            .limit(20);

        res.render('pages/home', {
            title: 'Home',
            topBanners,
            bottomBanners,
            scrollingBanner,
            categories,
            bestSellersByCategory,
            menuProducts
        });
    } catch (err) {
        console.error('Home page error:', err);
        res.render('pages/error', { title: 'Error', message: 'Failed to load home page' });
    }
});

// Search
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
        res.render('pages/search', {
            title: `Search: ${query}`,
            query,
            products
        });
    } catch (err) {
        console.error('Search error:', err);
        res.render('pages/search', { title: 'Search', query: '', products: [] });
    }
});

// Categories listing
router.get('/categories', async (req, res) => {
    try {
        const categories = await Category.find({ isActive: true }).sort({ displayOrder: 1 });
        res.render('pages/categories', {
            title: 'All Categories',
            categories
        });
    } catch (err) {
        res.render('pages/error', { title: 'Error', message: 'Failed to load categories' });
    }
});

// Category page
router.get('/category/:slug', async (req, res) => {
    try {
        const category = await Category.findOne({ slug: req.params.slug, isActive: true });
        if (!category) {
            return res.status(404).render('pages/404', { title: 'Not Found' });
        }
        const products = await Product.find({ category: category._id, isActive: true })
            .sort({ totalSold: -1 });
        res.render('pages/category', {
            title: category.name,
            category,
            products
        });
    } catch (err) {
        res.render('pages/error', { title: 'Error', message: 'Failed to load category' });
    }
});

// Static pages
router.get('/about', (req, res) => {
    res.render('pages/about', { title: 'About Us' });
});

router.get('/contact', (req, res) => {
    res.render('pages/contact', { title: 'Contact Us' });
});

router.post('/contact', async (req, res) => {
    try {
        // Handle contact form submission
        const { email, message } = req.body;
        const { sendEmail } = require('../config/email');
        await sendEmail({
            to: process.env.SMTP2GO_FROM_EMAIL,
            subject: `Contact Form: ${email}`,
            html: `<p><strong>From:</strong> ${email}</p><p>${message}</p>`
        });
        res.render('pages/contact', {
            title: 'Contact Us',
            success: 'Your message has been sent successfully!'
        });
    } catch (err) {
        res.render('pages/contact', {
            title: 'Contact Us',
            error: 'Failed to send message. Please try again.'
        });
    }
});

router.get('/terms', (req, res) => {
    res.render('pages/terms', { title: 'Terms & Conditions' });
});

router.get('/privacy', (req, res) => {
    res.render('pages/privacy', { title: 'Privacy Policy' });
});

router.get('/refund-policy', (req, res) => {
    res.render('pages/refund', { title: 'Refund Policy' });
});

router.get('/delivery-policy', (req, res) => {
    res.render('pages/delivery-policy', { title: 'Delivery Policy' });
});

module.exports = router;
