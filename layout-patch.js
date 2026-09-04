// Excel 輸出版面修正：滿意度簽核欄合併、測驗頁籤列出完整選項與正確答案。

const _baseBuildSatisfactionWorksheet = buildSatisfactionWorksheet;
buildSatisfactionWorksheet = function(workbook, rows) {
  _baseBuildSatisfactionWorksheet(workbook, rows);
  const ws = workbook.getWorksheet('滿意度統計表');
  if (!ws) return;

  // 兩行表頭固定置中。
  ['A1', 'A2'].forEach(addr => {
    ws.getCell(addr).alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true
    };
  });

  // 找到最下方簽核列，直接將三個簽核區合併，避免再手動調欄位。
  let signRowNumber = null;
  ws.eachRow((row, rowNumber) => {
    const first = cleanText(row.getCell(1).value);
    if (first.startsWith('製表人')) signRowNumber = rowNumber;
  });

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
      cell.font = { name: 'Microsoft JhengHei', size: 11 };
      cell.alignment = { horizontal: 'left', vertical: 'middle' };
    });

    for (let c = 1; c <= 10; c += 1) {
      setThinBorder(ws.getCell(signRowNumber, c));
    }
    ws.getRow(signRowNumber).height = 30;
  }
};

buildQuestionSummaryWorksheet = function(workbook, rows) {
  const ws = workbook.addWorksheet('測驗題目統計', {
    views: [{ state: 'frozen', ySplit: 3, showGridLines: false }]
  });

  ws.columns = [
    { width: 8 },   // 題號
    { width: 12 },  // 正確答案
    { width: 58 },  // 題目
    { width: 38 },  // 選項
    { width: 10 },  // 人數
    { width: 11 }   // 比例
  ];

  ws.mergeCells('A1:F1');
  ws.getCell('A1').value = '教育訓練測驗－題目作答統計';
  styleTitle(ws.getCell('A1'), 15);
  ws.mergeCells('A2:F2');
  ws.getCell('A2').value = `課程代碼：${cleanText(rows[0]?.['課程代碼'] || '').replace(/^'/, '')}`;
  ws.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };

  const header = ws.addRow(['題號', '正確答案', '題目', '選項', '人數', '比例']);
  styleHeaderRow(header);

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

    // 若沒有貼題目選項，至少把原始檔實際出現的作答值列出來。
    if (!options.length) {
      options = [...new Set(answered)].sort(naturalSort).map(value => ({ code: value, text: '' }));
    }

    // 原始作答若出現無法對應到貼入選項的值，也保留，避免資料遺失。
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
      row.alignment = { vertical: 'top', wrapText: true };

      if (optionIndex === 0 && correct) {
        row.getCell(2).font = { name: 'Microsoft JhengHei', size: 10, bold: true };
        row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.green } };
        row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
      }
    });
  });
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
