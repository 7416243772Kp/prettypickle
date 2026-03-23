document.addEventListener('DOMContentLoaded', async () => {
    setTimeout(async () => {
        if (!globalAuthState.isAuthenticated) {
            window.location.href = '/api/auth/google';
            return;
        }
        await loadWishlist();
    }, 500);
});

async function loadWishlist() {
    try {
        const res = await fetch('/api/wishlist');
        const data = await res.json();
        
        if (data.error) throw new Error(data.error);

        renderWishlist(data.data.products);
    } catch (err) {
        console.error('Failed to load wishlist', err);
        document.getElementById('wishlistContainer').innerHTML = '<p style="text-align:center;color:red;grid-column:1/-1;">Failed to load wishlist.</p>';
    }
}

function renderWishlist(products) {
    const container = document.getElementById('wishlistContainer');
    
    if (!products || products.length === 0) {
        container.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:40px;">
                <p style="margin-bottom:20px;color:var(--gray-mid);">Your wishlist is empty</p>
                <a href="/" class="btn btn-primary">Discover Products</a>
            </div>
        `;
        return;
    }

    container.innerHTML = products.map(product => {
        // We use the helper function from components.js to render the card
        return renderProductCardWrapper(product);
    }).join('');
}

// Ensure renderProductCard doesn't crash if it isn't defined directly via a wrapper
function renderProductCardWrapper(product) {
    if (typeof renderProductCard === 'function') {
        return renderProductCard(product);
    }
    // Fallback if needed, but components.js should be loaded
    return `<div class="product-card">
        <a href="/product/${product.slug}">${product.title}</a>
    </div>`;
}
