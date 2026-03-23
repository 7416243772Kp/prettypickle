let currentProduct = null;
let selectedVariant = '';
let selectedWeight = '';
let selectedPrice = 0;
let selectedRating = 0;
let productSlug = '';

document.addEventListener('DOMContentLoaded', async () => {
    productSlug = window.location.pathname.split('/').pop();
    if (!productSlug || productSlug === 'product.html') {
        document.getElementById('productContainer').innerHTML = '<h2>Product not found</h2>';
        return;
    }

    // Parse URL params for pagination/filter
    const urlParams = new URLSearchParams(window.location.search);
    const page = urlParams.get('page') || 1;
    const rating = urlParams.get('rating') || 0;

    try {
        const res = await fetch(`/api/products/${productSlug}?page=${page}&rating=${rating}`);
        const { success, data, error } = await res.json();
        
        if (!success || !data) {
            document.getElementById('productContainer').innerHTML = `<h2>${error || 'Product not found'}</h2>`;
            return;
        }

        currentProduct = data.product;
        document.title = `${currentProduct.title} | Pretty Pickles`;

        renderProductDetail(data);
    } catch (err) {
        console.error('Error fetching product data:', err);
        document.getElementById('productContainer').innerHTML = `<h2>Failed to load product. Please try again.</h2>`;
    }
});

