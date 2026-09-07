// 2026-09：滿意度標題不再依學員單位自動命名；個人明細「滿10」加寬。
(function unitTitleAndDetailWidthPatch() {
  // 第一頁籤：固定使用通用標題，不從「單位名稱」推算病房／單位。
  if (typeof buildSatisfactionWorksheet === 'function') {
    const baseBuildSatisfactionWorksheet = buildSatisfactionWorksheet;
    buildSatisfactionWorksheet = function(workbook, rows) {
      baseBuildSatisfactionWorksheet(workbook, rows);
      const ws = workbook.getWorksheet('滿意度統計表');
      if (!ws) return;
      ws.getCell('A2').value = '專科在職教育課程滿意度統計表';
      ws.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    };
  }

  // PDF 第一頁與 Excel 第一頁籤保持相同標題邏輯。
  if (typeof buildSatisfactionPdfReport === 'function') {
    const baseBuildSatisfactionPdfReport = buildSatisfactionPdfReport;
    buildSatisfactionPdfReport = function(rows) {
      const wrapper = baseBuildSatisfactionPdfReport(rows);
      const title = wrapper.querySelector('.pdf-sheet h2');
      if (title) title.textContent = '專科在職教育課程滿意度統計表';
      return wrapper;
    };
  }

  // 第二頁籤：「滿10」欄稍微加寬，避免 12pt 表頭被折成兩行。
  if (typeof buildAnswerDetailWorksheet === 'function') {
    const baseBuildAnswerDetailWorksheet = buildAnswerDetailWorksheet;
    buildAnswerDetailWorksheet = function(workbook, rows) {
      baseBuildAnswerDetailWorksheet(workbook, rows);
      const ws = workbook.getWorksheet('個人作答明細');
      if (!ws) return;

      const satCount = state.satisfactionColumns.length;
      if (!satCount) return;

      // 欄位順序：序、姓名、單位、及格、得分、Q...、滿...、感想與建議
      const lastSatCol = 5 + state.quizColumns.length + satCount;
      const lastSatCell = ws.getRow(3).getCell(lastSatCol);
      ws.getColumn(lastSatCol).width = Math.max(Number(ws.getColumn(lastSatCol).width) || 0, 6.8);
      lastSatCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false };
    };
  }
})();
