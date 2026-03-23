document.addEventListener('DOMContentLoaded', async () => {
    await loadOrders();
});

async function loadOrders() {
    try {
        const res = await fetch('/api/orders');
        
        if (res.status === 401) {
            window.location.href = '/api/auth/google';
            return;
        }

        const data = await res.json();
        
        if (!data.success) {
            renderError(data.error || 'Failed to load orders');
            return;
        }

        renderOrders(data.data.orders);
    } catch (err) {
        console.error('Orders error:', err);
        renderError('Failed to load orders. Please try again.');
    }
}

function renderError(msg) {
    document.getElementById('ordersContainer').innerHTML = `
        <h1 class="page-title">My Orders</h1>
        <div class="error-page" style="min-height:30vh;">
            <p>${msg}</p>
            <a href="/" class="btn btn-primary mt-20">Start Shopping</a>
        </div>
    `;
}

function renderOrders(orders) {
    if (!orders || orders.length === 0) {
        renderError('No orders yet');
        return;
    }

    let html = `<h1 class="page-title">My Orders</h1>`;

    orders.forEach(order => {
        const formattedDate = new Date(order.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
        
        const itemsHtml = order.items.map(item => `
            <div style="font-size:0.85rem;">${item.title.substring(0,30)} × ${item.quantity}</div>
        `).join('');

        html += `
        <div class="order-card" onclick="window.location.href='/orders/${order.orderId}'">
            <div class="order-card-header">
                <div>
                    <strong>${order.orderId}</strong><br>
                    <span style="font-size:0.8rem;color:var(--gray-mid);">${formattedDate}</span>
                </div>
                <span class="order-status ${order.status}">${order.status}</span>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                ${itemsHtml}
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;">
                <strong>₹${order.totalAmount.toLocaleString('en-IN')}</strong>
                <button class="btn btn-small btn-secondary" onclick="event.stopPropagation(); reorder('${order.orderId}')">Reorder</button>
            </div>
        </div>
        `;
    });

    document.getElementById('ordersContainer').innerHTML = html;
}

async function reorder(orderId) {
    try {
        const res = await fetch(`/api/orders/reorder/${orderId}`, { method: 'POST' });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        if (typeof showToast === 'function') showToast('Items added to cart!');
        setTimeout(() => window.location.href = '/cart', 1000);
    } catch (err) {
        if (typeof showToast === 'function') showToast(err.message, 'error');
    }
}
