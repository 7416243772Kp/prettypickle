let allBanners = [];

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(loadBanners, 500);
    setupForm();
});

async function loadBanners() {
    try {
        const data = await fetchAdminAPI('/api/admin/banners');
        allBanners = data.data.banners;
        
        document.getElementById('loadingIndicator').style.display = 'none';
        document.getElementById('bannersContainer').style.display = 'grid';
        
        renderBanners(allBanners);
    } catch (err) {
        console.error('Failed to load banners', err);
        document.getElementById('loadingIndicator').innerHTML = `<p style="color:red;">Error loading banners.</p>`;
    }
}

function renderBanners(banners) {
    const container = document.getElementById('bannersContainer');
    if (!banners || banners.length === 0) {
        container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;background:#f9f9f9;border-radius:8px;">No banners found.</div>';
        return;
    }
    
    container.innerHTML = banners.map(b => `
        <div style="border:1px solid #eee;border-radius:8px;padding:16px;background:#fff;display:flex;flex-direction:column;opacity:${b.isActive ? '1' : '0.6'};">
            ${b.isScrolling || b.position === 'marquee' 
                ? `<div style="background:#000;color:#fff;padding:20px;text-align:center;border-radius:4px;margin-bottom:12px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">${b.scrollText}</div>`
                : `<img src="${b.image ? `/images/uploads/${b.image}` : '/images/placeholder.jpg'}" style="width:100%;height:150px;object-fit:cover;border-radius:4px;margin-bottom:12px;">`
            }
            
            <div style="margin-bottom:12px;flex-grow:1;">
                <strong>Position:</strong> <span style="text-transform:capitalize;">${b.position}</span><br>
                <strong>Order:</strong> ${b.displayOrder}<br>
                <strong>Link:</strong> <a href="${b.link || '#'}" target="_blank" style="color:var(--primary);">${b.link || 'None'}</a>
            </div>
            
            <div style="display:flex;justify-content:space-between;gap:10px;">
                <button class="btn btn-small" style="background:#f5f5f5;color:#000;flex:1;" onclick="openEditModal('${b._id}')">Edit</button>
                <button class="btn btn-small btn-danger" onclick="deleteBanner('${b._id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

function openBannerModal() {
    document.getElementById('bannerForm').reset();
    document.getElementById('bannerId').value = '';
    document.getElementById('currentImagePreview').style.display = 'none';
    document.getElementById('bannerImage').required = true;
    document.getElementById('modalTitle').textContent = 'Add Banner';
    toggleFields();
    document.getElementById('bannerModal').style.display = 'flex';
}

window.openEditModal = function(id) {
    const b = allBanners.find(x => x._id === id);
    if (!b) return;

    document.getElementById('bannerId').value = b._id;
    document.getElementById('position').value = b.position;
    document.getElementById('scrollText').value = b.scrollText || '';
    document.getElementById('bannerLink').value = b.link || '';
    document.getElementById('displayOrder').value = b.displayOrder;
    document.getElementById('isActive').value = b.isActive ? 'true' : 'false';
    document.getElementById('isScrolling').value = b.isScrolling ? 'true' : 'false';
    
    const preview = document.getElementById('currentImagePreview');
    if (b.image) {
        preview.src = `/images/uploads/${b.image}`;
        preview.style.display = 'block';
        document.getElementById('bannerImage').required = false;
    } else {
        preview.style.display = 'none';
        document.getElementById('bannerImage').required = b.position !== 'marquee';
    }

    document.getElementById('modalTitle').textContent = 'Edit Banner';
    toggleFields();
    document.getElementById('bannerModal').style.display = 'flex';
};

function closeBannerModal() {
    document.getElementById('bannerModal').style.display = 'none';
}

function toggleFields() {
    const pos = document.getElementById('position').value;
    const isMarquee = pos === 'marquee';
    
    document.getElementById('textGroup').style.display = isMarquee ? 'block' : 'none';
    document.getElementById('imageGroup').style.display = isMarquee ? 'none' : 'block';
    document.getElementById('isScrolling').value = isMarquee ? 'true' : 'false';
    
    if (isMarquee) {
        document.getElementById('bannerImage').required = false;
        document.getElementById('scrollText').required = true;
    } else {
        const isEdit = !!document.getElementById('bannerId').value;
        document.getElementById('bannerImage').required = !isEdit;
        document.getElementById('scrollText').required = false;
    }
}

function setupForm() {
    document.getElementById('position').addEventListener('change', toggleFields);

    document.getElementById('bannerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.textContent = 'Saving...';
        submitBtn.disabled = true;

        try {
            const formData = new FormData(e.target);

            const res = await fetch('/api/admin/banners/save', {
                method: 'POST',
                body: formData // No Content-Type header so browser sets multipart boundary
            });
            
            if (res.status === 401) return window.location.href = '/admin-login';
            
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to save');
            
            showToast('Banner saved successfully!');
            closeBannerModal();
            loadBanners();
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            submitBtn.textContent = 'Save Banner';
            submitBtn.disabled = false;
        }
    });
}

window.deleteBanner = async function(id) {
    if (!confirm('Are you sure you want to delete this banner?')) return;
    try {
        await fetchAdminAPI(`/api/admin/banners/${id}`, { method: 'DELETE' });
        showToast('Banner deleted');
        loadBanners();
    } catch (err) { showToast(err.message, 'error'); }
};
