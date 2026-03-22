const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

// Storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', 'public', 'images', 'uploads'));
    },
    filename: (req, file, cb) => {
        // Generate unique filename: timestamp-randomhex.ext
        const uniqueName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

// File filter — only allow images
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only JPG, PNG, and WebP images are allowed'), false);
    }
};

// Multer upload instances
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB max
    }
});

// Single product image upload
const uploadProductImage = upload.array('images', 5);

// Single banner image upload
const uploadBannerImage = upload.single('image');

// Error handling wrapper
const handleUploadError = (uploadFn) => {
    return (req, res, next) => {
        uploadFn(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({ error: 'File too large. Maximum 5MB allowed.' });
                }
                return res.status(400).json({ error: err.message });
            }
            if (err) {
                return res.status(400).json({ error: err.message });
            }
            next();
        });
    };
};

module.exports = {
    uploadProductImage: handleUploadError(uploadProductImage),
    uploadBannerImage: handleUploadError(uploadBannerImage)
};
