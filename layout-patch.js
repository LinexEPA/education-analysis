// Excel 輸出版面：以「下載後可直接列印」為主。
// 中文：標楷體；英文／數字：Times New Roman。

const _baseBuildSatisfactionWorksheet = buildSatisfactionWorksheet;

buildSatisfactionWorksheet = function(workbook, rows) {
  _baseBuildSatisfactionWorksheet(workbook, rows);
  const ws = workbook.getWorksheet('滿意度統計表');
  if (!ws) return;

  const sat = calculateSatisfaction();

  ws.pageSetup = {
    orientation: 'portrait',
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 1,
    horizontalCentered: true,
    margins: {
      left: 0.3, right: 0.3, top: 0.35, bottom: 0.35,
      header: 0.15, footer: 0.15
    }
  };

  // 上方兩行標題。
  ['A1', 'A2'].forEach(addr => {
    ws.getCell(addr).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });
  ws.getRow(1).height = 34;
  ws.getRow(2).height = 32;
  ws.getRow(3).height = 25;
  ws.getRow(4).height = 25;
  ws.getRow(5).height = 30;

  // 總滿意度直接顯示百分比文字，避免 Excel 顯示 0.98。
  ws.getCell('H4').value = `總滿意度：${sat.overall == null ? '' : `${sat.overall.toFixed(1)}%`}`;
  ws.getCell('H4').alignment = { horizontal: 'left', vertical: 'middle' };

  // 表格表頭全部置中。
  ws.getRow(5).eachCell(cell => {
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });

  let signRowNumber = null;
  ws.eachRow((row, rowNumber) => {
    const first = cleanText(row.getCell(1).value);
    if (first.startsWith('製表人')) signRowNumber = rowNumber;
  });

  const lastTableRow = signRowNumber ? signRowNumber - 2 : ws.rowCount;
  for (let r = 6; r <= lastTableRow; r += 1) {
    const row = ws.getRow(r);
    row.height = 31;
    row.alignment = { vertical: 'middle', wrapText: true };

    // 序號置中。
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    // 數字欄置中；滿意度只留 1 位小數。
    for (let c = 3; c <= 10; c += 1) {
      row.getCell(c).alignment = { horizontal: 'center', vertical: 'middle' };
    }
    row.getCell(9).numFmt = '0.00';
    row.getCell(10).numFmt = '0.0%';
  }

  // 最下方簽核列合併。
  if (signRowNumber) {
    ws.mergeCells(signRowNumber, 1, signRowNumber, 3);
    ws.mergeCells(signRowNumber, 4, signRowNumber, 6);
    ws.mergeCells(signRowNumber, 7, signRowNumber, 10);

    [
      { col: 1, text: '製表人：' },
      { col: 4, text: '單位護理長：' },
      { col: 7, text: '單位督導：' }
    ].forEach(item => {
      const cell = ws.getCell(signRowNumber, item.col);
      cell.value = item.text;
      cell.alignment = { horizontal: 'left', vertical: 'middle' };
    });

    for (let c = 1; c <= 10; c += 1) setThinBorder(ws.getCell(signRowNumber, c));
    ws.getRow(signRowNumber).height = 34;
  }

  ws.pageSetup.printArea = `A1:J${ws.rowCount}`;
  applyBilingualFontsToWorksheet(ws);
};

