const mongoose = require('mongoose');

const deliverySettingSchema = new mongoose.Schema({
    deliveryCharge: {
        type: Number,
        default: 50,
        min: 0
    },
    freeDeliveryAbove: {
        type: Number,
        default: 499,
        min: 0 // 0 means no free delivery threshold
    },
    expectedDeliveryText: {
        type: String,
        default: '1-2 weeks'
    }
}, {
    timestamps: true
});

// Ensure only one settings document exists
deliverySettingSchema.statics.getSettings = async function() {
    let settings = await this.findOne();
    if (!settings) {
        settings = await this.create({});
    }
    return settings;
};

module.exports = mongoose.model('DeliverySetting', deliverySettingSchema);
