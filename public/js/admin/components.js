// Admin Components Sidebar
async function renderAdminSidebar() {
    const sidebarHTML = `
        <aside class="admin-sidebar" id="adminSidebar">
            <div class="admin-sidebar-logo">
                ⚙️ Pretty Pickles<br>
                <span style="font-size:0.7rem;font-weight:400;opacity:0.6;">Admin Panel</span>
            </div>

            <a href="/admin/dashboard" id="nav-dashboard">📊 Dashboard</a>
            <a href="/admin/products" id="nav-products">📦 Products</a>
            <a href="/admin/categories" id="nav-categories">📁 Categories</a>
            <a href="/admin/orders" id="nav-orders">🧾 Orders</a>
            <a href="/admin/coupons" id="nav-coupons">🏷️ Coupons</a>
            <a href="/admin/promoters" id="nav-promoters">💰 Promoters</a>
            <a href="/admin/bundles" id="nav-bundles">🎁 Bundles</a>
            <a href="/admin/banners" id="nav-banners">🖼️ Banners</a>
            <a href="/admin/delivery" id="nav-delivery">🚚 Delivery</a>
            <a href="/admin/analytics" id="nav-analytics">📈 Analytics</a>
            <a href="/admin/settings" id="nav-settings">⚙️ Settings</a>

            <div id="adminMenuDynamic"></div>

            <a href="/api/adminAuth/admin/logout" style="border-top:1px solid rgba(255,255,255,0.1);margin-top:auto;padding-top:16px;color:rgba(255,255,255,0.4);">🚪 Logout</a>
        </aside>

        <button id="adminMenuToggle" style="display:none;position:fixed;top:16px;left:16px;z-index:101;background:#000;color:#fff;border:none;border-radius:4px;padding:8px 12px;cursor:pointer;font-size:1.2rem;">☰</button>
    `;

    const container = document.getElementById('admin-sidebar-container');
    if (container) {
        container.innerHTML = sidebarHTML;

        // Mobile toggle
        const toggle = document.getElementById('adminMenuToggle');
        const sidebar = document.getElementById('adminSidebar');
        if (toggle && sidebar) {
            toggle.addEventListener('click', () => {
                sidebar.classList.toggle('open');
            });
            // Show toggle on mobile CSS:
            const style = document.createElement('style');
            style.textContent = `@media (max-width: 768px) { #adminMenuToggle { display: block !important; } }`;
            document.head.appendChild(style);
        }

        // Highlight active path
        const path = window.location.pathname;
        const links = container.querySelectorAll('a');
        links.forEach(link => {
            if (link.getAttribute('href') === path || path.startsWith(link.getAttribute('href') + '/')) {
                link.classList.add('active');
            }
        });
    }

    // Check auth status globally for admin
    try {
        const res = await fetch('/api/adminAuth/admin-login/status');
        const data = await res.json();
        if (data.status !== 'authenticated') {
            window.location.href = '/admin-login';
        }
    } catch (e) {
        window.location.href = '/admin-login';
    }
}

// Custom fetch wrapper for admin requests
async function fetchAdminAPI(url, options = {}) {
    // You could dynamically fetch the CSRF token if needed, but for now we'll just omit it or rely on cookies
    const defaults = {
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'same-origin'
    };
    const config = { ...defaults, ...options };
    if (options.headers) {
        config.headers = { ...defaults.headers, ...options.headers };
    }
    
    const response = await fetch(url, config);
    
    // Auto redirect on 401
    if (response.status === 401) {
        window.location.href = '/admin-login';
        return;
    }
    
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
    }
    return data;
}

function showToast(message, type = 'success', duration = 3000) {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Call on load
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('admin-sidebar-container')) {
        renderAdminSidebar();
    }
});
