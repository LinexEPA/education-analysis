// Excel 輸出版面修正：三個主要頁籤朝「可直接列印、少手動調整」處理。
// 中文使用標楷體，英文／數字使用 Times New Roman。

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

  // 兩行標題置中並增加高度。
  ['A1', 'A2'].forEach(addr => {
    ws.getCell(addr).alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true
    };
  });
  ws.getRow(1).height = 34;
  ws.getRow(2).height = 32;
  ws.getRow(3).height = 26;
  ws.getRow(4).height = 26;
  ws.getRow(5).height = 30;

  // 上方總滿意度直接顯示百分比，不再出現 0.98 這種小數。
  ws.getCell('H4').value = `總滿意度：${sat.overall == null ? '' : `${sat.overall.toFixed(1)}%`}`;
  ws.getCell('H4').alignment = { horizontal: 'left', vertical: 'middle' };

  // 表格首行（欄名）全部置中。
  ws.getRow(5).eachCell({ includeEmpty: true }, cell => {
    cell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true
    };
  });

  let signRowNumber = null;
  ws.eachRow((row, rowNumber) => {
    const first = cleanText(row.getCell(1).value);
    if (first.startsWith('製表人')) signRowNumber = rowNumber;
  });

  const lastTableRow = signRowNumber ? signRowNumber - 2 : ws.rowCount;
  for (let r = 6; r <= lastTableRow; r += 1) {
    const row = ws.getRow(r);
    row.height = 32;
    row.alignment = { vertical: 'middle', wrapText: true };

    // 滿意度百分比只留一位小數。
    if (row.getCell(10).value !== '' && row.getCell(10).value != null) {
      row.getCell(10).numFmt = '0.0%';
    }
  }

  // 最下方簽核列直接合併。
  if (signRowNumber) {
    ws.mergeCells(signRowNumber, 1, signRowNumber, 3);   // A:C 製表人
    ws.mergeCells(signRowNumber, 4, signRowNumber, 6);   // D:F 單位護理長
    ws.mergeCells(signRowNumber, 7, signRowNumber, 10);  // G:J 單位督導

    const signCells = [
      { col: 1, text: '製表人：' },
      { col: 4, text: '單位護理長：' },
      { col: 7, text: '單位督導：' }
    ];

    signCells.forEach(item => {
      const cell = ws.getCell(signRowNumber, item.col);
      cell.value = item.text;
      cell.font = { name: 'DFKai-SB', size: 11 };
      cell.alignment = { horizontal: 'left', vertical: 'middle' };
    });

    for (let c = 1; c <= 10; c += 1) {
      setThinBorder(ws.getCell(signRowNumber, c));
    }
    ws.getRow(signRowNumber).height = 34;
  }

  ws.pageSetup.printArea = `A1:J${ws.rowCount}`;
  applyBilingualFontsToWorksheet(ws);
};

