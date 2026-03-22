const router = require('express').Router();
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const Admin = require('../models/Admin');
const { loginLimiter } = require('../middleware/rateLimiter');
const { validateAdminLogin } = require('../middleware/validators');
const { ensureAdmin } = require('../middleware/adminAuth');

// Admin login page
router.get('/admin-login', (req, res) => {
    if (req.session && req.session.adminId && req.session.adminTotpVerified) {
        return res.redirect('/admin/dashboard');
    }
    res.render('admin/login', {
        layout: false,
        title: 'Admin Login',
        error: null,
        step: 'login' // 'login' or 'totp'
    });
});

// Admin login submit
router.post('/admin-login', loginLimiter, validateAdminLogin, async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await Admin.findOne({ email });

        if (!admin || !(await admin.comparePassword(password))) {
            return res.render('admin/login', {
                layout: false,
                title: 'Admin Login',
                error: 'Invalid email or password',
                step: 'login'
            });
        }

        // Store admin ID in session temporarily
        req.session.adminId = admin._id;
        req.session.adminTotpVerified = false;
        req.session.adminLoginAt = new Date();

        if (admin.totpEnabled) {
            // Redirect to TOTP verification
            return res.render('admin/login', {
                layout: false,
                title: 'TOTP Verification',
                error: null,
                step: 'totp'
            });
        }

        // If TOTP not yet set up, show setup page
        if (!admin.totpSecret) {
            const secret = speakeasy.generateSecret({
                name: `Pretty Pickles Admin (${admin.email})`,
                issuer: 'Pretty Pickles'
            });
            admin.totpSecret = secret.base32;
            await admin.save();

            const qrDataUrl = await QRCode.toDataURL(secret.otpauth_url);

            return res.render('admin/login', {
                layout: false,
                title: 'Setup TOTP',
                error: null,
                step: 'setup-totp',
                qrCode: qrDataUrl,
                secret: secret.base32
            });
        }

        // TOTP setup but not enabled — go to verify
        return res.render('admin/login', {
            layout: false,
            title: 'Verify TOTP',
            error: null,
            step: 'totp'
        });
    } catch (err) {
        console.error('Admin login error:', err);
        res.render('admin/login', {
            layout: false,
            title: 'Admin Login',
            error: 'Something went wrong. Please try again.',
            step: 'login'
        });
    }
});

// Verify TOTP code
router.post('/admin-login/totp', loginLimiter, async (req, res) => {
    try {
        const { totpCode } = req.body;
        const admin = await Admin.findById(req.session.adminId);

        if (!admin) {
            return res.redirect('/admin-login');
        }

        const verified = speakeasy.totp.verify({
            secret: admin.totpSecret,
            encoding: 'base32',
            token: totpCode,
            window: 1
        });

        if (!verified) {
            return res.render('admin/login', {
                layout: false,
                title: 'TOTP Verification',
                error: 'Invalid TOTP code. Please try again.',
                step: 'totp'
            });
        }

        // Enable TOTP if first time
        if (!admin.totpEnabled) {
            admin.totpEnabled = true;
            await admin.save();
        }

        // Generate session token for tracking
        const sessionToken = crypto.randomBytes(32).toString('hex');
        await admin.addSession(sessionToken, req.headers['user-agent']);

        req.session.adminTotpVerified = true;
        req.session.adminSessionToken = sessionToken;
        req.session.adminLoginAt = new Date();

        // Set admin session to 24 hours
        req.session.cookie.maxAge = 24 * 60 * 60 * 1000;

        res.redirect('/admin/dashboard');
    } catch (err) {
        console.error('TOTP verification error:', err);
        res.redirect('/admin-login');
    }
});

// Admin logout
router.get('/admin/logout', ensureAdmin, async (req, res) => {
    try {
        if (req.admin && req.session.adminSessionToken) {
            await req.admin.removeSession(req.session.adminSessionToken);
        }
        req.session.destroy((err) => {
            if (err) console.error('Admin session destroy error:', err);
            res.redirect('/admin-login');
        });
    } catch (err) {
        res.redirect('/admin-login');
    }
});

module.exports = router;
