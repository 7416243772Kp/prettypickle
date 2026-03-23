document.addEventListener('DOMContentLoaded', () => {
    setTimeout(loadPromoters, 500);
});

async function loadPromoters() {
    try {
        const data = await fetchAdminAPI('/api/admin/promoters');
        
        document.getElementById('loadingIndicator').style.display = 'none';
        document.getElementById('payoutsContainer').style.display = 'block';
        
        renderTable('promotersTableBody', data.data.promoters, 'promoter');
        renderTable('makersTableBody', data.data.makers, 'maker');

    } catch (err) {
        console.error('Failed to load promoters', err);
        document.getElementById('loadingIndicator').innerHTML = `<p style="color:red;">Error loading pending payouts.</p>`;
    }
}

function renderTable(tbodyId, dataList, type) {
    const tbody = document.getElementById(tbodyId);
    if (!dataList || dataList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--gray-mid);">No pending payouts for ${type}s.</td></tr>`;
        return;
    }
    
    tbody.innerHTML = dataList.map(item => `
        <tr>
            <td><strong>${item.upi}</strong></td>
            <td style="color:green;font-weight:600;font-size:1.1rem;">₹${item.amount.toFixed(2)}</td>
            <td><small style="color:var(--gray-mid);">${item.orders.join(', ')}</small></td>
            <td>
                <button class="btn btn-small btn-primary pay-btn" onclick="initiatePayout(this, '${item.upi}', ${item.amount}, '${type}')">
                    Pay Now (RazorpayX)
                </button>
            </td>
        </tr>
    `).join('');
}

window.initiatePayout = async function(btn, upi, amount, type) {
    if (!confirm(`Are you sure you want to payout ₹${amount} to ${upi}?`)) return;
    
    btn.disabled = true;
    btn.textContent = 'Processing...';
    
    try {
        const res = await fetchAdminAPI('/api/admin/promoters/pay', {
            method: 'POST',
            body: JSON.stringify({ upi, amount, type })
        });
        
        showToast('Payout successful! RazorpayX reference updated.');
        loadPromoters(); // Reload to clear from list
    } catch (err) {
        showToast(err.message, 'error');
        btn.disabled = false;
        btn.textContent = 'Pay Now (RazorpayX)';
    }
};
