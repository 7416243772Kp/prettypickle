document.addEventListener('DOMContentLoaded', async () => {
    // Wait for auth from components.js to resolve briefly
    setTimeout(loadDashboard, 500);
});

async function loadDashboard() {
    try {
        const data = await fetchAdminAPI('/api/admin/dashboard');
        
        document.getElementById('loadingIndicator').style.display = 'none';
        document.getElementById('dashboardStats').style.display = 'block';
        
        const stats = data.data.stats;
        
        document.getElementById('statToday').textContent = `₹${(stats.todaySales || 0).toLocaleString('en-IN')}`;
        document.getElementById('statYesterday').textContent = `₹${(stats.yesterdaySales || 0).toLocaleString('en-IN')}`;
        document.getElementById('statWeek').textContent = `₹${(stats.weekSales || 0).toLocaleString('en-IN')}`;
        document.getElementById('statMonth').textContent = `₹${(stats.monthSales || 0).toLocaleString('en-IN')}`;
        document.getElementById('statLastMonth').textContent = `₹${(stats.lastMonthSales || 0).toLocaleString('en-IN')}`;
        document.getElementById('statTotalSales').textContent = `₹${(stats.totalSales || 0).toLocaleString('en-IN')}`;
        document.getElementById('statTotalOrders').textContent = (stats.totalOrders || 0).toLocaleString('en-IN');
        
        renderRecentOrders(data.data.recentOrders);
        renderChart(stats);
        
    } catch (err) {
        console.error('Failed to load dashboard', err);
        document.getElementById('loadingIndicator').innerHTML = `<p style="color:red;">Error loading dashboard data.</p>`;
    }
}

function renderRecentOrders(orders) {
    const tbody = document.getElementById('recentOrdersTable');
    if (!orders || orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No recent orders.</td></tr>';
        return;
    }
    
    tbody.innerHTML = orders.map(o => `
        <tr onclick="window.location.href='/admin/orders/${o._id}';" style="cursor:pointer;" class="table-row-hover">
            <td>${o.orderId}</td>
            <td>${o.address?.fullName || '—'}</td>
            <td>₹${o.totalAmount}</td>
            <td>${o.paymentMethod || '—'}</td>
            <td><span class="order-status ${o.status}">${o.status}</span></td>
            <td>${new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
        </tr>
    `).join('');
}

function renderChart(stats) {
    document.getElementById('chartContainer').style.display = 'block';
    const ctx = document.getElementById('salesChart');
    if (!ctx) return;
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Last Month', 'This Month', 'This Week', 'Yesterday', 'Today'],
            datasets: [{
                label: 'Sales (₹)',
                data: [stats.lastMonthSales, stats.monthSales, stats.weekSales, stats.yesterdaySales, stats.todaySales],
                borderColor: '#00cc66',
                tension: 0.1,
                fill: false,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}
