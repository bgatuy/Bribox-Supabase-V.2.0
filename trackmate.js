// ====== Trackmate (Supabase-Ready, Stable Old Logic, Linear Flow) ======

// 2. Setup Lokasi
document.addEventListener('DOMContentLoaded', function () {
  // Gunakan helper terpusat dari utils.js
  setupLokasiDropdown(lokasiSelect, lokasiSearch);
});

/* ========= Query DOM ========= */
const fileInput    = document.getElementById('pdfFile');
const output       = document.getElementById('output');
const copyBtn      = document.getElementById('copyBtn');
const lokasiSelect = document.getElementById('inputLokasi');
const lokasiSearch = document.getElementById('lokasiSearch');

/* ========= Supabase helpers ========= */
async function getMetaByHash(contentHash) {
  try {
    const user = await getUserOrThrow();
    const { data, error } = await supabaseClient
      .from('pdf_history')
      .select('meta')
      .eq('user_id', user.id)
      .eq('content_hash', contentHash)
      .maybeSingle();
    if (error) return null;
    return data?.meta || null;
  } catch {
    return null;
  }
}

/* === AUTO-CALIBRATE (OLD LOGIC RESTORED) ===
   Menggunakan logika linear yang stabil: Cari anchor -> Hitung offset fix.
   Tanpa async race condition.
*/
async function autoCalibratePdf(buffer){
  const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
  const page = await doc.getPage(1);
  const items = (await page.getTextContent()).items || [];

  // 1. Anchor Utama: "Diselesaikan Oleh" (kolom tengah)
  let atas = items.find(it => /Diselesaikan\s*Oleh/i.test(it.str));
  if(!atas){
    for(let i=0;i<items.length-1;i++){
      if(/Diselesaikan/i.test(items[i].str) && /Oleh/i.test(items[i+1].str)){ atas = items[i]; break; }
    }
  }
  if (!atas){ try{doc.destroy()}catch{}; return null; }

  const xA = atas.transform[4], yA = atas.transform[5];

  // 2. Anchor Bawah: "Nama & Tanda Tangan"
  const kandidat = items.filter(it =>
    /Nama\s*&?\s*Tanda\s*&?\s*Tangan/i.test(it.str) && it.transform && it.transform[5] < yA
  );
  let bawah=null, best=Infinity;
  for(const it of kandidat){
    const x = it.transform[4], y = it.transform[5];
    const dx=Math.abs(x-xA), dy=Math.max(0,yA-y);
    const score = 1.6*dx + dy;
    if (dx <= 120 && score < best){ best = score; bawah = it; }
  }

  // 3. LOGIKA LAMA (STABLE):
  //    Offset X fix +95 dari 'Diselesaikan Oleh'
  //    Offset Y relatif terhadap bawah atau atas
  let x = xA + 95;
  let y = bawah ? (bawah.transform[5] + 12) : (yA - 32);

  // (Optional) Info Baris untuk metadata tambahan
  const first = r => items.find(it => r.test(it.str));
  const labUK = first(/Unit\s*Kerja/i), labKC = first(/Kantor\s*Cabang/i);
  let linesUK = 0;
  if (labUK && labKC){
    const yTop = labUK.transform[5], yBot = labKC.transform[5]-1;
    const xL = labUK.transform[4] + 40, xR = xL + 260;
    const ys=[];
    for(const it of items){
      if(!it.transform) continue;
      const x0=it.transform[4], y0=it.transform[5];
      if (y0<=yTop+2 && y0>=yBot-2 && x0>=xL && x0<=xR){
        const yy = Math.round(y0/2)*2;
        if(!ys.some(v=>Math.abs(v-yy)<2)) ys.push(yy);
      }
    }
    linesUK = Math.max(1, Math.min(5, ys.length||0));
  }

  const labSol = first(/Solusi\/?Perbaikan/i), labStatus = first(/Status\s*Pekerjaan/i);
  let linesSOL = 0;
  if (labSol && labStatus){
    const yTop = labSol.transform[5] + 1, yBot = labStatus.transform[5] + 2;
    const xL = labSol.transform[4] + 120, xR = xL + 300;
    const ys=[];
    for(const it of items){
      if(!it.transform) continue;
      const x0=it.transform[4], y0=it.transform[5];
      if (y0>=yBot && y0<=yTop && x0>=xL && x0<=xR){
        const yy = Math.round(y0/2)*2;
        if(!ys.some(v=>Math.abs(v-yy)<2)) ys.push(yy);
      }
    }
    linesSOL = Math.max(1, Math.min(6, ys.length||0));
  }

  try{ doc.destroy() }catch{}
  // Mengembalikan koordinat MURNI (Logic lama)
  return { x, y, linesUK, linesSOL, dx:0, dy:0, v:1 };
}

/* ========= Helpers UI ========= */
const clean = (x) => String(x || '')
  .replace(/[\u00A0\u2007\u202F]/g, ' ')
  .replace(/\u00C2/g, '')
  .replace(/\s+/g, ' ')
  .trim();