function renderProductDetail({ product, reviews, ratingDistribution, frequentlyBought, userReview, pagination }) {
    const container = document.getElementById('productContainer');
    
    const productImage = (product.images && product.images.length > 0) ? `/images/uploads/${product.images[0]}` : '/images/placeholder-product.png';
    const avgRating = product.avgRating || 0;
    const roundedRating = Math.round(avgRating);
    const totalRatings = product.totalRatings || 0;
    const hasVariants = product.hasVariants && product.variants && product.variants.length > 0;
    selectedVariant = hasVariants ? product.variants[0].name : '';

    let galleryThumbsHTML = '';
    if (product.images && product.images.length > 1) {
        galleryThumbsHTML = `
            <div class="product-gallery-thumbs">
                ${product.images.map((img, i) => `
                    <div class="product-gallery-thumb ${i === 0 ? 'active' : ''}" data-src="/images/uploads/${img}" onclick="changeMainImage('/images/uploads/${img}', this)">
                        <img src="/images/uploads/${img}" alt="${product.title} - ${i + 1}">
                    </div>
                `).join('')}
            </div>
        `;
    }

    let vegLabelHTML = product.type === 'veg' 
        ? `<div class="veg-mark" style="position:static;"></div><span style="color:var(--veg-green);">Vegetarian</span>`
        : `<div class="nonveg-mark" style="position:static;"></div><span style="color:var(--nonveg-red);">Non-Vegetarian</span>`;

    let starsHTML = '';
    for (let i = 1; i <= 5; i++) {
        starsHTML += i <= roundedRating ? '★' : '☆';
    }

    let variantSelectorHTML = '';
    if (hasVariants) {
        variantSelectorHTML = `
            <div class="variant-selector">
                <label>Select Type</label>
                <div class="variant-options" id="variantOptions">
                    ${product.variants.map((v, i) => `
                        <div class="variant-option ${i === 0 ? 'selected' : ''}" data-variant="${v.name}" data-prices='${JSON.stringify(v.prices)}' onclick="selectVariant(this)">
                            ${v.name}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    const prices = hasVariants ? product.variants[0].prices : product.basePrices;
    const weights = ['250g', '500g', '750g', '1kg', '2kg'];
    let weightOptionsHTML = '';
    let firstSelected = false;

    weights.forEach(w => {
        if (prices[w] && prices[w] > 0) {
            weightOptionsHTML += `
                <div class="weight-option ${!firstSelected ? 'selected' : ''}" data-weight="${w}" data-price="${prices[w]}" onclick="selectWeight(this)">
                    ${w} <span class="weight-price">₹${prices[w]}</span>
                </div>
            `;
            if (!firstSelected) {
                selectedWeight = w;
                selectedPrice = prices[w];
                firstSelected = true;
            }
        }
    });

    let frequentlyBoughtHTML = '';
    if (frequentlyBought && frequentlyBought.length > 0) {
        const itemsHTML = frequentlyBought.map((fp, i) => {
            const fpImage = (fp.images && fp.images.length > 0) ? `/images/uploads/${fp.images[0]}` : '/images/placeholder-product.png';
            return `
                <div class="frequently-bought-item">
                    <a href="/product/${fp.slug}">
                        <img src="${fpImage}" alt="${fp.title}">
                        <div style="font-size:0.8rem;margin-top:4px;">${fp.title.substring(0, 25)}</div>
                    </a>
                </div>
                ${i < frequentlyBought.length - 1 ? '<span class="frequently-bought-plus">+</span>' : ''}
            `;
        }).join('');

        frequentlyBoughtHTML = `
            <div class="frequently-bought">
                <h3>Frequently Bought Together</h3>
                <div class="frequently-bought-items">
                    ${itemsHTML}
                </div>
            </div>
        `;
    }

    // Build the main string
    let html = `
    <div class="product-detail">
        <div class="product-gallery">
            <div class="product-gallery-main">
                <img id="mainImage" src="${productImage}" alt="${product.title}">
            </div>
            ${galleryThumbsHTML}
        </div>

        <div class="product-info">
            <h1>${product.title}</h1>
            <div class="veg-nonveg-label">${vegLabelHTML}</div>
            
            <div class="product-rating-summary">
                <span class="product-rating-number">${avgRating.toFixed(1)}</span>
                <span class="rating-stars" style="font-size:1.2rem;">${starsHTML}</span>
                <span class="rating-count">(${totalRatings} reviews)</span>
            </div>

            ${variantSelectorHTML}

            <div class="weight-selector">
                <label>Select Weight</label>
                <div class="weight-options" id="weightOptions">${weightOptionsHTML}</div>
            </div>

            <div class="quantity-selector">
                <label>Quantity</label>
                <div class="quantity-controls">
                    <button id="qtyMinus" onclick="changeQty(-1)">−</button>
                    <input type="number" id="qtyInput" value="1" min="1" max="100" readonly>
                    <button id="qtyPlus" onclick="changeQty(1)">+</button>
                </div>
                <span style="font-size:0.8rem;color:var(--gray-mid);">Max 100</span>
            </div>

            <div class="product-price-display">
                <div class="total-price" id="totalPrice">₹0</div>
                <div class="price-breakdown" id="priceBreakdown"></div>
                <div class="includes-gst">Inclusive of all taxes (GST)</div>
            </div>

            <div class="product-actions">
                <button class="btn btn-primary btn-large" id="buyNowBtn" onclick="buyNow()">Buy Now</button>
                <button class="btn btn-secondary btn-large" id="addCartBtn" onclick="addToCart()">Add to Cart</button>
            </div>

            ${product.description ? `
            <div style="margin-top:20px;">
                <h3 style="margin-bottom:8px;">Description</h3>
                <p style="color:var(--gray-dark);line-height:1.7;">${product.description.replace(/\n/g, '<br>')}</p>
            </div>
            ` : ''}
        </div>
    </div>
    
    ${frequentlyBoughtHTML}
    `;

    // Add Reviews Section
    html += renderReviewsSection(product, reviews, ratingDistribution, userReview, pagination);

    container.innerHTML = html;
    updatePrice();
}

function renderReviewsSection(product, reviews, ratingDistribution, userReview, pagination) {
    let html = `<div class="reviews-section"><h2 style="font-size:1.5rem;font-weight:800;">Customer Reviews</h2>`;

    if (ratingDistribution && ratingDistribution.total > 0) {
        let barsHtml = '';
        for (let star = 5; star >= 1; star--) {
            const pct = ratingDistribution[star] ? ratingDistribution[star].percentage : 0;
            const barLink = `/product/${product.slug}?rating=${star}`;
            barsHtml += `
            <a href="${barLink}" class="rating-bar-row" style="text-decoration:none;color:inherit;display:flex;align-items:center;cursor:pointer;">
                <span class="rating-bar-label">${star} ★</span>
                <div class="rating-bar-track">
                    <div class="rating-bar-fill" style="width: ${pct}%;"></div>
                </div>
                <span class="rating-bar-percent">${pct}%</span>
            </a>
            `;
        }

        let avgStars = '';
        for (let i = 1; i <= 5; i++) avgStars += i <= Math.round(product.avgRating || 0) ? '★' : '☆';

        html += `
        <div class="reviews-summary">
            <div class="reviews-avg">
                <div class="avg-number">${(product.avgRating || 0).toFixed(1)}</div>
                <div class="avg-stars">${avgStars}</div>
                <div class="avg-total">${ratingDistribution.total} reviews</div>
            </div>
            <div class="reviews-bars">
                ${barsHtml}
            </div>
        </div>
        `;
    }

    if (pagination.filterRating > 0) {
        html += `<p style="margin:16px 0;">Showing <strong>${pagination.filterRating}-star</strong> reviews. <a href="/product/${product.slug}" style="text-decoration:underline;">Show all</a></p>`;
    }

    html += `<div id="reviewsList">`;
    reviews.forEach(review => {
        const reviewerName = (review.user && review.user.name) ? review.user.name : 'Anonymous';
        const reviewerInitial = reviewerName.charAt(0);
        const reviewDate = new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        
        let reviewStars = '';
        for (let i = 1; i <= 5; i++) reviewStars += i <= review.rating ? '★' : '☆';

        html += `
        <div class="review-card">
            <div class="review-card-header">
                <div class="review-card-avatar">${reviewerInitial}</div>
                <div>
                    <div class="review-card-name">${reviewerName}</div>
                    <div class="review-card-date">${reviewDate}</div>
                </div>
            </div>
            <div class="review-card-stars">${reviewStars}</div>
            <div class="review-card-text">${review.text}</div>
        </div>
        `;
    });
    html += `</div>`;

    if (pagination.totalPages > 1) {
        html += `<div style="text-align:center;margin:20px 0;">`;
        for (let p = 1; p <= pagination.totalPages; p++) {
            let pageUrl = `/product/${product.slug}?page=${p}`;
            if (pagination.filterRating) pageUrl += `&rating=${pagination.filterRating}`;
            const pageClass = (p === pagination.currentPage) ? 'btn btn-small btn-primary' : 'btn btn-small btn-secondary';
            html += `<a href="${pageUrl}" class="${pageClass}" style="margin:0 4px;">${p}</a>`;
        }
        html += `</div>`;
    }

    if (globalAuthState.isAuthenticated && !userReview) {
        html += `
        <div class="review-form">
            <h3>Write a Review</h3>
            <form id="reviewForm" onsubmit="submitReview(event)">
                <div class="star-input" id="starInput">
                    <span data-rating="1" onclick="setRating(1)">☆</span>
                    <span data-rating="2" onclick="setRating(2)">☆</span>
                    <span data-rating="3" onclick="setRating(3)">☆</span>
                    <span data-rating="4" onclick="setRating(4)">☆</span>
                    <span data-rating="5" onclick="setRating(5)">☆</span>
                </div>
                <textarea id="reviewText" placeholder="Share your experience..." required minlength="10" maxlength="1000"></textarea>
                <button type="submit" class="btn btn-primary">Submit Review</button>
            </form>
        </div>
        `;
    } else if (!globalAuthState.isAuthenticated) {
        html += `
        <p style="margin-top:16px;">
            <a href="/api/auth/google" class="btn btn-secondary">Sign in to write a review</a>
        </p>
        `;
    }

    html += `</div>`;
    return html;
}

// Interaction Functions

function changeMainImage(src, thumbEl) {
    document.getElementById('mainImage').src = src;
    document.querySelectorAll('.product-gallery-thumb').forEach(t => t.classList.remove('active'));
    thumbEl.classList.add('active');
}

function selectVariant(el) {
    document.querySelectorAll('.variant-option').forEach(o => o.classList.remove('selected'));
    el.classList.add('selected');
    selectedVariant = el.getAttribute('data-variant');
    
    const prices = JSON.parse(el.getAttribute('data-prices'));
    const weightOpts = document.getElementById('weightOptions');
    weightOpts.innerHTML = '';
    const weights = ['250g', '500g', '750g', '1kg', '2kg'];
    
    let first = true;
    weights.forEach(w => {
        if (prices[w] && prices[w] > 0) {
            const div = document.createElement('div');
            div.className = 'weight-option' + (first ? ' selected' : '');
            div.setAttribute('data-weight', w);
            div.setAttribute('data-price', prices[w]);
            div.onclick = function() { selectWeight(this); };
            div.innerHTML = `${w} <span class="weight-price">₹${prices[w]}</span>`;
            weightOpts.appendChild(div);
            
            if (first) {
                selectedWeight = w;
                selectedPrice = prices[w];
                first = false;
            }
        }
    });
    updatePrice();
}

function selectWeight(el) {
    document.querySelectorAll('.weight-option').forEach(o => o.classList.remove('selected'));
    el.classList.add('selected');
    selectedWeight = el.getAttribute('data-weight');
    selectedPrice = parseFloat(el.getAttribute('data-price'));
    updatePrice();
}

function changeQty(delta) {
    const input = document.getElementById('qtyInput');
    let val = parseInt(input.value) + delta;
    val = Math.max(1, Math.min(100, val));
    input.value = val;
    updatePrice();
}

function updatePrice() {
    const qty = parseInt(document.getElementById('qtyInput').value || 1);
    const total = selectedPrice * qty;
    
    const priceEl = document.getElementById('totalPrice');
    if (priceEl) {
        priceEl.textContent = '₹' + total.toLocaleString('en-IN');
    }
    
    let breakdown = `₹${selectedPrice} × ${qty}`;
    if (selectedVariant) breakdown += ` (${selectedVariant}, ${selectedWeight})`;
    else if (selectedWeight) breakdown += ` (${selectedWeight})`;
    
    const bdEl = document.getElementById('priceBreakdown');
    if (bdEl) bdEl.textContent = breakdown;
}

async function addToCart() {
    if (!globalAuthState.isAuthenticated) {
        window.location.href = '/api/auth/google';
        return;
    }

    try {
        const qty = parseInt(document.getElementById('qtyInput').value || 1);
        const res = await fetch('/api/cart/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                productId: currentProduct._id, 
                variant: selectedVariant, 
                weight: selectedWeight, 
                quantity: qty 
            })
        });
        const data = await res.json();
        
        if (data.error) throw new Error(data.error);

        showToast('Added to cart!');
        checkCartCount(); // update header badge
    } catch (err) {
        showToast(err.message || 'Failed to add to cart', 'error');
    }
}

async function buyNow() {
    if (!globalAuthState.isAuthenticated) {
        window.location.href = '/api/auth/google';
        return;
    }
    await addToCart();
    window.location.href = '/checkout'; // Wait, it needs to be the checkout page HTML!
}

// Review functions
function setRating(r) {
    selectedRating = r;
    document.querySelectorAll('.star-input span').forEach((s, idx) => {
        s.textContent = idx < r ? '★' : '☆';
    });
}

async function submitReview(e) {
    e.preventDefault();
    if (selectedRating === 0) {
        showToast('Please select a rating', 'error');
        return;
    }
    const text = document.getElementById('reviewText').value;
    try {
        const res = await fetch(`/api/reviews/${currentProduct._id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rating: selectedRating, text })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        
        showToast('Review submitted!');
        setTimeout(() => location.reload(), 1000);
    } catch (err) {
        showToast(err.message || 'Failed to submit review', 'error');
    }
}
