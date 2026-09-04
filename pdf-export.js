// 完整統計 PDF：輸出滿意度統計、個人作答明細與測驗題目統計。
// PDF 以可直接閱讀為原則，內文字級維持至少約 12pt；寬表拆頁，不硬縮成極小字。

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
  pdfBtn.textContent = '下載完整統計 PDF';
  actions.appendChild(pdfBtn);

  pdfBtn.addEventListener('click', exportCompletePdf);
})();

async function exportCompletePdf() {
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
  button.textContent = '正在產生完整 PDF…';

  const mounted = [];
  try {
    const rows = typeof getExportRows === 'function' ? getExportRows() : state.rows;
    const sections = [];

    // 第一頁籤：滿意度統計表。
    sections.push({ orientation: 'portrait', element: buildSatisfactionPdfReport(rows) });

    // 第二頁籤：個人作答明細。為維持 12pt 以上可讀性，測驗與滿意度拆成兩頁。
    sections.push({ orientation: 'landscape', element: buildAnswerPdfReport(rows, 'quiz') });
    if (state.satisfactionColumns.length) {
      sections.push({ orientation: 'landscape', element: buildAnswerPdfReport(rows, 'satisfaction') });
    }

    // 第三頁籤：測驗題目統計。題目過長時自動分成多頁，不縮小字體硬塞。
    const questionChunks = splitQuestionChunksForPdf();
    questionChunks.forEach((chunk, index) => {
      sections.push({
        orientation: 'landscape',
        element: buildQuestionPdfReport(rows, chunk, index + 1, questionChunks.length)
      });
    });

    sections.forEach(section => {
      document.body.appendChild(section.element);
      mounted.push(section.element);
    });

    const { jsPDF } = window.jspdf;
    let pdf = null;

    for (let i = 0; i < sections.length; i += 1) {
      const section = sections[i];
      const canvas = await html2canvas(section.element, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false
      });

      if (!pdf) {
        pdf = new jsPDF({ orientation: section.orientation, unit: 'mm', format: 'a4' });
      } else {
        pdf.addPage('a4', section.orientation);
      }

      addCanvasToPdfPage(pdf, canvas);
    }

    // 以純數字加總頁碼，避免 PDF 內建字型造成中文字型缺字。
    const totalPages = pdf.getNumberOfPages();
    for (let page = 1; page <= totalPages; page += 1) {
      pdf.setPage(page);
      const width = pdf.internal.pageSize.getWidth();
      const height = pdf.internal.pageSize.getHeight();
      pdf.setFont('times', 'normal');
      pdf.setFontSize(9);
      pdf.text(`${page} / ${totalPages}`, width / 2, height - 4.5, { align: 'center' });
    }

    const code = cleanText(rows[0]?.['課程代碼'] || '教育訓練')
      .replace(/^'/, '')
      .replace(/[\\/:*?"<>|]/g, '_');
    pdf.save(`${code}_教育訓練完整統計.pdf`);
  } catch (error) {
    console.error(error);
    alert(`產生 PDF 失敗：${error.message || '未知錯誤'}`);
  } finally {
    mounted.forEach(node => node.remove());
    button.disabled = false;
    button.textContent = '下載完整統計 PDF';
  }
}

function addCanvasToPdfPage(pdf, canvas) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const marginX = 7;
  const marginTop = 7;
  const marginBottom = 11;
  const usableWidth = pageWidth - marginX * 2;
  const usableHeight = pageHeight - marginTop - marginBottom;
  const ratio = Math.min(usableWidth / canvas.width, usableHeight / canvas.height);
  const drawWidth = canvas.width * ratio;
  const drawHeight = canvas.height * ratio;
  const x = (pageWidth - drawWidth) / 2;
  const y = marginTop;

  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, drawWidth, drawHeight, undefined, 'FAST');
}

function createPdfWrapper(width = 1100) {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = [
    'position:fixed',
    'left:-20000px',
    'top:0',
    `width:${width}px`,
    'background:#fff',
    'color:#111',
    'padding:24px 28px 26px',
    'font-family:DFKai-SB,BiauKai,標楷體,serif',
    'font-size:18px',
    'line-height:1.45',
    'box-sizing:border-box'
  ].join(';');
  return wrapper;
}

