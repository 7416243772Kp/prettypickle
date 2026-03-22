const router = require('express').Router();
const { ensureAuth } = require('../middleware/auth');
const User = require('../models/User');
const Product = require('../models/Product');

// Wishlist page
router.get('/', ensureAuth, async (req, res) => {
    const user = await User.findById(req.user._id).populate('wishlist');
    const products = user.wishlist.filter(p => p.isActive);
    res.render('pages/wishlist', { title: 'Wishlist', products });
});

// Toggle wishlist (API)
router.post('/toggle', ensureAuth, async (req, res) => {
    try {
        const { productId } = req.body;
        const added = await req.user.toggleWishlist(productId);
        res.json({ success: true, added });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update wishlist' });
    }
});

module.exports = router;
