// Excel：新增「測驗作答分布」頁籤。
// 位置由 export.js 控制：滿意度統計表之後、個人作答明細之前。
// 呈現方式與網頁「測驗作答分布」一致，不自行判斷正確答案。

function buildQuizDistributionWorksheet(workbook, rows) {
  if (!state.quizColumns.length) return;

  const ws = workbook.addWorksheet('測驗作答分布', {
    views: [{ state: 'frozen', ySplit: 3, showGridLines: false }]
  });

  ws.pageSetup = {
    orientation: 'landscape',
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalCentered: true,
    margins: {
      left: 0.28, right: 0.28, top: 0.3, bottom: 0.45,
      header: 0.12, footer: 0.22
    }
  };

  ws.columns = [
    { width: 8 },   // 題號
    { width: 55 },  // 題目
    { width: 13 },  // 作答選項
    { width: 45 },  // 選項內容
    { width: 10 },  // 人數
    { width: 11 }   // 比例
  ];

  ws.mergeCells('A1:F1');
  ws.getCell('A1').value = '教育訓練測驗－作答分布';
  styleTitle(ws.getCell('A1'), 18);
  ws.getRow(1).height = 34;

  ws.mergeCells('A2:F2');
  ws.getCell('A2').value = `課程代碼：${cleanText(rows[0]?.['課程代碼'] || '').replace(/^'/, '')}　｜　呈現各選項實際作答人數與比例`;
  ws.getCell('A2').alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  ws.getRow(2).height = 28;

  const header = ws.addRow(['題號', '題目', '作答選項', '選項內容', '人數', '比例']);
  styleHeaderRow(header);
  header.height = 32;

  state.quizColumns.forEach((column, index) => {
    const parsed = state.parsedQuiz[index];
    const questionText = parsed?.question || column;
    const distribution = {};

    rows.forEach(row => {
      const raw = cleanText(row[column]);
      if (!raw) return;
      const option = typeof findOption === 'function' ? findOption(parsed, raw) : null;
      const code = option?.code ? cleanText(option.code) : raw;
      const key = normalizeCode(code) || code;
      if (!distribution[key]) {
        distribution[key] = {
          code,
          text: option?.text ? cleanText(option.text) : '',
          count: 0
        };
      }
      distribution[key].count += 1;
    });

    const entries = Object.values(distribution)
      .sort((a, b) => naturalSort(a.code, b.code));
    const total = entries.reduce((sum, item) => sum + item.count, 0);

    if (!entries.length) {
      const row = ws.addRow([`Q${index + 1}`, questionText, '', '', 0, 0]);
      styleDataRow(row);
      row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(2).alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
      row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(6).numFmt = '0.0%';
      row.height = Math.max(48, estimateDistributionRowHeight(questionText, ''));
      return;
    }

    entries.forEach((item, answerIndex) => {
      const row = ws.addRow([
        answerIndex === 0 ? `Q${index + 1}` : '',
        answerIndex === 0 ? questionText : '',
        item.code,
        item.text,
        item.count,
        total ? item.count / total : 0
      ]);

      styleDataRow(row);
      row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(2).alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
      row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(4).alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
      row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(6).numFmt = '0.0%';

      const qText = answerIndex === 0 ? questionText : '';
      row.height = Math.max(38, estimateDistributionRowHeight(qText, item.text));
    });
  });

  ws.pageSetup.printArea = `A1:F${ws.rowCount}`;
  ws.pageSetup.printTitlesRow = '1:3';
  ws.headerFooter = {
    oddFooter: '&C第 &P 頁 / 共 &N 頁',
    evenFooter: '&C第 &P 頁 / 共 &N 頁',
    firstFooter: '&C第 &P 頁 / 共 &N 頁'
  };

  // 此頁以可直接閱讀為主，整體字級至少 12pt。
  ws.eachRow({ includeEmpty: false }, row => {
    row.eachCell({ includeEmpty: false }, cell => {
      const base = cell.font || {};
      const minSize = row.number === 1 ? 18 : (row.number <= 3 ? 13 : 12);

      if (cell.value && typeof cell.value === 'object' && Array.isArray(cell.value.richText)) {
        cell.value = {
          richText: cell.value.richText.map(run => ({
            ...run,
            font: {
              ...(run.font || {}),
              size: Math.max(Number(run.font?.size) || 0, minSize)
            }
          }))
        };
      }

      cell.font = {
        ...base,
        size: Math.max(Number(base.size) || 0, minSize)
      };
    });
  });

  if (typeof applyBilingualFontsToWorksheet === 'function') {
    applyBilingualFontsToWorksheet(ws);
  }
}

function estimateDistributionRowHeight(questionText, optionText) {
  const qLines = estimateDistributionLines(questionText, 33);
  const oLines = estimateDistributionLines(optionText, 30);
  return Math.min(150, Math.max(qLines, oLines, 1) * 20 + 14);
}

function estimateDistributionLines(text, charsPerLine) {
  const value = cleanText(text);
  if (!value) return 1;
  return value.split('\n').reduce((sum, line) => {
    let units = 0;
    for (const ch of Array.from(line)) {
      units += /[\u3400-\u9FFF\uF900-\uFAFF]/.test(ch) ? 1 : 0.58;
    }
    return sum + Math.max(1, Math.ceil(units / charsPerLine));
  }, 0);
}
