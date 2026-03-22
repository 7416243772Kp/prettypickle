const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
        index: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    text: {
        type: String,
        required: true,
        trim: true,
        minlength: 10,
        maxlength: 1000
    }
}, {
    timestamps: true
});

// Prevent duplicate reviews: one review per user per product
reviewSchema.index({ user: 1, product: 1 }, { unique: true });

// Static method: get rating distribution for a product
reviewSchema.statics.getRatingDistribution = async function(productId) {
    const distribution = await this.aggregate([
        { $match: { product: productId } },
        {
            $group: {
                _id: '$rating',
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: -1 } }
    ]);

    const total = distribution.reduce((sum, d) => sum + d.count, 0);
    const result = {};
    for (let i = 5; i >= 1; i--) {
        const found = distribution.find(d => d._id === i);
        const count = found ? found.count : 0;
        result[i] = {
            count,
            percentage: total > 0 ? Math.round((count / total) * 100) : 0
        };
    }
    result.total = total;
    return result;
};

module.exports = mongoose.model('Review', reviewSchema);
