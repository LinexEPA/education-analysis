// Excel 字級統一：一般內文至少 12pt，表頭至少 12pt；保留原本較大的標題。
// 中文／英文既有字型設定不改，只調整字級與必要列高。

(function applyExcelMinimumFontSizePatch() {
  const MIN_BODY_SIZE = 12;
  const MIN_HEADER_SIZE = 12;

  function raiseCellFontSize(cell, minSize) {
    if (!cell) return;

    // Rich text（中英文字型分流後的儲存格）也同步放大。
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

    const base = cell.font || {};
    cell.font = {
      ...base,
      size: Math.max(Number(base.size) || 0, minSize)
    };
  }

  function raiseWorksheetFonts(ws, headerRows = []) {
    if (!ws) return;
    const headerSet = new Set(headerRows);

    ws.eachRow({ includeEmpty: false }, row => {
      const minSize = headerSet.has(row.number) ? MIN_HEADER_SIZE : MIN_BODY_SIZE;
      row.eachCell({ includeEmpty: false }, cell => raiseCellFontSize(cell, minSize));

      // 12pt 後避免固定列高造成文字被切掉。
      if (row.number > 2) {
        const current = Number(row.height) || 18;
        row.height = Math.max(28, current * 1.12);
      }
    });
  }

  if (typeof buildSatisfactionWorksheet === 'function') {
    const base = buildSatisfactionWorksheet;
    buildSatisfactionWorksheet = function(workbook, rows) {
      base(workbook, rows);
      const ws = workbook.getWorksheet('滿意度統計表');
      raiseWorksheetFonts(ws, [5]);
      if (ws) {
        ws.getRow(1).height = Math.max(Number(ws.getRow(1).height) || 0, 38);
        ws.getRow(2).height = Math.max(Number(ws.getRow(2).height) || 0, 35);
      }
    };
  }

  if (typeof buildAnswerDetailWorksheet === 'function') {
    const base = buildAnswerDetailWorksheet;
    buildAnswerDetailWorksheet = function(workbook, rows) {
      base(workbook, rows);
      const ws = workbook.getWorksheet('個人作答明細');
      raiseWorksheetFonts(ws, [3]);
      if (ws) ws.getRow(3).height = Math.max(Number(ws.getRow(3).height) || 0, 30);
    };
  }

  if (typeof buildQuestionSummaryWorksheet === 'function') {
    const base = buildQuestionSummaryWorksheet;
    buildQuestionSummaryWorksheet = function(workbook, rows) {
      base(workbook, rows);
      const ws = workbook.getWorksheet('測驗題目統計');
      raiseWorksheetFonts(ws, [3]);
      if (ws) ws.getRow(3).height = Math.max(Number(ws.getRow(3).height) || 0, 30);
    };
  }

  if (typeof buildCommentsWorksheet === 'function') {
    const base = buildCommentsWorksheet;
    buildCommentsWorksheet = function(workbook, comments) {
      base(workbook, comments);
      const ws = workbook.getWorksheet('感想與建議');
      raiseWorksheetFonts(ws, [2]);
    };
  }
})();
