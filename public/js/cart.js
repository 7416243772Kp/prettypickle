document.addEventListener('DOMContentLoaded', async () => {
    // Wait for auth state to populate from components.js initApp
    // A better approach is to just load the cart directly
    await loadCart();
});

async function loadCart() {
    try {
        const res = await fetch('/api/cart');
        if (res.status === 401) {
            renderEmptyCart(true);
            return;
        }
        
        const data = await res.json();
        if (!data.success) {
            document.getElementById('cartContainer').innerHTML = `<h2>${data.error || 'Failed to load cart'}</h2>`;
            return;
        }

        const cart = data.data.cart;
        if (!cart || !cart.items || cart.items.length === 0) {
            renderEmptyCart(false);
            return;
        }

        renderCart(cart);
        
        // Update header badge
        globalCartCount = cart.items.reduce((acc, item) => acc + item.quantity, 0);
        if (typeof updateCartBadge === 'function') updateCartBadge();
        
    } catch (err) {
        console.error('Error fetching cart:', err);
        document.getElementById('cartContainer').innerHTML = `<h2>Failed to load cart. Please try again.</h2>`;
    }
}

function renderEmptyCart(requiresAuth) {
    document.getElementById('cartContainer').innerHTML = `
        <h1 class="page-title">Shopping Cart</h1>
        <div class="error-page" style="min-height:30vh;">
            <p>${requiresAuth ? 'Please sign in to view your cart' : 'Your cart is empty'}</p>
            ${requiresAuth 
                ? `<a href="/api/auth/google" class="btn btn-primary mt-20">Sign In</a>`
                : `<a href="/" class="btn btn-primary mt-20">Continue Shopping</a>`
            }
        </div>
    `;
}

function renderCart(cart) {
    let itemsHTML = '';
    let cartTotal = 0;

    cart.items.forEach(item => {
        const product = item.product;
        // In case product was deleted
        if (!product) return;

        const itemId = item._id;
        const itemQty = item.quantity;
        const itemImage = (product.images && product.images[0]) ? `/images/uploads/${product.images[0]}` : '/images/placeholder-product.png';
        const itemTotal = item.unitPrice * itemQty;
        cartTotal += itemTotal;

        itemsHTML += `
            <div class="cart-item" data-item-id="${itemId}">
                <div class="cart-item-image">
                    <img src="${itemImage}" alt="${product.title}">
                </div>
                <div class="cart-item-info">
                    <div class="cart-item-title">
                        <a href="/product/${product.slug}">${product.title}</a>
                    </div>
                    <div class="cart-item-variant">
                        ${item.variant ? item.variant + ' · ' : ''}${item.weight}
                    </div>
                    <div class="quantity-controls" style="margin:8px 0;">
                        <button class="qty-btn" onclick="updateCartItem('${itemId}', ${itemQty - 1})">−</button>
                        <input type="text" value="${itemQty}" readonly style="width:40px;height:34px;text-align:center;">
                        <button class="qty-btn" onclick="updateCartItem('${itemId}', ${itemQty + 1})">+</button>
                    </div>
                    <div class="cart-item-price">₹${itemTotal.toLocaleString('en-IN')}</div>
                    <div class="cart-item-remove" onclick="removeCartItem('${itemId}')">✕ Remove</div>
                </div>
            </div>
        `;
    });

    const html = `
        <h1 class="page-title">Shopping Cart</h1>
        <div class="cart-layout">
            <div class="cart-items">
                ${itemsHTML}
            </div>
            <div class="cart-summary">
                <h3>Order Summary</h3>
                <div class="cart-summary-row">
                    <span>Subtotal</span>
                    <span id="cartSubtotal">₹${cartTotal.toLocaleString('en-IN')}</span>
                </div>
                <div class="cart-summary-row">
                    <span>Delivery</span>
                    <span>Calculated at checkout</span>
                </div>
                <div class="cart-summary-row total">
                    <span>Total</span>
                    <span id="cartTotal">₹${cartTotal.toLocaleString('en-IN')}</span>
                </div>
                <p style="font-size:0.75rem;color:var(--gray-mid);margin-top:6px;">Inclusive of all taxes</p>
                <a href="/checkout" class="btn btn-primary btn-full mt-20">Proceed to Checkout</a>
                <a href="/" class="btn btn-secondary btn-full mt-10">Continue Shopping</a>
            </div>
        </div>
    `;

    document.getElementById('cartContainer').innerHTML = html;
}

async function updateCartItem(itemId, qty) {
    if (qty < 1) return removeCartItem(itemId);
    if (qty > 100) {
        if (typeof showToast === 'function') showToast('Max 100 items', 'warning');
        return;
    }

    try {
        const res = await fetch('/api/cart/update', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemId, quantity: qty })
        });
        const data = await res.json();
        
        if (data.error) throw new Error(data.error);
        
        // Reload cart
        await loadCart();
    } catch (err) {
        if (typeof showToast === 'function') showToast(err.message, 'error');
    }
}

async function removeCartItem(itemId) {
    try {
        const res = await fetch(`/api/cart/remove/${itemId}`, { method: 'DELETE' });
        const data = await res.json();
        
        if (data.error) throw new Error(data.error);
        
        if (typeof showToast === 'function') showToast('Item removed');
        
        // Reload cart
        await loadCart();
    } catch (err) {
        if (typeof showToast === 'function') showToast(err.message, 'error');
    }
}
