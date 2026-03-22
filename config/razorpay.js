const Razorpay = require('razorpay');

// Razorpay instance for payment gateway
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// RazorpayX Payout helper
const createPayout = async ({ accountNumber, amount, upiId, purpose, referenceId }) => {
    const options = {
        account_number: accountNumber || process.env.RAZORPAYX_ACCOUNT_NUMBER,
        fund_account: {
            account_type: 'vpa',
            vpa: {
                address: upiId
            }
        },
        amount: amount * 100, // Convert to paise
        currency: 'INR',
        mode: 'UPI',
        purpose: purpose || 'payout',
        queue_if_low_balance: true,
        reference_id: referenceId || `payout_${Date.now()}`
    };

    try {
        const payout = await razorpay.payouts.create(options);
        return { success: true, payout };
    } catch (err) {
        console.error('RazorpayX Payout Error:', err);
        return { success: false, error: err.message };
    }
};

module.exports = { razorpay, createPayout };
