// 滿意度統計表 PDF：以瀏覽器排版轉成圖片後嵌入 A4 PDF，避免中文字型缺字。

(function initPdfExport() {
  const exportBtn = document.getElementById('exportBtn');
  if (!exportBtn || document.getElementById('pdfExportBtn')) return;

  const actions = document.createElement('div');
  actions.className = 'export-actions';
  exportBtn.parentNode.insertBefore(actions, exportBtn);
  actions.appendChild(exportBtn);

  const pdfBtn = document.createElement('button');
  pdfBtn.id = 'pdfExportBtn';
  pdfBtn.className = 'secondary-btn pdf-btn';
  pdfBtn.type = 'button';
  pdfBtn.textContent = '下載滿意度統計 PDF';
  actions.appendChild(pdfBtn);

  pdfBtn.addEventListener('click', exportSatisfactionPdf);
})();

async function exportSatisfactionPdf() {
  if (!state.rows.length) {
    alert('請先上傳院內 ODS / XLSX 檔案。');
    return;
  }
  if (typeof html2canvas === 'undefined' || !window.jspdf?.jsPDF) {
    alert('PDF 輸出元件尚未載入，請重新整理頁面後再試。');
    return;
  }

  const button = document.getElementById('pdfExportBtn');
  button.disabled = true;
  button.textContent = '正在產生 PDF…';

  let report = null;
  try {
    report = buildSatisfactionPdfReport();
    document.body.appendChild(report);

    const canvas = await html2canvas(report, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false
    });

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 8;
    const usableWidth = pageWidth - margin * 2;
    const usableHeight = pageHeight - margin * 2;
    const ratio = Math.min(usableWidth / canvas.width, usableHeight / canvas.height);
    const drawWidth = canvas.width * ratio;
    const drawHeight = canvas.height * ratio;
    const x = (pageWidth - drawWidth) / 2;
    const y = margin;

    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, drawWidth, drawHeight, undefined, 'FAST');

    const code = cleanText(state.rows[0]?.['課程代碼'] || '教育訓練')
      .replace(/^'/, '')
      .replace(/[\\/:*?"<>|]/g, '_');
    pdf.save(`${code}_滿意度統計.pdf`);
  } catch (error) {
    console.error(error);
    alert(`產生 PDF 失敗：${error.message || '未知錯誤'}`);
  } finally {
    report?.remove();
    button.disabled = false;
    button.textContent = '下載滿意度統計 PDF';
  }
}

function buildSatisfactionPdfReport() {
  const sat = calculateSatisfaction();
  const rows = state.rows;
  const meta = typeof window.getReportMeta === 'function' ? window.getReportMeta(rows) : {};
  const unit = getCommonUnit(rows);
  const unitTitle = unit ? `${unit.replace(/^護理部/, '')}專科在職教育課程滿意度統計表` : '專科在職教育課程滿意度統計表';

  const wrapper = document.createElement('div');
  wrapper.style.cssText = [
    'position:fixed',
    'left:-20000px',
    'top:0',
    'width:1100px',
    'background:#fff',
    'color:#111',
    'padding:24px 28px 26px',
    'font-family:DFKai-SB,BiauKai,標楷體,serif',
    'box-sizing:border-box'
  ].join(';');

  const itemRows = sat.items.map((item, index) => {
    const total = Object.values(item.counts).reduce((sum, value) => sum + value, 0);
    return `
      <tr>
        <td class="center">${index + 1}</td>
        <td>${escapePdfHtml(item.label)}</td>
        <td class="center num">${item.counts[5]}</td>
        <td class="center num">${item.counts[4]}</td>
        <td class="center num">${item.counts[3]}</td>
        <td class="center num">${item.counts[2]}</td>
        <td class="center num">${item.counts[1]}</td>
        <td class="center num">${total}</td>
        <td class="center num">${item.average.toFixed(2)}</td>
        <td class="center num">${item.satisfaction.toFixed(1)}%</td>
      </tr>`;
  }).join('');

  wrapper.innerHTML = `
    <style>
      .pdf-sheet h1,.pdf-sheet h2{margin:0;text-align:center;font-weight:700}
      .pdf-sheet h1{font-size:27px;letter-spacing:2px;margin-bottom:16px}
      .pdf-sheet h2{font-size:24px;margin-bottom:20px}
      .pdf-meta{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px 44px;margin:0 26px 18px;font-size:19px}
      .pdf-meta div{min-height:28px}
      .pdf-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:18px}
      .pdf-table th,.pdf-table td{border:1px solid #777;padding:10px 6px;vertical-align:middle}
      .pdf-table th{background:#24577f;color:#fff;text-align:center;font-weight:700}
      .pdf-table th:nth-child(1){width:5%}.pdf-table th:nth-child(2){width:30%}
      .pdf-table th:nth-child(n+3):nth-child(-n+7){width:7%}.pdf-table th:nth-child(8){width:9%}
      .pdf-table th:nth-child(9){width:10%}.pdf-table th:nth-child(10){width:11%}
      .pdf-table tbody tr{height:56px}
      .center{text-align:center}.num{font-family:"Times New Roman",serif}
      .pdf-sign{display:grid;grid-template-columns:1fr 1fr 1.3fr;margin-top:18px;border:1px solid #777;border-right:0;font-size:18px}
      .pdf-sign div{border-right:1px solid #777;padding:12px 10px;min-height:44px}
    </style>
    <div class="pdf-sheet">
      <h1>佛教慈濟醫療財團法人台中慈濟醫院護理部</h1>
      <h2>${escapePdfHtml(unitTitle)}</h2>
      <div class="pdf-meta">
        <div>講師：${escapePdfHtml(meta.lecturer || '')}</div>
        <div>參與人數：${meta.participantCount === '' ? '' : escapePdfHtml(meta.participantCount)}</div>
        <div>回收率：${meta.responseRate === '' ? '' : `${Number(meta.responseRate).toFixed(1)}%`}</div>
        <div>日期：${escapePdfHtml(meta.dateDisplay || '')}</div>
        <div>問卷回收：<span class="num">${rows.length}</span></div>
        <div>總滿意度：<span class="num">${sat.overall == null ? '' : `${sat.overall.toFixed(1)}%`}</span></div>
      </div>
      <table class="pdf-table">
        <thead><tr><th>序</th><th>項目</th><th>5</th><th>4</th><th>3</th><th>2</th><th>1</th><th>總計</th><th>平均分數</th><th>滿意度</th></tr></thead>
        <tbody>${itemRows}</tbody>
      </table>
      <div class="pdf-sign"><div>製表人：</div><div>單位護理長：</div><div>單位督導：</div></div>
    </div>`;

  return wrapper;
}

function escapePdfHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
