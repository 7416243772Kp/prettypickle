const getOrderConfirmationHTML = (order, user) => {
    const itemsHTML = order.items.map(item => `
        <tr>
            <td style="padding:8px;border-bottom:1px solid #eee;">
                ${item.title}${item.variant ? ` (${item.variant})` : ''} - ${item.weight}
            </td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">₹${item.totalPrice}</td>
        </tr>
    `).join('');

    return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#000;">
        <div style="text-align:center;padding:20px 0;border-bottom:2px solid #000;">
            <h1 style="margin:0;font-size:24px;">Pretty Pickles</h1>
            <p style="margin:5px 0 0;color:#666;">Order Confirmation</p>
        </div>

        <div style="padding:20px 0;">
            <p>Hi <strong>${user.name}</strong>,</p>
            <p>Thank you for your order! Here are your order details:</p>
        </div>

        <div style="background:#f5f5f5;padding:15px;border-radius:4px;margin-bottom:20px;">
            <p style="margin:0;"><strong>Order ID:</strong> ${order.orderId}</p>
            <p style="margin:5px 0 0;"><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p style="margin:5px 0 0;"><strong>Payment:</strong> ${order.paymentMethod === 'online' ? 'Paid Online' : 'Cash on Delivery'}</p>
            <p style="margin:5px 0 0;"><strong>Expected Delivery:</strong> ${order.expectedDelivery}</p>
        </div>

        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
            <thead>
                <tr style="background:#000;color:#fff;">
                    <th style="padding:10px;text-align:left;">Product</th>
                    <th style="padding:10px;text-align:center;">Qty</th>
                    <th style="padding:10px;text-align:right;">Price</th>
                </tr>
            </thead>
            <tbody>${itemsHTML}</tbody>
        </table>

        <div style="text-align:right;padding:10px 0;">
            <p style="margin:4px 0;">Subtotal: ₹${order.subtotal}</p>
            <p style="margin:4px 0;">Delivery: ₹${order.deliveryCharge}</p>
            ${order.discount > 0 ? `<p style="margin:4px 0;color:green;">Discount: -₹${order.discount}</p>` : ''}
            <p style="margin:4px 0;font-size:18px;"><strong>Total: ₹${order.totalAmount}</strong></p>
            <p style="margin:4px 0;font-size:12px;color:#666;">(Inclusive of GST)</p>
        </div>

        <div style="background:#f5f5f5;padding:15px;border-radius:4px;margin:20px 0;">
            <p style="margin:0;font-weight:bold;">Delivery Address:</p>
            <p style="margin:5px 0 0;">${order.address.fullName}<br>
            ${order.address.line1}${order.address.line2 ? ', ' + order.address.line2 : ''}<br>
            ${order.address.city}, ${order.address.state} - ${order.address.pincode}<br>
            Phone: ${order.address.phone}</p>
        </div>

        <div style="text-align:center;padding:20px 0;border-top:1px solid #eee;color:#999;font-size:12px;">
            <p>Pretty Pickles — Authentic Homemade Pickles</p>
            <p>If you have any questions, reply to this email.</p>
        </div>
    </body>
    </html>`;
};

const getReturnConfirmationHTML = (order, user) => {
    return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#000;">
        <div style="text-align:center;padding:20px 0;border-bottom:2px solid #000;">
            <h1 style="margin:0;">Pretty Pickles</h1>
        </div>
        <div style="padding:20px 0;">
            <p>Hi <strong>${user.name}</strong>,</p>
            <p>Your return request for order <strong>${order.orderId}</strong> has been received.</p>
            <p>We will process your refund within 5-7 business days.</p>
            <p>Reason: ${order.returnReason || 'Not specified'}</p>
        </div>
        <div style="text-align:center;padding:20px 0;border-top:1px solid #eee;color:#999;font-size:12px;">
            <p>Pretty Pickles — Authentic Homemade Pickles</p>
        </div>
    </body>
    </html>`;
};

module.exports = { getOrderConfirmationHTML, getReturnConfirmationHTML };