function formatTanggalIndonesia(tanggal) {
  if (!tanggal) return '-';
  const bulan = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
  const [dd, mm, yyyy] = tanggal.split('/');
  return `${dd} ${bulan[parseInt(mm,10)-1]} ${yyyy}`;
}
function extractFlexibleBlock(lines, startLabel, stopLabels = []) {
  const norm = s => (s || '').replace(/[\u00A0\u2007\u202F]/g, ' ').replace(/\s+/g, ' ').trim();
  const text = (lines || []).map(x => x || '').join('\n');

  const startRe = new RegExp(`${startLabel}\\s*:\\s*`, 'i');
  const mStart  = startRe.exec(text);
  if (!mStart) return '';

  const tail = text.slice(mStart.index + mStart[0].length);
  const stopParts = [];
  for (const lbl of stopLabels) stopParts.push(`${lbl}\\s*:\\s*`);
  if (stopLabels.some(s => /^tanggal$/i.test(s))) stopParts.push(`Tanggal(?:\\s*Tiket)?\\s+\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4}`);
  if (stopLabels.some(s => /^kantor\\s*cabang$/i.test(s))) stopParts.push(`(?<!^)Kantor\\s*Cabang(?!\\s*:)`);
  stopParts.push(`[\\r\\n]+[A-Za-z][A-Za-z/() ]+\\s*:\\s*`);

  const stopPattern = stopParts.join('|');
  const cutRe = new RegExp(`([\\s\\S]*?)(?=${stopPattern})`, 'i');
  const mCut  = cutRe.exec(tail);
  const captured = mCut ? mCut[1] : tail;

  return norm(captured);
}

/* ========= State Variables ========= */
// Variabel global untuk menyimpan data UI saja
let unitKerja = "-", kantorCabang = "-", tanggalFormatted = "-", tanggalRaw = "",
    problem = "-", berangkat = "-", tiba = "-", mulai = "-", selesai = "-",
    solusi = "-", jenisPerangkat = "-", serial = "-", merk = "-", type = "-",
    pic = "-", status = "-";

// Kita simpan referensi file terakhir untuk UI preview
let currentFileBuffer = null; 

/* ========= Events ========= */
lokasiSelect?.addEventListener("change", updateOutput);

// Handler CHANGE: Hanya untuk Update UI Text (Cepat & Ringan)
fileInput?.addEventListener('change', async function () {
  const file = fileInput.files[0];
  if (!file || file.type !== 'application/pdf') return;

  try {
    // Baca buffer hanya untuk ekstraksi teks UI
    currentFileBuffer = await file.arrayBuffer();
    
    // Proses UI Text Extraction
    const typedarray = new Uint8Array(currentFileBuffer);
    const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;

    let rawText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      rawText += content.items.map(item => item.str).join('\n') + '\n';
    }

    const lines = rawText.split('\n');

    unitKerja       = stripLeadingColon(extractFlexibleBlock(lines,'Unit Kerja',['Kantor Cabang','Tanggal']) || '-');
    kantorCabang    = stripLeadingColon(extractFlexibleBlock(lines,'Kantor Cabang',['Tanggal','Pelapor']) || '-');
    tanggalRaw      = rawText.match(/Tanggal(?:\sTiket)?\s*:\s*(\d{2}\/\d{2}\/\d{4})/)?.[1] || '';
    tanggalFormatted= tanggalRaw ? formatTanggalIndonesia(tanggalRaw) : '-';
    problem         = extractFlexibleBlock(lines,'Trouble Dilaporkan',['Masalah','Solusi','Progress']) || '-';

    const ambilJam = (text, label) => text.match(new RegExp(`${label}\\s+(\\d{2}:\\d{2})(?::\\d{2})?`))?.[1] || '';
    berangkat = ambilJam(rawText, 'Berangkat') || '-';
    tiba      = ambilJam(rawText, 'Tiba') || '-';
    mulai     = ambilJam(rawText, 'Mulai') || '-';
    selesai   = ambilJam(rawText, 'Selesai') || '-';

    solusi          = extractFlexibleBlock(lines,'Solusi/Perbaikan',['STATUS','Jenis Perangkat','SN','Merk','Type']) || '-';
    jenisPerangkat  = clean(rawText.match(/Jenis Perangkat\s*:\s*(.+)/)?.[1]) || '-';
    serial          = clean(rawText.match(/SN\s*:\s*(.+)/)?.[1]) || '-';
    merk            = clean(rawText.match(/Merk\s*:\s*(.+)/)?.[1]) || '-';
    type            = clean(rawText.match(/Type\s*:\s*(.+)/)?.[1]) || '-';
    (() => {
      const stops = ['Jabatan','Jenis Perangkat','Serial Number','SN','Merk','Type','Status','STATUS','Tanggal','Nama','Tanda','Cap','Progress','Unit Kerja','Kantor Cabang'];
      const block = extractFlexibleBlock(lines, '(?:Pelapor|PIC)', stops) || '';
      const m = block.match(/^\s*([^()\[\]\n]+?)\s*(?:[\(\[]\s*([^()\[\]]+?)\s*[\)\]])?\s*$/);
      const name = clean(m ? m[1] : block);
      const jab  = clean(m && m[2] ? m[2] : extractFlexibleBlock(lines, 'Jabatan', stops) || '');
      pic = jab ? `${name} (${jab})` : (name || '-');
    })();

    status = clean(rawText.match(/STATUS PEKERJAAN\s*:\s*(.+)/)?.[1]) || '-';
    updateOutput();

  } catch (err) {
    console.error("Gagal memproses PDF UI:", err);
    alert("Terjadi kesalahan saat membaca PDF.");
  }
});

