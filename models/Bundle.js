const mongoose = require('mongoose');

const bundleSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        unique: true
    },
    description: {
        type: String,
        default: ''
    },
    products: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        variant: { type: String, default: '' },
        weight: { type: String, default: '250g' }
    }],
    originalPrice: {
        type: Number,
        default: 0
    },
    bundlePrice: {
        type: Number,
        required: true
    },
    image: {
        type: String,
        default: ''
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

bundleSchema.pre('validate', function(next) {
    if (this.name && !this.slug) {
        this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36);
    }
    next();
});

module.exports = mongoose.model('Bundle', bundleSchema);
