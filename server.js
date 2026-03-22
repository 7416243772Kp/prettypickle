require('dotenv').config();
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const MongoStore = require('connect-mongo').default || require('connect-mongo');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');

// Config imports
const connectDB = require('./config/db');
const passport = require('./config/passport');
const { verifyEmailConnection } = require('./config/email');

// Middleware imports
const setupSecurity = require('./middleware/security');
const { generalLimiter } = require('./middleware/rateLimiter');
const { checkAuth } = require('./middleware/auth');

const app = express();

// ============================
// Database Connection
// ============================
connectDB();

// ============================
// View Engine (EJS)
// ============================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// ============================
// Body Parsing
// ============================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ============================
// Security Middleware
// ============================
setupSecurity(app);
app.use(cors({ origin: process.env.SITE_URL, credentials: true }));

// ============================
// Rate Limiting
// ============================
app.use(generalLimiter);

// ============================
// Static Files
// ============================
app.use(express.static(path.join(__dirname, 'public')));

// ============================
// Session Configuration
// ============================
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        collectionName: 'sessions',
        ttl: 30 * 24 * 60 * 60 // 30 days for client sessions
    }),
    cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production'
    }
}));

// ============================
// Passport (Google OAuth)
// ============================
app.use(passport.initialize());
app.use(passport.session());

// ============================
// Global Middleware
// ============================
app.use(checkAuth);

// Make site config available to all templates
app.use((req, res, next) => {
    res.locals.siteUrl = process.env.SITE_URL;
    res.locals.siteName = 'Pretty Pickles';
    res.locals.fssaiLicense = process.env.FSSAI_LICENSE;
    res.locals.razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    res.locals.currentPath = req.path;
    next();
});

// ============================
// CSRF Protection (after session)
// ============================
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: false }); // Use session-based CSRF

// Apply CSRF to all non-API routes
app.use((req, res, next) => {
    // Skip CSRF for Razorpay webhooks and delivery API endpoints
    if (req.path.startsWith('/api/webhooks') || req.path.startsWith('/delivery/api') || req.path === '/payment/webhook') {
        return next();
    }
    csrfProtection(req, res, next);
});

// Make CSRF token available to all templates
app.use((req, res, next) => {
    if (req.csrfToken) {
        res.locals.csrfToken = req.csrfToken();
    }
    next();
});

// ============================
// Routes
// ============================
app.use('/', require('./routes/pageRoutes'));
app.use('/auth', require('./routes/authRoutes'));
app.use('/products', require('./routes/productRoutes'));
app.use('/cart', require('./routes/cartRoutes'));
app.use('/orders', require('./routes/orderRoutes'));
app.use('/reviews', require('./routes/reviewRoutes'));
app.use('/payment', require('./routes/paymentRoutes'));
app.use('/addresses', require('./routes/addressRoutes'));
app.use('/wishlist', require('./routes/wishlistRoutes'));

// Profile page
app.get('/profile', require('./middleware/auth').ensureAuth, (req, res) => {
    res.render('pages/profile', { title: 'My Profile' });
});

app.use('/', require('./routes/adminAuthRoutes'));
app.use('/admin', require('./routes/adminRoutes'));
app.use('/delivery', require('./routes/deliveryRoutes'));

// ============================
// 404 Handler
// ============================
app.use((req, res) => {
    res.status(404).render('pages/404', {
        layout: 'layouts/main',
        title: 'Page Not Found'
    });
});

// ============================
// Error Handler
// ============================
app.use((err, req, res, next) => {
    console.error('Server Error:', err);

    // CSRF token error
    if (err.code === 'EBADCSRFTOKEN') {
        return res.status(403).render('pages/error', {
            layout: 'layouts/main',
            title: 'Session Expired',
            message: 'Your session has expired. Please refresh and try again.'
        });
    }

    res.status(err.status || 500).render('pages/error', {
        layout: 'layouts/main',
        title: 'Error',
        message: process.env.NODE_ENV === 'production'
            ? 'Something went wrong. Please try again.'
            : err.message
    });
});

// ============================
// Start Server
// ============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Pretty Pickles server running on port ${PORT}`);
    console.log(`Visit: http://localhost:${PORT}`);
    verifyEmailConnection();
});

module.exports = app;
