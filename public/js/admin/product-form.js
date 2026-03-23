let currentVariants = [];

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initForm, 500);
});

async function initForm() {
    const pathParts = window.location.pathname.split('/');
    const isEdit = pathParts.includes('edit');
    const productId = isEdit ? pathParts[pathParts.length - 1] : null;

    try {
        const endpoint = isEdit ? `/api/admin/products/edit/${productId}` : `/api/admin/products/new`;
        const data = await fetchAdminAPI(endpoint);
        
        document.getElementById('loadingIndicator').style.display = 'none';
        document.getElementById('productForm').style.display = 'block';
        
        populateCategories(data.data.categories);
        
        if (isEdit && data.data.product) {
            populateProductData(data.data.product);
            document.getElementById('pageTitle').textContent = 'Edit Product';
        } else {
            // New Product Defaults
            addVariantRow();
        }

        setupEventListeners();

    } catch (err) {
        console.error('Failed to load form data', err);
        document.getElementById('loadingIndicator').innerHTML = `<p style="color:red;">Error loading form: ${err.message}</p>`;
    }
}

function populateCategories(categories) {
    const select = document.getElementById('category');
    select.innerHTML = '<option value="">Select Category...</option>' + 
        categories.map(c => `<option value="${c._id}">${c.name}</option>`).join('');
}

function populateProductData(p) {
    document.getElementById('productId').value = p._id;
    document.getElementById('title').value = p.title || '';
    document.getElementById('description').value = p.description || '';
    if (p.category) document.getElementById('category').value = p.category._id || p.category;
    document.getElementById('type').value = p.type || 'b2c';
    document.getElementById('stock').value = p.stock || 0;
    document.getElementById('metaTitle').value = p.metaTitle || '';
    document.getElementById('metaDescription').value = p.metaDescription || '';

    // Images
    const currentImagesDiv = document.getElementById('currentImages');
    if (p.images && p.images.length > 0) {
        currentImagesDiv.innerHTML = '<p style="width:100%;font-size:0.85rem;color:var(--gray-mid);margin-bottom:8px;">Current Images:</p>' + 
            p.images.map(img => `<img src="/images/uploads/${img}" style="width:80px;height:80px;object-fit:cover;border-radius:4px;border:1px solid #ddd;">`).join('');
    }

    // Variants
    const hasVariantsCheckbox = document.getElementById('hasVariants');
    hasVariantsCheckbox.checked = p.hasVariants || false;
    
    if (p.hasVariants && p.variants) {
        currentVariants = p.variants;
        currentVariants.forEach(v => addVariantRow(v));
    } else {
        if (p.basePrices) {
            document.getElementById('basePriceB2C').value = p.basePrices.b2c || 0;
            document.getElementById('basePriceB2B').value = p.basePrices.b2b || 0;
        }
    }
    toggleVariantView();
}

function toggleVariantView() {
    const isChecked = document.getElementById('hasVariants').checked;
    document.getElementById('singlePriceConfig').style.display = isChecked ? 'none' : 'block';
    document.getElementById('variantsConfig').style.display = isChecked ? 'block' : 'none';
}

function addVariantRow(vData = { weight: '', price: 0, stock: 0 }) {
    const list = document.getElementById('variantsList');
    const idx = list.children.length;
    
    const div = document.createElement('div');
    div.className = 'variant-row';
    div.style.cssText = 'display:flex;gap:12px;margin-bottom:12px;align-items:end;background:#fff;padding:12px;border:1px solid #ddd;border-radius:4px;';
    
    div.innerHTML = `
        <div style="flex:1;"><label style="font-size:0.8rem;">Weight (e.g. 250g)</label><input type="text" class="v-weight" value="${vData.weight}" placeholder="Weight" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:4px;"></div>
        <div style="flex:1;"><label style="font-size:0.8rem;">Price (₹)</label><input type="number" class="v-price" value="${vData.price}" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:4px;"></div>
        <div style="flex:1;"><label style="font-size:0.8rem;">Stock</label><input type="number" class="v-stock" value="${vData.stock}" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:4px;"></div>
        <div><button type="button" class="btn btn-small btn-danger" onclick="this.parentElement.parentElement.remove()" style="padding:8px 12px;">Remove</button></div>
    `;
    list.appendChild(div);
}

function setupEventListeners() {
    document.getElementById('hasVariants').addEventListener('change', toggleVariantView);
    
    document.getElementById('addVariantBtn').addEventListener('click', () => {
        addVariantRow();
    });

    document.getElementById('productForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Prep variant logic
        const hasVariants = document.getElementById('hasVariants').checked;
        if (hasVariants) {
            const rows = document.querySelectorAll('.variant-row');
            const variants = Array.from(rows).map(row => ({
                weight: row.querySelector('.v-weight').value,
                price: parseFloat(row.querySelector('.v-price').value) || 0,
                stock: parseInt(row.querySelector('.v-stock').value) || 0
            }));
            document.getElementById('variantsJson').value = JSON.stringify(variants);
        } else {
            const basePrices = {
                b2c: parseFloat(document.getElementById('basePriceB2C').value) || 0,
                b2b: parseFloat(document.getElementById('basePriceB2B').value) || 0
            };
            document.getElementById('basePricesJson').value = JSON.stringify(basePrices);
        }

        const submitBtn = document.getElementById('submitBtn');
        submitBtn.textContent = 'Saving...';
        submitBtn.disabled = true;

        try {
            const form = document.getElementById('productForm');
            const formData = new FormData(form);
            
            const res = await fetch('/api/admin/products/save', {
                method: 'POST',
                // Don't set Content-Type header when sending FormData; browser sets it automatically with boundary
                body: formData
            });
            
            if (res.status === 401) {
                window.location.href = '/admin-login';
                return;
            }
            
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to save');
            
            showToast('Product saved successfully!');
            setTimeout(() => {
                window.location.href = data.redirect || '/admin/products';
            }, 500);
            
        } catch (err) {
            showToast(err.message, 'error');
            submitBtn.textContent = 'Save Product';
            submitBtn.disabled = false;
        }
    });
}
