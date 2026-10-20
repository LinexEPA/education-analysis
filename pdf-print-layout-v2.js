// PDF 列印版 v2：
// - 滿意度：A4 直式
// - 個人作答明細：A4 直式
// - 題目統計：A4 橫式
// - 內文以實際列印約 12pt 為基準，不再用整頁縮小字體硬塞。

(function initPdfPrintLayoutV2() {
  const oldBtn = document.getElementById('pdfExportBtn');
  if (!oldBtn || window.__pdfPrintLayoutV2) return;

  // 移除舊版 click listener，改由新版輸出流程接手。
  const newBtn = oldBtn.cloneNode(true);
  newBtn.textContent = '下載完整統計 PDF';
  oldBtn.replaceWith(newBtn);
  newBtn.addEventListener('click', exportCompletePdfV2);
  window.__pdfPrintLayoutV2 = true;
})();

async function exportCompletePdfV2() {
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

    // 1. 滿意度統計表：直式。
    sections.push({ orientation: 'portrait', element: buildPdfSatisfactionV2(rows) });

    // 2. 測驗作答分布：橫式，接在滿意度後面。
    const distributionChunks = chunkArrayV2(
      state.quizColumns.map((column, index) => ({ column, index })),
      2
    );
    distributionChunks.forEach((chunk, index) => {
      if (!chunk.length) return;
      sections.push({
        orientation: 'landscape',
        element: buildPdfQuizDistributionV2(rows, chunk, index + 1, distributionChunks.length)
      });
    });

    // 3. 教育訓練測驗題目：橫式。長題目單獨一頁，短題目每頁最多兩題。
    const questionChunks = makeQuestionChunksV2(rows);
    questionChunks.forEach((chunk, index) => {
      sections.push({
        orientation: 'landscape',
        element: buildPdfQuestionsV2(rows, chunk, index + 1, questionChunks.length)
      });
    });

    // 4. 個人作答明細（測驗）：直式。
    const rowChunks = chunkArrayV2(rows, 18);
    rowChunks.forEach((chunk, index) => {
      sections.push({
        orientation: 'portrait',
        element: buildPdfPersonalQuizV2(chunk, rows, index + 1, rowChunks.length)
      });
    });

    // 5. 個人作答明細（滿意度）：直式。
    const activeSatColumns = typeof window.getActiveSatisfactionColumns === 'function'
      ? window.getActiveSatisfactionColumns()
      : state.satisfactionColumns;
    if (activeSatColumns.length) {
      const satGroup = activeSatColumns.map((column, index) => ({ column, index }));
      rowChunks.forEach((chunk, pageIndex) => {
        sections.push({
          orientation: 'portrait',
          element: buildPdfPersonalSatisfactionV2(
            chunk,
            rows,
            satGroup,
            1,
            1,
            pageIndex + 1,
            rowChunks.length
          )
        });
      });
    }

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

      addCanvasToPdfV2(pdf, canvas);
    }

    const totalPages = pdf.getNumberOfPages();
    for (let page = 1; page <= totalPages; page += 1) {
      pdf.setPage(page);
      const width = pdf.internal.pageSize.getWidth();
      const height = pdf.internal.pageSize.getHeight();
      pdf.setFont('times', 'normal');
      pdf.setFontSize(10);
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

function addCanvasToPdfV2(pdf, canvas) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const marginX = 7;
  const marginTop = 7;
  const marginBottom = 11;
  const usableWidth = pageWidth - marginX * 2;
  const usableHeight = pageHeight - marginTop - marginBottom;

  // 版面已事先分頁，通常以寬度縮放；只有真的超高才再縮小。
  const widthRatio = usableWidth / canvas.width;
  const heightRatio = usableHeight / canvas.height;
  const ratio = Math.min(widthRatio, heightRatio);
  const drawWidth = canvas.width * ratio;
  const drawHeight = canvas.height * ratio;
  const x = (pageWidth - drawWidth) / 2;
  const y = marginTop;

  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, drawWidth, drawHeight, undefined, 'FAST');
}

