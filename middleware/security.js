const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xssClean = require('xss-clean');
const hpp = require('hpp');

const setupSecurity = (app) => {
    // Helmet — sets various HTTP security headers
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: [
                    "'self'",
                    "'unsafe-inline'",
                    "https://checkout.razorpay.com",
                    "https://accounts.google.com",
                    "https://cdn.jsdelivr.net",
                    "https://unpkg.com"
                ],
                styleSrc: [
                    "'self'",
                    "'unsafe-inline'",
                    "https://fonts.googleapis.com"
                ],
                fontSrc: [
                    "'self'",
                    "https://fonts.gstatic.com"
                ],
                imgSrc: [
                    "'self'",
                    "data:",
                    "https:",
                    "blob:"
                ],
                frameSrc: [
                    "https://checkout.razorpay.com",
                    "https://api.razorpay.com"
                ],
                connectSrc: [
                    "'self'",
                    "https://api.razorpay.com",
                    "https://lux.razorpay.com"
                ]
            }
        },
        crossOriginEmbedderPolicy: false
    }));

    // Prevent NoSQL injection — sanitizes req.body, req.query, req.params
    app.use(mongoSanitize({
        replaceWith: '_',
        onSanitize: ({ req, key }) => {
            console.warn(`NoSQL injection attempt blocked on ${key}`);
        }
    }));

    // Prevent XSS attacks — sanitizes user input
    app.use(xssClean());

    // Prevent HTTP parameter pollution
    app.use(hpp({
        whitelist: ['price', 'rating', 'category']
    }));
};

module.exports = setupSecurity;
