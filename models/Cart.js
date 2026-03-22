const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    variant: {
        type: String,
        default: '' // 'Bone', 'Boneless', or empty
    },
    weight: {
        type: String,
        required: true // '250g', '500g', '750g', '1kg', '2kg'
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
        max: 100,
        default: 1
    },
    unitPrice: {
        type: Number,
        required: true
    }
}, { _id: true });

const cartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
        index: true
    },
    items: [cartItemSchema]
}, {
    timestamps: true
});

// Calculate cart totals
cartSchema.methods.getTotal = function() {
    return this.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
};

// Get item count
cartSchema.methods.getItemCount = function() {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
};

module.exports = mongoose.model('Cart', cartSchema);
