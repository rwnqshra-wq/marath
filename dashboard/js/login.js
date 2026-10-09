document.addEventListener('DOMContentLoaded', async () => {
    const apiUrl = typeof DASHBOARD_CONFIG !== 'undefined' ? DASHBOARD_CONFIG.API_URL : '';
    try {
        const configRes = await fetch(`${apiUrl}/api/config`);
        if (configRes.ok) {
            const config = await configRes.json();
            document.title = `لوحة التحكم - ${config.projectName}`;
            const headerP = document.querySelector('.login-header p');
            if (headerP) headerP.textContent = `نظام إدارة ${config.projectName}`;
        }
    } catch(e) {}

    const loginForm = document.getElementById('login-form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginError = document.getElementById('login-error');
    const loginBtn = document.querySelector('.login-btn');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const username = usernameInput.value;
            const password = passwordInput.value;

            // Loading state
            const originalBtnText = loginBtn.textContent;
            loginBtn.disabled = true;
            loginBtn.textContent = 'جاري الدخول...';
            loginError.classList.add('hidden');

            try {
                const response = await fetch(`${apiUrl}/dashboard/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, password }),
                    credentials: 'include'
                });

                if (response.ok) {
                    window.location.href = '/dashboard';
                } else {
                    const data = await response.json();
                    loginError.textContent = data.message || 'خطأ في تسجيل الدخول';
                    loginError.classList.remove('hidden');
                }
            } catch (error) {
                loginError.textContent = 'خطأ في الاتصال بالخادم';
                loginError.classList.remove('hidden');
            } finally {
                loginBtn.disabled = false;
                loginBtn.textContent = originalBtnText;
            }
        });
    }
});
