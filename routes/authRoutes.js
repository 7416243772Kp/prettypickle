const router = require('express').Router();
const passport = require('passport');

// Google OAuth login
router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email']
}));

// Google OAuth callback
router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/' }),
    (req, res) => {
        // Redirect to the page they were trying to visit, or home
        const returnTo = req.session.returnTo || '/';
        delete req.session.returnTo;
        res.redirect(returnTo);
    }
);

// Logout
router.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) console.error('Logout error:', err);
        req.session.destroy((err) => {
            if (err) console.error('Session destroy error:', err);
            res.redirect('/');
        });
    });
});

// Auth status API (for client-side JS)
router.get('/status', (req, res) => {
    res.json({
        isAuthenticated: req.isAuthenticated(),
        user: req.user ? {
            id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            avatar: req.user.avatar
        } : null
    });
});

module.exports = router;