// 第二頁籤：保留個人作答，也補回每人的 10 題滿意度。
buildAnswerDetailWorksheet = function(workbook, rows) {
  const quizColumns = state.quizColumns;
  const satColumns = state.satisfactionColumns;
  const satHeaders = satColumns.map((_, index) => `滿${index + 1}`);
  const headers = [
    '序', '姓名', '單位', '完測', '及格', '得分',
    ...quizColumns.map((_, index) => `Q${index + 1}`),
    ...satHeaders,
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
    fitToHeight: 1,
    horizontalCentered: true,
    margins: {
      left: 0.2, right: 0.2, top: 0.25, bottom: 0.25,
      header: 0.1, footer: 0.1
    }
  };

  ws.mergeCells(1, 1, 1, headers.length);
  ws.getCell(1, 1).value = '教育訓練測驗－個人作答明細';
  styleTitle(ws.getCell(1, 1), 14);

  ws.mergeCells(2, 1, 2, headers.length);
  ws.getCell(2, 1).value = `課程代碼：${cleanText(rows[0]?.['課程代碼'] || '').replace(/^'/, '')}　｜　Q＝測驗作答；滿1～滿${satColumns.length || 10}＝滿意度題目`;
  ws.getCell(2, 1).alignment = { horizontal: 'left', vertical: 'middle' };

  const headerRow = ws.addRow(headers);
  styleHeaderRow(headerRow);
  headerRow.height = 25;

  rows.forEach((row, index) => {
    const answers = quizColumns.map((column, qIndex) => formatAnswer(state.parsedQuiz[qIndex], row[column]));
    const satValues = satColumns.map(column => {
      const value = toNumber(row[column]);
      return value == null ? cleanText(row[column]) : value;
    });

    const dataRow = ws.addRow([
      index + 1,
      cleanPersonName(row['姓名']),
      cleanText(row['單位名稱']),
      cleanText(row['是否完測']),
      cleanText(row['是否及格']),
      toNumber(row['得分']) ?? cleanText(row['得分']),
      ...answers,
      ...satValues,
      cleanText(row['感想與建議'])
    ]);

    styleDataRow(dataRow);
    dataRow.height = 22;
    dataRow.alignment = { vertical: 'middle', wrapText: true };
  });

  // 基本欄位壓縮。
  ws.getColumn(1).width = 4.5;
  ws.getColumn(2).width = 10;
  ws.getColumn(3).width = 11;
  ws.getColumn(4).width = 6;
  ws.getColumn(5).width = 6;
  ws.getColumn(6).width = 6.5;

  let colIndex = 7;
  quizColumns.forEach(() => {
    ws.getColumn(colIndex).width = 4.2;
    ws.getColumn(colIndex).alignment = { horizontal: 'center', vertical: 'middle' };
    colIndex += 1;
  });
  satColumns.forEach(() => {
    ws.getColumn(colIndex).width = 4.2;
    ws.getColumn(colIndex).alignment = { horizontal: 'center', vertical: 'middle' };
    colIndex += 1;
  });
  ws.getColumn(colIndex).width = 14;

  for (let r = 4; r <= ws.rowCount; r += 1) {
    for (let c = 7; c < colIndex; c += 1) {
      ws.getCell(r, c).alignment = { horizontal: 'center', vertical: 'middle' };
    }
  }

  ws.autoFilter = {
    from: { row: 3, column: 1 },
    to: { row: 3, column: headers.length }
  };
  ws.pageSetup.printArea = `A1:${columnLetter(headers.length)}${ws.rowCount}`;
  applyBilingualFontsToWorksheet(ws);
};

