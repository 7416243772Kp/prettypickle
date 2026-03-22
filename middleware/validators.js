const { body, param, query, validationResult } = require('express-validator');

// Handle validation errors
const handleValidation = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        if (req.xhr || req.headers.accept?.includes('json')) {
            return res.status(400).json({ errors: errors.array() });
        }
        req.flash && req.flash('error', errors.array()[0].msg);
        return res.redirect('back');
    }
    next();
};

// Product validation
const validateProduct = [
    body('title').trim().notEmpty().withMessage('Product title is required')
        .isLength({ max: 200 }).withMessage('Title must be under 200 characters'),
    body('category').notEmpty().withMessage('Category is required'),
    body('type').isIn(['veg', 'nonveg']).withMessage('Type must be veg or nonveg'),
    handleValidation
];

// Review validation
const validateReview = [
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('text').trim().isLength({ min: 10, max: 1000 }).withMessage('Review must be 10-1000 characters'),
    handleValidation
];

// Address validation
const validateAddress = [
    body('fullName').trim().notEmpty().withMessage('Full name is required'),
    body('phone').trim().matches(/^[6-9]\d{9}$/).withMessage('Enter a valid 10-digit Indian phone number'),
    body('line1').trim().notEmpty().withMessage('Address line 1 is required'),
    body('city').trim().notEmpty().withMessage('City is required'),
    body('state').trim().notEmpty().withMessage('State is required'),
    body('pincode').trim().matches(/^\d{6}$/).withMessage('Enter a valid 6-digit pincode'),
    handleValidation
];

// Coupon validation
const validateCoupon = [
    body('code').trim().notEmpty().withMessage('Coupon code is required')
        .isAlphanumeric().withMessage('Coupon code must be alphanumeric')
        .isLength({ max: 20 }).withMessage('Coupon code must be under 20 characters'),
    body('discountType').isIn(['percentage', 'flat']).withMessage('Invalid discount type'),
    body('discountValue').isFloat({ min: 0 }).withMessage('Discount value must be positive'),
    handleValidation
];

// Admin login validation
const validateAdminLogin = [
    body('email').isEmail().withMessage('Enter a valid email address').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
    handleValidation
];

// Contact form validation
const validateContact = [
    body('email').isEmail().withMessage('Enter a valid email address').normalizeEmail(),
    body('message').trim().isLength({ min: 10, max: 2000 }).withMessage('Message must be 10-2000 characters'),
    handleValidation
];

// Order quantity validation
const validateQuantity = [
    body('quantity').isInt({ min: 1, max: 100 }).withMessage('Quantity must be between 1 and 100'),
    handleValidation
];

module.exports = {
    handleValidation,
    validateProduct,
    validateReview,
    validateAddress,
    validateCoupon,
    validateAdminLogin,
    validateContact,
    validateQuantity
};
