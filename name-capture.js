window.exportRows = [];

(function setupNameCapture() {
  const fileInput = document.getElementById('fileInput');
  const dropZone = document.getElementById('dropZone');

  fileInput?.addEventListener('change', event => {
    const file = event.target.files?.[0];
    if (file) parseForExport(file);
  });

  dropZone?.addEventListener('drop', event => {
    const file = event.dataTransfer?.files?.[0];
    if (file) parseForExport(file);
  });
})();

async function parseForExport(file) {
  window.exportRows = [];
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: false, raw: false });
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
      if (!matrix.length) continue;

      const maxScan = Math.min(matrix.length, 20);
      for (let i = 0; i < maxScan; i += 1) {
        const headers = (matrix[i] || []).map(value => String(value ?? '').replace(/\u3000/g, ' ').trim());
        const score = [
          headers.includes('課程代碼'),
          headers.includes('姓名'),
          headers.includes('得分'),
          headers.some(v => /^問題\s*\d+$/i.test(v)),
          headers.some(v => /^滿意度/.test(v))
        ].filter(Boolean).length;

        if (score < 3) continue;

        const rows = [];
        for (let r = i + 1; r < matrix.length; r += 1) {
          const raw = matrix[r] || [];
          if (raw.every(value => String(value ?? '').trim() === '')) continue;
          const row = {};
          headers.forEach((header, index) => {
            if (!header) return;
            if (/身分證|身份證|證號/i.test(header)) return;
            row[header] = raw[index] ?? '';
          });
          rows.push(row);
        }

        if (rows.length) {
          window.exportRows = rows;
          return;
        }
      }
    }
  } catch (error) {
    console.warn('姓名/作答明細讀取失敗，正式輸出將使用已解析資料。', error);
  }
}
