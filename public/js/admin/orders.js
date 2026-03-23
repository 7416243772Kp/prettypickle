document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        loadOrders('');
        
        document.getElementById('statusFilter').addEventListener('change', (e) => {
            loadOrders(e.target.value);
        });
    }, 500);
});

async function loadOrders(statusParam) {
    try {
        const query = statusParam ? `?status=${statusParam}` : '';
        const data = await fetchAdminAPI(`/api/admin/orders${query}`);
        
        document.getElementById('loadingIndicator').style.display = 'none';
        document.getElementById('ordersTableContainer').style.display = 'table';
        
        renderOrders(data.data.orders);
    } catch (err) {
        console.error('Failed to load orders', err);
        document.getElementById('loadingIndicator').innerHTML = `<p style="color:red;">Error loading orders.</p>`;
    }
}

function renderOrders(orders) {
    const tbody = document.getElementById('ordersTableBody');
    if (!orders || orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No orders found.</td></tr>';
        return;
    }
    
    tbody.innerHTML = orders.map(o => `
        <tr class="table-row-hover" onclick="if(!event.target.closest('button')) window.location.href='/admin/orders/${o._id}';" style="cursor:pointer;">
            <td><strong>${o.orderId}</strong></td>
            <td>
                <div>${o.address?.fullName || '—'}</div>
                <div style="font-size:0.8rem;color:var(--gray-mid);">${o.user?.email || o.address?.phone || ''}</div>
            </td>
            <td>${new Date(o.createdAt).toLocaleString('en-IN')}</td>
            <td>₹${o.totalAmount}</td>
            <td>
                <span style="font-size:0.85rem;text-transform:uppercase;">${o.paymentMethod || '—'}</span>
            </td>
            <td><span class="order-status ${o.status}">${o.status}</span></td>
            <td>
                <a href="/admin/orders/${o._id}" class="btn btn-small" style="background:#f5f5f5;color:#000;">View</a>
            </td>
        </tr>
    `).join('');
}