/* ========= Output UI ========= */
function updateOutput() {
  const lokasiTerpilih = lokasiSelect?.value || '';
  const unitKerjaLengkap = (lokasiTerpilih && unitKerja !== '-') ? `${unitKerja} (${lokasiTerpilih})` : unitKerja;

  const finalOutput =
`Selamat Pagi/Siang/Sore Petugas Call Center, Update Pekerjaan

Unit Kerja : ${unitKerjaLengkap}
Kantor Cabang : ${kantorCabang}

Tanggal : ${tanggalFormatted}

Jenis Pekerjaan (Problem) : ${problem}

Berangkat : ${berangkat}
Tiba : ${tiba}
Mulai : ${mulai}
Selesai : ${selesai}

Progress : ${solusi}

Jenis Perangkat : ${jenisPerangkat}
Serial Number : ${serial}
Merk Perangkat : ${merk}
Type Perangkat : ${type}

PIC : ${pic}
Status : ${status}`;

  if (output) output.textContent = finalOutput;
}

/* ========= Copy & Save (OLD LINEAR LOGIC) ========= */
// Tidak ada background process, semua dijalankan saat klik tombol.
copyBtn?.addEventListener("click", async () => {
  const originalContent = copyBtn.innerHTML;
  try {
    if (copyBtn.disabled) return; // Prevent double click
    
    // 1. Copy Teks ke Clipboard dulu (UX Instant)
    const text = output?.textContent || "";
    await navigator.clipboard.writeText(text);
    copyBtn.innerHTML = `<i data-lucide="check" class="w-3 h-3"></i> Copied!`;
    lucide.createIcons();
    
    // 2. Mulai Proses Berat (Sequential / Linear)
    copyBtn.disabled = true;
    showSpinner(); // Tampilkan spinner agar user tau sedang proses

    const file = fileInput?.files?.[0];
    if (!file) {
      showToast("Tidak ada file PDF yang dipilih.", 3500, "warn");
      throw new Error("No file");
    }

    const user = await getUserOrThrow();

    // A. Baca Buffer (Baru)
    const fileBuffer = await file.arrayBuffer();

    // B. Hitung Hash (Baru)
    const contentHash = await sha256Buffer(fileBuffer);

    // C. Cek Meta di DB (Optional, tapi kita paksa kalibrasi ulang jika ingin 'stable logic')
    // Untuk kestabilan maksimal sesuai request, kita jalankan kalibrasi selalu.
    // Tapi kita cek DB dulu untuk menghindari duplikasi row.
    let meta = await getMetaByHash(contentHash);
    
    // Jika tidak ada di DB, ATAU user ingin memastikan kalibrasi ulang:
    if (!meta) {
        meta = await autoCalibratePdf(fileBuffer);
    }

    // D. Upload File
    const filePath = `${user.id}/${contentHash}.pdf`;
    const { error: uploadError } = await uploadWithRetry(filePath, file, { 
      upsert: true, 
      contentType: file.type || 'application/pdf' 
    });
    if (uploadError) throw new Error(`Upload gagal: ${uploadError.message}`);

    // E. Simpan ke Database
    const namaUkerBersih = stripLeadingColon(unitKerja) || "-";
    const { error: dbError } = await supabaseClient.from('pdf_history').upsert({
      user_id: user.id,
      content_hash: contentHash,
      nama_uker: namaUkerBersih,
      tanggal_pekerjaan: tanggalRaw || null,
      file_name: file.name,
      storage_path: filePath,
      size_bytes: file.size,
      meta: meta || null
    }, {
      onConflict: 'user_id,content_hash'
    });

    if (dbError) throw new Error(`Simpan DB gagal: ${dbError.message}`);

    showToast("Berhasil menyimpan data.", 3000, "success");

  } catch (err) {
    if (err.message === "No file") return; // Sudah dihandle
    console.error("Copy handler error:", err);
    const msg = String(err?.message || err || '').trim();
    showToast(`Error: ${msg}`, 5000, "warn");
  } finally {
    // Revert button state after a delay to give user feedback.
    setTimeout(() => {
      copyBtn.innerHTML = originalContent;
      lucide.createIcons();
      copyBtn.disabled = false;
    }, 2000);
    hideSpinner();
  }
});