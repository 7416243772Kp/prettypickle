const router = require('express').Router();
const { ensureAuth } = require('../middleware/auth');
const Address = require('../models/Address');

// Middleware
router.use(ensureAuth);

// List addresses (API)
router.get('/', async (req, res) => {
    try {
        const addresses = await Address.find({ user: req.user._id });
        res.json({ success: true, data: { addresses } });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch addresses' });
    }
});

// Save address (API)
router.post('/save', async (req, res) => {
    try {
        const { label, fullName, phone, line1, line2, city, state, pincode, isDefault } = req.body;
        
        if (isDefault) {
            await Address.updateMany({ user: req.user._id }, { isDefault: false });
        }

        const address = await Address.create({
            user: req.user._id,
            label, fullName, phone, line1, line2, city, state, pincode,
            isDefault: !!isDefault
        });

        res.json({ success: true, address });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save address' });
    }
});

// Delete address (API)
router.delete('/:id', async (req, res) => {
    try {
        await Address.findOneAndDelete({ _id: req.params.id, user: req.user._id });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete address' });
    }
});

module.exports = router;
