document.addEventListener('DOMContentLoaded', () => {
    setTimeout(loadCoupons, 500);
});

async function loadCoupons() {
    try {
        const data = await fetchAdminAPI('/api/admin/coupons');
        
        document.getElementById('loadingIndicator').style.display = 'none';
        document.getElementById('couponsTableContainer').style.display = 'table';
        
        renderCoupons(data.data.coupons);
    } catch (err) {
        console.error('Failed to load coupons', err);
        document.getElementById('loadingIndicator').innerHTML = `<p style="color:red;">Error loading coupons.</p>`;
    }
}

function renderCoupons(coupons) {
    const tbody = document.getElementById('couponsTableBody');
    if (!coupons || coupons.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No coupons found.</td></tr>';
        return;
    }
    
    tbody.innerHTML = coupons.map(c => `
        <tr>
            <td><strong>${c.code}</strong></td>
            <td>
                ${c.discountType === 'percentage' ? `${c.discountValue}% off` : `₹${c.discountValue} off`}
                ${c.maxDiscountAmount ? `<br><small style="color:var(--gray-mid);">Max: ₹${c.maxDiscountAmount}</small>` : ''}
            </td>
            <td>
                <span style="font-size:0.8rem;text-transform:uppercase;background:#eee;padding:2px 6px;border-radius:4px;">${c.usageType}</span>
                <br><small style="color:var(--gray-mid);">${c.timesUsed} uses</small>
            </td>
            <td><span style="font-size:0.85rem;text-transform:capitalize;">${c.scope}</span></td>
            <td>${c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('en-IN') : 'Never'}</td>
            <td>
                <a href="/admin/coupons/edit/${c._id}" class="btn btn-small" style="background:#f5f5f5;color:#000;">Edit</a>
                <button class="btn btn-small btn-danger" onclick="deleteCoupon('${c._id}')">Delete</button>
            </td>
        </tr>
    `).join('');
}

async function deleteCoupon(id) {
    if (!confirm('Are you sure you want to delete this coupon?')) return;
    try {
        await fetchAdminAPI(`/api/admin/coupons/${id}`, { method: 'DELETE' });
        showToast('Coupon deleted');
        loadCoupons();
    } catch (err) {
        showToast(err.message, 'error');
    }
}
