// 最終匯出樣式與工作表結構（2026-10-20）
// 1. 所有大標黑字。
// 2. 表格首列淺灰底、黑字，適合黑白列印。
// 3. 測驗題目頁加大字級。
// 4. 個人作答明細拆成「測驗」與「滿意度」兩頁。
// 5. 工作表順序由 export.js 控制：滿意度 → 作答分布 → 測驗題目 → 明細(測驗) → 明細(滿意度)。

(function finalExportPrintPatch() {
  const BLACK = '111111';
  const LIGHT_GRAY = 'E7E7E7';
  const LIGHTER_GRAY = 'F3F3F3';
  const BORDER = '808080';

  // ---------- 共用列印樣式 ----------
  styleTitle = function(cell, size) {
    cell.font = {
      name: 'DFKai-SB',
      size,
      bold: true,
      color: { argb: BLACK }
    };
    cell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true
    };
  };

  styleHeaderRow = function(row) {
    row.eachCell({ includeEmpty: true }, cell => {
      cell.font = {
        name: 'DFKai-SB',
        size: 13,
        bold: true,
        color: { argb: BLACK }
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: LIGHT_GRAY }
      };
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true
      };
      setPrintBorder(cell);
    });
    row.height = Math.max(Number(row.height) || 0, 30);
  };

  function setPrintBorder(cell) {
    const side = { style: 'thin', color: { argb: BORDER } };
    cell.border = { top: side, left: side, bottom: side, right: side };
  }

  function activeSatColumns() {
    return typeof window.getActiveSatisfactionColumns === 'function'
      ? window.getActiveSatisfactionColumns()
      : state.satisfactionColumns;
  }

  function applyPrintFonts(ws, bodySize = 12) {
    if (!ws) return;
    ws.eachRow({ includeEmpty: false }, row => {
      row.eachCell({ includeEmpty: false }, cell => {
        const current = cell.font || {};
        const size = Math.max(Number(current.size) || 0, bodySize);

        if (cell.value && typeof cell.value === 'object' && Array.isArray(cell.value.richText)) {
          cell.value = {
            richText: cell.value.richText.map(run => ({
              ...run,
              font: {
                ...(run.font || {}),
                size: Math.max(Number(run.font?.size) || 0, size),
                color: run.font?.color || current.color || { argb: BLACK }
              }
            }))
          };
        }

        cell.font = {
          ...current,
          size,
          color: current.color || { argb: BLACK }
        };
      });
    });
  }

  function courseCode(rows) {
    return cleanText(rows[0]?.['課程代碼'] || '').replace(/^'/, '');
  }

  // ---------- 2. 測驗作答分布 ----------
  buildQuizDistributionWorksheet = function(workbook, rows) {
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
      margins: { left: 0.28, right: 0.28, top: 0.3, bottom: 0.45, header: 0.12, footer: 0.22 }
    };

    // 移除「分布判讀」欄，把空間留給題目與選項內容。
    ws.columns = [
      { width: 8 },
      { width: 51 },
      { width: 11 },
      { width: 49 },
      { width: 10 },
      { width: 11 }
    ];

    ws.mergeCells('A1:F1');
    ws.getCell('A1').value = '教育訓練測驗作答分布';
    styleTitle(ws.getCell('A1'), 19);
    ws.getRow(1).height = 36;

    const examSummary = typeof calculateExamSummary === 'function' ? calculateExamSummary() : {};
    const averageScoreText = examSummary.averageScore == null ? '—' : examSummary.averageScore;
    const passRateText = examSummary.passRate == null ? '—' : `${examSummary.passRate}%`;

    ws.mergeCells('A2:F2');
    ws.getCell('A2').value = `課程代碼：${courseCode(rows)}　｜　平均分數：${averageScoreText}　｜　及格率：${passRateText}`;
    ws.getCell('A2').font = { name: 'DFKai-SB', size: 13, color: { argb: BLACK } };
    ws.getCell('A2').alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    ws.getRow(2).height = 28;

    const header = ws.addRow(['題號', '題目', '作答選項', '選項內容', '人數', '比例']);
    styleHeaderRow(header);

    state.quizColumns.forEach((column, index) => {
      const parsed = state.parsedQuiz[index];
      const questionText = parsed?.question || column;
      const distribution = {};

      rows.forEach(row => {
        const raw = cleanText(row[column]);
        if (!raw) return;
        const option = typeof findOptionForResponse === 'function' ? findOptionForResponse(parsed, raw) : (typeof findOption === 'function' ? findOption(parsed, raw) : null);
        const code = cleanText(option?.code || raw);
        const key = normalizeCode(code) || code;
        if (!distribution[key]) {
          distribution[key] = {
            code,
            text: cleanText(option?.text || ''),
            count: 0
          };
        }
        distribution[key].count += 1;
      });

      const entries = Object.values(distribution).sort((a, b) => naturalSort(a.code, b.code));
      const total = entries.reduce((sum, item) => sum + item.count, 0);

      if (!entries.length) entries.push({ code: '', text: '', count: 0 });

      const counts = entries.map(item => item.count);
      const maxCount = Math.max(...counts);
      const minCount = Math.min(...counts);
      const startRow = ws.rowCount + 1;

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
        row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(4).alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
        row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(6).numFmt = '0.0%';

        // 不反灰、不增加文字判讀；只用字型區分最高與最低，保留黑白列印清楚度。
        if (entries.length > 1 && item.count === maxCount) {
          [5, 6].forEach(col => {
            row.getCell(col).font = {
              ...(row.getCell(col).font || {}),
              bold: true,
              color: { argb: BLACK }
            };
          });
        }
        if (entries.length > 1 && item.count === minCount && minCount !== maxCount) {
          [5, 6].forEach(col => {
            row.getCell(col).font = {
              ...(row.getCell(col).font || {}),
              underline: true,
              color: { argb: BLACK }
            };
          });
        }

        const oLines = estimateLinesFinal(item.text, 37);
        row.height = Math.max(34, Math.min(120, oLines * 20 + 12));
      });

      const endRow = ws.rowCount;

      // 每一題的題號、題目跨所有作答選項合併，讓題目結構一眼看懂。
      if (endRow > startRow) {
        ws.mergeCells(startRow, 1, endRow, 1);
        ws.mergeCells(startRow, 2, endRow, 2);
      }

      ws.getCell(startRow, 1).alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getCell(startRow, 2).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

      // 題與題之間用較粗的底線區隔。
      for (let col = 1; col <= 6; col += 1) {
        const cell = ws.getCell(endRow, col);
        cell.border = {
          ...(cell.border || {}),
          bottom: { style: 'medium', color: { argb: BORDER } }
        };
      }
    });

    ws.pageSetup.printArea = `A1:F${ws.rowCount}`;
    ws.pageSetup.printTitlesRow = '1:3';
    ws.headerFooter = {
      oddFooter: '&C第 &P 頁 / 共 &N 頁',
      evenFooter: '&C第 &P 頁 / 共 &N 頁',
      firstFooter: '&C第 &P 頁 / 共 &N 頁'
    };

    applyPrintFonts(ws, 12);
    if (typeof applyBilingualFontsToWorksheet === 'function') applyBilingualFontsToWorksheet(ws);
  };

  // ---------- 3. 教育訓練測驗題目 ----------
  buildQuestionSummaryWorksheet = function(workbook, rows) {
    if (!state.quizColumns.length) return;

    const ws = workbook.addWorksheet('教育訓練測驗題目', {
      views: [{ state: 'frozen', ySplit: 3, showGridLines: false }]
    });

    ws.pageSetup = {
      orientation: 'landscape',
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
      margins: { left: 0.26, right: 0.26, top: 0.28, bottom: 0.45, header: 0.12, footer: 0.22 }
    };

    ws.columns = [
      { width: 7 },
      { width: 10 },
      { width: 47 },
      { width: 56 }
    ];

    ws.mergeCells('A1:D1');
    ws.getCell('A1').value = '教育訓練測驗題目';
    styleTitle(ws.getCell('A1'), 18);
    ws.getRow(1).height = 40;

    ws.mergeCells('A2:D2');
    ws.getCell('A2').value = `課程代碼：${courseCode(rows)}　｜　題目統計 ${state.quizColumns.length}/${state.quizColumns.length}`;
    ws.getCell('A2').font = { name: 'DFKai-SB', size: 12, color: { argb: BLACK } };
    ws.getCell('A2').alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    ws.getRow(2).height = 30;

    const header = ws.addRow(['題號', '正確答案', '題目', '選項']);
    styleHeaderRow(header);
    header.eachCell(cell => {
      cell.font = { ...(cell.font || {}), size: 12, color: { argb: BLACK } };
    });
    header.height = 36;

    const correctAnswers = typeof inferCorrectAnswers === 'function'
      ? inferCorrectAnswers(rows)
      : state.quizColumns.map((_, index) => state.parsedQuiz?.[index]?.correctAnswer || '');

    state.quizColumns.forEach((column, index) => {
      const parsed = state.parsedQuiz[index];
      const questionText = parsed?.question || column;
      const correct = correctAnswers[index] || '';

      const answered = rows.map(row => cleanText(row[column])).filter(Boolean);
      let options = parsed?.options?.length
        ? parsed.options.map(option => ({ code: cleanText(option.code), text: cleanText(option.text) }))
        : [...new Set(answered)].sort(naturalSort).map(value => ({ code: value, text: '' }));

      if (!options.length) options = [{ code: '', text: '' }];

      const optionText = options.map(option =>
        option.text ? `(${option.code}) ${option.text}` : `(${option.code})`
      ).join('\n');

      const row = ws.addRow([
        `Q${index + 1}`,
        correct,
        questionText,
        optionText
      ]);

      styleDataRow(row);
      row.eachCell({ includeEmpty: true }, cell => {
        cell.font = {
          ...(cell.font || {}),
          size: 12,
          color: { argb: BLACK }
        };
        setPrintBorder(cell);
      });

      row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(3).alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
      row.getCell(4).alignment = { horizontal: 'left', vertical: 'top', wrapText: true };

      if (correct) {
        row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHTER_GRAY } };
        row.getCell(2).font = { name: 'Times New Roman', size: 12, bold: true, color: { argb: BLACK } };
      }

      const qLines = estimateLinesFinal(questionText, 31);
      const oLines = optionText
        ? optionText.split('\n').reduce((sum, line) => sum + estimateLinesFinal(line, 36), 0)
        : 1;
      const lines = Math.max(qLines, oLines, 2);
      row.height = Math.max(46, Math.min(300, lines * 20 + 14));
    });

    ws.pageSetup.printArea = `A1:D${ws.rowCount}`;
    ws.pageSetup.printTitlesRow = '1:3';
    ws.headerFooter = {
      oddFooter: '&C第 &P 頁 / 共 &N 頁',
      evenFooter: '&C第 &P 頁 / 共 &N 頁',
      firstFooter: '&C第 &P 頁 / 共 &N 頁'
    };

    if (typeof applyBilingualFontsToWorksheet === 'function') applyBilingualFontsToWorksheet(ws);
    applyPrintFonts(ws, 12);
  };

  // ---------- 4 / 5. 個人作答明細拆頁 ----------
  buildAnswerDetailWorksheet = function(workbook, rows) {
    const quizColumns = state.quizColumns;
    const satColumns = activeSatColumns();

    if (quizColumns.length) {
      buildPersonalQuizSheet(workbook, rows, quizColumns);
    }

    if (satColumns.length) {
      buildPersonalSatisfactionSheet(workbook, rows, satColumns);
    }
  };

  function buildPersonalQuizSheet(workbook, rows, quizColumns) {
    const headers = ['序', '姓名', '單位', '及格', '得分', ...quizColumns.map((_, i) => `Q${i + 1}`)];
    const ws = workbook.addWorksheet('個人作答明細(測驗)', {
      views: [{ state: 'frozen', ySplit: 3, xSplit: 2, showGridLines: false }]
    });

    configureDetailSheet(ws, headers.length);
    ws.mergeCells(1, 1, 1, headers.length);
    ws.getCell(1, 1).value = '教育訓練－個人作答明細（測驗）';
    styleTitle(ws.getCell(1, 1), 18);
    ws.getRow(1).height = 36;

    ws.mergeCells(2, 1, 2, headers.length);
    const examSummary = typeof calculateExamSummary === 'function' ? calculateExamSummary() : {};
    const averageScoreText = examSummary.averageScore == null ? '—' : examSummary.averageScore;
    ws.getCell(2, 1).value = `課程代碼：${courseCode(rows)}　｜　平均分數：${averageScoreText}　｜　Q＝測驗作答`;
    ws.getCell(2, 1).font = { name: 'DFKai-SB', size: 13, color: { argb: BLACK } };
    ws.getCell(2, 1).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    ws.getRow(2).height = 28;

    const header = ws.addRow(headers);
    styleHeaderRow(header);

    rows.forEach((row, index) => {
      const answers = quizColumns.map((column, qIndex) => formatAnswer(state.parsedQuiz[qIndex], row[column]));
      const dataRow = ws.addRow([
        index + 1,
        cleanPersonName(row['姓名']),
        typeof formatUnitForDetail === 'function' ? formatUnitForDetail(row['單位名稱']) : cleanText(row['單位名稱']),
        cleanText(row['是否及格']),
        toNumber(row['得分']) ?? cleanText(row['得分']),
        ...answers
      ]);
      styleDataRow(dataRow);
      dataRow.height = 32;
      dataRow.alignment = { vertical: 'middle', wrapText: true };
      [1,2,3,4,5].forEach(col => {
        dataRow.getCell(col).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      });
      for (let c = 6; c <= headers.length; c += 1) {
        dataRow.getCell(c).alignment = { horizontal: 'center', vertical: 'middle' };
      }
    });

    ws.getColumn(1).width = 5.5;
    ws.getColumn(2).width = 12;
    ws.getColumn(3).width = 14;
    ws.getColumn(4).width = 7;
    ws.getColumn(5).width = 8;
    for (let c = 6; c <= headers.length; c += 1) ws.getColumn(c).width = 6;

    finishDetailSheet(ws, headers.length);
  }

  function buildPersonalSatisfactionSheet(workbook, rows, satColumns) {
    const includeGain = !!window.__formResponseMode;
    const headers = [
      '序', '姓名', '單位',
      ...satColumns.map((_, i) => `滿${i + 1}`),
      ...(includeGain ? ['具體收穫'] : []),
      '感想與建議'
    ];
    const ws = workbook.addWorksheet('個人作答明細(滿意度)', {
      views: [{ state: 'frozen', ySplit: 3, xSplit: 2, showGridLines: false }]
    });

    configureDetailSheet(ws, headers.length);
    ws.mergeCells(1, 1, 1, headers.length);
    ws.getCell(1, 1).value = '教育訓練－個人作答明細（滿意度）';
    styleTitle(ws.getCell(1, 1), 18);
    ws.getRow(1).height = 36;

    ws.mergeCells(2, 1, 2, headers.length);
    ws.getCell(2, 1).value = `課程代碼：${courseCode(rows)}　｜　滿1～滿${satColumns.length}＝滿意度題目`;
    ws.getCell(2, 1).font = { name: 'DFKai-SB', size: 13, color: { argb: BLACK } };
    ws.getCell(2, 1).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    ws.getRow(2).height = 28;

    const header = ws.addRow(headers);
    styleHeaderRow(header);

    rows.forEach((row, index) => {
      const sats = satColumns.map(column => toNumber(row[column]) ?? cleanText(row[column]));
      const dataRow = ws.addRow([
        index + 1,
        cleanPersonName(row['姓名']),
        typeof formatUnitForDetail === 'function' ? formatUnitForDetail(row['單位名稱']) : cleanText(row['單位名稱']),
        ...sats,
        ...(includeGain ? [cleanText(row['具體收穫'])] : []),
        cleanText(row['感想與建議'])
      ]);
      styleDataRow(dataRow);
      dataRow.height = 34;
      dataRow.alignment = { vertical: 'middle', wrapText: true };
      for (let c = 1; c <= 3 + satColumns.length; c += 1) {
        dataRow.getCell(c).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      }
      dataRow.getCell(headers.length).alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
    });

    ws.getColumn(1).width = 5.5;
    ws.getColumn(2).width = 12;
    ws.getColumn(3).width = 14;
    let col = 4;
    satColumns.forEach(() => {
      ws.getColumn(col).width = 6;
      col += 1;
    });
    if (includeGain) {
      ws.getColumn(col).width = 28;
      col += 1;
    }
    ws.getColumn(col).width = 26;

    finishDetailSheet(ws, headers.length);
  }

  function configureDetailSheet(ws, columnCount) {
    ws.pageSetup = {
      orientation: 'landscape',
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
      margins: { left: 0.2, right: 0.2, top: 0.28, bottom: 0.35, header: 0.12, footer: 0.18 }
    };
    ws.autoFilter = null;
  }

  function finishDetailSheet(ws, columnCount) {
    ws.pageSetup.printArea = `A1:${columnLetterFinal(columnCount)}${ws.rowCount}`;
    ws.pageSetup.printTitlesRow = '1:3';
    ws.headerFooter = {
      oddFooter: '&C第 &P 頁 / 共 &N 頁',
      evenFooter: '&C第 &P 頁 / 共 &N 頁',
      firstFooter: '&C第 &P 頁 / 共 &N 頁'
    };
    applyPrintFonts(ws, 12);
    if (typeof applyBilingualFontsToWorksheet === 'function') applyBilingualFontsToWorksheet(ws);
  }

  function estimateLinesFinal(text, charsPerLine) {
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

  function columnLetterFinal(number) {
    let n = number;
    let out = '';
    while (n > 0) {
      n -= 1;
      out = String.fromCharCode(65 + (n % 26)) + out;
      n = Math.floor(n / 26);
    }
    return out;
  }
})();
