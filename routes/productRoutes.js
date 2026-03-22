const router = require('express').Router();
const Product = require('../models/Product');
const Review = require('../models/Review');
const { ensureAuth } = require('../middleware/auth');

// Product detail page
router.get('/:slug', async (req, res) => {
    try {
        const product = await Product.findOne({ slug: req.params.slug, isActive: true })
            .populate('category');
        if (!product) {
            return res.status(404).render('pages/404', { title: 'Product Not Found' });
        }

        // Track recently viewed
        if (req.user) {
            await req.user.addRecentlyViewed(product._id);
        }

        // Get reviews with pagination
        const page = parseInt(req.query.page) || 1;
        const limit = 50;
        const filterRating = parseInt(req.query.rating) || 0;

        const reviewQuery = { product: product._id };
        if (filterRating >= 1 && filterRating <= 5) {
            reviewQuery.rating = filterRating;
        }

        const totalReviews = await Review.countDocuments(reviewQuery);
        const reviews = await Review.find(reviewQuery)
            .populate('user', 'name avatar')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        // Rating distribution
        const ratingDistribution = await Review.getRatingDistribution(product._id);

        // Frequently bought together (products from same category)
        const frequentlyBought = await Product.find({
            category: product.category._id,
            _id: { $ne: product._id },
            isActive: true
        }).limit(4);

        // Check if user already reviewed
        let userReview = null;
        if (req.user) {
            userReview = await Review.findOne({ user: req.user._id, product: product._id });
        }

        res.render('pages/product', {
            title: product.title,
            product,
            reviews,
            ratingDistribution,
            frequentlyBought,
            userReview,
            currentPage: page,
            totalPages: Math.ceil(totalReviews / limit),
            totalReviews,
            filterRating,
            pageScript: 'product.js'
        });
    } catch (err) {
        console.error('Product detail error:', err);
        res.render('pages/error', { title: 'Error', message: 'Failed to load product' });
    }
});

module.exports = router;
