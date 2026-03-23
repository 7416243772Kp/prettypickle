let currentOrderId = null;

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(loadOrderDetails, 500);
});

async function loadOrderDetails() {
    const pathParts = window.location.pathname.split('/');
    currentOrderId = pathParts[pathParts.length - 1];

    try {
        const data = await fetchAdminAPI(`/api/admin/orders/${currentOrderId}`);
        
        document.getElementById('loadingIndicator').style.display = 'none';
        document.getElementById('orderContainer').style.display = 'block';
        
        populateOrderData(data.data.order);
    } catch (err) {
        console.error('Failed to load order', err);
        document.getElementById('loadingIndicator').innerHTML = `<p style="color:red;">Error loading order details: ${err.message}</p>`;
    }
}

function populateOrderData(o) {
    document.getElementById('pageTitle').textContent = `Order ${o.orderId}`;
    document.getElementById('orderIdText').textContent = o.orderId;
    document.getElementById('orderDateText').textContent = new Date(o.createdAt).toLocaleString('en-IN');
    
    const badge = document.getElementById('orderStatusBadge');
    badge.textContent = o.status.toUpperCase();
    badge.className = `order-status ${o.status}`;
    
    document.getElementById('updateStatusSelect').value = o.status;

    // Customer
    document.getElementById('cName').textContent = o.address?.fullName || o.user?.name || '—';
    document.getElementById('cEmail').textContent = o.user?.email || '—';
    document.getElementById('cPhone').textContent = o.address?.phone || '—';

    // Address
    if (o.address) {
        document.getElementById('sFullName').textContent = o.address.fullName;
        document.getElementById('sLine1').textContent = o.address.streetAddress;
        document.getElementById('sLine2').textContent = o.address.landmark ? `Landmark: ${o.address.landmark}` : '';
        document.getElementById('sCityStateZip').textContent = `${o.address.city}, ${o.address.state} - ${o.address.pincode}`;
    }

    // Items
    const itemsHtml = o.items.map(item => `
        <tr>
            <td>
                <div style="display:flex;align-items:center;">
                    <img src="${item.image ? `/images/uploads/${item.image}` : '/images/placeholder.jpg'}" style="width:40px;height:40px;object-fit:cover;border-radius:4px;margin-right:12px;">
                    <strong>${item.title}</strong>
                </div>
            </td>
            <td>${item.variantWeight || 'Base'}</td>
            <td>₹${item.price}</td>
            <td>${item.quantity}</td>
            <td><strong>₹${item.price * item.quantity}</strong></td>
        </tr>
    `).join('');
    document.getElementById('orderItemsBody').innerHTML = itemsHtml;

    // Totals
    document.getElementById('subtotalCost').textContent = `₹${o.subtotal}`;
    document.getElementById('deliveryCost').textContent = `₹${o.deliveryFee}`;
    if (o.discountAmount > 0) {
        document.getElementById('discountRow').style.display = 'flex';
        document.getElementById('discountCost').textContent = `-₹${o.discountAmount}`;
    }
    document.getElementById('totalCost').textContent = `₹${o.totalAmount}`;
    
    document.getElementById('payMethod').textContent = o.paymentMethod || '—';
    document.getElementById('payStatus').textContent = o.paymentStatus || '—';
    if (o.paymentStatus === 'paid') document.getElementById('payStatus').style.color = 'green';
}

window.updateOrderStatus = async function() {
    const status = document.getElementById('updateStatusSelect').value;
    try {
        await fetchAdminAPI(`/api/admin/orders/${currentOrderId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
        showToast('Order status updated!');
        setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
        showToast(err.message, 'error');
    }
};
