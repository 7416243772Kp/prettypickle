const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    role: {
        type: String,
        enum: ['primary', 'secondary'],
        default: 'secondary'
    },
    totpSecret: {
        type: String,
        default: ''
    },
    totpEnabled: {
        type: Boolean,
        default: false
    },
    // Track sessions for "logout from all browsers"
    sessionTokens: [{
        token: String,
        device: String,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

// Hash password before saving
adminSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compare password
adminSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Invalidate all sessions (logout from all browsers)
adminSchema.methods.invalidateAllSessions = async function() {
    this.sessionTokens = [];
    await this.save();
};

// Add session token
adminSchema.methods.addSession = async function(token, device = 'unknown') {
    this.sessionTokens.push({ token, device, createdAt: new Date() });
    await this.save();
};

// Remove specific session
adminSchema.methods.removeSession = async function(token) {
    this.sessionTokens = this.sessionTokens.filter(s => s.token !== token);
    await this.save();
};

// Check if session token is valid
adminSchema.methods.isSessionValid = function(token) {
    return this.sessionTokens.some(s => s.token === token);
};

module.exports = mongoose.model('Admin', adminSchema);
