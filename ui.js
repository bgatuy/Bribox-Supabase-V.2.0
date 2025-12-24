// ui.js

document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();

  // ==================================================
  // LOGOUT (MANUAL) – ANTI 403
  // ==================================================
  const handleLogout = async (e) => {
    e?.preventDefault();

    const confirmed = await window.showConfirm(
      'Konfirmasi Logout',
      'Anda yakin ingin keluar dari sesi ini?'
    );
    if (!confirmed) return;

    const { data: { session } } =
      await supabaseClient.auth.getSession();

    if (!session) {
      window.location.replace(BASE + 'index.html');
      return;
    }

    try {
      await supabaseClient.auth.signOut({ scope: 'local' });
      // redirect via onAuthStateChange
    } catch (err) {
      console.warn('Logout skipped:', err.message);
      window.location.replace(BASE + 'index.html');
    }
  };

  document.getElementById('btnLogout')
    ?.addEventListener('click', handleLogout);
  document.getElementById('mobileBtnLogout')
    ?.addEventListener('click', handleLogout);

  // ==================================================
  // MOBILE MENU
  // ==================================================
  const menuBtn = document.getElementById('mobileMenuBtn');
  const menuPanel = document.getElementById('mobileMenuPanel');
  const menuBackdrop = document.getElementById('menuBackdrop');
  const menuSidebar = document.getElementById('menuSidebar');
  const closeBtn = document.getElementById('mobileMenuCloseBtn');

  const openMenu = () => {
    if (!menuPanel) return;
    menuPanel.classList.remove('invisible');
    menuBackdrop.classList.remove('opacity-0');
    menuSidebar.classList.remove('-translate-x-full');
  };

  const closeMenu = () => {
    if (!menuPanel) return;
    menuBackdrop.classList.add('opacity-0');
    menuSidebar.classList.add('-translate-x-full');
    setTimeout(() => {
      menuPanel.classList.add('invisible');
    }, 500);
  };

  menuBtn?.addEventListener('click', openMenu);
  closeBtn?.addEventListener('click', closeMenu);
  menuBackdrop?.addEventListener('click', closeMenu);

  // ==================================================
  // DRAG & DROP
  // ==================================================
  const dropZone = document.getElementById('dropZone');
  if (dropZone) {
    const fileInput =
      document.getElementById(dropZone.getAttribute('for'));

    ['dragenter','dragover'].forEach(evt =>
      dropZone.addEventListener(evt, e => {
        e.preventDefault();
        dropZone.classList.add('is-dragging');
      })
    );

    ['dragleave','drop'].forEach(evt =>
      dropZone.addEventListener(evt, e => {
        e.preventDefault();
        dropZone.classList.remove('is-dragging');
      })
    );

    dropZone.addEventListener('drop', e => {
      if (fileInput && e.dataTransfer?.files?.length) {
        fileInput.files = e.dataTransfer.files;
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    fileInput?.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      const promptEl = document.getElementById('upload-prompt');
      const infoEl = document.getElementById('file-info');
      const nameEl = document.getElementById('file-name');

      if (!promptEl || !infoEl || !nameEl) return;

      if (file) {
        promptEl.classList.add('hidden');
        nameEl.textContent = file.name;
        nameEl.title = file.name;
        infoEl.classList.remove('hidden');
        infoEl.classList.add('flex');
      } else {
        infoEl.classList.add('hidden');
        infoEl.classList.remove('flex');
        promptEl.classList.remove('hidden');
      }
    });
  }

  // ==================================================
  // HEADER SCROLL EFFECT
  // ==================================================
  const mainNav = document.getElementById('mainNav');
  if (mainNav) {
    const page = document.body.dataset.page;
    const bg = page === 'admin'
      ? 'bg-brand-dark/90'
      : 'bg-brand-blue/90';

    window.addEventListener('scroll', () => {
      if (window.scrollY > 10) {
        mainNav.classList.add(bg, 'backdrop-blur-sm', 'shadow-lg');
      } else {
        mainNav.classList.remove(bg, 'backdrop-blur-sm', 'shadow-lg');
      }
    });
  }
});
