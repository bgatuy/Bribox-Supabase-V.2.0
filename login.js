// login.js

document.addEventListener('DOMContentLoaded', async () => {
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    const errorDiv = document.getElementById('login-error');

    // Handler untuk tombol Login with Google.
    googleLoginBtn?.addEventListener('click', async () => {
        if (typeof supabaseClient === 'undefined') {
            if (errorDiv) errorDiv.textContent = 'Supabase client tidak terdefinisi.';
            return;
        }
        const { data, error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
        });
        if (error) {
            if(errorDiv) errorDiv.textContent = `Login Google Gagal: ${error.message}`;
        }
    });

    // Listener ini akan menangani pengalihan SETELAH login berhasil.
    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
            // Gunakan app root untuk path yang lebih andal
            const base = window.__getAppRoot ? window.__getAppRoot() : '/';
            window.location.href = `${base}trackmate.html`;
        }
    });
});
