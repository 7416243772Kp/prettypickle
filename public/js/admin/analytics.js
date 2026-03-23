document.addEventListener('DOMContentLoaded', () => {
    setTimeout(loadAnalytics, 500);
});

async function loadAnalytics() {
    try {
        const data = await fetchAdminAPI('/api/admin/analytics');
        
        document.getElementById('loadingIndicator').style.display = 'none';
        document.getElementById('analyticsContainer').style.display = 'block';
        
        const res = data.data;
        
        renderTopProducts(res.topProducts);
        renderTopCustomers(res.topCustomers);
        renderCategoryStats(res.categoryStats);
        renderNeverBought(res.neverBought);

    } catch (err) {
        console.error('Failed to load analytics', err);
        document.getElementById('loadingIndicator').innerHTML = `<p style="color:red;">Error loading analytics data.</p>`;
    }
}

function renderTopProducts(products) {
    const tbody = document.getElementById('topProductsBody');
    if (!products || products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;">No data available.</td></tr>';
        return;
    }
    
    tbody.innerHTML = products.map(p => `
        <tr>
            <td>
                <div style="display:flex;align-items:center;">
                    <img src="${p.images?.[0] ? `/images/uploads/${p.images[0]}` : '/images/placeholder.jpg'}" style="width:30px;height:30px;object-fit:cover;border-radius:4px;margin-right:12px;">
                    <div>
                        <strong>${p.title}</strong><br>
                        <small style="color:var(--gray-mid);">${p.category?.name || 'Uncategorized'}</small>
                    </div>
                </div>
            </td>
            <td style="font-weight:bold;">${p.totalSold}</td>
        </tr>
    `).join('');
}

function renderTopCustomers(customers) {
    const tbody = document.getElementById('topCustomersBody');
    if (!customers || customers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No data available.</td></tr>';
        return;
    }
    
    tbody.innerHTML = customers.map(c => `
        <tr>
            <td>
                <strong>${c.name}</strong><br>
                <small style="color:var(--gray-mid);">${c.email}</small>
            </td>
            <td>${c.orderCount}</td>
            <td style="color:green;font-weight:bold;">₹${c.totalSpent.toFixed(2)}</td>
        </tr>
    `).join('');
}

function renderCategoryStats(categories) {
    const tbody = document.getElementById('categoryStatsBody');
    if (!categories || categories.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No data available.</td></tr>';
        return;
    }
    
    tbody.innerHTML = categories.map(c => `
        <tr>
            <td><strong>${c.name}</strong></td>
            <td>${c.totalProducts}</td>
            <td style="font-weight:bold;">${c.totalSold}</td>
        </tr>
    `).join('');
}

function renderNeverBought(products) {
    const tbody = document.getElementById('neverBoughtBody');
    if (!products || products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;color:green;">Great! All active products have been sold at least once.</td></tr>';
        return;
    }
    
    tbody.innerHTML = products.map(p => `
        <tr>
            <td>
                <div style="display:flex;align-items:center;">
                    <img src="${p.images?.[0] ? `/images/uploads/${p.images[0]}` : '/images/placeholder.jpg'}" style="width:30px;height:30px;object-fit:cover;border-radius:4px;margin-right:12px;">
                    <strong>${p.title}</strong>
                </div>
            </td>
            <td>${p.category?.name || 'Uncategorized'}</td>
        </tr>
    `).join('');
}
