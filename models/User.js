const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    googleId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    avatar: {
        type: String,
        default: ''
    },
    wishlist: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    }],
    recentlyViewed: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        },
        viewedAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

// Limit recently viewed to last 20
userSchema.methods.addRecentlyViewed = async function(productId) {
    const existing = this.recentlyViewed.findIndex(
        rv => rv.product.toString() === productId.toString()
    );
    if (existing !== -1) {
        this.recentlyViewed.splice(existing, 1);
    }
    this.recentlyViewed.unshift({ product: productId, viewedAt: new Date() });
    if (this.recentlyViewed.length > 20) {
        this.recentlyViewed = this.recentlyViewed.slice(0, 20);
    }
    await this.save();
};

// Toggle wishlist
userSchema.methods.toggleWishlist = async function(productId) {
    const index = this.wishlist.indexOf(productId);
    if (index === -1) {
        this.wishlist.push(productId);
    } else {
        this.wishlist.splice(index, 1);
    }
    await this.save();
    return index === -1; // true = added, false = removed
};

module.exports = mongoose.model('User', userSchema);