// 第三頁籤：每題的題號、正確答案、題目改成跨選項列合併，避免畫面碎裂；
// 選項欄加寬並依文字自動增加列高。
buildQuestionSummaryWorksheet = function(workbook, rows) {
  const ws = workbook.addWorksheet('測驗題目統計', {
    views: [{ state: 'frozen', ySplit: 3, showGridLines: false }]
  });

  ws.pageSetup = {
    orientation: 'landscape',
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 1,
    horizontalCentered: true,
    margins: {
      left: 0.22, right: 0.22, top: 0.25, bottom: 0.25,
      header: 0.1, footer: 0.1
    }
  };

  ws.columns = [
    { width: 6.5 },  // 題號
    { width: 8 },    // 正確答案
    { width: 40 },   // 題目
    { width: 46 },   // 選項
    { width: 7 },    // 人數
    { width: 8.5 }   // 比例
  ];

  ws.mergeCells('A1:F1');
  ws.getCell('A1').value = '教育訓練測驗－題目作答統計';
  styleTitle(ws.getCell('A1'), 15);
  ws.getRow(1).height = 30;

  ws.mergeCells('A2:F2');
  ws.getCell('A2').value = `課程代碼：${cleanText(rows[0]?.['課程代碼'] || '').replace(/^'/, '')}`;
  ws.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 22;

  const header = ws.addRow(['題號', '正確答案', '題目', '選項', '人數', '比例']);
  styleHeaderRow(header);
  header.height = 26;

  const correctAnswers = inferCorrectAnswers(rows);

  state.quizColumns.forEach((column, index) => {
    const parsed = state.parsedQuiz[index];
    const questionText = parsed?.question || column;
    const correct = correctAnswers[index] || '';

    const answered = rows.map(row => cleanText(row[column])).filter(Boolean);
    const total = answered.length;

    let options = parsed?.options?.length
      ? parsed.options.map(option => ({ code: cleanText(option.code), text: cleanText(option.text) }))
      : [];

    if (!options.length) {
      options = [...new Set(answered)].sort(naturalSort).map(value => ({ code: value, text: '' }));
    }

    const known = new Set(options.map(option => normalizeCode(option.code)));
    [...new Set(answered)].forEach(value => {
      if (!known.has(normalizeCode(value)) && !options.some(option => cleanText(option.text).toUpperCase() === value.toUpperCase())) {
        options.push({ code: value, text: '' });
      }
    });
    if (!options.length) options = [{ code: '', text: '' }];

    const startRow = ws.rowCount + 1;

    options.forEach(option => {
      const count = answered.filter(raw => answerMatchesOption(raw, option)).length;
      const displayOption = option.text ? `(${option.code}) ${option.text}` : option.code;
      const row = ws.addRow(['', '', '', displayOption, count, total ? count / total : 0]);
      styleDataRow(row);
      row.getCell(6).numFmt = '0.0%';
      row.getCell(4).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      row.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' };

      // 依選項長度設定高度，避免像畫面中長文字互相壓到。
      row.height = estimateRowHeight(displayOption, 46, 20, 11);
    });

    const endRow = ws.rowCount;

    ws.mergeCells(startRow, 1, endRow, 1);
    ws.mergeCells(startRow, 2, endRow, 2);
    ws.mergeCells(startRow, 3, endRow, 3);

    ws.getCell(startRow, 1).value = `Q${index + 1}`;
    ws.getCell(startRow, 2).value = correct;
    ws.getCell(startRow, 3).value = questionText;

    ws.getCell(startRow, 1).alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getCell(startRow, 2).alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getCell(startRow, 3).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

    // 若題目文字較長，確保整個題目區塊的總高度足夠。
    const requiredQuestionHeight = estimateRowHeight(questionText, 40, 42, 14);
    const currentHeight = options.reduce((sum, _, i) => sum + (ws.getRow(startRow + i).height || 20), 0);
    if (requiredQuestionHeight > currentHeight) {
      const extra = (requiredQuestionHeight - currentHeight) / options.length;
      options.forEach((_, i) => {
        const row = ws.getRow(startRow + i);
        row.height = (row.height || 20) + extra;
      });
    }

    if (correct) {
      const cell = ws.getCell(startRow, 2);
      cell.font = { name: 'Times New Roman', size: 10, bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.green } };
    }

    // 合併後重新補外框，讓每一題成為完整區塊。
    for (let r = startRow; r <= endRow; r += 1) {
      for (let c = 1; c <= 6; c += 1) {
        setThinBorder(ws.getCell(r, c));
      }
    }
  });

  ws.pageSetup.printArea = `A1:F${ws.rowCount}`;
  applyBilingualFontsToWorksheet(ws);
};

// 只有在原始檔中存在 100 分學員，而且所有 100 分學員該題答案一致時，才自動判定為正確答案。
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

function answerMatchesOption(rawValue, option) {
  const raw = cleanText(rawValue);
  if (!raw) return false;
  if (normalizeCode(raw) === normalizeCode(option.code)) return true;
  return cleanText(option.text) && raw.toUpperCase() === cleanText(option.text).toUpperCase();
}

function estimateRowHeight(text, width, baseHeight = 20, perLine = 11) {
  const value = cleanText(text);
  if (!value) return baseHeight;
  const chinese = (value.match(/[\u3400-\u9FFF]/g) || []).length;
  const nonChinese = value.length - chinese;
  const weightedLength = chinese * 2 + nonChinese;
  const charsPerLine = Math.max(10, Math.floor(width * 1.7));
  const lines = Math.max(1, Math.ceil(weightedLength / charsPerLine));
  return Math.min(56, baseHeight + (lines - 1) * perLine);
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
      if (typeof cell.value !== 'string' || !cell.value) return;

      const text = cell.value;
      const base = cell.font || {};
      const runs = splitFontRuns(text).map(run => ({
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
