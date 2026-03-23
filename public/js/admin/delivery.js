document.addEventListener('DOMContentLoaded', () => {
    setTimeout(loadDeliveryData, 500);
    setupForms();
});

async function loadDeliveryData() {
    try {
        const data = await fetchAdminAPI('/api/admin/delivery');
        
        document.getElementById('loadingIndicator').style.display = 'none';
        document.getElementById('deliveryContainer').style.display = 'grid';
        
        // Populate settings form
        const s = data.data.settings;
        if (s) {
            document.getElementById('deliveryCharge').value = s.deliveryCharge || 0;
            document.getElementById('freeDeliveryAbove').value = s.freeDeliveryAbove || 0;
            document.getElementById('expectedDeliveryText').value = s.expectedDeliveryText || '';
        }

        renderAgents(data.data.deliveryPersons);
        
    } catch (err) {
        console.error('Failed to load delivery data', err);
        document.getElementById('loadingIndicator').innerHTML = `<p style="color:red;">Error loading data.</p>`;
    }
}

function renderAgents(agents) {
    const tbody = document.getElementById('agentsTableBody');
    if (!agents || agents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No delivery agents added yet.</td></tr>';
        return;
    }
    
    tbody.innerHTML = agents.map(a => `
        <tr>
            <td><strong>${a.name}</strong></td>
            <td>${a.email}</td>
            <td>${a.phone || '—'}</td>
            <td><span style="font-size:0.8rem;text-transform:uppercase;background:${a.isActive ? '#e8f5e9;color:green;' : '#ffebee;color:red;'}padding:2px 6px;border-radius:4px;">${a.isActive ? 'Active' : 'Inactive'}</span></td>
            <td>
                <!-- Toggle status or delete functionality can be added later as an API route update -->
                <span style="font-size:0.8rem;color:var(--gray-mid);">No actions</span>
            </td>
        </tr>
    `).join('');
}

function setupForms() {
    document.getElementById('deliverySettingsForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('saveSettingsBtn');
        btn.textContent = 'Saving...';
        btn.disabled = true;

        try {
            const formData = new FormData(e.target);
            const dataObj = Object.fromEntries(formData.entries());

            const res = await fetch('/api/admin/delivery/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataObj)
            });
            
            if (res.status === 401) return window.location.href = '/admin-login';
            
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to save settings');
            
            showToast('Settings saved successfully!');
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            btn.textContent = 'Save Settings';
            btn.disabled = false;
        }
    });

    document.getElementById('addPersonForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('addAgentBtn');
        btn.textContent = 'Adding...';
        btn.disabled = true;

        try {
            const formData = new FormData(e.target);
            const dataObj = Object.fromEntries(formData.entries());

            const res = await fetch('/api/admin/delivery/person', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataObj)
            });
            
            if (res.status === 401) return window.location.href = '/admin-login';
            
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to add agent');
            
            showToast('Delivery agent added successfully!');
            e.target.reset();
            loadDeliveryData(); // reload table
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            btn.textContent = 'Add Agent';
            btn.disabled = false;
        }
    });
}
