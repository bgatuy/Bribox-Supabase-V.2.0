// supabase-client.js

const SUPABASE_URL = 'https://yaajbonefhpdeehdkujr.supabase.co';
const SUPABASE_ANON_KEY = 'PASTE_ANON_KEY_DI_ENV_PROD';

// Inisialisasi Supabase
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==================================================
// UTIL
// ==================================================
function __getAppRoot() {
  const path = window.location.pathname;
  return path.substring(0, path.lastIndexOf('/') + 1);
}

const BASE = __getAppRoot();
const path = window.location.pathname;

// Sembunyikan admin page sampai role diverifikasi
if (path.endsWith('/admin.html') || path.endsWith('admin.html')) {
  try { document.body.style.visibility = 'hidden'; } catch {}
}

// ==================================================
// GATE HALAMAN (AUTH CHECK)
// ==================================================
if (!path.endsWith('/') && !path.endsWith('/index.html')) {
  supabaseClient.auth.getSession().then(async ({ data: { session } }) => {
    if (!session) {
      window.location.replace(BASE + 'index.html');
      return;
    }

    // ===============================
    // INIT USER UI
    // ===============================
    const user = session.user;
    if (user) {
      const meta = user.user_metadata || {};
      const avatarUrl = meta.picture || meta.avatar_url;
      const displayName =
        meta.full_name || meta.name || user.email || 'User';

      const setText = (id, v) => {
        const el = document.getElementById(id);
        if (el) el.textContent = v;
      };
      const setImg = (id, v) => {
        const el = document.getElementById(id);
        if (el && v) el.src = v;
      };

      setText('userName', displayName.split(' ')[0]);
      setImg('userAvatar', avatarUrl);
      setText('mobileUserName', displayName.split(' ')[0]);
      setImg('mobileUserAvatar', avatarUrl);

      // ===============================
      // ADMIN CHECK
      // ===============================
      try {
        const { data: isAdmin } = await supabaseClient.rpc('is_admin');
        if (isAdmin) {
          document.getElementById('navAdminLink')?.classList.remove('hidden');
          const m = document.getElementById('mobileNavAdminLink');
          if (m) {
            m.classList.remove('hidden');
            m.classList.add('flex');
          }
        }
      } catch (e) {
        console.warn('Admin check failed:', e.message);
      }
    }

    // ===============================
    // ADMIN PAGE GUARD
    // ===============================
    if (path.endsWith('/admin.html') || path.endsWith('admin.html')) {
      try {
        const { data: isAdmin } = await supabaseClient.rpc('is_admin');
        if (isAdmin === true) {
          document.body.style.visibility = 'visible';
        } else {
          window.location.replace(BASE + 'trackmate.html');
          return;
        }
      } catch {
        window.location.replace(BASE + 'trackmate.html');
        return;
      }
    }

    // ===============================
    // IDLE LOGOUT (8 JAM) – ANTI 403
    // ===============================
    if (!window.__idleTimeoutSetup) {
      window.__idleTimeoutSetup = true;

      const IDLE_LIMIT_MS = 8 * 60 * 60 * 1000;
      let idleTimer;

      const resetIdleTimer = () => {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(async () => {
          console.log('Idle timeout reached');

          const { data: { session } } =
            await supabaseClient.auth.getSession();

          if (!session) {
            window.location.replace(BASE + 'index.html');
            return;
          }

          await supabaseClient.auth.signOut({ scope: 'local' });
        }, IDLE_LIMIT_MS);
      };

      ['mousemove','keydown','scroll','touchstart','visibilitychange']
        .forEach(evt =>
          document.addEventListener(evt, resetIdleTimer, { passive: true })
        );

      resetIdleTimer();
    }
  });

  // ==================================================
  // AUTH STATE LISTENER (SINGLE SOURCE OF REDIRECT)
  // ==================================================
  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || (event === 'USER_DELETED' && !session)) {
      window.location.replace(BASE + 'index.html');
    }
  });
}
