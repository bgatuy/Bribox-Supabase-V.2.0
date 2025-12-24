// ==================================================
// supabase-client.js
// ==================================================

/**
 * ⚠️ CATATAN KEAMANAN
 * Jangan hardcode anon key di production.
 * Gunakan Environment Variables di hosting.
 */
const SUPABASE_URL = 'https://yaajbonefhpdeehdkujr.supabase.co';
const SUPABASE_ANON_KEY = 'PASTE_ANON_KEY_DI_ENV_PRODUCTION';

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==================================================
// HELPER
// ==================================================
function getAppRoot() {
  const path = window.location.pathname;
  return path.substring(0, path.lastIndexOf('/') + 1);
}

const BASE = getAppRoot();
const path = window.location.pathname;

// ==================================================
// GATE AUTH (SEMUA HALAMAN KECUALI LOGIN)
// ==================================================
if (
  !path.endsWith('/') &&
  !path.endsWith('/index.html')
) {

  // Sembunyikan admin sampai role diverifikasi
  if (path.endsWith('admin.html')) {
    try {
      document.body.style.visibility = 'hidden';
    } catch {}
  }

  supabaseClient.auth.getSession().then(async (res) => {
    const session = res?.data?.session;

    // ==================================================
    // TIDAK ADA SESSION → REDIRECT KE LOGIN
    // ==================================================
    if (!session) {
      window.location.replace(BASE + 'index.html');
      return;
    }

    // ==================================================
    // SET USER UI
    // ==================================================
    const user = session.user;
    if (user) {
      const meta = user.user_metadata || {};
      const displayName =
        meta.full_name ||
        meta.name ||
        user.email ||
        'User';

      const avatarUrl =
        meta.picture ||
        meta.avatar_url ||
        null;

      const shortName = displayName.split(' ')[0];

      const userNameEl = document.getElementById('userName');
      const mobileUserNameEl = document.getElementById('mobileUserName');
      const userAvatarEl = document.getElementById('userAvatar');
      const mobileUserAvatarEl = document.getElementById('mobileUserAvatar');

      if (userNameEl) userNameEl.textContent = shortName;
      if (mobileUserNameEl) mobileUserNameEl.textContent = shortName;

      if (avatarUrl) {
        if (userAvatarEl) userAvatarEl.src = avatarUrl;
        if (mobileUserAvatarEl) mobileUserAvatarEl.src = avatarUrl;
      }
    }

    // ==================================================
    // ADMIN GATE
    // ==================================================
    if (path.endsWith('admin.html')) {
      try {
        const { data: isAdmin } = await supabaseClient.rpc('is_admin');

        if (!isAdmin) {
          window.location.replace(BASE + 'trackmate.html');
          return;
        }

        document.body.style.visibility = 'visible';
      } catch (err) {
        window.location.replace(BASE + 'trackmate.html');
        return;
      }
    }

    // ==================================================
    // IDLE AUTO LOGOUT (LOCAL ONLY)
    // ==================================================
    if (!window.__idleSetup) {
      window.__idleSetup = true;

      const IDLE_LIMIT_MS = 8 * 60 * 60 * 1000; // 8 jam
      let idleTimer;

      const resetIdleTimer = () => {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(async () => {
          try {
            // HAPUS SESSION LOKAL SAJA (ANTI 403)
            await supabaseClient.auth.signOut({ scope: 'local' });
          } catch {}
          window.location.replace(BASE + 'index.html?reason=idle');
        }, IDLE_LIMIT_MS);
      };

      [
        'mousemove',
        'keydown',
        'scroll',
        'touchstart',
        'visibilitychange'
      ].forEach(evt =>
        document.addEventListener(evt, resetIdleTimer, { passive: true })
      );

      resetIdleTimer();
    }
  });

  // ==================================================
  // MULTI TAB / CROSS TAB LOGOUT SYNC
  // ==================================================
  supabaseClient.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
      window.location.replace(BASE + 'index.html');
    }
  });
}
