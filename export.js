const exportBtn = document.getElementById('exportBtn');

exportBtn.addEventListener('click', async () => {
  if (!state.rows.length) {
    alert('請先上傳院內 ODS / XLSX 檔案。');
    return;
  }
  if (typeof ExcelJS === 'undefined') {
    alert('Excel 輸出元件尚未載入，請重新整理頁面後再試。');
    return;
  }

  exportBtn.disabled = true;
  exportBtn.textContent = '正在產生 Excel…';

  try {
    const rows = getExportRows();
    const workbook = new ExcelJS.Workbook();
    workbook.creator = '教育訓練統計轉檔工具';
    workbook.created = new Date();

    buildSatisfactionWorksheet(workbook, rows);
    buildAnswerDetailWorksheet(workbook, rows);
    buildQuestionSummaryWorksheet(workbook, rows);

    const comments = rows
      .map(row => cleanText(row['感想與建議']))
      .filter(Boolean)
      .filter(text => text !== '無');
    if (comments.length) buildCommentsWorksheet(workbook, comments);

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const code = cleanText(rows[0]?.['課程代碼'] || '教育訓練').replace(/^'/, '').replace(/[\\/:*?"<>|]/g, '_');
    link.href = url;
    link.download = `${code}_教育訓練統計.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  } catch (error) {
    console.error(error);
    alert(`產生 Excel 失敗：${error.message || '未知錯誤'}`);
  } finally {
    exportBtn.disabled = false;
    exportBtn.textContent = '下載教育訓練統計 Excel';
  }
});

const COLORS = {
  navy: '1F4E78',
  blue: 'D9EAF7',
  paleBlue: 'EAF3F8',
  gray: 'F2F2F2',
  line: '808080',
  white: 'FFFFFF',
  dark: '222222',
  green: 'E2F0D9',
  yellow: 'FFF2CC'
};

function getExportRows() {
  return (window.exportRows && window.exportRows.length)
    ? window.exportRows
    : state.rows;
}

function buildSatisfactionWorksheet(workbook, rows) {
  const sat = calculateSatisfaction();
  const ws = workbook.addWorksheet('滿意度統計表', {
    pageSetup: { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 1 }
  });

  ws.columns = [
    { width: 6 }, { width: 34 }, { width: 8 }, { width: 8 }, { width: 8 },
    { width: 8 }, { width: 8 }, { width: 10 }, { width: 12 }, { width: 13 }
  ];

  ws.mergeCells('A1:J1');
  ws.getCell('A1').value = '佛教慈濟醫療財團法人台中慈濟醫院護理部';
  styleTitle(ws.getCell('A1'), 16);

  ws.mergeCells('A2:J2');
  const commonUnit = getCommonUnit(rows);
  ws.getCell('A2').value = commonUnit
    ? `${commonUnit.replace(/^護理部/, '')}專科在職教育課程滿意度統計表`
    : '專科在職教育課程滿意度統計表';
  styleTitle(ws.getCell('A2'), 14);

  ws.mergeCells('B3:C3');
  ws.getCell('B3').value = '講師：';
  ws.mergeCells('D3:F3');
  ws.getCell('D3').value = '參與人數：';
  ws.mergeCells('H3:J3');
  ws.getCell('H3').value = '回收率：';

  ws.mergeCells('B4:C4');
  ws.getCell('B4').value = '日期：';
  ws.mergeCells('D4:F4');
  ws.getCell('D4').value = `問卷回收：${rows.length}`;
  ws.mergeCells('H4:J4');
  ws.getCell('H4').value = `總滿意度：${sat.overall == null ? '' : (sat.overall / 100)}`;
  ws.getCell('H4').numFmt = '0.00%';

  ['B3','D3','H3','B4','D4','H4'].forEach(addr => {
    ws.getCell(addr).font = { name: 'Microsoft JhengHei', size: 11 };
    ws.getCell(addr).alignment = { vertical: 'middle', horizontal: 'left' };
  });

  const headers = ['序', '項目', '5', '4', '3', '2', '1', '總計', '平均分數', '滿意度'];
  ws.addRow(headers);
  const headerRow = ws.getRow(5);
  styleHeaderRow(headerRow);

  sat.items.forEach((item, index) => {
    const total = Object.values(item.counts).reduce((sum, value) => sum + value, 0);
    const row = ws.addRow([
      index + 1,
      item.label,
      item.counts[5], item.counts[4], item.counts[3], item.counts[2], item.counts[1],
      total,
      Number(item.average.toFixed(2)),
      item.satisfaction / 100
    ]);
    styleDataRow(row);
    row.getCell(9).numFmt = '0.00';
    row.getCell(10).numFmt = '0.00%';
  });

  const totalCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  sat.items.forEach(item => {
    Object.keys(totalCounts).forEach(key => totalCounts[key] += item.counts[key]);
  });
  const totalResponses = Object.values(totalCounts).reduce((sum, value) => sum + value, 0);
  const avg = sat.items.length
    ? sat.items.reduce((sum, item) => sum + item.average, 0) / sat.items.length
    : 0;
  const totalRow = ws.addRow([
    '/', '總計', totalCounts[5], totalCounts[4], totalCounts[3], totalCounts[2], totalCounts[1],
    totalResponses, Number(avg.toFixed(2)), sat.overall == null ? '' : sat.overall / 100
  ]);
  styleTotalRow(totalRow);
  totalRow.getCell(9).numFmt = '0.00';
  totalRow.getCell(10).numFmt = '0.00%';

  ws.addRow([]);
  const signRow = ws.addRow(['製表人：', '', '', '單位護理長：', '', '', '單位督導：', '', '', '']);
  signRow.font = { name: 'Microsoft JhengHei', size: 11 };
  signRow.height = 25;

  for (let r = 1; r <= totalRow.number; r += 1) {
    ws.getRow(r).alignment = { vertical: 'middle', wrapText: true };
  }
  ws.getRow(1).height = 28;
  ws.getRow(2).height = 26;
  ws.getRow(5).height = 25;
  ws.views = [{ showGridLines: false }];
}

function buildAnswerDetailWorksheet(workbook, rows) {
  const ws = workbook.addWorksheet('個人作答明細', {
    views: [{ state: 'frozen', ySplit: 3, xSplit: 2, showGridLines: false }]
  });

  const quizColumns = state.quizColumns;
  const headers = ['序', '姓名', '單位', '是否完測', '是否及格', '得分', ...quizColumns, '感想與建議'];

  ws.mergeCells(1, 1, 1, headers.length);
  ws.getCell(1, 1).value = '教育訓練測驗－個人作答明細';
  styleTitle(ws.getCell(1, 1), 15);

  ws.mergeCells(2, 1, 2, headers.length);
  ws.getCell(2, 1).value = `課程代碼：${cleanText(rows[0]?.['課程代碼'] || '').replace(/^'/, '')}`;
  ws.getCell(2, 1).font = { name: 'Microsoft JhengHei', size: 10, color: { argb: COLORS.dark } };

  const headerRow = ws.addRow(headers);
  styleHeaderRow(headerRow);

  rows.forEach((row, index) => {
    const answers = quizColumns.map((column, qIndex) => formatAnswer(state.parsedQuiz[qIndex], row[column]));
    const dataRow = ws.addRow([
      index + 1,
      cleanPersonName(row['姓名']),
      cleanText(row['單位名稱']),
      cleanText(row['是否完測']),
      cleanText(row['是否及格']),
      toNumber(row['得分']) ?? cleanText(row['得分']),
      ...answers,
      cleanText(row['感想與建議'])
    ]);
    styleDataRow(dataRow);
    dataRow.alignment = { vertical: 'top', wrapText: true };
  });

  ws.getColumn(1).width = 6;
  ws.getColumn(2).width = 16;
  ws.getColumn(3).width = 20;
  ws.getColumn(4).width = 13;
  ws.getColumn(5).width = 11;
  ws.getColumn(6).width = 9;
  quizColumns.forEach((_, index) => ws.getColumn(7 + index).width = 22);
  ws.getColumn(headers.length).width = 24;

  if (state.parsedQuiz.length) {
    state.parsedQuiz.forEach((question, index) => {
      const cell = ws.getRow(3).getCell(7 + index);
      cell.value = `Q${index + 1}`;
      cell.note = question.question || `問題${index + 1}`;
    });
  }

  ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: headers.length } };
}

function buildQuestionSummaryWorksheet(workbook, rows) {
  const ws = workbook.addWorksheet('測驗題目統計', {
    views: [{ state: 'frozen', ySplit: 3, showGridLines: false }]
  });
  ws.columns = [
    { width: 8 }, { width: 58 }, { width: 12 }, { width: 34 }, { width: 10 }, { width: 11 }
  ];

  ws.mergeCells('A1:F1');
  ws.getCell('A1').value = '教育訓練測驗－題目作答統計';
  styleTitle(ws.getCell('A1'), 15);
  ws.mergeCells('A2:F2');
  ws.getCell('A2').value = `課程代碼：${cleanText(rows[0]?.['課程代碼'] || '').replace(/^'/, '')}`;

  const header = ws.addRow(['題號', '題目', '作答值', '選項內容', '人數', '比例']);
  styleHeaderRow(header);

  state.quizColumns.forEach((column, index) => {
    const parsed = state.parsedQuiz[index];
    const questionText = parsed?.question || column;
    const counts = {};
    rows.forEach(row => {
      const raw = cleanText(row[column]);
      if (!raw) return;
      counts[raw] = (counts[raw] || 0) + 1;
    });
    const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

    Object.entries(counts)
      .sort(([a], [b]) => naturalSort(a, b))
      .forEach(([raw, count], answerIndex) => {
        const option = findOption(parsed, raw);
        const row = ws.addRow([
          answerIndex === 0 ? `Q${index + 1}` : '',
          answerIndex === 0 ? questionText : '',
          raw,
          option?.text || '',
          count,
          total ? count / total : 0
        ]);
        styleDataRow(row);
        row.getCell(6).numFmt = '0.0%';
        row.alignment = { vertical: 'top', wrapText: true };
      });

    if (!Object.keys(counts).length) {
      const row = ws.addRow([`Q${index + 1}`, questionText, '', '', 0, 0]);
      styleDataRow(row);
      row.getCell(6).numFmt = '0.0%';
    }
  });
}

function buildCommentsWorksheet(workbook, comments) {
  const ws = workbook.addWorksheet('感想與建議', { views: [{ showGridLines: false }] });
  ws.columns = [{ width: 8 }, { width: 90 }];
  ws.mergeCells('A1:B1');
  ws.getCell('A1').value = '感想與建議';
  styleTitle(ws.getCell('A1'), 15);
  const header = ws.addRow(['序', '內容']);
  styleHeaderRow(header);
  comments.forEach((comment, index) => {
    const row = ws.addRow([index + 1, comment]);
    styleDataRow(row);
    row.alignment = { vertical: 'top', wrapText: true };
  });
}

function formatAnswer(parsed, rawValue) {
  const raw = cleanText(rawValue);
  if (!raw || !parsed) return raw;
  const option = findOption(parsed, raw);
  if (!option) return raw;
  const rawUpper = normalizeCode(raw);
  const codeUpper = normalizeCode(option.code);
  const textUpper = cleanText(option.text).toUpperCase();
  if (rawUpper === codeUpper && cleanText(option.text)) return `${raw}｜${option.text}`;
  if (raw.toUpperCase() === textUpper) return raw;
  return `${raw}｜${option.text}`;
}

function findOption(parsed, rawValue) {
  if (!parsed?.options?.length) return null;
  const raw = cleanText(rawValue);
  const byCode = parsed.options.find(option => normalizeCode(option.code) === normalizeCode(raw));
  if (byCode) return byCode;
  return parsed.options.find(option => cleanText(option.text).toUpperCase() === raw.toUpperCase()) || null;
}

function getCommonUnit(rows) {
  const values = rows.map(row => cleanText(row['單位名稱'])).filter(Boolean);
  if (!values.length) return '';
  const counts = values.reduce((acc, value) => {
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function cleanPersonName(value) {
  return cleanText(value).split('/')[0].trim();
}

function cleanText(value) {
  return String(value ?? '').replace(/\u3000/g, ' ').trim();
}

function styleTitle(cell, size) {
  cell.font = { name: 'Microsoft JhengHei', size, bold: true, color: { argb: COLORS.dark } };
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
}

function styleHeaderRow(row) {
  row.eachCell(cell => {
    cell.font = { name: 'Microsoft JhengHei', size: 10, bold: true, color: { argb: COLORS.white } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navy } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    setThinBorder(cell);
  });
  row.height = 24;
}

function styleDataRow(row) {
  row.eachCell({ includeEmpty: true }, cell => {
    cell.font = { name: 'Microsoft JhengHei', size: 10, color: { argb: COLORS.dark } };
    cell.alignment = { vertical: 'middle', wrapText: true };
    setThinBorder(cell);
  });
}

function styleTotalRow(row) {
  row.eachCell({ includeEmpty: true }, cell => {
    cell.font = { name: 'Microsoft JhengHei', size: 10, bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.blue } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    setThinBorder(cell);
  });
}

function setThinBorder(cell) {
  const side = { style: 'thin', color: { argb: COLORS.line } };
  cell.border = { top: side, left: side, bottom: side, right: side };
}
