const router = require('express').Router();
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { ensureAuth } = require('../middleware/auth');

// View cart (API)
router.get('/', ensureAuth, async (req, res) => {
    try {
        let cart = await Cart.findOne({ user: req.user._id })
            .populate('items.product');
        if (!cart) {
            cart = { items: [], getTotal: () => 0, getItemCount: () => 0 };
        }
        res.json({
            success: true,
            data: { cart }
        });
    } catch (err) {
        console.error('Cart API error:', err);
        res.status(500).json({ success: false, error: 'Failed to load cart' });
    }
});

// Add to cart (API)
router.post('/add', ensureAuth, async (req, res) => {
    try {
        const { productId, variant, weight, quantity } = req.body;
        const product = await Product.findById(productId);
        if (!product || !product.isActive) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Get price for selected variant/weight
        let unitPrice = 0;
        if (product.hasVariants && variant) {
            const selectedVariant = product.variants.find(v => v.name === variant);
            if (selectedVariant) {
                unitPrice = selectedVariant.prices[weight] || 0;
            }
        } else {
            unitPrice = product.basePrices[weight] || 0;
        }

        if (unitPrice === 0) {
            return res.status(400).json({ error: 'Invalid variant/weight selection' });
        }

        let cart = await Cart.findOne({ user: req.user._id });
        if (!cart) {
            cart = new Cart({ user: req.user._id, items: [] });
        }

        // Check if same product+variant+weight already in cart
        const existingIndex = cart.items.findIndex(
            item => item.product.toString() === productId && item.variant === (variant || '') && item.weight === weight
        );

        if (existingIndex !== -1) {
            cart.items[existingIndex].quantity = Math.min(
                cart.items[existingIndex].quantity + (quantity || 1), 100
            );
            cart.items[existingIndex].unitPrice = unitPrice;
        } else {
            cart.items.push({
                product: productId,
                variant: variant || '',
                weight,
                quantity: Math.min(quantity || 1, 100),
                unitPrice
            });
        }

        await cart.save();
        res.json({ success: true, itemCount: cart.getItemCount() });
    } catch (err) {
        console.error('Add to cart error:', err);
        res.status(500).json({ error: 'Failed to add to cart' });
    }
});

// Update cart item quantity (API)
router.put('/update', ensureAuth, async (req, res) => {
    try {
        const { itemId, quantity } = req.body;
        const cart = await Cart.findOne({ user: req.user._id });
        if (!cart) return res.status(404).json({ error: 'Cart not found' });

        const item = cart.items.id(itemId);
        if (!item) return res.status(404).json({ error: 'Item not found in cart' });

        if (quantity <= 0) {
            cart.items.pull(itemId);
        } else {
            item.quantity = Math.min(quantity, 100);
        }

        await cart.save();
        res.json({ success: true, total: cart.getTotal(), itemCount: cart.getItemCount() });
    } catch (err) {
        console.error('Update cart error:', err);
        res.status(500).json({ error: 'Failed to update cart' });
    }
});

// Remove cart item (API)
router.delete('/remove/:itemId', ensureAuth, async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user._id });
        if (!cart) return res.status(404).json({ error: 'Cart not found' });

        cart.items.pull(req.params.itemId);
        await cart.save();
        res.json({ success: true, total: cart.getTotal(), itemCount: cart.getItemCount() });
    } catch (err) {
        console.error('Remove cart item error:', err);
        res.status(500).json({ error: 'Failed to remove item' });
    }
});

// Cart count (API - for header badge)
router.get('/count', async (req, res) => {
    try {
        if (!req.user) return res.json({ count: 0 });
        const cart = await Cart.findOne({ user: req.user._id });
        res.json({ count: cart ? cart.getItemCount() : 0 });
    } catch (err) {
        res.json({ count: 0 });
    }
});

module.exports = router;
