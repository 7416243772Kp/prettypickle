const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true // e.g., 'Bone', 'Boneless'
    },
    prices: {
        '250g': { type: Number, default: 0 },
        '500g': { type: Number, default: 0 },
        '750g': { type: Number, default: 0 },
        '1kg': { type: Number, default: 0 },
        '2kg': { type: Number, default: 0 }
    }
}, { _id: true });

const productSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    description: {
        type: String,
        default: '',
        trim: true
    },
    images: [{
        type: String // filename stored in /public/images/uploads/
    }],
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['veg', 'nonveg'],
        required: true
    },
    // If true, product has variants (e.g., Bone/Boneless)
    hasVariants: {
        type: Boolean,
        default: false
    },
    // Variants with individual pricing (for products with bone/boneless)
    variants: [variantSchema],
    // Base prices for products without variants
    basePrices: {
        '250g': { type: Number, default: 0 },
        '500g': { type: Number, default: 0 },
        '750g': { type: Number, default: 0 },
        '1kg': { type: Number, default: 0 },
        '2kg': { type: Number, default: 0 }
    },
    stock: {
        type: Number,
        default: 0,
        min: 0
    },
    totalSold: {
        type: Number,
        default: 0
    },
    avgRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    totalRatings: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    // SEO
    metaTitle: {
        type: String,
        default: ''
    },
    metaDescription: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// Generate slug from title
productSchema.pre('validate', function(next) {
    if (this.title && (!this.slug || this.isModified('title'))) {
        this.slug = this.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            + '-' + Date.now().toString(36);
    }
    next();
});

// Get the minimum price for display
productSchema.methods.getMinPrice = function() {
    if (this.hasVariants && this.variants.length > 0) {
        let minPrice = Infinity;
        this.variants.forEach(v => {
            Object.values(v.prices.toJSON ? v.prices.toJSON() : v.prices).forEach(p => {
                if (p > 0 && p < minPrice) minPrice = p;
            });
        });
        return minPrice === Infinity ? 0 : minPrice;
    }
    const prices = this.basePrices.toJSON ? this.basePrices.toJSON() : this.basePrices;
    const validPrices = Object.values(prices).filter(p => p > 0);
    return validPrices.length > 0 ? Math.min(...validPrices) : 0;
};

// Update rating aggregates
productSchema.methods.updateRating = async function(Review) {
    const stats = await Review.aggregate([
        { $match: { product: this._id } },
        { $group: {
            _id: null,
            avgRating: { $avg: '$rating' },
            totalRatings: { $sum: 1 }
        }}
    ]);
    if (stats.length > 0) {
        this.avgRating = Math.round(stats[0].avgRating * 10) / 10;
        this.totalRatings = stats[0].totalRatings;
    } else {
        this.avgRating = 0;
        this.totalRatings = 0;
    }
    await this.save();
};

// Index for search
productSchema.index({ title: 'text', description: 'text' });
productSchema.index({ totalSold: -1 });
productSchema.index({ avgRating: -1 });

module.exports = mongoose.model('Product', productSchema);
