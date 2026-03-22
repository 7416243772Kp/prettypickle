const router = require('express').Router();
const { ensureAuth } = require('../middleware/auth');
const Review = require('../models/Review');
const Product = require('../models/Product');
const { validateReview } = require('../middleware/validators');

// Submit a review
router.post('/:productId', ensureAuth, validateReview, async (req, res) => {
    try {
        const { rating, text } = req.body;
        const productId = req.params.productId;

        // Check if product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Check for existing review
        const existing = await Review.findOne({ user: req.user._id, product: productId });
        if (existing) {
            return res.status(400).json({ error: 'You have already reviewed this product' });
        }

        const review = await Review.create({
            user: req.user._id,
            product: productId,
            rating,
            text
        });

        // Update product rating
        await product.updateRating(Review);

        // Populate user info for response
        await review.populate('user', 'name avatar');

        if (req.xhr || req.headers.accept?.includes('json')) {
            return res.json({ success: true, review });
        }
        res.redirect(`/product/${product.slug}`);
    } catch (err) {
        console.error('Review submit error:', err);
        if (req.xhr || req.headers.accept?.includes('json')) {
            return res.status(500).json({ error: 'Failed to submit review' });
        }
        res.redirect('back');
    }
});

// Get reviews for a product (API - for pagination)
router.get('/:productId', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 50;
        const rating = parseInt(req.query.rating) || 0;

        const query = { product: req.params.productId };
        if (rating >= 1 && rating <= 5) query.rating = rating;

        const total = await Review.countDocuments(query);
        const reviews = await Review.find(query)
            .populate('user', 'name avatar')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        const distribution = await Review.getRatingDistribution(
            require('mongoose').Types.ObjectId.createFromHexString(req.params.productId)
        );

        res.json({
            reviews,
            distribution,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            total
        });
    } catch (err) {
        console.error('Get reviews error:', err);
        res.status(500).json({ error: 'Failed to load reviews' });
    }
});

module.exports = router;
