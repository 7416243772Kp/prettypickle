let allProducts = [];

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(loadBundles, 500);
    setupForm();
});

async function loadBundles() {
    try {
        const data = await fetchAdminAPI('/api/admin/bundles');
        
        allProducts = data.data.products;
        
        const sel = document.getElementById('bProducts');
        sel.innerHTML = allProducts.map(p => `<option value="${p._id}">${p.title}</option>`).join('');

        document.getElementById('loadingIndicator').style.display = 'none';
        document.getElementById('bundlesContainer').style.display = 'grid';
        document.getElementById('bundlesContainer').style.gridTemplateColumns = '1fr 1fr';
        document.getElementById('bundlesContainer').style.gap = '20px';
        
        renderBundles(data.data.bundles);
    } catch (err) {
        console.error('Failed to load bundles', err);
        document.getElementById('loadingIndicator').innerHTML = `<p style="color:red;">Error loading bundles.</p>`;
    }
}

function renderBundles(bundles) {
    const container = document.getElementById('bundlesContainer');
    if (!bundles || bundles.length === 0) {
        container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;background:#f9f9f9;border-radius:8px;">No bundles created yet.</div>';
        return;
    }
    
    container.innerHTML = bundles.map(b => `
        <div style="border:1px solid #eee;border-radius:8px;padding:20px;background:#fff;display:flex;flex-direction:column;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
                <h3 style="margin:0;">${b.name}</h3>
                <div style="text-align:right;">
                    <div style="color:green;font-weight:bold;font-size:1.2rem;">₹${b.bundlePrice}</div>
                    ${b.originalPrice > b.bundlePrice ? `<div style="text-decoration:line-through;color:var(--gray-mid);font-size:0.9rem;">₹${b.originalPrice}</div>` : ''}
                </div>
            </div>
            
            <p style="font-size:0.9rem;color:var(--gray-mid);margin-bottom:16px;flex-grow:1;">${b.description || ''}</p>
            
            <div style="background:#f9f9f9;padding:12px;border-radius:4px;margin-bottom:16px;">
                <strong>Includes:</strong>
                <ul style="margin:8px 0 0;padding-left:20px;font-size:0.9rem;">
                    ${b.products.map(p => `<li>${p.product?.title || 'Unknown Product'} (x${p.quantity})</li>`).join('')}
                </ul>
            </div>
            
            <div style="display:flex;justify-content:flex-end;gap:10px;">
                <button class="btn btn-small btn-danger" onclick="deleteBundle('${b._id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

function openBundleModal() {
    document.getElementById('bundleForm').reset();
    document.getElementById('bundleId').value = '';
    document.getElementById('modalTitle').textContent = 'Create Bundle';
    document.getElementById('bundleModal').style.display = 'flex';
}

function closeBundleModal() {
    document.getElementById('bundleModal').style.display = 'none';
}

function setupForm() {
    document.getElementById('bundleForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.textContent = 'Saving...';
        submitBtn.disabled = true;

        try {
            const formData = new FormData(e.target);
            const dataObj = Object.fromEntries(formData.entries());
            
            const selectedOpt = Array.from(document.getElementById('bProducts').selectedOptions);
            const productsArr = selectedOpt.map(opt => ({
                product: opt.value,
                quantity: 1
            }));
            
            dataObj.products = JSON.stringify(productsArr);

            const res = await fetch('/api/admin/bundles/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataObj)
            });
            
            if (res.status === 401) return window.location.href = '/admin-login';
            
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to save');
            
            showToast('Bundle saved successfully!');
            closeBundleModal();
            loadBundles(); // reload
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            submitBtn.textContent = 'Save Bundle';
            submitBtn.disabled = false;
        }
    });
}

window.deleteBundle = async function(id) {
    if (!confirm('Are you sure you want to delete this bundle?')) return;
    try {
        await fetchAdminAPI(`/api/admin/bundles/${id}`, { method: 'DELETE' });
        showToast('Bundle deleted');
        loadBundles();
    } catch (err) { showToast(err.message, 'error'); }
};
