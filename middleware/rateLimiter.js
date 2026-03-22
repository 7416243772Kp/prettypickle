const rateLimit = require('express-rate-limit');

// General API rate limiter
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes
    message: {
        status: 429,
        error: 'Too many requests. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Strict limiter for login endpoints
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 login attempts per 15 minutes
    message: {
        status: 429,
        error: 'Too many login attempts. Please try again after 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Payment endpoint limiter
const paymentLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 10, // 10 payment requests per minute
    message: {
        status: 429,
        error: 'Too many payment requests. Please try again later.'
    }
});

// API limiter for AJAX calls
const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // 60 API requests per minute
    message: {
        status: 429,
        error: 'Rate limit exceeded.'
    }
});

module.exports = { generalLimiter, loginLimiter, paymentLimiter, apiLimiter };
