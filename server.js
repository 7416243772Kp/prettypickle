require('dotenv').config();
const express = require('express');
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
app.use('/api', require('./routes/pageRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/cart', require('./routes/cartRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));
app.use('/api/payment', require('./routes/paymentRoutes'));
app.use('/api/addresses', require('./routes/addressRoutes'));
app.use('/api/wishlist', require('./routes/wishlistRoutes'));

app.use('/api/adminAuth', require('./routes/adminAuthRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/delivery', require('./routes/deliveryRoutes'));

// ============================
// Frontend HTML Routing
// ============================
// We serve all HTML pages from the 'public' folder. 
// Fallback for dynamic frontend routes (like /product/slug) to return the base HTML file
app.get('/product/:slug', (req, res) => res.sendFile(path.join(__dirname, 'public', 'product.html')));
app.get('/category/:slug', (req, res) => res.sendFile(path.join(__dirname, 'public', 'category.html')));
app.get('/orders/:id', (req, res) => res.sendFile(path.join(__dirname, 'public', 'order-detail.html')));

// Catch-all mapping for other valid pages if they don't include .html extension
app.get('/:page', (req, res, next) => {
    const pages = ['cart', 'checkout', 'orders', 'profile', 'addresses', 'wishlist', 'search', 'categories', 'about', 'contact', 'terms', 'privacy', 'refund-policy', 'delivery-policy'];
    if (pages.includes(req.params.page)) {
        return res.sendFile(path.join(__dirname, 'public', `${req.params.page}.html`));
    }
    next();
});

// Admin panel dynamic routes
app.get('/admin/:page', (req, res, next) => {
    const adminPages = ['dashboard', 'products', 'categories', 'orders', 'coupons', 'promoters', 'bundles', 'banners', 'delivery', 'admins', 'analytics', 'settings'];
    if (adminPages.includes(req.params.page)) {
        return res.sendFile(path.join(__dirname, 'public', 'admin', `${req.params.page}.html`));
    }
    next();
});

app.get('/admin-login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin', 'login.html')));

// ============================
// 404 Handler
// ============================
app.use((req, res) => {
    if (req.accepts('html')) {
        res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
    } else {
        res.status(404).json({ error: 'Not found' });
    }
});

// ============================
// API Error Handler
// ============================
app.use((err, req, res, next) => {
    console.error('Server Error:', err);

    if (err.code === 'EBADCSRFTOKEN') {
        return res.status(403).json({ error: 'Session expired. Please refresh the page.' });
    }

    res.status(err.status || 500).json({ 
        error: process.env.NODE_ENV === 'production' ? 'Something went wrong.' : err.message 
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