function createPdfPageV2(orientation) {
  // 直式維持原尺寸；橫式縮窄畫布，讓題目與作答分布在實際 PDF 中放大。
  const width = orientation === 'portrait' ? 740 : 920;
  const wrapper = document.createElement('div');
  wrapper.style.cssText = [
    'position:fixed',
    'left:-20000px',
    'top:0',
    `width:${width}px`,
    'background:#fff',
    'color:#111',
    'padding:18px 20px 20px',
    'box-sizing:border-box',
    'font-family:DFKai-SB,BiauKai,標楷體,serif',
    'font-size:16px',
    'line-height:1.4'
  ].join(';');
  return wrapper;
}

function basePdfStylesV2() {
  return `
    .p2-sheet{font-family:DFKai-SB,BiauKai,標楷體,serif;font-size:16px;line-height:1.4;color:#111}
    .p2-sheet h1,.p2-sheet h2{margin:0;text-align:center;font-weight:700;color:#111}
    .p2-sheet h1{font-size:24px;letter-spacing:1px;margin-bottom:10px}
    .p2-sheet h2{font-size:22px;margin-bottom:12px}
    .p2-sub{font-size:16px;margin:0 0 10px;text-align:left}
    .p2-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:16px}
    .p2-table th,.p2-table td{border:1px solid #777;padding:6px 5px;vertical-align:middle;box-sizing:border-box}
    .p2-table th{background:#e7e7e7;color:#111;text-align:center;font-weight:700}
    .p2-table td{overflow-wrap:anywhere;word-break:break-word}
    .p2-center{text-align:center!important}
    .p2-left{text-align:left!important}
    .p2-top{vertical-align:top!important}
    .p2-num,.p2-latin{font-family:"Times New Roman",serif!important}
    .p2-green{background:#f1f1f1;font-weight:700}
  `;
}

function buildPdfSatisfactionV2(rows) {
  const sat = calculateSatisfaction();
  const meta = typeof window.getReportMeta === 'function' ? window.getReportMeta(rows) : {};
  const wrapper = createPdfPageV2('portrait');

  const itemRows = sat.items.map((item, index) => {
    const total = Object.values(item.counts).reduce((sum, value) => sum + value, 0);
    return `
      <tr>
        <td class="p2-center p2-num">${index + 1}</td>
        <td>${escapePdfV2(item.label)}</td>
        <td class="p2-center p2-num">${item.counts[5]}</td>
        <td class="p2-center p2-num">${item.counts[4]}</td>
        <td class="p2-center p2-num">${item.counts[3]}</td>
        <td class="p2-center p2-num">${item.counts[2]}</td>
        <td class="p2-center p2-num">${item.counts[1]}</td>
        <td class="p2-center p2-num">${total}</td>
        <td class="p2-center p2-num">${item.average.toFixed(2)}</td>
        <td class="p2-center p2-num">${item.satisfaction.toFixed(1)}%</td>
      </tr>`;
  }).join('');

  const participant = meta.participantCount === '' ? '' : escapePdfV2(meta.participantCount);
  const responseRate = meta.responseRate === '' ? '' : `${Number(meta.responseRate).toFixed(1)}%`;

  wrapper.innerHTML = `
    <style>
      ${basePdfStylesV2()}
      .p2-meta{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px 24px;margin:0 16px 12px;font-size:16px}
      .p2-meta div{min-height:24px}
      .p2-sat th:nth-child(1){width:5%}.p2-sat th:nth-child(2){width:30%}
      .p2-sat th:nth-child(n+3):nth-child(-n+7){width:7%}.p2-sat th:nth-child(8){width:9%}
      .p2-sat th:nth-child(9){width:10%}.p2-sat th:nth-child(10){width:11%}
      .p2-sat tbody tr{height:45px}
      .p2-sign{display:grid;grid-template-columns:1fr 1fr 1.3fr;margin-top:12px;border:1px solid #777;border-right:0;font-size:16px}
      .p2-sign div{border-right:1px solid #777;padding:8px;min-height:34px}
    </style>
    <div class="p2-sheet">
      <h1>佛教慈濟醫療財團法人台中慈濟醫院護理部</h1>
      <h2>專科在職教育課程滿意度統計表</h2>
      <div class="p2-meta">
        <div>講師：${escapePdfV2(meta.lecturer || '')}</div>
        <div>參與人數：${participant}</div>
        <div>回收率：<span class="p2-num">${responseRate}</span></div>
        <div>日期：${escapePdfV2(meta.dateDisplay || '')}</div>
        <div>問卷回收：<span class="p2-num">${rows.length}</span></div>
        <div>總滿意度：<span class="p2-num">${sat.overall == null ? '' : `${sat.overall.toFixed(1)}%`}</span></div>
      </div>
      <table class="p2-table p2-sat">
        <thead><tr><th>序</th><th>項目</th><th>5</th><th>4</th><th>3</th><th>2</th><th>1</th><th>總計</th><th>平均分數</th><th>滿意度</th></tr></thead>
        <tbody>${itemRows}</tbody>
      </table>
      <div class="p2-sign"><div>製表人：</div><div>單位護理長：</div><div>單位督導：</div></div>
    </div>`;

  applyMixedFontsPdfV2(wrapper);
  return wrapper;
}

