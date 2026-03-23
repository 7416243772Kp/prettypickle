document.addEventListener('DOMContentLoaded', async () => {
    // Wait for the auth state check to complete from components.js
    // globalAuthState should be populated
    setTimeout(() => {
        if (!globalAuthState.isAuthenticated) {
            window.location.href = '/api/auth/google';
        } else {
            renderProfile(globalAuthState.user);
        }
    }, 500); // Give components.js a little time to fetch the auth status
});

function renderProfile(user) {
    const html = `
        <h1 class="page-title">My Profile</h1>
        <div style="display:flex;align-items:center;gap:20px;padding:24px;background:var(--gray-light);border-radius:8px;">
            <img src="${user.avatar}" alt="${user.name}" style="width:80px;height:80px;border-radius:50%;" onerror="this.src='/images/default-avatar.png'">
            <div>
                <h2>${user.name}</h2>
                <p style="color:var(--gray-mid);">${user.email}</p>
            </div>
        </div>

        <div style="margin-top:30px;display:grid;grid-template-columns:repeat(3,1fr);gap:16px;">
            <a href="/orders" class="btn btn-secondary btn-full">My Orders</a>
            <a href="/addresses" class="btn btn-secondary btn-full">My Addresses</a>
            <a href="/wishlist" class="btn btn-secondary btn-full">Wishlist</a>
        </div>

        <div style="margin-top:30px;">
            <a href="/api/auth/logout" class="btn btn-danger">Sign Out</a>
        </div>
    `;

    document.getElementById('profileContainer').innerHTML = html;
}