// 個人作答明細：明確重建，避免下載後還要拉欄寬。
buildAnswerDetailWorksheet = function(workbook, rows) {
  const quizColumns = state.quizColumns;
  const satColumns = state.satisfactionColumns;
  const headers = [
    '序', '姓名', '單位', '及格', '得分',
    ...quizColumns.map((_, i) => `Q${i + 1}`),
    ...satColumns.map((_, i) => `滿${i + 1}`),
    '感想與建議'
  ];

  const ws = workbook.addWorksheet('個人作答明細', {
    views: [{ state: 'frozen', ySplit: 3, xSplit: 2, showGridLines: false }]
  });

  ws.pageSetup = {
    orientation: 'landscape',
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalCentered: true,
    margins: {
      left: 0.2, right: 0.2, top: 0.28, bottom: 0.35,
      header: 0.12, footer: 0.18
    }
  };

  ws.mergeCells(1, 1, 1, headers.length);
  ws.getCell(1, 1).value = '教育訓練測驗－個人作答明細';
  styleTitle(ws.getCell(1, 1), 15);
  ws.getRow(1).height = 28;

  ws.mergeCells(2, 1, 2, headers.length);
  ws.getCell(2, 1).value = `課程代碼：${cleanText(rows[0]?.['課程代碼'] || '').replace(/^'/, '')}　｜　Q＝測驗作答；滿1～滿${satColumns.length || 10}＝滿意度題目`;
  ws.getCell(2, 1).alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 22;

  const headerRow = ws.addRow(headers);
  styleHeaderRow(headerRow);
  headerRow.height = 26;

  rows.forEach((row, index) => {
    const answers = quizColumns.map((column, qIndex) => formatAnswer(state.parsedQuiz[qIndex], row[column]));
    const sats = satColumns.map(column => toNumber(row[column]) ?? cleanText(row[column]));

    const dataRow = ws.addRow([
      index + 1,
      cleanPersonName(row['姓名']),
      formatUnitForDetail(row['單位名稱']),
      cleanText(row['是否及格']),
      toNumber(row['得分']) ?? cleanText(row['得分']),
      ...answers,
      ...sats,
      cleanText(row['感想與建議'])
    ]);

    styleDataRow(dataRow);
    dataRow.height = 30;
    dataRow.alignment = { vertical: 'middle', wrapText: true };

    // 序號、及格、得分、Q、滿意度全部置中。
    dataRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    dataRow.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
    dataRow.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
    const compactStart = 6;
    const compactEnd = 5 + quizColumns.length + satColumns.length;
    for (let c = compactStart; c <= compactEnd; c += 1) {
      dataRow.getCell(c).alignment = { horizontal: 'center', vertical: 'middle' };
    }
  });

  // 欄寬：去除完測欄後，將空間留給姓名／單位與備註。
  ws.getColumn(1).width = 5.5;
  ws.getColumn(2).width = 11;
  ws.getColumn(3).width = 12;
  ws.getColumn(4).width = 6.5;
  ws.getColumn(5).width = 7.5;

  let col = 6;
  quizColumns.forEach(() => {
    ws.getColumn(col).width = 5.3;
    col += 1;
  });
  satColumns.forEach(() => {
    ws.getColumn(col).width = 5.1;
    col += 1;
  });
  ws.getColumn(col).width = 17;

  // 取消篩選箭頭，讓列印表頭乾淨，序號也不會被按鈕擠到。
  ws.autoFilter = null;
  ws.pageSetup.printArea = `A1:${columnLetter(headers.length)}${ws.rowCount}`;
  ws.pageSetup.printTitlesRow = '1:3';
  ws.headerFooter = {
    oddFooter: '&C第 &P 頁 / 共 &N 頁',
    evenFooter: '&C第 &P 頁 / 共 &N 頁',
    firstFooter: '&C第 &P 頁 / 共 &N 頁'
  };

  applyBilingualFontsToWorksheet(ws);
};