function commonPdfStyles() {
  return `
    .pdf-sheet{font-size:18px;line-height:1.45}
    .pdf-sheet h1,.pdf-sheet h2{margin:0;text-align:center;font-weight:700}
    .pdf-sheet h1{font-size:28px;letter-spacing:2px;margin-bottom:14px}
    .pdf-sheet h2{font-size:24px;margin-bottom:18px}
    .pdf-sub{font-size:18px;margin:0 0 14px;text-align:left}
    .pdf-meta{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px 36px;margin:0 22px 18px;font-size:18px}
    .pdf-meta div{min-height:28px}
    .pdf-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:18px}
    .pdf-table th,.pdf-table td{border:1px solid #777;padding:8px 6px;vertical-align:middle;box-sizing:border-box}
    .pdf-table th{background:#24577f;color:#fff;text-align:center;font-weight:700}
    .pdf-table td{word-break:break-word;overflow-wrap:anywhere}
    .center{text-align:center}.left{text-align:left}.top{vertical-align:top!important}
    .num{font-family:"Times New Roman",serif}
    .pdf-sign{display:grid;grid-template-columns:1fr 1fr 1.3fr;margin-top:16px;border:1px solid #777;border-right:0;font-size:18px}
    .pdf-sign div{border-right:1px solid #777;padding:11px 10px;min-height:42px}
    .section-note{font-size:17px;margin:0 0 10px;color:#333}
  `;
}

