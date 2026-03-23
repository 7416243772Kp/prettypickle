// Global state and shared UI components
let globalAuthState = {
    isAuthenticated: false,
    user: null
};

let globalCartCount = 0;

// Fetch auth state
async function checkAuthState() {
    try {
        const res = await fetch('/api/auth/status');
        const data = await res.json();
        globalAuthState = data;
    } catch (err) {
        console.error('Failed to fetch auth status', err);
    }
}

// Fetch cart count
async function checkCartCount() {
    if (!globalAuthState.isAuthenticated) return;
    try {
        const res = await fetch('/api/cart/count');
        const data = await res.json();
        globalCartCount = data.count || 0;
        updateCartBadge();
    } catch (err) {
        console.error('Failed to fetch cart count', err);
    }
}

// Inject Header
function injectHeader() {
    const currentPath = window.location.pathname;
    const headerHTML = `
    <header class="header">
        <div class="header-inner">
            <a href="/" class="header-logo">
                <img src="/images/logo-placeholder.png" alt="Pretty Pickles Logo" onerror="this.style.background='#000';this.style.display='flex';this.style.alignItems='center';this.style.justifyContent='center';this.alt='PP';">
                <span class="header-logo-text">Pretty Pickles</span>
            </a>

            <nav class="header-nav" id="headerNav">
                <a href="/" class="${currentPath === '/' ? 'active' : ''}">Home</a>
                <a href="/categories" class="${currentPath.startsWith('/category') || currentPath === '/categories' ? 'active' : ''}">Menu</a>
                <a href="/orders" class="${currentPath === '/orders' ? 'active' : ''}">Orders</a>
                <a href="/wishlist" class="${currentPath === '/wishlist' ? 'active' : ''}">Wishlist</a>
                <a href="/contact" class="${currentPath === '/contact' ? 'active' : ''}">Contact</a>
            </nav>

            <div class="header-actions">
                <div class="header-search">
                    <span class="header-search-icon">🔍</span>
                    <input type="text" id="headerSearchInput" placeholder="Search pickles, snacks..." autocomplete="off">
                </div>

                <a href="/cart" class="btn-secondary btn-small" style="position:relative;">
                    🛒 Cart
                    <span id="cartCount" style="position:absolute;top:-6px;right:-6px;background:#000;color:#fff;width:18px;height:18px;border-radius:50%;font-size:0.65rem;display:flex;align-items:center;justify-content:center;display:none;">0</span>
                </a>

                ${globalAuthState.isAuthenticated ? `
                    <a href="/profile" class="btn-signin" title="${globalAuthState.user.name}">
                        <img src="${globalAuthState.user.avatar}" alt="${globalAuthState.user.name}" style="width:24px;height:24px;border-radius:50%;" onerror="this.src='/images/default-avatar.png'">
                        ${globalAuthState.user.name.split(' ')[0]}
                    </a>
                ` : `
                    <a href="/api/auth/google" class="btn-signin" id="signInBtn">Sign In</a>
                `}
            </div>

            <div class="menu-toggle" id="menuToggle">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    </header>
    `;

    document.getElementById('header-container').innerHTML = headerHTML;
    
    // Bind search
    const searchInput = document.getElementById('headerSearchInput');
    if (searchInput) {
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && searchInput.value.trim()) {
                window.location.href = `/search?q=${encodeURIComponent(searchInput.value.trim())}`;
            }
        });
    }

    // Bind mobile menu
    const menuToggle = document.getElementById('menuToggle');
    const headerNav = document.getElementById('headerNav');
    if (menuToggle && headerNav) {
        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('open');
            headerNav.classList.toggle('open');
        });
    }

    updateCartBadge();
}

function updateCartBadge() {
    const badge = document.getElementById('cartCount');
    if (badge) {
        badge.textContent = globalCartCount;
        badge.style.display = globalCartCount > 0 ? 'flex' : 'none';
    }
}

