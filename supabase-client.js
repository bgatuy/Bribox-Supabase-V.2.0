// supabase-client.js (FIXED & SAFE)

const SUPABASE_URL = 'https://yaajbonefhpdeehdkujr.supabase.co';
const SUPABASE_ANON_KEY = 'PASTE_ANON_KEY_DI_ENV_PRODUCTION';

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==================================================
// HELPER
// ==================================================
function __getAppRoot() {
  const path = window.location.pathname;
  return path.substring(0, path.lastIndexOf('/') + 1);
}

const BASE = __getAppRoot();
const path = window.location.pathname;

// ==================================================
// GATE AUTH (EXCEPT LOGIN PAGE)
// ==================================================
if (!path.endsWith('/') && !path.endsWith('/index.html')) {

  // Sembunyikan admin sampai role valid
  if (path.endsWith('admin.html')) {
    document.body.style.visibility = 'hidden';
  }

  supabaseClient.auth.getSession().then(async ({ data: { session } }) => {
    if (!session) {
      window.location.replace(BASE + 'index.html');
      return;
    }

    const user = session.user;
    if (user) {
      const meta = user.user_metadata || {};
      const avatar = meta.picture || meta.avatar_url;
      const name = meta.full_name || meta.name || user.email || 'User';

      document.getElementById('userName')?.textContent = name.split(' ')[0];
      document.getElementById('mobileUserName')?.textContent = name.split(' ')[0];

      if (avatar) {
        document.getElementById('userAvatar')?.setAttribute('src', avatar);
        document.getElementById('mobileUserAvatar')?.setAttribute('src', avatar);
      }

      try {
        const { data: isAdmin } = await supabaseClient.rpc('is_admin');
        if (isAdmin) {
          document.getElementById('navAdminLink')?.classList.remove('hidden');
          document.getElementById('mobileNavAdminLink')?.classList.remove('hidden');
        }
      } catch {}
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
      } catch {
        window.location.replace(BASE + 'trackmate.html');
        return;
      }
    }

    // ==================================================
    // IDLE AUTO LOGOUT (LOCAL ONLY)
    // ==================================================
    if (!window.__idleSetup) {
      window.__idleSetup = true;

      const IDLE_LIMIT = 8 * 60 * 60 * 1000; // 8 jam
      let timer;

      const resetTimer = () => {
        clearTimeout(timer);
        timer = setTimeout(async () => {
          await supabaseClient.auth.signOut({ scope: 'local' });
          window.location.replace(BASE + 'index.html?reason=idle');
        }, IDLE_LIMIT);
      };

      ['mousemove', 'keydown', 'scroll', 'touchstart', 'visibilitychange']
        .forEach(evt => document.addEventListener(evt, resetTimer, { passive: true }));

      resetTimer();
    }
  });

  // ==================================================
  // AUTH STATE SYNC (MULTI TAB SAFE)
  // ==================================================
  supabaseClient.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
      window.location.replace(BASE + 'index.html');
    }
  });
}
