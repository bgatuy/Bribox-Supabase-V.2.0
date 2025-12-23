// supabase-client.js

/**
 * =================================================================================
 * SARAN KEAMANAN (PENTING): Gunakan Environment Variables untuk menyimpan kunci Supabase.
 * 
 * Jangan letakkan kunci API langsung di dalam kode (hardcode) seperti di bawah ini.
 * Ini sangat berisiko karena siapa saja bisa melihatnya di browser dan menyalahgunakan
 * akun Supabase Anda (menghabiskan kuota, memasukkan data sampah, dll).
 * 
 * Praktik terbaik adalah menyimpannya di fitur "Environment Variables" pada platform
 * hosting Anda (misalnya Vercel, Netlify, atau GitHub Secrets untuk GitHub Pages).
 * =================================================================================
 */
const SUPABASE_URL = 'https://yaajbonefhpdeehdkujr.supabase.co'; // <-- Pindahkan ke Environment Variable di production
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhYWpib25lZmhwZGVlaGRrdWpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMzA3MDAsImV4cCI6MjA4MDYwNjcwMH0.UjM0CrVxwKR-jiMNICqRx-Njgzw7SexmBNRCsrXHqKI'; // <-- Pindahkan ke Environment Variable di production

// Inisialisasi Supabase client. Variabel `supabaseClient` akan tersedia secara global.
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==================================================
// INI ADALAH SCRIPT "PENJAGA GERBANG"
// ==================================================
const path = window.location.pathname;
const BASE = window.__getAppRoot(); // Gunakan fungsi global dari utils.js

// Jika di admin.html, sembunyikan konten sampai verifikasi role selesai
if (path.endsWith('/admin.html') || path.endsWith('admin.html')) {
  try { document.body.style.visibility = 'hidden'; } catch {}
}

// "Penjaga Gerbang" utama
// Cek jika kita TIDAK sedang di halaman login
if (!path.endsWith('/') && !path.endsWith('/index.html')) {
  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    // Jika tidak ada sesi (baik saat load awal atau setelah logout), redirect ke login
    if (!session) {
      window.location.replace(`${BASE}index.html`);
      return;
    }

    // Jika ada sesi, kita lanjutkan
    const user = session.user;
    
    // =================================================================
    // Centralized UI Initialization
    // =================================================================
    if (user) {
        const meta = user.user_metadata || {};
        const avatarUrl = meta.picture || meta.avatar_url;
        const displayName = meta.full_name || meta.name || user.email || 'User';
        
        // Desktop UI
        const userNameEl = document.getElementById('userName');
        const userAvatarEl = document.getElementById('userAvatar');
        if (userNameEl) userNameEl.textContent = displayName.split(' ')[0];
        if (userAvatarEl && avatarUrl) userAvatarEl.src = avatarUrl;

        // Mobile UI
        const mobileUserNameEl = document.getElementById('mobileUserName');
        const mobileUserAvatarEl = document.getElementById('mobileUserAvatar');
        if (mobileUserNameEl) mobileUserNameEl.textContent = displayName.split(' ')[0];
        if (mobileUserAvatarEl && avatarUrl) mobileUserAvatarEl.src = avatarUrl;

        // Check for admin role and show link
        try {
            const { data: isAdmin } = await supabaseClient.rpc('is_admin');
            if (isAdmin) {
                document.documentElement.classList.add('is-admin'); // Tandai user sebagai admin
                const navAdminLink = document.getElementById('navAdminLink');
                if (navAdminLink) navAdminLink.classList.remove('hidden');
                
                const mobileNavAdminLink = document.getElementById('mobileNavAdminLink');
                if (mobileNavAdminLink) {
                    mobileNavAdminLink.classList.remove('hidden');
                    mobileNavAdminLink.classList.add('flex');
                }
            }
        } catch (adminCheckError) {
            console.warn('Could not check admin status:', adminCheckError.message);
        }
    }

    // =================================================================
    // Verifikasi role untuk halaman admin
    // =================================================================
    if (path.endsWith('/admin.html') || path.endsWith('admin.html')) {
      try {
        const { data: isAdmin } = await supabaseClient.rpc('is_admin');
        if (isAdmin === true) {
          // Tampilkan konten jika admin
          try { document.body.style.visibility = 'visible'; } catch {}
        } else {
          // Bukan admin, redirect ke halaman utama
          window.location.replace(`${BASE}trackmate.html`);
        }
      } catch {
        // Gagal cek role, redirect ke halaman utama
        window.location.replace(`${BASE}trackmate.html`);
      }
    }

    // =================================================================
    // Setup auto logout saat idle (hanya sekali)
    // =================================================================
    if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
      if (!window.__idleTimeoutSetup) {
        window.__idleTimeoutSetup = true;
        const IDLE_LIMIT_MS = 8 * 60 * 60 * 1000; // 8 jam
        let idleTimer;
        const activityEvents = ['mousemove', 'keydown', 'scroll', 'touchstart', 'visibilitychange'];
        const resetIdleTimer = () => {
          clearTimeout(idleTimer);
          idleTimer = setTimeout(() => {
            // onAuthStateChange akan menangani redirect setelah signOut berhasil
            supabaseClient.auth.signOut({ scope: 'local' }).catch(console.error);
          }, IDLE_LIMIT_MS);          
        };
        activityEvents.forEach(evt => document.addEventListener(evt, resetIdleTimer, { passive: true }));
        resetIdleTimer();
      }
    }
  });
} else {
  // Ini adalah halaman login. Jika sudah ada sesi, redirect ke halaman utama.
  supabaseClient.auth.getSession().then(({ data: { session } }) => {
      if (session) {
          window.location.replace(`${BASE}trackmate.html`);
      }
  });
}