// Inject Footer
function injectFooter() {
    const year = new Date().getFullYear();
    const footerHTML = `
    <footer class="footer">
        <div class="footer-grid">
            <div class="footer-col">
                <h3>Pretty Pickles</h3>
                <p>Authentic homemade pickles, snacks & delicacies crafted with love and traditional recipes.</p>
                <p style="margin-top:12px;">
                    📧 <a href="mailto:contact@prettypickles.com">contact@prettypickles.com</a>
                </p>
                <p>📍 Hyderabad, Telangana, India</p>
            </div>

            <div class="footer-col">
                <h3>Quick Links</h3>
                <a href="/">Home</a>
                <a href="/categories">Menu</a>
                <a href="/about">About Us</a>
                <a href="/contact">Contact Us</a>
            </div>

            <div class="footer-col">
                <h3>Policies</h3>
                <a href="/terms">Terms & Conditions</a>
                <a href="/privacy">Privacy Policy</a>
                <a href="/refund-policy">Refund Policy</a>
                <a href="/delivery-policy">Delivery Policy</a>
            </div>

            <div class="footer-col">
                <h3>My Account</h3>
                ${globalAuthState.isAuthenticated ? `
                    <a href="/profile">My Profile</a>
                    <a href="/orders">My Orders</a>
                    <a href="/addresses">My Addresses</a>
                    <a href="/wishlist">Wishlist</a>
                ` : `
                    <a href="/api/auth/google">Sign In</a>
                `}
            </div>
        </div>

        <div class="footer-bottom">
            <p>&copy; ${year} Pretty Pickles. All rights reserved.</p>
        </div>
    </footer>
    `;

    document.getElementById('footer-container').innerHTML = footerHTML;
}

// Toast notification feature
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

// Product Card Generator (Reusable across pages)
function renderProductCard(product) {
    let displayPrice = 0;
    if (product.hasVariants && product.variants && product.variants.length > 0) {
        const firstVariant = product.variants[0];
        displayPrice = firstVariant.prices['250g'] || firstVariant.prices['500g'] || Array.from(Object.values(firstVariant.prices))[0] || 0;
    } else if (product.basePrices) {
        displayPrice = product.basePrices['250g'] || product.basePrices['500g'] || Array.from(Object.values(product.basePrices))[0] || 0;
    }

    const typeMark = product.type === 'veg' ? '<div class="veg-mark"></div>' : '<div class="nonveg-mark"></div>';
    
    // Check if in user wishlist (naive check)
    const isWishlisted = false;
    const heartIcon = isWishlisted ? '♥' : '♡';
    const activeClass = isWishlisted ? 'active' : '';

    const imgUrl = product.images && product.images.length > 0 
        ? "/images/uploads/" + product.images[0]
        : '/images/placeholder-product.png';

    const avgRating = product.avgRating || 0;
    let starsHtml = '';
    for (let i = 1; i <= 5; i++) {
        starsHtml += i <= Math.round(avgRating) ? '★' : '☆';
    }

    return `
    <div class="product-card" onclick="window.location.href='/product/${product.slug}'">
        <div class="product-card-image">
            ${typeMark}
            <div class="product-card-wishlist ${activeClass}" onclick="event.stopPropagation(); toggleWishlist('${product._id}', this)" title="Add to Wishlist">
                ${heartIcon}
            </div>
            <img src="${imgUrl}" alt="${product.title}" loading="lazy">
        </div>
        <div class="product-card-info">
            <div class="product-card-title">${product.title}</div>
            <div class="product-card-price">
                ₹${displayPrice} <span class="price-per">onwards</span>
            </div>
            <div class="product-card-rating">
                <span class="rating-stars">${starsHtml}</span>
                <span>${avgRating.toFixed(1)}</span>
                <span class="rating-count">(${product.totalRatings || 0})</span>
            </div>
            <button class="btn-add-cart" onclick="event.stopPropagation(); window.location.href='/product/${product.slug}'">
                View Product
            </button>
        </div>
    </div>
    `;
}

// Wishlist toggle helper
async function toggleWishlist(productId, el) {
    if (!globalAuthState.isAuthenticated) {
        showToast('Please sign in first', 'error');
        window.location.href = '/api/auth/google';
        return;
    }
    try {
        const res = await fetch('/api/wishlist/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId })
        });
        const data = await res.json();
        if (data.success) {
            el.classList.toggle('active');
            el.innerHTML = el.classList.contains('active') ? '♥' : '♡';
            showToast(data.added ? 'Added to wishlist' : 'Removed from wishlist');
        } else {
            throw new Error(data.error);
        }
    } catch (err) {
        showToast(err.message || 'Failed to update wishlist', 'error');
    }
}

// Init function
async function initApp() {
    await checkAuthState();
    await checkCartCount();
    
    if (document.getElementById('header-container')) injectHeader();
    if (document.getElementById('footer-container')) injectFooter();
}

// Run init
document.addEventListener('DOMContentLoaded', initApp);
