// ui.js - Shared UI Initialization Logic (FIXED)

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide icons
  lucide.createIcons();

  // ==================================================
  // 1. LOGOUT BUTTON (DEFENSIVE LOGOUT)
  // ==================================================
  const handleLogout = async (e) => {
    e?.preventDefault();

    const confirmed = await window.showConfirm(
      'Konfirmasi Logout',
      'Anda yakin ingin keluar dari sesi ini?'
    );
    if (!confirmed) return;

    try {
      // Cek apakah session masih ada
      const { data: { session } } = await supabaseClient.auth.getSession();

      // Jika session masih valid, coba logout ke server
      if (session) {
        await supabaseClient.auth.signOut();
      }
    } catch (err) {
      // Kalau token expired / 403, tidak masalah
      console.warn('Logout server gagal (diabaikan):', err?.message);
    } finally {
      // PAKSA bersihkan session client (INI YANG PENTING)
      await supabaseClient.auth.signOut({ scope: 'local' });
      window.location.replace('index.html');
    }
  };

  document.getElementById('btnLogout')?.addEventListener('click', handleLogout);
  document.getElementById('mobileBtnLogout')?.addEventListener('click', handleLogout);

  // ==================================================
  // 2. MOBILE MENU TOGGLE
  // ==================================================
  const menuBtn = document.getElementById('mobileMenuBtn');
  const menuPanel = document.getElementById('mobileMenuPanel');
  const menuBackdrop = document.getElementById('menuBackdrop');
  const menuSidebar = document.getElementById('menuSidebar');
  const closeBtn = document.getElementById('mobileMenuCloseBtn');

  const openMenu = () => {
    if (!menuPanel || !menuBackdrop || !menuSidebar) return;
    menuPanel.classList.remove('invisible');
    menuBackdrop.classList.remove('opacity-0');
    menuSidebar.classList.remove('-translate-x-full');
  };

  const closeMenu = () => {
    if (!menuPanel || !menuBackdrop || !menuSidebar) return;
    menuBackdrop.classList.add('opacity-0');
    menuSidebar.classList.add('-translate-x-full');
    setTimeout(() => menuPanel.classList.add('invisible'), 500);
  };

  menuBtn?.addEventListener('click', openMenu);
  closeBtn?.addEventListener('click', closeMenu);
  menuBackdrop?.addEventListener('click', closeMenu);

  // ==================================================
  // 3. DRAG & DROP FEEDBACK
  // ==================================================
  const dropZone = document.getElementById('dropZone');
  if (dropZone) {
    const fileInput = document.getElementById(dropZone.getAttribute('for'));

    ['dragenter', 'dragover'].forEach(evt =>
      dropZone.addEventListener(evt, e => {
        e.preventDefault();
        dropZone.classList.add('is-dragging');
      })
    );

    ['dragleave', 'drop'].forEach(evt =>
      dropZone.addEventListener(evt, e => {
        e.preventDefault();
        dropZone.classList.remove('is-dragging');
      })
    );

    dropZone.addEventListener('drop', (e) => {
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
  // 4. HEADER SCROLL EFFECT
  // ==================================================
  const mainNav = document.getElementById('mainNav');
  if (mainNav) {
    const page = document.body.dataset.page;
    const bgClass = page === 'admin' ? 'bg-brand-dark/90' : 'bg-brand-blue/90';
    const shadowClass = page === 'admin' ? 'shadow-black/20' : 'shadow-blue-900/10';

    window.addEventListener('scroll', () => {
      if (window.scrollY > 10) {
        mainNav.classList.add(bgClass, 'backdrop-blur-sm', 'shadow-lg', shadowClass);
      } else {
        mainNav.classList.remove(bgClass, 'backdrop-blur-sm', 'shadow-lg', shadowClass);
      }
    });
  }
});
