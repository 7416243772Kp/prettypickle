// Client authentication middleware
const ensureAuth = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    if (req.originalUrl.startsWith('/api/')) {
        return res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }
    // Store the original URL to redirect back after login
    req.session.returnTo = req.originalUrl;
    res.redirect('/api/auth/google');
};

// Check if user is authenticated (non-blocking)
const checkAuth = (req, res, next) => {
    res.locals.isAuthenticated = req.isAuthenticated();
    res.locals.currentUser = req.user || null;
    next();
};

// Ensure user is NOT authenticated (for login page)
const ensureGuest = (req, res, next) => {
    if (req.isAuthenticated()) {
        return res.redirect('/');
    }
    next();
};

module.exports = { ensureAuth, checkAuth, ensureGuest };
