// Hapus DOMContentLoaded listener yang berulang.
// Inisialisasi layout dan fitur global sekarang ditangani oleh utils.js.
document.addEventListener('DOMContentLoaded', function () {
  // Setup field lokasi menggunakan helper terpusat dari utils.js
  try { setupLokasiDropdown(lokasiSelect); } catch {}
});

/* ========= Query DOM ========= */
const pdfInput     = document.getElementById("pdfFile");
const output       = document.getElementById("output");
const copyBtn      = document.getElementById("copyBtn");
const lokasiSelect = document.getElementById("inputLokasi");
let lokasiSearch = null;

/* ========= State ========= */
let lokasiTerpilih = "", unitKerja = "-", kantor = "-", tanggal = "-", problem = "-",
    berangkat = "-", tiba = "-", mulai = "-", selesai = "-", progress = "-",
    jenis = "-", sn = "-", merk = "-", tipe = "-", pic = "-", status = "-",
    currentFile = null, currentTanggalRaw = "-";

/* ========= Helpers ========= */
function formatTanggalIndo(tanggalStr) {
  const bulan = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
  const [dd, mm, yyyy] = tanggalStr.split("/");
  return `${dd} ${bulan[parseInt(mm,10)-1]} ${yyyy}`;
}
function ambil(text, regex, fallback = "-") {
  const match = text.match(regex);
  return match?.[1]?.trim() || fallback;
}
function cleanJam(text) {
  if (!text || text === "-") return "-";
  const match = text.match(/\d{2}[.:]\d{2}/);
  return match ? match[0].replace(/\./g, ":") : "-";
}

/* ========= Output ========= */
function generateLaporan() {
  const unitKerjaLengkap = (lokasiTerpilih && unitKerja !== "-") ? `${unitKerja} (${lokasiTerpilih})` : unitKerja;
  const laporanBaru =
`Selamat Pagi/Siang/Sore Petugas Call Center, Update Pekerjaan

Unit Kerja : ${unitKerjaLengkap}
Kantor Cabang : ${kantor}

Tanggal : ${tanggal}

Jenis Pekerjaan (Problem) : ${problem}

Berangkat : ${berangkat}
Tiba : ${tiba}
Mulai : ${mulai}
Selesai : ${selesai}

Progress : ${progress}

Jenis Perangkat : ${jenis}
Serial Number : ${sn}
Merk Perangkat : ${merk}
Type Perangkat : ${tipe}

PIC : ${pic}
Status : ${status}`;
  output.textContent = laporanBaru;
}

lokasiSelect?.addEventListener("change", () => {
  lokasiTerpilih = lokasiSelect.value;
  generateLaporan();
});

/* ========= File Input ========= */
pdfInput?.addEventListener("change", async () => {
  const file = pdfInput.files[0];
  if (!file) return;
  currentFile = file;

  console.log('🧪 File input:', { name: file.name, type: file.type, size: file.size });
  if (file.type !== 'application/pdf' || !file.size) { alert('File bukan PDF valid.'); return; }

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  let rawText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    rawText += content.items.map(i => i.str).join(" ") + "\n";
  }
  rawText = rawText.replace(/\s+/g, " ").trim();

  unitKerja = stripLeadingColon(ambil(rawText, /Unit Kerja\s*:\s*(.+?)\s+(Perangkat|Kantor Cabang)/));
  kantor    = ambil(rawText, /Kantor Cabang\s*:\s*(.+?)\s+(Tanggal|Asset ID|Tanggal\/Jam)/);
  const tglRaw = ambil(rawText, /Tanggal\/Jam\s*:\s*(\d{2}\/\d{2}\/\d{4})/);
  currentTanggalRaw = tglRaw;
  tanggal  = tglRaw !== "-" ? formatTanggalIndo(tglRaw) : "-";

  problem  = ambil(rawText, /Trouble Dilaporkan\s*:\s*(.+?)\s+(Solusi|Progress|KETERANGAN)/i);
  if (problem === "-") problem = ambil(rawText, /Problem\s*[:\-]?\s*(.+?)\s+(Solusi|Progress|KETERANGAN)/i);

  berangkat = cleanJam(ambil(rawText, /BERANGKAT\s+(\d{2}[.:]\d{2})/));
  tiba      = cleanJam(ambil(rawText, /TIBA\s+(\d{2}[.:]\d{2})/));
  mulai     = cleanJam(ambil(rawText, /MULAI\s+(\d{2}[.:]\d{2})/));
  selesai   = cleanJam(ambil(rawText, /SELESAI\s+(\d{2}[.:]\d{2})/));

  progress = ambil(rawText, /Solusi\s*\/?\s*Perbaikan\s*:\s*(.+?)\s+(KETERANGAN|Status|$)/i);
  jenis    = ambil(rawText, /Perangkat\s*[:\-]?\s*(.+?)\s+(Kantor Cabang|SN|Asset ID)/i);
  sn       = ambil(rawText, /SN\s*[:\-]?\s*([A-Za-z0-9\-]+)/i);
  tipe     = ambil(rawText, /Type\s*[:\-]?\s*([A-Za-z0-9\s\-]+?)(?=\s+(SN|PW|Status|PIC|$))/i);
  merk     = ambil(rawText, /Merk\s*[:\-]?\s*([A-Za-z]+)/i);

  if ((merk === "-" || !merk) && tipe && tipe !== "-") {
    const t = tipe.toUpperCase();
    if (t.includes("LENOVO")) merk = "LENOVO";
    else if (t.includes("DELL")) merk = "DELL";
    else if (t.includes("HP"))   merk = "HP";
    else if (t.includes("ASUS")) merk = "ASUS";
    else if (t.includes("ACER")) merk = "ACER";
    else if (t.includes("AXIOO")) merk = "AXIOO";
    else if (t.includes("MSI"))   merk = "MSI";
    else if (t.includes("ZYREX")) merk = "ZYREX";
  }

  pic    = ambil(rawText, /Pelapor\s*:\s*(.+?)\s+(Type|Status|$)/);
  if (pic.includes("(")) pic = pic.split("(")[0].trim();
  status = ambil(rawText, /Status Pekerjaan\s*:?\s*(Done|Pending|On\s?Progress|Done By Repairing)/i);

  generateLaporan();
});

