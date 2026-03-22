const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
    image: {
        type: String,
        required: true
    },
    link: {
        type: String,
        default: '#'
    },
    position: {
        type: String,
        enum: ['top', 'bottom'],
        default: 'top'
    },
    displayOrder: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    // Announcement text (for scrolling banner)
    isScrolling: {
        type: Boolean,
        default: false
    },
    scrollText: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Banner', bannerSchema);
