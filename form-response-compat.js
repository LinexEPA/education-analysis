// 相容「Google 表單回覆」型 Excel：自動辨識滿意度文字題，不要求院內固定欄位。
(function formResponseCompat() {
  const RATING_MAP = new Map([
    ['非常滿意', 5], ['很滿意', 5], ['滿意', 4],
    ['普通', 3], ['尚可', 3], ['一般', 3],
    ['不滿意', 2], ['非常不滿意', 1], ['很不滿意', 1],
    ['非常同意', 5], ['同意', 4], ['不同意', 2], ['非常不同意', 1]
  ]);

  const baseDetectDataSheet = detectDataSheet;
  const baseCalculateSatisfaction = calculateSatisfaction;
  const baseToNumber = toNumber;
  const baseRenderFileSummary = renderFileSummary;
  const baseParseForExport = typeof parseForExport === 'function' ? parseForExport : null;
  const baseBuildAnswerDetailWorksheet = typeof buildAnswerDetailWorksheet === 'function' ? buildAnswerDetailWorksheet : null;
  const baseBuildQuestionSummaryWorksheet = typeof buildQuestionSummaryWorksheet === 'function' ? buildQuestionSummaryWorksheet : null;
  const baseBuildCommentsWorksheet = typeof buildCommentsWorksheet === 'function' ? buildCommentsWorksheet : null;

  window.__formResponseMode = false;
  window.__formResponseSatLabels = [];
  window.__formResponseTextColumns = {};

  function norm(value) {
    return String(value ?? '').replace(/\u3000/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function ratingValue(value) {
    const text = norm(value);
    return RATING_MAP.has(text) ? RATING_MAP.get(text) : null;
  }

  function cleanQuestionLabel(value) {
    return norm(value)
      .replace(/^\s*\d+\s*[.．、:：)）-]\s*/, '')
      .replace(/[？?]\s*$/, '');
  }

  function findHeaderIndex(headers, patterns) {
    return headers.findIndex(h => patterns.some(pattern => pattern.test(norm(h))));
  }

  function detectFormResponseWorkbook(workbook, keepName) {
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
      if (matrix.length < 2) continue;

      const maxScan = Math.min(matrix.length, 10);
      for (let headerIndex = 0; headerIndex < maxScan; headerIndex += 1) {
        const originalHeaders = (matrix[headerIndex] || []).map(norm);
        if (originalHeaders.filter(Boolean).length < 3) continue;

        const dataRows = matrix.slice(headerIndex + 1).filter(row =>
          (row || []).some(value => norm(value) !== '')
        );
        if (!dataRows.length) continue;

        const ratingIndexes = [];
        originalHeaders.forEach((header, colIndex) => {
          if (!header) return;
          const values = dataRows.map(row => norm(row?.[colIndex])).filter(Boolean);
          if (!values.length) return;
          const matched = values.filter(value => ratingValue(value) != null).length;
          const ratio = matched / values.length;
          if (matched >= Math.min(3, values.length) && ratio >= 0.8) ratingIndexes.push(colIndex);
        });

        // 至少兩題 Likert/滿意度題，才當作表單型滿意度資料。
        if (ratingIndexes.length < 2) continue;

        const unitIndex = findHeaderIndex(originalHeaders, [/^單位$/, /單位名稱/, /服務單位/]);
        const nameIndex = findHeaderIndex(originalHeaders, [/^姓名$/, /學員姓名/, /填答者姓名/]);
        const timeIndex = findHeaderIndex(originalHeaders, [/時間戳記/, /填答時間/, /提交時間/]);
        const gainIndex = findHeaderIndex(originalHeaders, [/具體收穫/, /課程收穫/, /學習收穫/, /今日課程帶給/]);
        const suggestionIndex = findHeaderIndex(originalHeaders, [/建議/, /意見/, /回饋/, /下次辦理/]);

        const satLabels = ratingIndexes.map(index => cleanQuestionLabel(originalHeaders[index]));
        const headers = [];
        if (timeIndex >= 0) headers.push('時間戳記');
        if (unitIndex >= 0) headers.push('單位名稱');
        if (keepName && nameIndex >= 0) headers.push('姓名');
        ratingIndexes.forEach((_, index) => headers.push(`滿意度${index + 1}`));
        if (gainIndex >= 0) headers.push('具體收穫');
        if (suggestionIndex >= 0) headers.push('感想與建議');

        const rows = dataRows.map(raw => {
          const row = {};
          if (timeIndex >= 0) row['時間戳記'] = raw?.[timeIndex] ?? '';
          if (unitIndex >= 0) row['單位名稱'] = raw?.[unitIndex] ?? '';
          if (keepName && nameIndex >= 0) row['姓名'] = raw?.[nameIndex] ?? '';
          ratingIndexes.forEach((colIndex, index) => {
            row[`滿意度${index + 1}`] = raw?.[colIndex] ?? '';
          });
          if (gainIndex >= 0) row['具體收穫'] = raw?.[gainIndex] ?? '';
          if (suggestionIndex >= 0) row['感想與建議'] = raw?.[suggestionIndex] ?? '';
          return row;
        }).filter(row => Object.values(row).some(value => norm(value) !== ''));

        if (!rows.length) continue;

        return {
          headers,
          rows,
          satLabels,
          textColumns: {
            gain: gainIndex >= 0 ? originalHeaders[gainIndex] : '',
            suggestion: suggestionIndex >= 0 ? originalHeaders[suggestionIndex] : ''
          }
        };
      }
    }
    return null;
  }

  detectDataSheet = function(workbook) {
    window.__formResponseMode = false;
    window.__formResponseSatLabels = [];
    window.__formResponseTextColumns = {};

    const standard = baseDetectDataSheet(workbook);
    if (standard) {
      document.querySelector('.satisfaction-settings-card')?.style.removeProperty('display');
      return standard;
    }

    const form = detectFormResponseWorkbook(workbook, false);
    if (!form) return null;

    window.__formResponseMode = true;
    window.__formResponseSatLabels = form.satLabels;
    window.__formResponseTextColumns = form.textColumns;
    return { headers: form.headers, rows: form.rows };
  };

  toNumber = function(value) {
    const mapped = ratingValue(value);
    if (mapped != null) return mapped;
    return baseToNumber(value);
  };

  calculateSatisfaction = function() {
    const result = baseCalculateSatisfaction();
    if (!window.__formResponseMode) return result;

    result.items.forEach((item, index) => {
      item.label = window.__formResponseSatLabels[index] || item.column;
    });
    const ordered = [...result.items].sort((a, b) => b.satisfaction - a.satisfaction);
    result.highest = ordered[0] || null;
    result.lowest = ordered.at(-1) || null;
    return result;
  };

  renderFileSummary = function() {
    baseRenderFileSummary();

    const settingsCard = document.querySelector('.satisfaction-settings-card');
    if (!window.__formResponseMode) {
      settingsCard?.style.removeProperty('display');
      return;
    }

    if (settingsCard) settingsCard.style.display = 'none';

    const check = els.formatCheck;
    if (check) {
      check.innerHTML = [
        `<div>✓ 已辨識 ${state.rows.length} 筆表單回覆</div>`,
        `<div>✓ 已自動辨識 ${state.satisfactionColumns.length} 題滿意度題目</div>`,
        '<div>✓ 「非常滿意／滿意／普通／不滿意／非常不滿意」會自動換算為 5～1 分</div>',
        '<div>✓ 此檔沒有測驗題也可以直接產生滿意度統計</div>',
        '<div>✓ 個人姓名不顯示於分析畫面</div>'
      ].join('');
    }
  };

  if (baseParseForExport) {
    parseForExport = async function(file) {
      try {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array', cellDates: false, raw: false });
        const form = detectFormResponseWorkbook(workbook, true);
        if (form) {
          window.exportRows = form.rows;
          return;
        }
      } catch (error) {
        console.warn('表單回覆明細讀取失敗，改用原有格式解析。', error);
      }
      return baseParseForExport(file);
    };
  }

  // 表單型資料：第二頁籤改成真正需要的欄位，不顯示空白的及格／得分／Q欄。
  if (baseBuildAnswerDetailWorksheet) {
    buildAnswerDetailWorksheet = function(workbook, rows) {
      if (!window.__formResponseMode) return baseBuildAnswerDetailWorksheet(workbook, rows);

      const satColumns = state.satisfactionColumns;
      const headers = [
        '序', '姓名', '單位',
        ...satColumns.map((_, i) => `滿${i + 1}`),
        '具體收穫', '感想與建議'
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
        margins: { left: 0.2, right: 0.2, top: 0.28, bottom: 0.35, header: 0.12, footer: 0.18 }
      };

      ws.mergeCells(1, 1, 1, headers.length);
      ws.getCell(1, 1).value = '教育訓練－個人滿意度與文字回饋明細';
      styleTitle(ws.getCell(1, 1), 15);
      ws.getRow(1).height = 30;

      ws.mergeCells(2, 1, 2, headers.length);
      ws.getCell(2, 1).value = '滿1～滿' + satColumns.length + '＝原表單滿意度題目';
      ws.getCell(2, 1).alignment = { horizontal: 'left', vertical: 'middle' };

      const headerRow = ws.addRow(headers);
      styleHeaderRow(headerRow);
      headerRow.height = 30;

      rows.forEach((row, index) => {
        const sats = satColumns.map(column => toNumber(row[column]) ?? cleanText(row[column]));
        const dataRow = ws.addRow([
          index + 1,
          cleanPersonName(row['姓名']),
          cleanText(row['單位名稱']),
          ...sats,
          cleanText(row['具體收穫']),
          cleanText(row['感想與建議'])
        ]);
        styleDataRow(dataRow);
        dataRow.height = 42;
        dataRow.alignment = { vertical: 'middle', wrapText: true };

        for (let c = 1; c <= 3 + satColumns.length; c += 1) {
          dataRow.getCell(c).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        }
      });

      ws.getColumn(1).width = 5.5;
      ws.getColumn(2).width = 11;
      ws.getColumn(3).width = 13;
      let col = 4;
      satColumns.forEach(() => {
        ws.getColumn(col).width = 6.2;
        col += 1;
      });
      ws.getColumn(col).width = 30;
      ws.getColumn(col + 1).width = 34;

      ws.autoFilter = null;
      ws.pageSetup.printArea = `A1:${columnLetter(headers.length)}${ws.rowCount}`;
      ws.pageSetup.printTitlesRow = '1:3';
      ws.headerFooter = {
        oddFooter: '&C第 &P 頁 / 共 &N 頁',
        evenFooter: '&C第 &P 頁 / 共 &N 頁',
        firstFooter: '&C第 &P 頁 / 共 &N 頁'
      };

      if (typeof applyBilingualFontsToWorksheet === 'function') applyBilingualFontsToWorksheet(ws);
    };
  }

  // 表單型資料沒有測驗題，不產生空白的「測驗題目統計」頁籤。
  if (baseBuildQuestionSummaryWorksheet) {
    buildQuestionSummaryWorksheet = function(workbook, rows) {
      if (window.__formResponseMode && !state.quizColumns.length) return;
      return baseBuildQuestionSummaryWorksheet(workbook, rows);
    };
  }

  // 表單型資料將兩個文字題完整保留，不只留下「建議」。
  if (baseBuildCommentsWorksheet) {
    buildCommentsWorksheet = function(workbook, comments) {
      if (!window.__formResponseMode) return baseBuildCommentsWorksheet(workbook, comments);

      const rows = typeof getExportRows === 'function' ? getExportRows() : [];
      const ws = workbook.addWorksheet('文字回饋', { views: [{ showGridLines: false }] });
      ws.columns = [{ width: 7 }, { width: 12 }, { width: 14 }, { width: 45 }, { width: 45 }];

      ws.mergeCells('A1:E1');
      ws.getCell('A1').value = '文字回饋';
      styleTitle(ws.getCell('A1'), 15);

      const header = ws.addRow(['序', '姓名', '單位', '具體收穫', '建議']);
      styleHeaderRow(header);

      rows.forEach((row, index) => {
        const dataRow = ws.addRow([
          index + 1,
          cleanPersonName(row['姓名']),
          cleanText(row['單位名稱']),
          cleanText(row['具體收穫']),
          cleanText(row['感想與建議'])
        ]);
        styleDataRow(dataRow);
        dataRow.height = 48;
        dataRow.alignment = { vertical: 'top', wrapText: true };
        dataRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        dataRow.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
        dataRow.getCell(3).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      });

      if (typeof applyBilingualFontsToWorksheet === 'function') applyBilingualFontsToWorksheet(ws);
    };
  }
})();
