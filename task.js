document.addEventListener('DOMContentLoaded', () => {
    const pdfFileInput = document.getElementById('pdfFile');
    const dropZone = document.getElementById('dropZone');
    const uploadPrompt = document.getElementById('upload-prompt');
    const fileInfo = document.getElementById('file-info');
    const fileNameDisplay = document.getElementById('file-name');
    const outputPre = document.getElementById('output');
    const copyBtn = document.getElementById('copyBtn');
    const inputLokasi = document.getElementById('inputLokasi');
    const inputJmlPerangkat = document.getElementById('inputJmlPerangkat');

    let extractedData = {
        unitKerja: '',
        kantorCabang: '',
        tanggal: '',
        pic: '',
        jamBerangkat: '',
        jamTiba: '',
        jamMulai: '',
        jamSelesai: '',
        trouble: '',
        catatan: '',
        status: '',
        jmlPerangkat: ''
    };

    // Initialize Location Dropdown (from utils.js)
    if (typeof setupLokasiDropdown === 'function') {
        setupLokasiDropdown(inputLokasi);
    }

    // Clear inputs on load to ensure no browser caching
    inputLokasi.value = '';
    inputJmlPerangkat.value = '';

    // --- Helpers (Mirrored from trackmate.js) ---
    const clean = (x) => String(x || '')
        .replace(/[\u00A0\u2007\u202F]/g, ' ')
        .replace(/\u00C2/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    function formatTanggalIndonesia(tanggal) {
        if (!tanggal) return '-';
        const bulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        const [dd, mm, yyyy] = tanggal.split('/');
        return `${dd} ${bulan[parseInt(mm, 10) - 1]} ${yyyy}`;
    }

    function extractFlexibleBlock(lines, startLabel, stopLabels = []) {
        const norm = s => (s || '').replace(/[\u00A0\u2007\u202F]/g, ' ').replace(/\s+/g, ' ').trim();
        const text = (lines || []).map(x => x || '').join('\n');

        const startRe = new RegExp(`${startLabel}\\s*:\\s*`, 'i');
        const mStart = startRe.exec(text);
        if (!mStart) return '';

        const tail = text.slice(mStart.index + mStart[0].length);
        const stopParts = [];
        for (const lbl of stopLabels) stopParts.push(`${lbl}\\s*:\\s*`);
        if (stopLabels.some(s => /^tanggal$/i.test(s))) stopParts.push(`Tanggal(?:\\s*Tiket)?\\s+\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4}`);
        if (stopLabels.some(s => /^kantor\\s*cabang$/i.test(s))) stopParts.push(`(?<!^)Kantor\\s*Cabang(?!\\s*:)`);
        stopParts.push(`[\\r\\n]+[A-Za-z][A-Za-z/() ]+\\s*:\\s*`);

        const stopPattern = stopParts.join('|');
        const cutRe = new RegExp(`([\\s\\S]*?)(?=${stopPattern})`, 'i');
        const mCut = cutRe.exec(tail);
        const captured = mCut ? mCut[1] : tail;

        return norm(captured);
    }

    // --- Event Listeners ---

    pdfFileInput.addEventListener('change', handleFileSelect);
    
    // Drag & Drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('is-dragging');
    });
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('is-dragging');
    });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('is-dragging');
        if (e.dataTransfer.files.length) {
            pdfFileInput.files = e.dataTransfer.files;
            handleFileSelect();
        }
    });

    // Input Listeners for Manual Overrides
    inputLokasi.addEventListener('input', (e) => {
        updateOutput();
    });
    // Handle dropdown selection change
    inputLokasi.addEventListener('change', (e) => {
        updateOutput();
    });

    inputJmlPerangkat.addEventListener('input', (e) => {
        extractedData.jmlPerangkat = e.target.value;
        updateOutput();
    });

    copyBtn.addEventListener('click', () => {
        const text = outputPre.textContent;
        navigator.clipboard.writeText(text).then(() => {
            const originalContent = copyBtn.innerHTML;
            copyBtn.innerHTML = `<i data-lucide="check" class="w-3 h-3"></i> Copied!`;
            lucide.createIcons();
            if (typeof showToast === 'function') {
                showToast('Laporan berhasil disalin!', 'success');
            }
            setTimeout(() => {
                copyBtn.innerHTML = originalContent;
                lucide.createIcons();
            }, 2000);
        });
    });

    // --- Functions ---

    async function handleFileSelect() {
        const file = pdfFileInput.files[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            if (typeof showToast === 'function') showToast('Harap pilih file PDF', 'error');
            return;
        }

        // Update UI
        uploadPrompt.classList.add('hidden');
        fileInfo.classList.remove('hidden');
        fileInfo.classList.add('flex');
        fileNameDisplay.textContent = file.name;

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            
            let rawText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                rawText += content.items.map(item => item.str).join('\n') + '\n';
            }

            parsePdfText(rawText);
            updateOutput();

        } catch (error) {
            console.error('Error parsing PDF:', error);
            if (typeof showToast === 'function') showToast('Gagal membaca PDF', 'error');
        }
    }

    function parsePdfText(rawText) {
        const lines = rawText.split('\n');

        // 1. Unit Kerja
        extractedData.unitKerja = stripLeadingColon(extractFlexibleBlock(lines, 'Unit Kerja', ['Kantor Cabang', 'Tanggal']) || '-');
        
        // 2. Kantor Cabang
        extractedData.kantorCabang = stripLeadingColon(extractFlexibleBlock(lines, 'Kantor Cabang', ['Tanggal', 'Pelapor']) || '-');

        // 3. Tanggal
        const tanggalRaw = rawText.match(/Tanggal(?:\sTiket)?\s*:\s*(\d{2}\/\d{2}\/\d{4})/)?.[1] || '';
        extractedData.tanggal = tanggalRaw ? formatTanggalIndonesia(tanggalRaw) : '-';

        // 4. Jenis Pekerjaan (Trouble Dilaporkan)
        extractedData.trouble = extractFlexibleBlock(lines, 'Trouble Dilaporkan', ['Masalah', 'Solusi', 'Progress', 'Catatan']) || '-';

        // 5-8. Waktu
        const ambilJam = (text, label) => text.match(new RegExp(`${label}\\s+(\\d{2}:\\d{2})(?::\\d{2})?`))?.[1] || '';
        extractedData.jamBerangkat = ambilJam(rawText, 'Berangkat') || '-';
        extractedData.jamTiba = ambilJam(rawText, 'Tiba') || '-';
        extractedData.jamMulai = ambilJam(rawText, 'Mulai') || '-';
        extractedData.jamSelesai = ambilJam(rawText, 'Selesai') || '-';

        // 9. Progress (Catatan Pekerjaan)
        extractedData.catatan = extractFlexibleBlock(lines, 'Catatan Pekerjaan', ['Status', 'Jumlah', 'Solusi']) || 
                                extractFlexibleBlock(lines, 'Solusi/Perbaikan', ['Status']) || '-';

        // 10. PIC
        (() => {
            const stops = ['Jabatan', 'Jenis Perangkat', 'Serial Number', 'SN', 'Merk', 'Type', 'Status', 'STATUS', 'Tanggal', 'Nama', 'Tanda', 'Cap', 'Progress', 'Unit Kerja', 'Kantor Cabang'];
            const block = extractFlexibleBlock(lines, '(?:Pelapor|PIC)', stops) || '';
            const m = block.match(/^\s*([^()\[\]\n]+?)\s*(?:[\(\[]\s*([^()\[\]]+?)\s*[\)\]])?\s*$/);
            const name = clean(m ? m[1] : block);
            const jab = clean(m && m[2] ? m[2] : extractFlexibleBlock(lines, 'Jabatan', stops) || '');
            extractedData.pic = jab ? `${name} (${jab})` : (name || '-');
        })();

        // 11. Status
        extractedData.status = clean(rawText.match(/STATUS PEKERJAAN\s*:\s*(.+)/i)?.[1]) || '-';
    }

    function updateOutput() {
        const lokasiVal = inputLokasi.value;
        const unitKerjaDisplay = (lokasiVal && extractedData.unitKerja && extractedData.unitKerja !== '-') 
            ? `${extractedData.unitKerja} (${lokasiVal})` 
            : (extractedData.unitKerja || '-');

        // Format Laporan
        const report = `Selamat Pagi/Siang/Sore Petugas Call Center, Update Pekerjaan Tambahan 

Unit Kerja/Group : ${unitKerjaDisplay}
Kantor Cabang/Direktorat : ${extractedData.kantorCabang || '-'}

Tanggal : ${extractedData.tanggal || '-'}

Jenis Pekerjaan : ${extractedData.trouble || '-'}

Berangkat : ${extractedData.jamBerangkat || '-'}
Tiba : ${extractedData.jamTiba || '-'}
Mulai : ${extractedData.jamMulai || '-'}
Selesai : ${extractedData.jamSelesai || '-'}

Progress : ${extractedData.catatan || '-'}

Jumlah Perangkat : ${extractedData.jmlPerangkat || '-'}

PIC : ${extractedData.pic || '-'}
Status : ${extractedData.status || '-'}`;

        outputPre.textContent = report;
    }
});