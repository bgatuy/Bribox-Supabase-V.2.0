// ===== Shared Utilities & Constants =====

/**
 * Gets the application root path.
 * @returns {string} The root path, e.g., "/" or "/my-app/".
 */
window.__getAppRoot = function() {
  const path = window.location.pathname;
  return path.substring(0, path.lastIndexOf('/') + 1);
};

// Satu sumber kebenaran untuk daftar lokasi.
const LOCATIONS = [
  "BRI 1 Lt. Split","BRI 1 Lt. 2","BRI 1 Lt. 3","BRI 1 Lt. 4","BRI 1 Lt. 5","BRI 1 Lt. 6","BRI 1 Lt. 7","BRI 1 Lt. 8","BRI 1 Lt. 9","BRI 1 Lt. 10","BRI 1 Lt. 11","BRI 1 Lt. 12","BRI 1 Lt. 13","BRI 1 Lt. 14","BRI 1 Lt. 15","BRI 1 Lt. 16","BRI 1 Lt. 17","BRI 1 Lt. 18","BRI 1 Lt. 19","BRI 1 Lt. 20",
  "BRI 2 Lt. Basement","BRI 2 Lt. 2","BRI 2 Lt. 3","BRI 2 Lt. 4","BRI 2 Lt. 5","BRI 2 Lt. 6","BRI 2 Lt. 7","BRI 2 Lt. 8","BRI 2 Lt. 9","BRI 2 Lt. 10","BRI 2 Lt. 11","BRI 2 Lt. 12","BRI 2 Lt. 13","BRI 2 Lt. 14","BRI 2 Lt. 15","BRI 2 Lt. 16","BRI 2 Lt. 17","BRI 2 Lt. 18","BRI 2 Lt. 19","BRI 2 Lt. 20","BRI 2 Lt. 21","BRI 2 Lt. 22","BRI 2 Lt. 23","BRI 2 Lt. 24","BRI 2 Lt. 25","BRI 2 Lt. 26","BRI 2 Lt. 27","BRI 2 Lt. 28","BRI 2 Lt. 29","BRI 2 Lt. 30","BRI 2 Lt. 31",
  "Gd. Parkir BRI Lt. 1","Gd. Parkir BRI Lt. 5","Gd. Parkir BRI Lt. 8",
  "Menara Brilian Lt. 5","Menara Brilian Lt. 8","Menara Brilian Lt. 9","Menara Brilian Lt. 18","Menara Brilian Lt. 26","Menara Brilian Lt. 27","Menara Brilian Lt. 28","Menara Brilian Lt. 29","Menara Brilian Lt. 30","Menara Brilian Lt. 31","Menara Brilian Lt. 32","Menara Brilian Lt. 33","Menara Brilian Lt. 37","Menara Brilian Lt. 40","Menara Brilian Lt. 41",
  "PSCF Ragunan Lt. 1","PSCF Ragunan Lt. 2","PSCF Ragunan Lt. 3",
  "GTI Ragunan Lt. 5","GTI Ragunan Lt. 6","GTI Ragunan Lt. 7","GTI Ragunan Lt. 8"
];

// ===== SHARED HELPERS =====

/**
 * Menghitung hash SHA-256 dari sebuah ArrayBuffer.
 * @param {ArrayBuffer} buffer - Buffer yang akan di-hash.
 * @returns {Promise<string>} Hash dalam format hex.
 */
