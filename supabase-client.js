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
// Cek jika kita TIDAK sedang di halaman login (yaitu bukan di index.html atau /)
function __getAppRoot() {
  const path = window.location.pathname;
  return path.substring(0, path.lastIndexOf('/') + 1);
}
const path = window.location.pathname;
// Jika di admin.html, sembunyikan konten sampai verifikasi role selesai
if (path.endsWith('/admin.html') || path.endsWith('admin.html')) {
  try { document.body.style.visibility = 'hidden'; } catch {}
}
const BASE = __getAppRoot();
if (!path.endsWith('/') && !path.endsWith('/index.html')) {
  // Gate cepat: kalau tidak ada session, langsung redirect (tanpa menunggu event)
  supabaseClient.auth.getSession().then(async ({ data: { session } }) => {
    if (!session) {
      window.location.replace(BASE + 'index.html');
    } else {
      // =================================================================
      // NEW: Centralized UI Initialization
      // =================================================================
      const user = session.user;
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
      // Jika halaman admin, verifikasi role lebih dulu
      if (path.endsWith('/admin.html') || path.endsWith('admin.html')) {
        try {
          const { data: isAdmin } = await supabaseClient.rpc('is_admin');
          if (isAdmin === true) {
            try { document.body.style.visibility = 'visible'; } catch {}
          } else {
            // non-admin: langsung alihkan ke halaman utama tanpa alert
            window.location.replace(BASE + 'trackmate.html');
            return;
          }
        } catch {
          // error cek role -> alihkan ke halaman utama
          window.location.replace(BASE + 'trackmate.html');
          return;
        }
      }

      // Auto logout saat idle lama (8 jam)
      if (!window.__idleTimeoutSetup) {
        window.__idleTimeoutSetup = true;
        const IDLE_LIMIT_MS = 8 * 60 * 60 * 1000; // 8 jam
        let idleTimer;
        const activityEvents = ['mousemove', 'keydown', 'scroll', 'touchstart', 'visibilitychange'];
        const resetIdleTimer = () => {
          clearTimeout(idleTimer);
          idleTimer = setTimeout(async () => {
            // Cukup panggil signOut(). Listener onAuthStateChange akan menangani
            // redirect secara otomatis saat mendeteksi event 'SIGNED_OUT'.
            // Ini mencegah duplikasi logika dan potensi race condition.
            console.log('Idle timeout reached. Signing out...');
            const { error } = await supabaseClient.auth.signOut();
            if (error) console.warn('Idle sign out failed, session might have already been invalid.', error.message);
          }, IDLE_LIMIT_MS);
        };
        activityEvents.forEach(evt => document.addEventListener(evt, resetIdleTimer, { passive: true }));
        resetIdleTimer();
      }
    }
  });

  // Listener tetap aktif untuk menangkap SIGNED_OUT dlsb.
  supabaseClient.auth.onAuthStateChange((event, session) => {
    // Jika logout dari tab lain, paksa redirect.
    if (event === 'SIGNED_OUT' || (event === 'USER_DELETED' && !session)) {
      window.location.replace(BASE + 'index.html');
    }
  });
}
