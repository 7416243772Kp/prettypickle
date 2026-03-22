const Admin = require('../models/Admin');

// Admin authentication middleware
const ensureAdmin = async (req, res, next) => {
    if (req.session && req.session.adminId && req.session.adminTotpVerified) {
        try {
            const admin = await Admin.findById(req.session.adminId);
            if (admin) {
                req.admin = admin;
                res.locals.admin = admin;
                return next();
            }
        } catch (err) {
            console.error('Admin auth error:', err);
        }
    }
    res.redirect('/admin-login');
};

// Primary admin only middleware
const ensurePrimaryAdmin = async (req, res, next) => {
    if (req.admin && req.admin.role === 'primary') {
        return next();
    }
    res.status(403).render('admin/error', {
        layout: 'layouts/admin',
        title: 'Access Denied',
        message: 'Only the primary admin can access this section.'
    });
};

// Check admin session expiry (24 hours)
const checkAdminSession = (req, res, next) => {
    if (req.session && req.session.adminLoginAt) {
        const loginTime = new Date(req.session.adminLoginAt).getTime();
        const now = Date.now();
        const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

        if (now - loginTime > TWENTY_FOUR_HOURS) {
            req.session.destroy((err) => {
                if (err) console.error('Session destroy error:', err);
                return res.redirect('/admin-login');
            });
            return;
        }
    }
    next();
};

module.exports = { ensureAdmin, ensurePrimaryAdmin, checkAdminSession };