function buildPdfQuizDistributionV2(rows, chunk, pageIndex, pageCount) {
  const wrapper = createPdfPageV2('landscape');
  const code = cleanText(rows[0]?.['課程代碼'] || '').replace(/^'/, '');
  const examSummary = typeof calculateExamSummary === 'function' ? calculateExamSummary() : {};
  const averageScoreText = examSummary.averageScore == null ? '—' : examSummary.averageScore;
  const passRateText = examSummary.passRate == null ? '—' : `${examSummary.passRate}%`;

  const blocks = chunk.map(item => {
    const parsed = state.parsedQuiz[item.index];
    const question = parsed?.question || item.column;
    const labels = Object.fromEntries((parsed?.options || []).map(opt => [normalizeCode(opt.code), cleanText(opt.text)]));
    const counts = {};

    rows.forEach(row => {
      const raw = cleanText(row[item.column]);
      if (!raw) return;
      counts[raw] = (counts[raw] || 0) + 1;
    });

    const entries = Object.entries(counts)
      .sort(([a], [b]) => naturalSort(a, b));
    const total = entries.reduce((sum, [, count]) => sum + count, 0);
    const values = entries.map(([, count]) => count);
    const maxCount = values.length ? Math.max(...values) : 0;
    const minCount = values.length ? Math.min(...values) : 0;

    const bars = entries.map(([codeValue, count]) => {
      const label = labels[normalizeCode(codeValue)] || '';
      const pct = total ? (count / total) * 100 : 0;
      let flag = '';
      if (entries.length === 1) flag = '唯一作答';
      else if (count === maxCount && count === minCount) flag = '最高＝最低';
      else if (count === maxCount) flag = '最高作答';
      else if (count === minCount) flag = '最低作答';

      return `
        <div class="p2-bar-row">
          <div class="p2-bar-code p2-num">${escapePdfV2(codeValue)}.</div>
          <div class="p2-bar-label">${escapePdfV2(label)}</div>
          <div class="p2-bar-track"><div class="p2-bar-fill" style="width:${pct.toFixed(1)}%"></div></div>
          <div class="p2-bar-value p2-num">${count}人 · ${pct.toFixed(1)}%</div>
          <div class="p2-bar-flag">${flag ? escapePdfV2(flag) : ''}</div>
        </div>`;
    }).join('');

    return `
      <section class="p2-dist-block">
        <h3>${item.index + 1}. ${escapePdfV2(question)}</h3>
        <div class="p2-bar-list">
          ${bars || '<div class="p2-empty">沒有有效作答資料</div>'}
        </div>
      </section>`;
  }).join('');

  wrapper.innerHTML = `
    <style>
      ${basePdfStylesV2()}
      .p2-sheet h2{font-size:30px!important;color:#111!important;margin-bottom:12px!important}
      .p2-sub{font-size:20px!important;color:#111!important;margin-bottom:16px!important}
      .p2-dist-grid{display:grid;grid-template-columns:1fr;gap:16px;transform:scale(.8);transform-origin:top left;width:125%}
      .p2-dist-block{break-inside:avoid;padding:0 0 17px;border-bottom:1px dashed #c9cecc}
      .p2-dist-block:last-child{border-bottom:0}
      .p2-dist-block h3{margin:0 0 10px;font-size:22px;line-height:1.42;color:#111}
      .p2-bar-list{display:grid;gap:8px}
      .p2-bar-row{
        display:grid;
        grid-template-columns:28px minmax(270px, 1.55fr) minmax(200px, 1.05fr) 112px 76px;
        align-items:center;
        column-gap:8px;
        row-gap:4px;
        min-height:28px;
        font-size:17px;
      }
      .p2-bar-code{align-self:start;padding-top:1px;text-align:right;color:#111;line-height:1.35}
      .p2-bar-label{align-self:start;line-height:1.35;color:#111;text-align:left}
      .p2-bar-track{height:11px;max-width:340px;border-radius:999px;background:#e7ecea;overflow:hidden}
      .p2-bar-fill{height:100%;border-radius:999px;background:#5ca99f}
      .p2-bar-value{text-align:right;color:#222;white-space:nowrap;font-weight:700;font-size:16px}
      .p2-bar-flag{
        min-height:22px;
        display:flex;
        align-items:center;
        justify-content:center;
        border-radius:999px;
        font-size:12px;
        font-weight:700;
        color:#333;
        background:#f0f1ef;
      }
      .p2-bar-flag:empty{background:transparent}
      .p2-empty{font-size:17px;color:#666}
    </style>
    <div class="p2-sheet">
      <h2>教育訓練測驗作答分布</h2>
      <div class="p2-sub">課程代碼：${escapePdfV2(code)}　｜　平均分數：${escapePdfV2(averageScoreText)}　｜　及格率：${escapePdfV2(passRateText)}　｜　作答分布 ${pageIndex}/${pageCount}</div>
      <div class="p2-dist-grid">${blocks}</div>
    </div>`;

  applyMixedFontsPdfV2(wrapper);
  return wrapper;
}

function buildPdfPersonalQuizV2(rowsChunk, allRows, pageIndex, pageCount) {
  const wrapper = createPdfPageV2('portrait');
  const quizColumns = state.quizColumns;
  const code = cleanText(allRows[0]?.['課程代碼'] || '').replace(/^'/, '');
  const examSummary = typeof calculateExamSummary === 'function' ? calculateExamSummary() : {};
  const averageScoreText = examSummary.averageScore == null ? '—' : examSummary.averageScore;

  const body = rowsChunk.map((row, localIndex) => {
    const originalIndex = allRows.indexOf(row);
    const answers = quizColumns.map((column, qIndex) => formatAnswer(state.parsedQuiz[qIndex], row[column]));
    return `
      <tr>
        <td class="p2-center p2-num">${originalIndex + 1}</td>
        <td class="p2-center">${escapePdfV2(cleanPersonName(row['姓名']))}</td>
        <td class="p2-center">${escapePdfV2(formatUnitForDetail(row['單位名稱'])).replace(/\n/g, '<br>')}</td>
        <td class="p2-center p2-num">${escapePdfV2(cleanText(row['是否及格']))}</td>
        <td class="p2-center p2-num">${escapePdfV2(toNumber(row['得分']) ?? cleanText(row['得分']))}</td>
        ${answers.map(value => `<td class="p2-center p2-num">${escapePdfV2(value)}</td>`).join('')}
      </tr>`;
  }).join('');

  const qHeaders = quizColumns.map((_, i) => `<th>Q${i + 1}</th>`).join('');
  wrapper.innerHTML = `
    <style>
      ${basePdfStylesV2()}
      .p2-personal tbody tr{height:39px}
      .p2-personal th:nth-child(1){width:6%}
      .p2-personal th:nth-child(2){width:13%}
      .p2-personal th:nth-child(3){width:18%}
      .p2-personal th:nth-child(4){width:9%}
      .p2-personal th:nth-child(5){width:9%}
    </style>
    <div class="p2-sheet">
      <h2>教育訓練－個人作答明細（測驗）</h2>
      <div class="p2-sub">課程代碼：${escapePdfV2(code)}　｜　平均分數：${escapePdfV2(averageScoreText)}　｜　Q＝測驗作答${pageCount > 1 ? `　｜　${pageIndex}/${pageCount}` : ''}</div>
      <table class="p2-table p2-personal">
        <thead><tr><th>序</th><th>姓名</th><th>單位</th><th>及格</th><th>得分</th>${qHeaders}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>`;

  applyMixedFontsPdfV2(wrapper);
  return wrapper;
}

function buildPdfPersonalSatisfactionV2(rowsChunk, allRows, group, groupIndex, groupCount, pageIndex, pageCount) {
  const wrapper = createPdfPageV2('portrait');
  const code = cleanText(allRows[0]?.['課程代碼'] || '').replace(/^'/, '');
  const isLastGroup = groupIndex === groupCount;

  const body = rowsChunk.map(row => {
    const originalIndex = allRows.indexOf(row);
    const sats = group.map(item => toNumber(row[item.column]) ?? cleanText(row[item.column]));
    return `
      <tr>
        <td class="p2-center p2-num">${originalIndex + 1}</td>
        <td class="p2-center">${escapePdfV2(cleanPersonName(row['姓名']))}</td>
        <td class="p2-center">${escapePdfV2(formatUnitForDetail(row['單位名稱'])).replace(/\n/g, '<br>')}</td>
        ${sats.map(value => `<td class="p2-center p2-num">${escapePdfV2(value)}</td>`).join('')}
        ${isLastGroup ? `<td class="p2-left">${escapePdfV2(cleanText(row['感想與建議']))}</td>` : ''}
      </tr>`;
  }).join('');

  const headers = group.map(item => `<th>滿${item.index + 1}</th>`).join('');
  wrapper.innerHTML = `
    <style>
      ${basePdfStylesV2()}
      .p2-personal-sat{font-size:16px}
      .p2-personal-sat th,.p2-personal-sat td{padding:5px 3px}
      .p2-personal-sat tbody tr{height:39px}
      .p2-personal-sat th:nth-child(1){width:5%}
      .p2-personal-sat th:nth-child(2){width:12%}
      .p2-personal-sat th:nth-child(3){width:15%}
      .p2-personal-sat th:nth-child(n+4):nth-child(-n+${3 + group.length}){width:4.6%}
      ${isLastGroup ? '.p2-personal-sat th:last-child{width:22%}' : ''}
    </style>
    <div class="p2-sheet">
      <h2>教育訓練－個人作答明細（滿意度）</h2>
      <div class="p2-sub">課程代碼：${escapePdfV2(code)}　｜　滿1～滿${group.length}＝滿意度題目${pageCount > 1 ? `　｜　人員 ${pageIndex}/${pageCount}` : ''}</div>
      <table class="p2-table p2-personal-sat">
        <thead><tr><th>序</th><th>姓名</th><th>單位</th>${headers}${isLastGroup ? '<th>感想與建議</th>' : ''}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>`;

  applyMixedFontsPdfV2(wrapper);
  return wrapper;
}

function makeQuestionChunksV2(rows) {
  const items = state.quizColumns.map((column, index) => ({ column, index, weight: 0 }));
  const chunks = [];
  for (let i = 0; i < items.length; i += 2) {
    chunks.push(items.slice(i, i + 2));
  }
  return chunks;
}

function buildPdfQuestionsV2(rows, chunk, pageIndex, pageCount) {
  const wrapper = createPdfPageV2('landscape');
  const correctAnswers = typeof inferCorrectAnswers === 'function' ? inferCorrectAnswers(rows) : [];
  const code = cleanText(rows[0]?.['課程代碼'] || '').replace(/^'/, '');
  const rowHeight = chunk.length === 1 ? 420 : 220;

  const body = chunk.map(item => {
    const index = item.index;
    const column = item.column;
    const parsed = state.parsedQuiz[index];
    const question = parsed?.question || column;
    const correct = correctAnswers[index] || '';
    const answered = rows.map(row => cleanText(row[column])).filter(Boolean);
    let options = parsed?.options?.length
      ? parsed.options.map(option => ({ code: cleanText(option.code), text: cleanText(option.text) }))
      : [...new Set(answered)].map(value => ({ code: value, text: '' }));
    if (!options.length) options = [{ code: '', text: '' }];

    const optionHtml = options.map(option => {
      const text = option.text ? ` ${escapePdfV2(option.text)}` : '';
      return `(${escapePdfV2(option.code)})${text}`;
    }).join('<br>');

    return `
      <tr style="height:${rowHeight}px">
        <td class="p2-center p2-num">Q${index + 1}</td>
        <td class="p2-center p2-num${correct ? ' p2-green' : ''}">${escapePdfV2(correct)}</td>
        <td class="p2-left p2-top">${escapePdfV2(question)}</td>
        <td class="p2-left p2-top">${optionHtml}</td>
      </tr>`;
  }).join('');

  wrapper.innerHTML = `
    <style>
      ${basePdfStylesV2()}
      .p2-sheet h2{font-size:28px!important;margin-bottom:12px!important;color:#111!important}
      .p2-sub{font-size:18px!important;margin-bottom:10px!important;color:#111!important}
      .p2-question{font-size:22px;line-height:1.48}
      .p2-question th,.p2-question td{padding:9px 9px}
      .p2-question th{font-size:16px;background:#e7e7e7!important;color:#111!important}
      .p2-question th:nth-child(1){width:7%}
      .p2-question th:nth-child(2){width:10%}
      .p2-question th:nth-child(3){width:40%}
      .p2-question th:nth-child(4){width:43%}
    </style>
    <div class="p2-sheet">
      <h2>教育訓練測驗題目</h2>
      <div class="p2-sub">課程代碼：${escapePdfV2(code)}　｜　題目 ${pageIndex}/${pageCount}</div>
      <table class="p2-table p2-question">
        <thead><tr><th>題號</th><th>正確答案</th><th>題目</th><th>選項</th></tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>`;

  applyMixedFontsPdfV2(wrapper);
  return wrapper;
}

function applyMixedFontsPdfV2(root) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  let node;
  while ((node = walker.nextNode())) {
    const parent = node.parentElement;
    if (!parent || parent.tagName === 'STYLE' || parent.closest('.p2-num,.p2-latin')) continue;
    if (/[A-Za-z0-9]/.test(node.nodeValue || '')) nodes.push(node);
  }

  nodes.forEach(textNode => {
    const text = textNode.nodeValue || '';
    const frag = document.createDocumentFragment();
    const parts = text.split(/([A-Za-z0-9]+(?:[./:%+\-][A-Za-z0-9]+)*%?)/g);
    parts.forEach(part => {
      if (!part) return;
      if (/[A-Za-z0-9]/.test(part)) {
        const span = document.createElement('span');
        span.className = 'p2-latin';
        span.textContent = part;
        frag.appendChild(span);
      } else {
        frag.appendChild(document.createTextNode(part));
      }
    });
    textNode.parentNode.replaceChild(frag, textNode);
  });
}

function textUnitsV2(text) {
  let units = 0;
  for (const ch of Array.from(String(text || ''))) {
    units += /[\u3400-\u9FFF\uF900-\uFAFF]/.test(ch) ? 1 : 0.55;
  }
  return units;
}

function chunkArrayV2(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks.length ? chunks : [[]];
}

function escapePdfV2(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
