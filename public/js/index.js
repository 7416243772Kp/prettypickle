document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch('/api/home');
        const { success, data } = await res.json();
        
        if (!success) {
            console.error('Failed to load home page data');
            return;
        }

        renderHome(data);
    } catch (err) {
        console.error('Error fetching home data:', err);
    }
});

function renderHome(data) {
    // 1. Scrolling Banner
    if (data.scrollingBanner) {
        const text = data.scrollingBanner.scrollText;
        document.getElementById('scrollingBannerContainer').innerHTML = `
            <div class="announcement-bar">
                <div class="announcement-bar-scroll">
                    <span>${text}</span>
                    <span>${text}</span>
                </div>
            </div>
        `;
    }

    // 2. Top Banner Carousel
    if (data.topBanners && data.topBanners.length > 0) {
        let slides = '';
        let dots = '';
        data.topBanners.forEach((banner, i) => {
            slides += `
                <div class="banner-carousel-slide">
                    <a href="${banner.link || '#'}">
                        <img src="/images/uploads/${banner.image}" alt="Banner" loading="lazy">
                    </a>
                </div>
            `;
            if (data.topBanners.length > 1) {
                dots += `<span class="banner-dot ${i === 0 ? 'active' : ''}" data-index="${i}"></span>`;
            }
        });

        document.getElementById('topBannerContainer').innerHTML = `
            <div class="banner-carousel" id="topBannerCarousel">
                <div class="banner-carousel-track" id="bannerTrack">
                    ${slides}
                </div>
                ${dots ? `<div class="banner-dots" id="bannerDots">${dots}</div>` : ''}
            </div>
        `;
        initCarousel('bannerTrack', '.banner-dot');
    }

    // 3. Category Bar
    if (data.categories) {
        const catBar = document.getElementById('categoryBar');
        data.categories.forEach(cat => {
            const a = document.createElement('a');
            a.href = `/category/${cat.slug}`;
            a.className = 'category-chip';
            a.textContent = cat.name;
            catBar.appendChild(a);
        });
    }

    // 4. Best Sellers by Category
    if (data.bestSellersByCategory && data.bestSellersByCategory.length > 0) {
        const bestContainer = document.getElementById('bestSellersContainer');
        data.bestSellersByCategory.forEach(section => {
            const wrapper = document.createElement('div');
            wrapper.innerHTML = `
                <div class="section-title">
                    <h2>Best Selling ${section.category.name}</h2>
                    <p>Top picks in ${section.category.name.toLowerCase()}</p>
                </div>
                <div class="products-grid">
                    ${section.products.map(p => renderProductCard(p)).join('')}
                </div>
            `;
            bestContainer.appendChild(wrapper);
        });
    }

    // 5. All Products Menu
    if (data.menuProducts && data.menuProducts.length > 0) {
        document.getElementById('menuContainer').innerHTML = `
            <div class="section-title">
                <h2>Our Menu</h2>
                <p>Explore all our products</p>
            </div>
            <div class="products-grid">
                ${data.menuProducts.map(p => renderProductCard(p)).join('')}
            </div>
        `;
    }

    // 6. Bottom Banners
    if (data.bottomBanners && data.bottomBanners.length > 0) {
        const slides = data.bottomBanners.map(banner => `
            <div class="banner-carousel-slide">
                <a href="${banner.link || '#'}"><img src="/images/uploads/${banner.image}" alt="Banner" loading="lazy"></a>
            </div>
        `).join('');
        document.getElementById('bottomBannerContainer').innerHTML = `
            <div class="banner-carousel">
                <div class="banner-carousel-track">
                    ${slides}
                </div>
            </div>
        `;
    }

    // 7. Recently Viewed (using localStorage for client-side)
    const recentIds = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
    if (recentIds.length > 0) {
        // We will fetch recently viewed items individually in future updates
        document.getElementById('recentlyViewed').style.display = 'block';
    }
}

function initCarousel(trackId, dotSelector) {
    const track = document.getElementById(trackId);
    if (!track) return;
    const dots = document.querySelectorAll(dotSelector);
    if (dots.length === 0) return;
    
    let current = 0;
    const total = dots.length;

    function goTo(index) {
        current = index;
        track.style.transform = `translateX(-${current * 100}%)`;
        dots.forEach((d, i) => d.classList.toggle('active', i === current));
    }

    dots.forEach(dot => dot.addEventListener('click', () => goTo(parseInt(dot.dataset.index))));
    setInterval(() => goTo((current + 1) % total), 5000);
}
