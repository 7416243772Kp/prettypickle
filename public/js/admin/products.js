document.addEventListener('DOMContentLoaded', async () => {
    setTimeout(loadProducts, 500);
});

async function loadProducts() {
    try {
        const data = await fetchAdminAPI('/api/admin/products');
        
        document.getElementById('loadingIndicator').style.display = 'none';
        document.getElementById('productsTableContainer').style.display = 'table';
        
        renderProducts(data.data.products);
    } catch (err) {
        console.error('Failed to load products', err);
        document.getElementById('loadingIndicator').innerHTML = `<p style="color:red;">Error loading products.</p>`;
    }
}

function renderProducts(products) {
    const tbody = document.getElementById('productsTableBody');
    if (!products || products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No products found.</td></tr>';
        return;
    }
    
    tbody.innerHTML = products.map(p => {
        const img = p.images && p.images.length > 0 ? `/images/uploads/${p.images[0]}` : '/images/placeholder.jpg';
        let priceDisplay = '—';
        if (p.hasVariants && p.variants && p.variants.length > 0) {
            priceDisplay = `₹${p.variants[0].price} - ₹${p.variants[p.variants.length-1].price}`;
        } else if (!p.hasVariants && p.basePrices) {
            priceDisplay = `₹${p.basePrices.b2c || 0} / ₹${p.basePrices.b2b || 0}`;
        }

        return `
            <tr>
                <td><img src="${img}" style="width:50px;height:50px;object-fit:cover;border-radius:4px;"></td>
                <td><strong>${p.title}</strong></td>
                <td>${p.category ? p.category.name : '—'}</td>
                <td><span style="background:#eee;padding:2px 6px;border-radius:4px;font-size:0.8rem;text-transform:uppercase;">${p.type}</span></td>
                <td>${priceDisplay}</td>
                <td>${p.hasVariants ? 'Calculated' : p.stock}</td>
                <td>
                    <a href="/admin/products/edit/${p._id}" class="btn btn-small" style="background:#f5f5f5;color:#000;">Edit</a>
                    <button class="btn btn-small btn-danger" onclick="deleteProduct('${p._id}')">Delete</button>
                </td>
            </tr>
        `;
    }).join('');
}

async function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
        await fetchAdminAPI(`/api/admin/products/${id}`, { method: 'DELETE' });
        showToast('Product deleted');
        loadProducts();
    } catch (err) {
        showToast(err.message, 'error');
    }
}
