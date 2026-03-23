let selectedAddressId = '';
let paymentMethod = 'online';
let appliedCoupon = '';
let discountAmount = 0;
let subtotal = 0;
let currentDeliveryCharge = 0;
let grandTotal = 0;
let checkoutData = null;

document.addEventListener('DOMContentLoaded', async () => {
    await loadCheckout();
});

async function loadCheckout() {
    try {
        const res = await fetch('/api/orders/checkout/data');
        
        if (res.status === 401) {
            window.location.href = '/api/auth/google';
            return;
        }

        const data = await res.json();
        
        if (!data.success) {
            document.getElementById('checkoutContainer').innerHTML = `
                <div class="error-page" style="min-height:30vh;">
                    <p>${data.error || 'Failed to load checkout'}</p>
                    <a href="/cart" class="btn btn-primary mt-20">Back to Cart</a>
                </div>
            `;
            return;
        }

        checkoutData = data.data;
        renderCheckout();
    } catch (err) {
        console.error('Checkout error:', err);
        document.getElementById('checkoutContainer').innerHTML = `<h2>Failed to load checkout. Please try again.</h2>`;
    }
}

function renderCheckout() {
    const { cart, addresses, deliverySettings } = checkoutData;

    // Calculate totals
    subtotal = cart.items.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0);
    const freeThreshold = deliverySettings.freeDeliveryAbove;
    const baseDeliveryCharge = deliverySettings.deliveryCharge;
    const isFreeDelivery = (freeThreshold > 0 && subtotal >= freeThreshold);
    currentDeliveryCharge = isFreeDelivery ? 0 : baseDeliveryCharge;
    grandTotal = subtotal + currentDeliveryCharge - discountAmount;

    // Determine default address
    selectedAddressId = '';
    for (let ai = 0; ai < addresses.length; ai++) {
        if (addresses[ai].isDefault) { selectedAddressId = addresses[ai]._id.toString(); break; }
    }
    if (!selectedAddressId && addresses.length > 0) { selectedAddressId = addresses[0]._id.toString(); }

    // Render Addresses
    let addressesHTML = '';
    if (addresses.length === 0) {
        addressesHTML = `<p>No addresses saved. <a href="/addresses" style="text-decoration:underline;">Add one</a></p>`;
    } else {
        addressesHTML = addresses.map(addr => `
            <div class="address-card ${addr._id.toString() === selectedAddressId ? 'selected' : ''}" data-id="${addr._id}" onclick="selectAddress(this)">
                <div class="address-card-label">${addr.label} ${addr.isDefault ? '(Default)' : ''}</div>
                <p>${addr.fullName}, ${addr.phone}</p>
                <p>${addr.line1}${addr.line2 ? ', ' + addr.line2 : ''}</p>
                <p>${addr.city}, ${addr.state} - ${addr.pincode}</p>
            </div>
        `).join('');
    }

    // Render Cart Items
    let summaryItemsHTML = cart.items.map(item => `
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:0.85rem;">
            <span>${item.product.title.substring(0,30)} × ${item.quantity}</span>
            <span>₹${(item.unitPrice * item.quantity).toLocaleString('en-IN')}</span>
        </div>
    `).join('');

    const html = `
    <div class="checkout-layout">
        <div>
            <!-- Delivery Address -->
            <div class="checkout-section">
                <h2>Delivery Address</h2>
                ${addressesHTML}
            </div>

            <!-- Payment Method -->
            <div class="checkout-section">
                <h2>Payment Method</h2>
                <div class="payment-options">
                    <label class="payment-option selected" onclick="selectPayment('online', this)">
                        <input type="radio" name="payment" value="online" checked>
                        <div>
                            <div class="payment-option-label">Pay Online (Razorpay)</div>
                            <div style="font-size:0.8rem;color:var(--gray-mid);">UPI, Cards, Net Banking</div>
                        </div>
                    </label>
                    <label class="payment-option" onclick="selectPayment('cod', this)">
                        <input type="radio" name="payment" value="cod">
                        <div>
                            <div class="payment-option-label">Cash on Delivery</div>
                            <div style="font-size:0.8rem;color:var(--gray-mid);">Pay when you receive</div>
                        </div>
                    </label>
                </div>
            </div>
        </div>

        <!-- Order Summary -->
        <div class="cart-summary">
            <h3>Order Summary</h3>
            ${summaryItemsHTML}
            <div class="cart-summary-row" style="margin-top:12px;">
                <span>Subtotal</span>
                <span>₹${subtotal.toLocaleString('en-IN')}</span>
            </div>
            <div class="cart-summary-row">
                <span>Delivery</span>
                <span id="deliveryChargeDisplay">₹${currentDeliveryCharge.toLocaleString('en-IN')}</span>
            </div>

            <!-- Coupon -->
            <div class="coupon-input">
                <input type="text" id="couponInput" placeholder="Coupon code" style="text-transform:uppercase;">
                <button class="btn btn-small btn-secondary" onclick="applyCoupon()">Apply</button>
            </div>
            <div id="couponMessage" style="font-size:0.8rem;margin-bottom:8px;"></div>

            <div class="cart-summary-row" id="discountRow" style="display:none;color:var(--success);">
                <span>Discount</span>
                <span id="discountDisplay">-₹0</span>
            </div>

            <div class="cart-summary-row total">
                <span>Total</span>
                <span id="checkoutTotal">₹${grandTotal.toLocaleString('en-IN')}</span>
            </div>

            <button class="btn btn-primary btn-full btn-large mt-20" onclick="placeOrder()">Place Order</button>
        </div>
    </div>
    `;

    document.getElementById('checkoutContainer').innerHTML = html;
}

