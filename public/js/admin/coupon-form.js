document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initForm, 500);
});

async function initForm() {
    const pathParts = window.location.pathname.split('/');
    const isEdit = pathParts.includes('edit');
    const couponId = isEdit ? pathParts[pathParts.length - 1] : null;

    try {
        const endpoint = isEdit ? `/api/admin/coupons/edit/${couponId}` : `/api/admin/coupons/new`;
        const data = await fetchAdminAPI(endpoint);
        
        document.getElementById('loadingIndicator').style.display = 'none';
        document.getElementById('couponForm').style.display = 'block';
        
        populateSelects(data.data.products, data.data.categories);
        
        if (isEdit && data.data.coupon) {
            populateCouponData(data.data.coupon);
            document.getElementById('pageTitle').textContent = 'Edit Coupon';
        }

        setupEventListeners();
        toggleScopeViews();
        togglePromoterViews();

    } catch (err) {
        console.error('Failed to load form data', err);
        document.getElementById('loadingIndicator').innerHTML = `<p style="color:red;">Error loading form: ${err.message}</p>`;
    }
}

function populateSelects(products, categories) {
    const prodSelect = document.getElementById('applicableProducts');
    prodSelect.innerHTML = products.map(p => `<option value="${p._id}">${p.title}</option>`).join('');
    
    const catSelect = document.getElementById('applicableCategories');
    catSelect.innerHTML = categories.map(c => `<option value="${c._id}">${c.name}</option>`).join('');
}

function populateCouponData(c) {
    document.getElementById('couponId').value = c._id;
    document.getElementById('code').value = c.code || '';
    document.getElementById('usageType').value = c.usageType || 'public_unlimited';
    document.getElementById('discountType').value = c.discountType || 'percentage';
    document.getElementById('discountValue').value = c.discountValue || 0;
    document.getElementById('maxDiscountAmount').value = c.maxDiscountAmount || '';
    document.getElementById('scope').value = c.scope || 'all';
    document.getElementById('maxUsesPerUser').value = c.maxUsesPerUser || 1;
    
    if (c.expiresAt) {
        document.getElementById('expiresAt').value = new Date(new Date(c.expiresAt).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    }
    
    // Multi-select arrays
    if (c.applicableProducts && c.applicableProducts.length > 0) {
        const sel = document.getElementById('applicableProducts');
        Array.from(sel.options).forEach(opt => {
            if (c.applicableProducts.includes(opt.value)) opt.selected = true;
        });
    }
    if (c.applicableCategories && c.applicableCategories.length > 0) {
        const sel = document.getElementById('applicableCategories');
        Array.from(sel.options).forEach(opt => {
            if (c.applicableCategories.includes(opt.value)) opt.selected = true;
        });
    }

    // Promoters
    document.getElementById('promoterUPI').value = c.promoterUPI || '';
    document.getElementById('promoterCommission').value = c.promoterCommission || 0;
    document.getElementById('makerUPI').value = c.makerUPI || '';
    document.getElementById('makerCommission').value = c.makerCommission || 0;
}

function toggleScopeViews() {
    const scope = document.getElementById('scope').value;
    document.getElementById('specificProductsContainer').style.display = scope === 'specific_products' ? 'block' : 'none';
    document.getElementById('specificCategoriesContainer').style.display = scope === 'specific_categories' ? 'block' : 'none';
}

function togglePromoterViews() {
    const usageType = document.getElementById('usageType').value;
    document.getElementById('promoterFields').style.display = usageType === 'promoter' ? 'block' : 'none';
}

function setupEventListeners() {
    document.getElementById('scope').addEventListener('change', toggleScopeViews);
    document.getElementById('usageType').addEventListener('change', togglePromoterViews);

    document.getElementById('couponForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.textContent = 'Saving...';
        submitBtn.disabled = true;

        try {
            const formData = new FormData(e.target);
            const dataObj = Object.fromEntries(formData.entries());
            
            // Handle multi-selects
            const selectedProds = Array.from(document.getElementById('applicableProducts').selectedOptions).map(opt => opt.value);
            const selectedCats = Array.from(document.getElementById('applicableCategories').selectedOptions).map(opt => opt.value);
            
            dataObj.applicableProducts = JSON.stringify(selectedProds);
            dataObj.applicableCategories = JSON.stringify(selectedCats);

            const res = await fetch('/api/admin/coupons/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataObj)
            });
            
            if (res.status === 401) {
                window.location.href = '/admin-login';
                return;
            }
            
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to save');
            
            showToast('Coupon saved successfully!');
            setTimeout(() => {
                window.location.href = data.redirect || '/admin/coupons';
            }, 500);
            
        } catch (err) {
            showToast(err.message, 'error');
            submitBtn.textContent = 'Save Coupon';
            submitBtn.disabled = false;
        }
    });
}
