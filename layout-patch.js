// Excel 輸出版面修正：三個主要頁籤直接朝「可列印、少手動調整」處理。
// 中文使用標楷體，英文／數字使用 Times New Roman。

const _baseBuildSatisfactionWorksheet = buildSatisfactionWorksheet;
const _baseBuildAnswerDetailWorksheet = buildAnswerDetailWorksheet;

buildSatisfactionWorksheet = function(workbook, rows) {
  _baseBuildSatisfactionWorksheet(workbook, rows);
  const ws = workbook.getWorksheet('滿意度統計表');
  if (!ws) return;

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

  // 兩行表頭置中並增加高度。
  ['A1', 'A2'].forEach(addr => {
    ws.getCell(addr).alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true
    };
  });
  ws.getRow(1).height = 34;
  ws.getRow(2).height = 32;
  ws.getRow(3).height = 25;
  ws.getRow(4).height = 25;
  ws.getRow(5).height = 30;

  // 滿意度項目列增加行高，讓版面不要擠在一起。
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
  }

  // 最下方簽核列直接合併，下載後不需要再手動調整。
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

buildAnswerDetailWorksheet = function(workbook, rows) {
  _baseBuildAnswerDetailWorksheet(workbook, rows);
  const ws = workbook.getWorksheet('個人作答明細');
  if (!ws) return;

  ws.pageSetup = {
    orientation: 'landscape',
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 1,
    horizontalCentered: true,
    margins: {
      left: 0.25, right: 0.25, top: 0.3, bottom: 0.3,
      header: 0.12, footer: 0.12
    }
  };

  const quizColumns = state.quizColumns;
  const totalCols = 7 + quizColumns.length;

  // 壓縮作答欄，Q1～Q5只放選項代碼，不需要寬格。
  ws.getColumn(1).width = 5.5;
  ws.getColumn(2).width = 12;
  ws.getColumn(3).width = 14;
  ws.getColumn(4).width = 10;
  ws.getColumn(5).width = 10;
  ws.getColumn(6).width = 8;
  quizColumns.forEach((_, index) => {
    const col = ws.getColumn(7 + index);
    col.width = 6.5;
    col.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  ws.getColumn(totalCols).width = 17;

  ws.getRow(1).height = 28;
  ws.getRow(2).height = 22;
  ws.getRow(3).height = 27;
  for (let r = 4; r <= ws.rowCount; r += 1) {
    ws.getRow(r).height = 23;
    ws.getRow(r).alignment = { vertical: 'middle', wrapText: true };
    quizColumns.forEach((_, index) => {
      ws.getCell(r, 7 + index).alignment = {
        horizontal: 'center',
        vertical: 'middle'
      };
    });
  }

  ws.pageSetup.printArea = `A1:${columnLetter(totalCols)}${ws.rowCount}`;
  applyBilingualFontsToWorksheet(ws);
};

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
      left: 0.25, right: 0.25, top: 0.3, bottom: 0.3,
      header: 0.12, footer: 0.12
    }
  };

  // 題目欄縮窄並自動換行，選項欄也收斂，確保整張可壓進 A4 橫式一頁。
  ws.columns = [
    { width: 7 },   // 題號
    { width: 9 },   // 正確答案
    { width: 34 },  // 題目
    { width: 27 },  // 選項
    { width: 8 },   // 人數
    { width: 9 }    // 比例
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
  header.height = 27;

  const correctAnswers = inferCorrectAnswers(rows);

  state.quizColumns.forEach((column, index) => {
    const parsed = state.parsedQuiz[index];
    const questionText = parsed?.question || column;
    const correct = correctAnswers[index] || '';

    const answered = rows
      .map(row => cleanText(row[column]))
      .filter(Boolean);
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

    options.forEach((option, optionIndex) => {
      const count = answered.filter(raw => answerMatchesOption(raw, option)).length;
      const displayOption = option.text
        ? `(${option.code}) ${option.text}`
        : option.code;

      const row = ws.addRow([
        optionIndex === 0 ? `Q${index + 1}` : '',
        optionIndex === 0 ? correct : '',
        optionIndex === 0 ? questionText : '',
        displayOption,
        count,
        total ? count / total : 0
      ]);

      styleDataRow(row);
      row.getCell(6).numFmt = '0.0%';
      row.alignment = { vertical: 'middle', wrapText: true };

      // 題目只出現在每題第一列，依字數略增行高，其他選項列保持緊湊。
      if (optionIndex === 0) {
        row.height = Math.min(48, 24 + Math.floor(questionText.length / 28) * 8);
      } else {
        row.height = 22;
      }

      if (optionIndex === 0 && correct) {
        row.getCell(2).font = { name: 'Times New Roman', size: 10, bold: true };
        row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.green } };
        row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
      }
    });
  });

  ws.pageSetup.printArea = `A1:F${ws.rowCount}`;
  applyBilingualFontsToWorksheet(ws);
};

// 只有在原始檔中存在 100 分學員，而且所有 100 分學員該題答案一致時，才自動判定為正確答案。
// 若無法確定就留白，不猜答案。
function inferCorrectAnswers(rows) {
  const perfectRows = rows.filter(row => {
    const score = toNumber(row['得分']);
    return score != null && Math.abs(score - 100) < 0.0001;
  });

  return state.quizColumns.map(column => {
    if (!perfectRows.length) return '';
    const answers = perfectRows
      .map(row => cleanText(row[column]))
      .filter(Boolean);
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
