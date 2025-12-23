// admin.js

document.addEventListener('DOMContentLoaded', async () => {
  // Verifikasi admin dan inisialisasi layout sekarang ditangani oleh supabase-client.js dan utils.js.
  // Cukup panggil fungsi yang spesifik untuk halaman ini.
  // Muat statistik dan daftar pengguna secara bersamaan
  Promise.all([
    loadAdminStats(),
    loadUserList()
  ]);

  // Event untuk tombol Reset Semua Data
  const btnAdminResetAll = document.getElementById('btnAdminResetAll');
  btnAdminResetAll?.addEventListener('click', handleAdminReset);

  // Event delegation untuk aksi di tabel pengguna (ubah role, hapus)
  const userTableBody = document.getElementById('user-table-body');
  userTableBody?.addEventListener('change', handleRoleChange);
  userTableBody?.addEventListener('click', handleDeleteUser);
});

/**
 * Memuat data statistik untuk dashboard admin.
 * NOTE: Saat ini menggunakan data placeholder. Ini bisa diganti dengan panggilan API sungguhan.
 */
async function loadAdminStats() {
  const el = (id) => document.getElementById(id);
  const totalUsersEl = el('stat-total-users');
  const monthlyReportsEl = el('stat-monthly-reports');
  const totalFilesEl = el('stat-total-files');
  const storageUsageEl = el('stat-storage-usage');

  if (typeof supabaseClient === 'undefined') return;

  // Helper untuk format ukuran
  const formatBytes = (bytes) => {
    const b = Number(bytes) || 0;
    if (b >= 1024 * 1024 * 1024) return (b / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    if (b >= 1024 * 1024) return (b / (1024 * 1024)).toFixed(2) + ' MB';
    if (b >= 1024) return (b / 1024).toFixed(2) + ' KB';
    return b + ' B';
  };

  try {
    // Panggil satu RPC function yang akan menghitung semua statistik di sisi server
    const { data: stats, error } = await supabaseClient.rpc('get_admin_stats');

    if (error) {
      throw error;
    }

    if (stats) {
      if (totalFilesEl) totalFilesEl.textContent = String(stats.total_files || 0);
      if (monthlyReportsEl) monthlyReportsEl.textContent = String(stats.monthly_reports || 0);
      if (totalUsersEl) totalUsersEl.textContent = String(stats.total_users || 0);
      if (storageUsageEl) storageUsageEl.textContent = formatBytes(stats.storage_usage || 0);
    }
  } catch (e) {
    console.warn('Gagal memuat statistik admin:', e);
    // Tampilkan pesan error di UI agar admin tahu ada masalah
    const statCards = document.querySelectorAll('.stat-card .stat-value');
    statCards.forEach(card => {
        card.textContent = 'Error';
        card.style.color = '#dc3545'; // Merah
    });
    showToast?.(`Gagal memuat statistik: ${e.message}`, 5000, 'warn');
  }
}

/**
 * Memuat daftar semua pengguna dan menampilkannya dalam tabel.
 */
async function loadUserList() {
  const tableBody = document.getElementById('user-table-body');
  if (!tableBody) return;

  // Dapatkan ID admin yang sedang login
  const { data: { user: currentAdmin } } = await supabaseClient.auth.getUser();
  const currentAdminId = currentAdmin?.id;

  try {
    const { data: users, error } = await supabaseClient.rpc('get_all_users');
    if (error) throw error;

    if (!users || users.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-slate-500 italic">Tidak ada pengguna ditemukan.</td></tr>`;
      return;
    }

    // Kosongkan body tabel sebelum mengisi
    tableBody.innerHTML = '';

    // Helper format tanggal (biar rapi)
    const formatDate = (dateString) => {
      if (!dateString) return '-';
      return new Date(dateString).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    };

    users.forEach(user => {
      const isCurrentUser = user.user_id === currentAdminId;
      const row = document.createElement('tr');
      
      // TAMBAHAN: Class biar barisnya ada garis pembatas tipis & efek hover
      row.className = "bg-white border-b border-slate-100 hover:bg-slate-50 transition-colors";

      // Logic tampilan Role
      const roleCellContent = isCurrentUser
        ? `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-200">Admin (Anda)</span>`
        : `
          <select class="role-selector bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-brand-orange focus:border-brand-orange block w-full p-1.5 cursor-pointer" 
                  data-user-id="${user.user_id}" 
                  data-original-role="${user.role}">
            <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
          </select>
        `;

      // HTML ROW BARU (Perhatikan class px-6 py-4 di setiap td)
      row.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap text-slate-700 font-medium">
            ${user.email}
        </td>
        
        <td class="px-6 py-4 whitespace-nowrap">
            ${roleCellContent}
        </td>
        
        <td class="px-6 py-4 whitespace-nowrap text-slate-500">
            ${formatDate(user.created_at)}
        </td>
        
        <td class="px-6 py-4 whitespace-nowrap text-slate-500">
            ${formatDate(user.last_sign_in_at)}
        </td>
        
        <td class="px-6 py-4 whitespace-nowrap text-center">
          <button class="btn-icon p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all disabled:opacity-30" 
                  title="Hapus Pengguna" 
                  data-user-id="${user.user_id}" 
                  data-user-email="${user.email}" 
                  ${isCurrentUser ? 'disabled' : ''}>
            <i data-lucide="trash-2" class="w-5 h-5"></i>
          </button>
        </td>
      `;
      tableBody.appendChild(row);
    });

    lucide.createIcons();

  } catch (err) {
    console.error('Gagal memuat daftar pengguna:', err);
    tableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-rose-500 bg-rose-50">Gagal memuat data: ${err.message}</td></tr>`;
  }
}

/**
 * Menangani event saat admin mengubah role pengguna dari dropdown.
 * @param {Event} e The change event.
 */
async function handleRoleChange(e) {
  if (!e.target.classList.contains('role-selector')) return;

  const selector = e.target;
  const targetUserId = selector.dataset.userId;
  const newRole = selector.value;
  const originalRole = selector.dataset.originalRole;
  const userEmail = selector.closest('tr').cells[0].textContent;

  if (newRole === originalRole) return; // Tidak ada perubahan

  const confirmation = confirm(`Anda yakin ingin mengubah role untuk pengguna "${userEmail}" dari "${originalRole}" menjadi "${newRole}"?`);

  if (!confirmation) {
    selector.value = originalRole; // Kembalikan pilihan jika dibatalkan
    return;
  }

  try {
    showSpinner();
    const { error } = await supabaseClient.rpc('admin_update_user_role', {
      target_user_id: targetUserId,
      new_role: newRole
    });

    if (error) throw error;

    showToast(`Role untuk ${userEmail} berhasil diubah.`, 4000, 'success');
    await loadUserList(); // Muat ulang daftar pengguna untuk memastikan UI konsisten
  } catch (err) {
    showToast(`Gagal mengubah role: ${err.message}`, 6000, 'warn');
    selector.value = originalRole; // Kembalikan jika gagal
  } finally {
    hideSpinner();
  }
}

/**
 * Menangani event saat admin mengklik tombol hapus pengguna.
 * @param {Event} e The click event.
 */
async function handleDeleteUser(e) {
  const deleteButton = e.target.closest('.btn-icon[title="Hapus Pengguna"]');
  if (!deleteButton) return;

  const targetUserId = deleteButton.dataset.userId;
  const userEmail = deleteButton.dataset.userEmail;

  const confirmation = confirm(
    `PERINGATAN!\n\nAnda yakin ingin menghapus pengguna "${userEmail}"?\n\nSemua data milik pengguna ini (file, histori, laporan) akan dihapus secara permanen. Tindakan ini tidak bisa dibatalkan.`
  );

  if (!confirmation) return;

  try {
    showSpinner();

    // Ambil token untuk otorisasi
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session?.access_token) throw new Error("Otorisasi gagal: token tidak ditemukan.");

    // Panggil Edge Function untuk menghapus pengguna
    const { error } = await supabaseClient.functions.invoke('admin-delete-user', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: { target_user_id: targetUserId }
    });

    if (error) throw error;

    showToast(`Pengguna ${userEmail} berhasil dihapus.`, 4000, 'success');
    // Muat ulang daftar pengguna dan statistik
    await Promise.all([
      loadUserList(),
      loadAdminStats()
    ]);
  } catch (err) {
    showToast(`Gagal menghapus pengguna: ${err.message}`, 6000, 'warn');
  } finally {
    hideSpinner();
  }
}

/**
 * Menangani logika untuk mereset semua data melalui Edge Function.
 */
async function handleAdminReset() {
  const confirmationText =
    "PERINGATAN ADMIN:\n\nAnda akan MENGHAPUS SEMUA DATA pengguna (histori PDF, file di storage, dan laporan bulanan).\n\nKetik 'RESET' untuk konfirmasi.";
  const userInput = prompt(confirmationText);
  if (userInput !== 'RESET') {
    showToast('Reset dibatalkan.', 3000, 'info');
    return;
  }

  try {
    showSpinner();

    // Ambil access token pengguna yang sedang login untuk otorisasi di Edge Function
    const { data: { session } } = await supabaseClient.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error("Otorisasi gagal: token tidak ditemukan.");

    // Panggil Edge Function 'reset-all-data'
    const { data, error } = await supabaseClient.functions.invoke('reset-all-data', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: { confirm: 'RESET' }
    });

    if (error) {
      const resp = error?.context?.response;
      const extra = resp ? ` (HTTP ${resp.status} ${resp.statusText || ''})` : '';
      throw new Error(error.message + extra);
    }

    showToast('RESET BERHASIL: Semua data pengguna telah dihapus.', 5000, 'success');
    loadAdminStats(); // Muat ulang statistik setelah reset
  } catch (err) {
    showToast(`RESET GAGAL: ${err.message}`, 6000, 'warn');
  } finally {
    hideSpinner();
  }
}