// 測驗題目統計：每題一列，題目與全部選項各自自動換行；允許自然分頁。
buildQuestionSummaryWorksheet = function(workbook, rows) {
  const ws = workbook.addWorksheet('測驗題目統計', {
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
    { width: 7 },   // 題號
    { width: 10 },  // 正確答案
    { width: 48 },  // 題目
    { width: 56 }   // 選項
  ];

  ws.mergeCells('A1:D1');
  ws.getCell('A1').value = '教育訓練測驗－題目作答統計';
  styleTitle(ws.getCell('A1'), 15);
  ws.getRow(1).height = 30;

  ws.mergeCells('A2:D2');
  ws.getCell('A2').value = `課程代碼：${cleanText(rows[0]?.['課程代碼'] || '').replace(/^'/, '')}`;
  ws.getCell('A2').alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  ws.getRow(2).height = 22;

  const header = ws.addRow(['題號', '正確答案', '題目', '選項']);
  styleHeaderRow(header);
  header.height = 27;

  const correctAnswers = inferCorrectAnswers(rows);

  state.quizColumns.forEach((column, index) => {
    const parsed = state.parsedQuiz[index];
    const questionText = parsed?.question || column;
    const correct = correctAnswers[index] || '';

    const answered = rows.map(row => cleanText(row[column])).filter(Boolean);
    let options = parsed?.options?.length
      ? parsed.options.map(option => ({ code: cleanText(option.code), text: cleanText(option.text) }))
      : [];

    if (!options.length) {
      options = [...new Set(answered)]
        .sort(naturalSort)
        .map(value => ({ code: value, text: '' }));
    }

    // 題庫與原始作答若有未對應值，仍保留。
    const known = new Set(options.map(option => normalizeCode(option.code)));
    [...new Set(answered)].forEach(value => {
      if (!known.has(normalizeCode(value)) && !options.some(option => cleanText(option.text).toUpperCase() === value.toUpperCase())) {
        options.push({ code: value, text: '' });
      }
    });

    const optionText = options.length
      ? options.map(option => option.text ? `(${option.code}) ${option.text}` : `(${option.code})`).join('\n')
      : '';

    const row = ws.addRow([
      `Q${index + 1}`,
      correct,
      questionText,
      optionText
    ]);

    styleDataRow(row);
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(3).alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
    row.getCell(4).alignment = { horizontal: 'left', vertical: 'top', wrapText: true };

    if (correct) {
      row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.green } };
      row.getCell(2).font = { name: 'Times New Roman', size: 10, bold: true };
    }

    // 依題目與選項字數估算列高，避免文字被切掉。
    const qLines = estimateWrappedLines(questionText, 27);
    const oLines = optionText
      ? optionText.split('\n').reduce((sum, line) => sum + estimateWrappedLines(line, 33), 0)
      : 1;
    row.height = Math.max(32, Math.min(140, Math.max(qLines, oLines) * 16 + 8));
  });

  ws.pageSetup.printArea = `A1:D${ws.rowCount}`;
  ws.pageSetup.printTitlesRow = '1:3';
  ws.headerFooter = {
    oddFooter: '&C第 &P 頁 / 共 &N 頁',
    evenFooter: '&C第 &P 頁 / 共 &N 頁',
    firstFooter: '&C第 &P 頁 / 共 &N 頁'
  };

  applyBilingualFontsToWorksheet(ws);
};

function inferCorrectAnswers(rows) {
  const perfectRows = rows.filter(row => {
    const score = toNumber(row['得分']);
    return score != null && Math.abs(score - 100) < 0.0001;
  });

  return state.quizColumns.map(column => {
    if (!perfectRows.length) return '';
    const answers = perfectRows.map(row => cleanText(row[column])).filter(Boolean);
    if (!answers.length) return '';
    const normalized = [...new Set(answers.map(normalizeCode))];
    return normalized.length === 1 ? answers[0] : '';
  });
}

function formatUnitForDetail(value) {
  const unit = cleanText(value).replace(/\s+/g, '');
  if (!unit) return '';
  if (unit.startsWith('護理部') && unit.length > 3) {
    return `護理部\n${unit.slice(3)}`;
  }
  return unit;
}

function estimateWrappedLines(text, charsPerLine) {
  const value = cleanText(text);
  if (!value) return 1;
  return value.split('\n').reduce((sum, line) => {
    return sum + Math.max(1, Math.ceil(Array.from(line).length / charsPerLine));
  }, 0);
}

function columnLetter(number) {
  let n = number;
  let out = '';
  while (n > 0) {
    n -= 1;
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26);
  }
  return out;
}

function applyBilingualFontsToWorksheet(ws) {
  ws.eachRow({ includeEmpty: false }, row => {
    row.eachCell({ includeEmpty: false }, cell => {
      const base = cell.font || {};

      if (typeof cell.value === 'number') {
        cell.font = {
          ...base,
          name: 'Times New Roman',
          size: base.size || 10
        };
        return;
      }

      if (typeof cell.value !== 'string' || !cell.value) return;

      const runs = splitFontRuns(cell.value).map(run => ({
        text: run.text,
        font: {
          name: run.cjk ? 'DFKai-SB' : 'Times New Roman',
          size: base.size || 10,
          bold: !!base.bold,
          italic: !!base.italic,
          underline: base.underline,
          color: base.color
        }
      }));

      cell.value = { richText: runs };
    });
  });
}

function splitFontRuns(text) {
  const chars = Array.from(String(text));
  if (!chars.length) return [];

  const result = [];
  let current = { cjk: isCjk(chars[0]), text: chars[0] };

  for (let i = 1; i < chars.length; i += 1) {
    const cjk = isCjk(chars[i]);
    if (cjk === current.cjk) {
      current.text += chars[i];
    } else {
      result.push(current);
      current = { cjk, text: chars[i] };
    }
  }
  result.push(current);
  return result;
}

function isCjk(char) {
  return /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u3040-\u30FF\u3100-\u312F\u31A0-\u31BF]/.test(char);
}