function buildSatisfactionPdfReport(rows) {
  const sat = calculateSatisfaction();
  const meta = typeof window.getReportMeta === 'function' ? window.getReportMeta(rows) : {};
  const unit = getCommonUnit(rows);
  const unitTitle = unit ? `${unit.replace(/^護理部/, '')}專科在職教育課程滿意度統計表` : '專科在職教育課程滿意度統計表';
  const wrapper = createPdfWrapper(1100);

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
      ${commonPdfStyles()}
      .sat-table th:nth-child(1){width:5%}.sat-table th:nth-child(2){width:30%}
      .sat-table th:nth-child(n+3):nth-child(-n+7){width:7%}.sat-table th:nth-child(8){width:9%}
      .sat-table th:nth-child(9){width:10%}.sat-table th:nth-child(10){width:11%}
      .sat-table tbody tr{height:54px}
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
      <table class="pdf-table sat-table">
        <thead><tr><th>序</th><th>項目</th><th>5</th><th>4</th><th>3</th><th>2</th><th>1</th><th>總計</th><th>平均分數</th><th>滿意度</th></tr></thead>
        <tbody>${itemRows}</tbody>
      </table>
      <div class="pdf-sign"><div>製表人：</div><div>單位護理長：</div><div>單位督導：</div></div>
    </div>`;

  return wrapper;
}

function buildAnswerPdfReport(rows, mode) {
  const wrapper = createPdfWrapper(1100);
  const quizColumns = state.quizColumns;
  const satColumns = state.satisfactionColumns;
  const isQuiz = mode === 'quiz';
  const title = isQuiz ? '教育訓練測驗－個人作答明細（測驗作答）' : '教育訓練測驗－個人作答明細（滿意度）';

  let headers;
  let bodyRows;

  if (isQuiz) {
    headers = ['序', '姓名', '單位', '及格', '得分', ...quizColumns.map((_, i) => `Q${i + 1}`)];
    bodyRows = rows.map((row, index) => {
      const answers = quizColumns.map((column, qIndex) => formatAnswer(state.parsedQuiz[qIndex], row[column]));
      const values = [
        index + 1,
        cleanPersonName(row['姓名']),
        formatUnitForDetail(row['單位名稱']).replace(/\n/g, '<br>'),
        cleanText(row['是否及格']),
        toNumber(row['得分']) ?? cleanText(row['得分']),
        ...answers
      ];
      return `<tr>${values.map((value, i) => `<td class="${i === 1 || i === 2 ? 'center' : 'center num'}">${i === 2 ? value : escapePdfHtml(value)}</td>`).join('')}</tr>`;
    }).join('');
  } else {
    headers = ['序', '姓名', '單位', ...satColumns.map((_, i) => `滿${i + 1}`), '感想與建議'];
    bodyRows = rows.map((row, index) => {
      const sats = satColumns.map(column => toNumber(row[column]) ?? cleanText(row[column]));
      const values = [index + 1, cleanPersonName(row['姓名']), formatUnitForDetail(row['單位名稱']).replace(/\n/g, '<br>'), ...sats, cleanText(row['感想與建議'])];
      return `<tr>${values.map((value, i) => {
        const isText = i === 1 || i === 2 || i === values.length - 1;
        const cls = isText ? (i === values.length - 1 ? 'left' : 'center') : 'center num';
        return `<td class="${cls}">${i === 2 ? value : escapePdfHtml(value)}</td>`;
      }).join('')}</tr>`;
    }).join('');
  }

  const code = cleanText(rows[0]?.['課程代碼'] || '').replace(/^'/, '');
  const note = isQuiz
    ? `課程代碼：${escapePdfHtml(code)}　｜　Q＝測驗作答`
    : `課程代碼：${escapePdfHtml(code)}　｜　滿1～滿${satColumns.length || 10}＝滿意度題目`;

  wrapper.innerHTML = `
    <style>
      ${commonPdfStyles()}
      .detail-table th,.detail-table td{padding:9px 5px}
      .detail-table th:nth-child(1){width:5%}
      .detail-table th:nth-child(2){width:11%}
      .detail-table th:nth-child(3){width:14%}
      .detail-table tbody tr{height:46px}
      ${isQuiz ? `
        .detail-table th:nth-child(4){width:8%}.detail-table th:nth-child(5){width:8%}
      ` : `
        .detail-table th:last-child{width:18%}
      `}
    </style>
    <div class="pdf-sheet">
      <h2>${title}</h2>
      <div class="pdf-sub">${note}</div>
      <table class="pdf-table detail-table">
        <thead><tr>${headers.map(h => `<th>${escapePdfHtml(h)}</th>`).join('')}</tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </div>`;

  return wrapper;
}

function splitQuestionChunksForPdf() {
  const items = state.quizColumns.map((column, index) => {
    const parsed = state.parsedQuiz[index];
    const questionText = parsed?.question || column;
    const optionText = getPdfQuestionOptions(column, parsed).map(option => option.text ? `(${option.code}) ${option.text}` : `(${option.code})`).join('\n');
    const units = Math.max(
      estimateWrappedLines(questionText, 35),
      optionText.split('\n').reduce((sum, line) => sum + estimateWrappedLines(line, 44), 0)
    );
    return { index, column, parsed, questionText, optionText, units: Math.max(3, units) };
  });

  const chunks = [];
  let current = [];
  let used = 0;
  const maxUnits = 28;

  items.forEach(item => {
    if (current.length && (used + item.units > maxUnits || current.length >= 3)) {
      chunks.push(current);
      current = [];
      used = 0;
    }
    current.push(item);
    used += item.units;
  });
  if (current.length) chunks.push(current);
  return chunks.length ? chunks : [[]];
}

function getPdfQuestionOptions(column, parsed) {
  const answered = state.rows.map(row => cleanText(row[column])).filter(Boolean);
  let options = parsed?.options?.length
    ? parsed.options.map(option => ({ code: cleanText(option.code), text: cleanText(option.text) }))
    : [...new Set(answered)].sort(naturalSort).map(value => ({ code: value, text: '' }));

  const known = new Set(options.map(option => normalizeCode(option.code)));
  [...new Set(answered)].forEach(value => {
    if (!known.has(normalizeCode(value)) && !options.some(option => cleanText(option.text).toUpperCase() === value.toUpperCase())) {
      options.push({ code: value, text: '' });
    }
  });
  return options;
}

function buildQuestionPdfReport(rows, chunk, chunkNumber, chunkTotal) {
  const wrapper = createPdfWrapper(1100);
  const correctAnswers = inferCorrectAnswers(rows);
  const code = cleanText(rows[0]?.['課程代碼'] || '').replace(/^'/, '');

  const bodyRows = chunk.map(item => {
    const correct = correctAnswers[item.index] || '';
    const optionsHtml = escapePdfHtml(item.optionText).replace(/\n/g, '<br>');
    return `
      <tr>
        <td class="center num">Q${item.index + 1}</td>
        <td class="center num correct">${escapePdfHtml(correct)}</td>
        <td class="left top">${escapePdfHtml(item.questionText)}</td>
        <td class="left top">${optionsHtml}</td>
      </tr>`;
  }).join('');

  wrapper.innerHTML = `
    <style>
      ${commonPdfStyles()}
      .question-table th:nth-child(1){width:7%}
      .question-table th:nth-child(2){width:10%}
      .question-table th:nth-child(3){width:38%}
      .question-table th:nth-child(4){width:45%}
      .question-table td{padding:10px 8px;font-size:18px;line-height:1.5}
      .correct{background:#e2f0d9;font-weight:700}
    </style>
    <div class="pdf-sheet">
      <h2>教育訓練測驗－題目作答統計</h2>
      <div class="pdf-sub">課程代碼：${escapePdfHtml(code)}${chunkTotal > 1 ? `　｜　題目統計 ${chunkNumber}/${chunkTotal}` : ''}</div>
      <table class="pdf-table question-table">
        <thead><tr><th>題號</th><th>正確答案</th><th>題目</th><th>選項</th></tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>
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
