const router = require('express').Router();
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const Admin = require('../models/Admin');
const { loginLimiter } = require('../middleware/rateLimiter');
const { validateAdminLogin } = require('../middleware/validators');
const { ensureAdmin } = require('../middleware/adminAuth');

// Admin login API
router.get('/admin-login/status', (req, res) => {
    if (req.session && req.session.adminId && req.session.adminTotpVerified) {
        return res.json({ status: 'authenticated' });
    }
    if (req.session && req.session.adminId && !req.session.adminTotpVerified) {
        return res.json({ status: 'pending_totp' });
    }
    res.json({ status: 'unauthenticated' });
});

// Admin login submit (API)
router.post('/admin-login', loginLimiter, validateAdminLogin, async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await Admin.findOne({ email });

        if (!admin || !(await admin.comparePassword(password))) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        req.session.adminId = admin._id;
        req.session.adminTotpVerified = false;
        req.session.adminLoginAt = new Date();

        if (admin.totpEnabled) {
            return res.json({ success: true, step: 'totp' });
        }

        if (!admin.totpSecret) {
            const secret = speakeasy.generateSecret({
                name: `Pretty Pickles Admin (${admin.email})`,
                issuer: 'Pretty Pickles'
            });
            admin.totpSecret = secret.base32;
            await admin.save();

            const qrDataUrl = await QRCode.toDataURL(secret.otpauth_url);

            return res.json({
                success: true,
                step: 'setup-totp',
                qrCode: qrDataUrl,
                secret: secret.base32
            });
        }

        return res.json({ success: true, step: 'totp' });
    } catch (err) {
        console.error('Admin login error:', err);
        res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
});

// Verify TOTP code (API)
router.post('/admin-login/totp', loginLimiter, async (req, res) => {
    try {
        const { totpCode } = req.body;
        const admin = await Admin.findById(req.session.adminId);

        if (!admin) {
            return res.status(401).json({ error: 'Session expired' });
        }

        const verified = speakeasy.totp.verify({
            secret: admin.totpSecret,
            encoding: 'base32',
            token: totpCode,
            window: 1
        });

        if (!verified) {
            return res.status(400).json({ error: 'Invalid TOTP code' });
        }

        if (!admin.totpEnabled) {
            admin.totpEnabled = true;
            await admin.save();
        }

        const sessionToken = crypto.randomBytes(32).toString('hex');
        await admin.addSession(sessionToken, req.headers['user-agent']);

        req.session.adminTotpVerified = true;
        req.session.adminSessionToken = sessionToken;
        req.session.adminLoginAt = new Date();
        req.session.cookie.maxAge = 24 * 60 * 60 * 1000;

        res.json({ success: true, redirect: '/admin/dashboard' });
    } catch (err) {
        console.error('TOTP verification error:', err);
        res.status(500).json({ error: 'Verification failed' });
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
