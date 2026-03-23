let orderSlug = '';

document.addEventListener('DOMContentLoaded', async () => {
    orderSlug = window.location.pathname.split('/').pop();
    await loadOrderData();
});

async function loadOrderData() {
    try {
        const res = await fetch(`/api/orders/${orderSlug}`);
        
        if (res.status === 401) {
            window.location.href = '/api/auth/google';
            return;
        }

        const data = await res.json();
        
        if (!data.success) {
            document.getElementById('orderDetailContainer').innerHTML = `
                <div class="error-page" style="min-height:30vh;">
                    <p>${data.error || 'Order not found'}</p>
                    <a href="/orders" class="btn btn-primary mt-20">Back to Orders</a>
                </div>
            `;
            return;
        }

        renderOrderDetail(data.data.order);
    } catch (err) {
        console.error('Order error:', err);
        document.getElementById('orderDetailContainer').innerHTML = `<h2>Failed to load order. Please try again.</h2>`;
    }
}

function renderOrderDetail(order) {
    const formattedDate = new Date(order.createdAt).toLocaleDateString('en-IN', {day:'numeric',month:'long',year:'numeric'});
    const steps = ['placed', 'confirmed', 'shipped', 'delivered'];
    const idx = steps.indexOf(order.status);
    
    const timelineHTML = steps.map((step, i) => `
        <div class="timeline-step ${i <= idx ? 'completed' : ''}">
            <div class="timeline-step-dot">${i <= idx ? '✓' : i+1}</div>
            <div class="timeline-step-label">${step.charAt(0).toUpperCase() + step.slice(1)}</div>
        </div>
    `).join('');

    const itemsHTML = order.items.map(item => `
        <div class="cart-item">
            <div class="cart-item-image">
                <img src="${item.image ? '/images/uploads/' + item.image : '/images/placeholder-product.png'}" alt="${item.title}">
            </div>
            <div class="cart-item-info">
                <div class="cart-item-title">${item.title}</div>
                <div class="cart-item-variant">${item.variant ? item.variant + ' · ' : ''}${item.weight} × ${item.quantity}</div>
                <div class="cart-item-price">₹${item.totalPrice.toLocaleString('en-IN')}</div>
            </div>
        </div>
    `).join('');

    const discountRow = order.discount > 0 ? `
        <div class="cart-summary-row" style="color:var(--success);">
            <span>Discount</span><span>-₹${order.discount.toLocaleString('en-IN')}</span>
        </div>
    ` : '';

    let returnSectionHTML = '';
    if (order.status === 'delivered') {
        const deliveredAt = order.deliveredAt || order.createdAt;
        const hoursSince = (Date.now() - new Date(deliveredAt).getTime()) / (1000 * 60 * 60);

        if (hoursSince <= 24) {
            returnSectionHTML = `
                <div style="margin-top:20px;">
                    <button class="btn btn-danger" onclick="document.getElementById('returnModal').classList.add('active')">Request Return/Replace</button>
                </div>
                <div class="modal-overlay" id="returnModal">
                    <div class="modal">
                        <div class="modal-header">
                            <h3>Return Request</h3>
                            <span class="modal-close" onclick="document.getElementById('returnModal').classList.remove('active')">×</span>
                        </div>
                        <p style="font-size:0.85rem;color:var(--gray-mid);margin-bottom:12px;">Returns accepted within 24 hours of delivery only.</p>
                        <div class="form-group">
                            <label>Reason</label>
                            <textarea id="returnReason" placeholder="Why are you returning?" required style="width:100%;height:80px;padding:8px;"></textarea>
                        </div>
                        <button class="btn btn-primary btn-full" onclick="submitReturn('${order.orderId}')">Submit Request</button>
                    </div>
                </div>
            `;
        }
    }

    const html = `
        <h1 class="page-title">Order ${order.orderId}</h1>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
            <span class="order-status ${order.status}">${order.status}</span>
            <span style="color:var(--gray-mid);font-size:0.85rem;">${formattedDate}</span>
        </div>
        
        <div class="order-timeline">
            ${timelineHTML}
        </div>
        
        <div style="margin:30px 0;">
            <h3 style="margin-bottom:12px;">Items</h3>
            ${itemsHTML}
        </div>
        
        <div class="cart-summary" style="max-width:400px;position:static;">
            <div class="cart-summary-row"><span>Subtotal</span><span>₹${order.subtotal.toLocaleString('en-IN')}</span></div>
            <div class="cart-summary-row"><span>Delivery</span><span>₹${order.deliveryCharge.toLocaleString('en-IN')}</span></div>
            ${discountRow}
            <div class="cart-summary-row total"><span>Total</span><span>₹${order.totalAmount.toLocaleString('en-IN')}</span></div>
            <div style="font-size:0.8rem;color:var(--gray-mid);margin-top:4px;">Payment: ${order.paymentMethod === 'online' ? 'Paid Online' : 'Cash on Delivery'}</div>
        </div>
        
        <div style="margin:20px 0;padding:16px;background:var(--gray-light);border-radius:4px;max-width:400px;">
            <h4 style="margin-bottom:8px;">Delivery Address</h4>
            <p>${order.address.fullName}, ${order.address.phone}</p>
            <p>${order.address.line1}${order.address.line2 ? ', ' + order.address.line2 : ''}</p>
            <p>${order.address.city}, ${order.address.state} - ${order.address.pincode}</p>
        </div>
        
        ${returnSectionHTML}
        
        <a href="/orders" class="btn btn-secondary mt-30" style="display:inline-block;">← Back to Orders</a>
    `;

    document.getElementById('orderDetailContainer').innerHTML = html;
}

async function submitReturn(orderId) {
    const reason = document.getElementById('returnReason').value;
    if (!reason) {
        if (typeof showToast === 'function') showToast('Please enter a reason', 'error');
        return;
    }
    try {
        const res = await fetch(`/api/orders/${orderId}/return`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        if (typeof showToast === 'function') showToast('Return request submitted');
        setTimeout(() => location.reload(), 1000);
    } catch (err) {
        if (typeof showToast === 'function') showToast(err.message, 'error');
    }
}