async function sha256Buffer(buffer) {
  try {
    const hashBuf = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Fallback jika SubtleCrypto tidak tersedia (misal: non-HTTPS context)
    return `fz_${buffer.byteLength}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

/**
 * Mengambil sesi user atau melempar error jika tidak login.
 * @returns {Promise<object>} Objek user Supabase.
 */
async function getUserOrThrow() {
  const { data: { session }, error } = await supabaseClient.auth.getSession();
  if (error || !session?.user) throw new Error('User tidak login atau sesi berakhir.');
  return session.user;
}

/**
 * Menghapus spasi dan titik dua di awal string.
 * @param {string} s - String input.
 * @returns {string} String yang sudah dibersihkan.
 */
const stripLeadingColon = (s) => (s || '').replace(/^\s*:+\s*/, '');

/**
 * Mengunggah file ke Supabase Storage dengan mekanisme coba ulang (retry).
 * @param {string} filePath - Path tujuan di bucket.
 * @param {File} file - Objek File yang akan diunggah.
 * @param {object} options - Opsi untuk Supabase upload.
 * @returns {Promise<object>} Hasil dari Supabase upload.
 */
async function uploadWithRetry(filePath, file, options = {}) {
  const bucket = supabaseClient.storage.from('pdf-forms');
  
  // Prioritas utama adalah mengunggah objek File secara langsung.
  const tryAsFile = () => bucket.upload(filePath, file, options);

  // Fallback jika `File` gagal, coba unggah sebagai ArrayBuffer.
  const tryAsArrayBuffer = async () => {
    const buffer = await file.arrayBuffer();
    return bucket.upload(filePath, buffer, options);
  };

  let res = await tryAsFile();
  // Coba ulang sekali jika ada error jaringan
  if (res?.error && /failed to fetch|network/i.test(res.error.message || '')) {
    await new Promise(r => setTimeout(r, 500));
    res = await tryAsFile();
  }
  // Jika masih error, gunakan fallback ArrayBuffer
  if (res?.error && /failed to fetch|network/i.test(res.error.message || '')) {
    await new Promise(r => setTimeout(r, 400));
    res = await tryAsArrayBuffer();
  }
  return res;
}

// ===== UI HELPERS (dulu di inline script) =====

// Definisikan fungsi-fungsi ini di window agar bisa diakses secara global
// seperti sebelumnya, memastikan kompatibilitas dengan kode yang ada.

window.showSpinner = () => {
    const spinner = document.getElementById('globalSpinner');
    if (spinner) {
        spinner.classList.remove('hidden');
        spinner.classList.add('flex');
    }
};

window.hideSpinner = () => {
    const spinner = document.getElementById('globalSpinner');
    if (spinner) {
        spinner.classList.add('hidden');
        spinner.classList.remove('flex');
    }
};

let toastTimer;
window.showToast = (message, duration = 3000, variant = 'success') => {
    const toast = document.getElementById('toast');
    if (!toast) return;

    clearTimeout(toastTimer);
    toast.textContent = message;

    toast.classList.remove('bg-green-600', 'bg-amber-500', 'bg-red-600', 'bg-sky-500');
    if (variant === 'warn') toast.classList.add('bg-amber-500');
    else if (variant === 'error' || variant === 'danger') toast.classList.add('bg-red-600');
    else if (variant === 'info') toast.classList.add('bg-sky-500');
    else toast.classList.add('bg-green-600');

    toast.classList.remove('opacity-0', '-translate-y-10');
    toast.classList.add('opacity-100', 'translate-y-0');

    toastTimer = setTimeout(() => {
        toast.classList.remove('opacity-100', 'translate-y-0');
        toast.classList.add('opacity-0', '-translate-y-10');
    }, duration);
};

window.showConfirm = (title, message, okLabel = 'Ya, Lanjutkan', okVariant = 'danger') => {
    return new Promise((resolve) => {
        const dialog = document.getElementById('confirmDialog');
        if (!dialog) {
            resolve(window.confirm(message));
            return;
        }

        const confirmTitle = document.getElementById('confirmTitle');
        const confirmMessage = document.getElementById('confirmMessage');
        const confirmOk = document.getElementById('confirmOk');

        if(confirmTitle) confirmTitle.textContent = title;
        if(confirmMessage) confirmMessage.textContent = message;
        if(confirmOk) confirmOk.textContent = okLabel;

        if (confirmOk) {
            confirmOk.classList.remove('bg-rose-600', 'hover:bg-rose-700', 'bg-brand-blue', 'hover:bg-brand-dark');
            if (okVariant === 'danger') {
                confirmOk.classList.add('bg-rose-600', 'hover:bg-rose-700');
            } else {
                confirmOk.classList.add('bg-brand-blue', 'hover:bg-brand-dark');
            }
        }

        const handleConfirm = (e) => { e.preventDefault(); dialog.close('ok'); };
        const handleClose = () => {
            resolve(dialog.returnValue === 'ok');
            confirmOk.removeEventListener('click', handleConfirm);
            dialog.removeEventListener('close', handleClose);
        };

        confirmOk.addEventListener('click', handleConfirm, { once: true });
        dialog.addEventListener('close', handleClose, { once: true });
        dialog.showModal();
    });
};

/**
 * Creates a searchable combobox from a text input.
 * @param {HTMLInputElement} input The input element.
 * @param {string[]} items The array of strings for the dropdown.
 */
function attachCombo(input, items){
  const container = input.closest('.input-pill');
  if (!container) {
    console.error("Could not find '.input-pill' container for", input);
    return;
  }

  const popup = document.createElement('div');
  popup.className = 'combo-popup';
  popup.hidden = true;
  document.body.appendChild(popup);

  let filtered = items.slice();
  let active = -1;
  let isOpen = false;
  let hideTimer = null;

  const render = ()=>{
    popup.innerHTML = filtered.map((n,i)=>`<div class="combo-item${i===active?' active':''}" data-val="${n}">${n}</div>`).join('');
  };

  const open = ()=>{
    if (isOpen && !popup.hidden) return;
    filtered = filter(input.value); active = -1; render();

    const rect = container.getBoundingClientRect();
    popup.style.position = 'fixed';
    popup.style.left = `${rect.left}px`;
    popup.style.top = `${rect.bottom + 2}px`;
    popup.style.width = `${rect.width}px`;

    popup.hidden = false;
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    requestAnimationFrame(()=> popup.classList.add('is-visible'));
    isOpen = true;
  };

  const close = ()=>{
    if (!isOpen) return;
    isOpen = false;
    popup.classList.remove('is-visible');
    hideTimer = window.setTimeout(()=>{ if(!isOpen) popup.hidden = true; }, 220);
  };

  const ensureOpen = ()=>{ if (!isOpen) open(); };
  const filter = (q)=>{ q=(q||'').toLowerCase(); return q? items.filter(n=> n.toLowerCase().includes(q)) : items; };

  input.addEventListener('focus', open);
  input.addEventListener('click', ()=>{ if(popup.hidden) open(); });
  input.addEventListener('input', ()=>{
    ensureOpen();
    filtered = filter(input.value); active = -1; render();
  });
  input.addEventListener('keydown', (e)=>{
    if (!isOpen && (e.key==='ArrowDown' || e.key==='Enter')) { open(); e.preventDefault(); return; }
    if (!isOpen) return;
    if (e.key==='ArrowDown'){ active = Math.min(filtered.length-1, active+1); render(); e.preventDefault(); }
    else if (e.key==='ArrowUp'){ active = Math.max(0, active-1); render(); e.preventDefault(); }
    else if (e.key==='Enter' || e.key==='Tab'){
      if (active>=0 && filtered[active]){ input.value = filtered[active]; input.dispatchEvent(new Event('change',{bubbles:true})); close(); e.preventDefault(); }
    } else if (e.key==='Escape'){ close(); }
  });
  popup.addEventListener('mousedown', (e)=>{
    const item = e.target.closest('.combo-item'); if(!item) return;
    const val = item.getAttribute('data-val')||''; input.value = val; input.dispatchEvent(new Event('change',{bubbles:true})); close();
  });
  document.addEventListener('click', (e)=>{ if(isOpen && !container.contains(e.target) && !popup.contains(e.target)) close(); });
  window.addEventListener('scroll', (e) => { if (popup.contains(e.target)) return; if (isOpen) close(); }, { passive: true, capture: true });
}

// ===== LOKASI DROPDOWN HELPERS (Centralized) =====

/**
 * Mengisi elemen <select> dengan daftar lokasi.
 * @param {HTMLSelectElement} select - Elemen select yang akan diisi.
 * @param {string[]} list - Array berisi string lokasi.
 */
function populateLokasi(select, list) {
  if (!select) return;
  select.innerHTML = '<option value="">-- Pilih Lokasi --</option>';
  const frag = document.createDocumentFragment();
  for (const name of list) {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    frag.appendChild(opt);
  }
  select.appendChild(frag);
}

/**
 * Menginisialisasi dropdown lokasi, baik sebagai combobox (input) atau select.
 * @param {HTMLElement} lokasiSelectEl - Elemen input atau select untuk lokasi.
 * @param {HTMLInputElement} [lokasiSearchEl] - (Opsional) Elemen input untuk pencarian pada mode <select>.
 */
function setupLokasiDropdown(lokasiSelectEl, lokasiSearchEl) {
  if (!lokasiSelectEl) return;

  // Mode 1: Jika elemen adalah <input>, gunakan combobox canggih.
  if (lokasiSelectEl.tagName === 'INPUT') {
    const listId = lokasiSelectEl.getAttribute('list');
    if (listId) {
      try { document.getElementById(listId)?.remove(); } catch {}
      lokasiSelectEl.removeAttribute('list');
    }
    // `attachCombo` dan `LOCATIONS` sudah ada di utils.js
    attachCombo(lokasiSelectEl, LOCATIONS);
    return;
  }

  // Mode 2: Jika elemen adalah <select>, gunakan lazy loading.
  let populated = false;
  const ensurePopulated = () => {
    if (populated) return;
    populated = true;
    populateLokasi(lokasiSelectEl, LOCATIONS);
  };
  // Lazy load saat interaksi pertama
  ['focus', 'mousedown', 'touchstart', 'keydown'].forEach(ev => lokasiSelectEl.addEventListener(ev, ensurePopulated, { once: true }));

  // Jika ada input pencarian terpisah untuk <select>
  if (lokasiSearchEl) {
    lokasiSearchEl.addEventListener('input', () => {
      ensurePopulated();
      const term = (lokasiSearchEl.value || '').toLowerCase();
      const filtered = term ? LOCATIONS.filter(n => n.toLowerCase().includes(term)) : LOCATIONS;
      const current = lokasiSelectEl.value;
      populateLokasi(lokasiSelectEl, filtered);
      // Pertahankan nilai yang dipilih jika masih ada di daftar hasil filter
      if (filtered.includes(current)) {
        lokasiSelectEl.value = current;
      }
    });
  }
}