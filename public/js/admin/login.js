document.addEventListener('DOMContentLoaded', async () => {
    // Check if already logged in
    try {
        const res = await fetch('/api/adminAuth/admin-login/status');
        const data = await res.json();
        
        if (data.status === 'authenticated') {
            window.location.href = '/admin/dashboard';
            return;
        } else if (data.status === 'pending_totp') {
            showStep('step-totp');
        }
    } catch (e) {
        console.error('Status check error:', e);
    }

    const loginForm = document.getElementById('loginForm');
    const setupTotpForm = document.getElementById('setupTotpForm');
    const verifyTotpForm = document.getElementById('verifyTotpForm');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideError();
        
        try {
            const res = await fetch('/api/adminAuth/admin-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: document.getElementById('email').value,
                    password: document.getElementById('password').value
                })
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || 'Login failed');

            if (data.step === 'setup-totp') {
                document.getElementById('totpQrCode').src = data.qrCode;
                document.getElementById('totpSecretText').textContent = data.secret;
                showStep('step-setup-totp');
            } else if (data.step === 'totp') {
                showStep('step-totp');
            }
        } catch (err) {
            showError(err.message);
        }
    });

    setupTotpForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitTotp(document.getElementById('setupTotpCode').value);
    });

    verifyTotpForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitTotp(document.getElementById('verifyTotpCode').value);
    });
});

function showStep(stepId) {
    document.querySelectorAll('.step-container').forEach(el => el.classList.remove('active'));
    document.getElementById(stepId).classList.add('active');
}

function showError(msg) {
    const el = document.getElementById('errorMessage');
    el.textContent = msg;
    el.style.display = 'block';
}

function hideError() {
    document.getElementById('errorMessage').style.display = 'none';
}

async function submitTotp(code) {
    hideError();
    try {
        const res = await fetch('/api/adminAuth/admin-login/totp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ totpCode: code })
        });
        const data = await res.json();
        
        if (!res.ok || data.error) throw new Error(data.error || 'Verification failed');
        
        if (data.redirect) {
            window.location.href = data.redirect;
        }
    } catch (err) {
        showError(err.message);
    }
}
