// 最終版面微調：
// 1) 網頁提示改成一般使用者看得懂的說法。
// 2) Excel 題庫頁強制換行並依 12pt 字級重算列高。
// 3) PDF 中文用標楷體、英數用 Times New Roman；提高實際列印字級。
// 4) PDF 題庫每頁最多 2 題，題目格固定同高，避免大小不一。

(function finalPolishPatch() {
  // ---------- 網頁提示文字 ----------
  if (typeof setStatus === 'function') {
    const baseSetStatus = setStatus;
    setStatus = function(element, type, message) {
      let next = message;
      if (typeof next === 'string') {
        next = next.replace(
          '原始檔未上傳至 GitHub。',
          '原始檔僅在目前裝置的瀏覽器中處理，不會上傳或儲存。'
        );
      }
      return baseSetStatus(element, type, next);
    };
  }

  // ---------- Excel：第三頁籤換行與列高 ----------
  if (typeof buildQuestionSummaryWorksheet === 'function') {
    const baseBuildQuestionSummaryWorksheet = buildQuestionSummaryWorksheet;
    buildQuestionSummaryWorksheet = function(workbook, rows) {
      baseBuildQuestionSummaryWorksheet(workbook, rows);
      const ws = workbook.getWorksheet('測驗題目統計');
      if (!ws) return;

      // 保留題目／選項足夠寬度，但仍讓 Excel 主動換行。
      ws.getColumn(1).width = 7;
      ws.getColumn(2).width = 10;
      ws.getColumn(3).width = 48;
      ws.getColumn(4).width = 56;

      for (let r = 4; r <= ws.rowCount; r += 1) {
        const row = ws.getRow(r);
        const qCell = row.getCell(3);
        const oCell = row.getCell(4);

        qCell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
        oCell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
        row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

        const qText = getExcelCellText(qCell);
        const oText = getExcelCellText(oCell);
        const qLines = estimateExcelWrappedLines(qText, 31);
        const oLines = oText
          ? oText.split('\n').reduce((sum, line) => sum + estimateExcelWrappedLines(line, 36), 0)
          : 1;
        const lines = Math.max(qLines, oLines, 2);

        // ExcelJS 不會真的 AutoFit 列高，所以依內容估算；12pt 時保留較寬鬆行距。
        row.height = Math.max(42, Math.min(320, lines * 19 + 14));
      }

      ws.pageSetup.fitToWidth = 1;
      ws.pageSetup.fitToHeight = 0;
      ws.pageSetup.printArea = `A1:D${ws.rowCount}`;
    };
  }

  function getExcelCellText(cell) {
    const value = cell?.value;
    if (value == null) return '';
    if (typeof value === 'object' && Array.isArray(value.richText)) {
      return value.richText.map(run => run.text || '').join('');
    }
    return String(value);
  }

  function estimateExcelWrappedLines(text, charsPerLine) {
    const value = String(text || '');
    if (!value) return 1;
    return value.split('\n').reduce((sum, line) => {
      let units = 0;
      for (const ch of Array.from(line)) {
        units += /[\u3400-\u9FFF\uF900-\uFAFF]/.test(ch) ? 1 : 0.58;
      }
      return sum + Math.max(1, Math.ceil(units / charsPerLine));
    }, 0);
  }

  // ---------- PDF：字型與實際列印字級 ----------
  if (typeof buildSatisfactionPdfReport === 'function') {
    const baseSatisfactionPdf = buildSatisfactionPdfReport;
    buildSatisfactionPdfReport = function(rows) {
      const wrapper = baseSatisfactionPdf(rows);
      // 第一頁是直式，縮放比例較大；將畫布寬度縮窄，避免 18px 被縮成約 9pt。
      wrapper.style.width = '850px';
      appendPdfStyle(wrapper, `
        .pdf-sheet{font-size:20px!important;line-height:1.5!important}
        .pdf-meta,.pdf-table,.pdf-sign{font-size:20px!important}
        .pdf-table th,.pdf-table td{padding:9px 6px!important}
        .pdf-table tbody tr{height:58px!important}
      `);
      applyPdfMixedFonts(wrapper);
      return wrapper;
    };
  }

  if (typeof buildAnswerPdfReport === 'function') {
    const baseAnswerPdf = buildAnswerPdfReport;
    buildAnswerPdfReport = function(rows, mode) {
      const wrapper = baseAnswerPdf(rows, mode);
      appendPdfStyle(wrapper, `
        .pdf-sheet{font-size:20px!important;line-height:1.5!important}
        .pdf-sub,.pdf-table{font-size:20px!important}
        .detail-table th,.detail-table td{padding:10px 6px!important}
        .detail-table tbody tr{height:50px!important}
      `);
      applyPdfMixedFonts(wrapper);
      return wrapper;
    };
  }

  // 題庫固定每頁最多 2 題，避免同一頁每題格高不同。
  splitQuestionChunksForPdf = function() {
    const items = state.quizColumns.map((column, index) => ({ column, index }));
    const chunks = [];
    for (let i = 0; i < items.length; i += 2) {
      chunks.push(items.slice(i, i + 2));
    }
    return chunks;
  };

  buildQuestionPdfReport = function(rows, chunk, chunkIndex, totalChunks) {
    const wrapper = createFinalPdfWrapper(1100);
    const correctAnswers = typeof inferCorrectAnswers === 'function' ? inferCorrectAnswers(rows) : [];

    const bodyRows = chunk.map(item => {
      const index = item.index;
      const column = item.column;
      const parsed = state.parsedQuiz[index];
      const questionText = parsed?.question || column;
      const correct = correctAnswers[index] || '';

      const answered = rows.map(row => cleanText(row[column])).filter(Boolean);
      let options = parsed?.options?.length
        ? parsed.options.map(option => ({ code: cleanText(option.code), text: cleanText(option.text) }))
        : [...new Set(answered)].map(value => ({ code: value, text: '' }));

      if (!options.length) options = [{ code: '', text: '' }];
      const optionHtml = options.map(option => {
        const code = escapeFinalPdfHtml(option.code);
        const text = escapeFinalPdfHtml(option.text);
        return `(${code})${text ? ` ${text}` : ''}`;
      }).join('<br>');

      return `
        <tr class="question-row">
          <td class="q-center latin-target">Q${index + 1}</td>
          <td class="q-center answer-cell latin-target">${escapeFinalPdfHtml(correct)}</td>
          <td class="q-text">${escapeFinalPdfHtml(questionText)}</td>
          <td class="q-text">${optionHtml}</td>
        </tr>`;
    }).join('');

    const code = cleanText(rows[0]?.['課程代碼'] || '').replace(/^'/, '');
    wrapper.innerHTML = `
      <style>
        .final-question-sheet{font-family:DFKai-SB,BiauKai,標楷體,serif;font-size:22px;line-height:1.42;color:#111}
        .final-question-sheet h2{margin:0 0 16px;text-align:center;font-size:29px;font-weight:700}
        .final-question-sub{margin:0 0 14px;font-size:21px;text-align:left}
        .final-question-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:22px}
        .final-question-table th,.final-question-table td{border:1px solid #777;box-sizing:border-box}
        .final-question-table th{height:50px;padding:8px 6px;background:#24577f;color:#fff;text-align:center;font-weight:700}
        .final-question-table th:nth-child(1){width:7%}
        .final-question-table th:nth-child(2){width:10%}
        .final-question-table th:nth-child(3){width:40%}
        .final-question-table th:nth-child(4){width:43%}
        .final-question-table .question-row{height:360px}
        .final-question-table td{padding:12px 10px;overflow:hidden}
        .q-center{text-align:center;vertical-align:middle}
        .q-text{text-align:left;vertical-align:top;white-space:normal;overflow-wrap:anywhere;word-break:break-word}
        .answer-cell{background:#e2f0d9;font-weight:700}
        .latin{font-family:"Times New Roman",serif!important}
      </style>
      <div class="final-question-sheet">
        <h2>教育訓練測驗－題目作答統計</h2>
        <div class="final-question-sub">課程代碼：${escapeFinalPdfHtml(code)}　｜　題目統計 ${chunkIndex}/${totalChunks}</div>
        <table class="final-question-table">
          <thead><tr><th>題號</th><th>正確答案</th><th>題目</th><th>選項</th></tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </div>`;

    applyPdfMixedFonts(wrapper);
    return wrapper;
  };

  function createFinalPdfWrapper(width) {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = [
      'position:fixed',
      'left:-20000px',
      'top:0',
      `width:${width}px`,
      'background:#fff',
      'color:#111',
      'padding:24px 28px 26px',
      'box-sizing:border-box'
    ].join(';');
    return wrapper;
  }

  function appendPdfStyle(wrapper, css) {
    const style = document.createElement('style');
    style.textContent = css;
    wrapper.appendChild(style);
  }

  // 將 PDF 內容中的英文字母／阿拉伯數字改套 Times New Roman。
  // 中文仍使用標楷體，避免「1140210005、Q1、100%」看起來像標楷體數字。
  function applyPdfMixedFonts(root) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let node;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (!parent || parent.tagName === 'STYLE' || parent.closest('.latin,.num')) continue;
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
          span.className = 'latin';
          span.style.fontFamily = 'Times New Roman, serif';
          span.textContent = part;
          frag.appendChild(span);
        } else {
          frag.appendChild(document.createTextNode(part));
        }
      });
      textNode.parentNode.replaceChild(frag, textNode);
    });
  }

  function escapeFinalPdfHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
})();