function selectAddress(el) {
    document.querySelectorAll('.address-card').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    selectedAddressId = el.getAttribute('data-id');
}

function selectPayment(method, el) {
    document.querySelectorAll('.payment-option').forEach(o => o.classList.remove('selected'));
    el.classList.add('selected');
    paymentMethod = method;
}

async function applyCoupon() {
    const code = document.getElementById('couponInput').value.trim();
    if (!code) return;
    try {
        const res = await fetch('/api/payment/apply-coupon', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, subtotal })
        });
        const result = await res.json();

        if (!res.ok || result.error) throw new Error(result.error || 'Invalid coupon');

        appliedCoupon = result.code;
        discountAmount = result.discount;
        grandTotal = subtotal + currentDeliveryCharge - discountAmount;

        const discountRow = document.getElementById('discountRow');
        if (discountRow) discountRow.style.display = 'flex';
        
        const discountDisplay = document.getElementById('discountDisplay');
        if (discountDisplay) discountDisplay.textContent = '-₹' + discountAmount;
        
        const totalDisplay = document.getElementById('checkoutTotal');
        if (totalDisplay) totalDisplay.textContent = '₹' + grandTotal.toLocaleString('en-IN');
        
        const msgDisplay = document.getElementById('couponMessage');
        if (msgDisplay) msgDisplay.innerHTML = '<span style="color:green;">✓ Coupon applied!</span>';
    } catch (err) {
        const msgDisplay = document.getElementById('couponMessage');
        if (msgDisplay) msgDisplay.innerHTML = `<span style="color:red;">${err.message}</span>`;
    }
}

async function placeOrder() {
    if (!selectedAddressId) {
        if (typeof showToast === 'function') showToast('Please select a delivery address', 'error'); 
        return; 
    }
    
    try {
        const res = await fetch('/api/orders/place', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ addressId: selectedAddressId, paymentMethod, couponCode: appliedCoupon })
        });
        
        if (res.status === 401) {
            window.location.href = '/api/auth/google';
            return;
        }

        const result = await res.json();
        if (!res.ok || result.error) throw new Error(result.error || 'Failed to place order');

        if (result.paymentMethod === 'online') {
            const options = {
                key: result.key,
                amount: result.amount,
                currency: 'INR',
                name: 'Pretty Pickles',
                description: 'Order ' + result.orderId,
                order_id: result.razorpayOrderId,
                prefill: { name: result.user.name, email: result.user.email },
                theme: { color: '#000000' },
                handler: async function(response) {
                    try {
                        const verifyRes = await fetch('/api/payment/verify', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                orderId: result.orderId
                            })
                        });
                        const verifyData = await verifyRes.json();
                        if (verifyData.error) throw new Error(verifyData.error);

                        if (typeof showToast === 'function') showToast('Payment successful!');
                        window.location.href = `/orders/${result.orderId}`;
                    } catch (err) {
                        if (typeof showToast === 'function') showToast('Payment verification failed', 'error');
                        // Redirect to orders page so they can retry payment later
                        window.location.href = `/orders/${result.orderId}`; 
                    }
                }
            };
            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (response){
                if (typeof showToast === 'function') showToast('Payment failed. Please try again from orders page.', 'error');
                window.location.href = `/orders/${result.orderId}`; 
            });
            rzp.open();
        } else {
            if (typeof showToast === 'function') showToast('Order placed!');
            window.location.href = `/orders/${result.orderId}`;
        }
    } catch (err) { 
        if (typeof showToast === 'function') showToast(err.message, 'error'); 
    }
}
