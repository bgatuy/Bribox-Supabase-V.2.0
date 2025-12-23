// ui.js - Shared UI Initialization Logic

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide icons
    lucide.createIcons();

    // --- 1. Logout Button ---
    const handleLogout = async (e) => {
        e?.preventDefault(); // Mencegah aksi default dari tombol

        const confirmed = await window.showConfirm('Konfirmasi Logout', 'Anda yakin ingin keluar dari sesi ini?');
        if (!confirmed) {
            return; // Pengguna membatalkan, tidak melakukan apa-apa
        }

        // Beri feedback visual bahwa proses sedang berjalan
        window.showSpinner?.();

        try {
            // Panggil signOut() tanpa opsi apa pun untuk logout LOKAL (hanya perangkat ini)
            const { error } = await supabaseClient.auth.signOut();

            if (error) {
                // Jika ada error dari Supabase, sembunyikan spinner dan tampilkan pesan
                window.hideSpinner?.();
                console.error('Logout error:', error);
                window.showToast?.(`Logout Gagal: ${error.message}`, 5000, 'warn');
            } else {
                // Jika berhasil, langsung arahkan ke halaman login.
                // Notifikasi sukses dihilangkan sesuai permintaan.
                window.location.href = 'index.html';
            }
        } catch (err) {
            // Tangani error tak terduga, sembunyikan spinner
            window.hideSpinner?.();
            console.error('Unexpected logout error:', err);
            window.showToast?.('Terjadi kesalahan tak terduga saat logout.', 5000, 'error');
        }
    };
    document.getElementById('btnLogout')?.addEventListener('click', handleLogout);
    document.getElementById('mobileBtnLogout')?.addEventListener('click', handleLogout);
    
    // --- 2. Mobile Menu Toggle ---
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
        setTimeout(() => {
            menuPanel.classList.add('invisible');
        }, 500); // Match sidebar transition duration
    };

    menuBtn?.addEventListener('click', openMenu);
    closeBtn?.addEventListener('click', closeMenu);
    menuBackdrop?.addEventListener('click', closeMenu);

    // --- 3. Drag & Drop Feedback (Conditional) ---
    const dropZone = document.getElementById('dropZone');
    if (dropZone) {
        const fileInput = document.getElementById(dropZone.getAttribute('for'));

        // Memberi efek visual saat file diseret ke area drop
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropZone.classList.add('is-dragging');
            });
        });

        // Menghilangkan efek visual saat file keluar dari area atau di-drop
        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropZone.classList.remove('is-dragging');
            });
        });

        // Menangani file yang di-drop
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            if (fileInput && e.dataTransfer?.files?.length > 0) {
                // Masukkan file yang di-drop ke dalam input file
                fileInput.files = e.dataTransfer.files;
                // Picu event 'change' agar logika ekstrak teks berjalan
                const changeEvent = new Event('change', { bubbles: true });
                fileInput.dispatchEvent(changeEvent);
            }
        });

        // Menangani perubahan UI saat file dipilih
        if (fileInput) {
            fileInput.addEventListener('change', () => {
                const file = fileInput.files?.[0];
                const promptEl = document.getElementById('upload-prompt');
                const infoEl = document.getElementById('file-info');
                const nameEl = document.getElementById('file-name');

                if (!promptEl || !infoEl || !nameEl) return;

                if (file) {
                    promptEl.classList.add('hidden');
                    nameEl.textContent = file.name;
                    nameEl.title = file.name; // Tooltip untuk nama file panjang
                    infoEl.classList.remove('hidden');
                    infoEl.classList.add('flex');
                } else {
                    infoEl.classList.add('hidden');
                    infoEl.classList.remove('flex');
                    promptEl.classList.remove('hidden');
                }
            });
        }
    }

    // --- 4. Header scroll effect ---
    const mainNav = document.getElementById('mainNav');
    if (mainNav) {
        const page = document.body.dataset.page;
        const scrollBgClass = (page === 'admin') ? 'bg-brand-dark/90' : 'bg-brand-blue/90';
        const shadowClass = (page === 'admin') ? 'shadow-black/20' : 'shadow-blue-900/10';

        window.addEventListener('scroll', () => {
            if (window.scrollY > 10) {
                mainNav.classList.add(scrollBgClass, 'backdrop-blur-sm', 'shadow-lg', shadowClass);
            } else {
                mainNav.classList.remove(scrollBgClass, 'backdrop-blur-sm', 'shadow-lg', shadowClass);
            }
        });
    }
});