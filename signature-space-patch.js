// 第一頁簽核／蓋章欄位加高，預留實際簽名或蓋章空間。
(function enlargeSignatureAreas() {
  // Excel 第一頁籤：簽核列加高。
  if (typeof buildSatisfactionWorksheet === 'function') {
    const baseBuildSatisfactionWorksheet = buildSatisfactionWorksheet;
    buildSatisfactionWorksheet = function(workbook, rows) {
      baseBuildSatisfactionWorksheet(workbook, rows);
      const ws = workbook.getWorksheet('滿意度統計表');
      if (!ws) return;

      let signRowNumber = null;
      ws.eachRow((row, rowNumber) => {
        const first = String(row.getCell(1).value ?? '').trim();
        if (first.startsWith('製表人')) signRowNumber = rowNumber;
      });

      if (signRowNumber) {
        const row = ws.getRow(signRowNumber);
        row.height = 58;
        [1, 4, 7].forEach(col => {
          const cell = row.getCell(col);
          cell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
        });
      }
    };
  }

  // PDF 第一頁：簽核區加高。
  if (typeof buildSatisfactionPdfReport === 'function') {
    const baseBuildSatisfactionPdfReport = buildSatisfactionPdfReport;
    buildSatisfactionPdfReport = function(rows) {
      const wrapper = baseBuildSatisfactionPdfReport(rows);
      const style = document.createElement('style');
      style.textContent = `
        .pdf-sign div{
          min-height:82px !important;
          padding:12px 12px !important;
          box-sizing:border-box;
          vertical-align:top;
        }
      `;
      wrapper.appendChild(style);
      return wrapper;
    };
  }
})();
