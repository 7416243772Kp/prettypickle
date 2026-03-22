const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP2GO_HOST,
    port: parseInt(process.env.SMTP2GO_PORT),
    secure: false,
    auth: {
        user: process.env.SMTP2GO_USER,
        pass: process.env.SMTP2GO_PASS
    }
});

const sendEmail = async ({ to, subject, html, attachments = [] }) => {
    try {
        const mailOptions = {
            from: `"${process.env.SMTP2GO_FROM_NAME}" <${process.env.SMTP2GO_FROM_EMAIL}>`,
            to,
            subject,
            html,
            attachments
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (err) {
        console.error('Email Error:', err);
        return { success: false, error: err.message };
    }
};

// Verify connection on startup
const verifyEmailConnection = async () => {
    try {
        await transporter.verify();
        console.log('SMTP2GO Email service ready');
    } catch (err) {
        console.error('SMTP2GO connection failed:', err.message);
    }
};

module.exports = { sendEmail, verifyEmailConnection };
