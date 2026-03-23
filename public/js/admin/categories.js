let categoriesData = [];

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(loadCategories, 500);

    document.getElementById('categoryForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('submitBtn');
        btn.textContent = 'Saving...';
        btn.disabled = true;

        const data = {
            id: document.getElementById('categoryId').value,
            name: document.getElementById('categoryName').value,
            description: document.getElementById('categoryDesc').value,
            displayOrder: parseInt(document.getElementById('categoryOrder').value) || 0
        };

        try {
            await fetchAdminAPI('/api/admin/categories/save', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            showToast('Category saved successfully');
            closeCategoryModal();
            loadCategories();
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            btn.textContent = 'Save Category';
            btn.disabled = false;
        }
    });
});

async function loadCategories() {
    try {
        const data = await fetchAdminAPI('/api/admin/categories');
        categoriesData = data.data.categories || [];
        
        document.getElementById('loadingIndicator').style.display = 'none';
        document.getElementById('categoriesTableContainer').style.display = 'table';
        
        renderCategories();
    } catch (err) {
        console.error('Failed to load categories', err);
        document.getElementById('loadingIndicator').innerHTML = `<p style="color:red;">Error loading categories.</p>`;
    }
}

function renderCategories() {
    const tbody = document.getElementById('categoriesTableBody');
    if (categoriesData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No categories found.</td></tr>';
        return;
    }
    
    tbody.innerHTML = categoriesData.map(c => `
        <tr>
            <td>${c.displayOrder || 0}</td>
            <td><strong>${c.name}</strong></td>
            <td>${c.description || '—'}</td>
            <td><span style="color:${c.isActive ? 'green' : 'red'};">${c.isActive ? 'Active' : 'Inactive'}</span></td>
            <td>
                <button class="btn btn-small" style="background:#f5f5f5;color:#000;" onclick="editCategory('${c._id}')">Edit</button>
                <button class="btn btn-small btn-danger" onclick="deleteCategory('${c._id}')">Delete</button>
            </td>
        </tr>
    `).join('');
}

function openCategoryModal() {
    document.getElementById('categoryForm').reset();
    document.getElementById('categoryId').value = '';
    document.getElementById('modalTitle').textContent = 'Add Category';
    document.getElementById('categoryModal').classList.add('active');
}

function closeCategoryModal() {
    document.getElementById('categoryModal').classList.remove('active');
}

window.editCategory = function(id) {
    const cat = categoriesData.find(c => c._id === id);
    if (!cat) return;
    
    document.getElementById('categoryId').value = cat._id;
    document.getElementById('categoryName').value = cat.name;
    document.getElementById('categoryDesc').value = cat.description || '';
    document.getElementById('categoryOrder').value = cat.displayOrder || 0;
    
    document.getElementById('modalTitle').textContent = 'Edit Category';
    document.getElementById('categoryModal').classList.add('active');
};

window.deleteCategory = async function(id) {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
        await fetchAdminAPI(`/api/admin/categories/${id}`, { method: 'DELETE' });
        showToast('Category deleted');
        loadCategories();
    } catch (err) {
        showToast(err.message, 'error');
    }
};
