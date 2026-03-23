document.addEventListener('DOMContentLoaded', async () => {
    // Wait for auth check
    setTimeout(async () => {
        if (!globalAuthState.isAuthenticated) {
            window.location.href = '/api/auth/google';
            return;
        }
        await loadAddresses();
    }, 500);

    const addressForm = document.getElementById('addressForm');
    if (addressForm) {
        addressForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            const data = Object.fromEntries(fd.entries());
            data.isDefault = document.getElementById('isDefault').checked;

            try {
                const res = await fetch('/api/addresses/save', { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const resData = await res.json();
                
                if (resData.error) throw new Error(resData.error);
                
                if (typeof showToast === 'function') showToast('Address saved!');
                
                // Hide modal and reload
                document.getElementById('addressModal').classList.remove('active');
                await loadAddresses();
                e.target.reset(); // clear form
            } catch (err) {
                if (typeof showToast === 'function') showToast(err.message, 'error');
            }
        });
    }
});

async function loadAddresses() {
    try {
        const res = await fetch('/api/addresses');
        const data = await res.json();
        
        if (data.error) throw new Error(data.error);

        renderAddresses(data.data.addresses);
    } catch (err) {
        console.error('Failed to load addresses', err);
        document.getElementById('addressesContainer').innerHTML = '<p style="text-align:center;color:red;">Failed to load addresses.</p>';
    }
}

function renderAddresses(addresses) {
    const container = document.getElementById('addressesContainer');
    
    if (!addresses || addresses.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:var(--gray-mid);">No addresses found.</p>';
        return;
    }

    const html = addresses.map(addr => `
        <div class="address-card">
            <div class="address-card-label">${addr.label} ${addr.isDefault ? '⭐ Default' : ''}</div>
            <p>${addr.fullName}, ${addr.phone}</p>
            <p>${addr.line1}${addr.line2 ? ', ' + addr.line2 : ''}</p>
            <p>${addr.city}, ${addr.state} - ${addr.pincode}</p>
            <div style="margin-top:12px;">
                <button class="btn btn-small btn-danger" onclick="deleteAddress('${addr._id}')">Delete</button>
            </div>
        </div>
    `).join('');

    container.innerHTML = html;
}

async function deleteAddress(id) {
    if (!confirm('Delete this address?')) return;
    try {
        const res = await fetch(`/api/addresses/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        
        await loadAddresses();
    } catch (err) {
        if (typeof showToast === 'function') showToast(err.message, 'error');
    }
}