/* ========= Copy & Save ========= */
copyBtn?.addEventListener('click', async () => {
  const originalContent = copyBtn.innerHTML;
  try {
    if (copyBtn.disabled) return; // Mencegah klik ganda

    // 1. Copy teks ke clipboard
    const text = output?.textContent || '';
    await navigator.clipboard.writeText(text);

    // 2. Beri feedback visual bahwa teks sudah disalin
    copyBtn.innerHTML = `<i data-lucide="check" class="w-3 h-3"></i> Copied!`;
    lucide.createIcons(); // Render ikon baru
    copyBtn.disabled = true; // Nonaktifkan tombol sementara
    showSpinner();

    // 3. Validasi file
    if (!currentFile || !currentTanggalRaw) {
      throw new Error("Tidak ada file/tanggal untuk disimpan.");
    }

    // 4. Persiapan data untuk Supabase
    const fileBuffer = await currentFile.arrayBuffer(); // Baca file sekali
    const contentHash = await sha256Buffer(fileBuffer); // Gunakan buffer untuk hash

    // Gunakan getSession() yang lebih andal untuk mendapatkan user ID
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
    if (sessionError || !session?.user) throw new Error('User tidak login atau sesi berakhir.');
    const user = session.user;
    const filePath = `${user.id}/${contentHash}.pdf`;

    // 5. Upload file menggunakan helper dari utils.js
    const { error: uploadError } = await uploadWithRetry(filePath, currentFile, { upsert: true, contentType: currentFile.type || 'application/pdf' });
    if (uploadError) throw new Error(`Upload gagal: ${uploadError.message}`);

    // 6. Simpan semua info ke database (tanpa metadata TTD)
    const namaUkerBersih = stripLeadingColon(unitKerja) || '-';
    const { error: dbError } = await supabaseClient.from('pdf_history').upsert({
      user_id: user.id,
      content_hash: contentHash,
      nama_uker: namaUkerBersih,
      tanggal_pekerjaan: currentTanggalRaw || null,
      file_name: currentFile.name,
      storage_path: filePath,
      size_bytes: currentFile.size,
      meta: null, // PDF dari AppSheet sudah ada nama, tidak perlu meta
    }, {
      onConflict: 'user_id,content_hash'
    });
    if (dbError) throw new Error(`Simpan DB gagal: ${dbError.message}`);

    showToast("Berhasil disimpan ke server.", 3000, "success");

  } catch (err) {
    console.error("Copy/Save Error:", err);
    const msg = String(err?.message || err || '').trim();
    if (/failed to fetch/i.test(msg)) {
      showToast("Upload gagal: koneksi ke Supabase Storage terputus/terblokir. Coba matikan VPN/Private DNS/Ad-block, gunakan Wi‑Fi yang sama dengan laptop, atau coba ulang.", 6000, 'warn');
    } else if (msg === "Tidak ada file/tanggal untuk disimpan.") {
      showToast(msg, 3000, 'warn');
    } else {
      showToast(`Gagal menyimpan: ${msg}`, 4500, 'warn');
    }
  } finally {
    // Kembalikan tombol ke kondisi semula setelah 2 detik
    setTimeout(() => {
      copyBtn.innerHTML = originalContent;
      lucide.createIcons(); // Render kembali ikon asli
      copyBtn.disabled = false; // Aktifkan kembali tombol
    }, 2000);
    hideSpinner();
  }
});
