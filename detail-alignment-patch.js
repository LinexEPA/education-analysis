// 個人作答明細最後版面微調：姓名／單位置中，第二列表頭資訊靠左。
const _previousBuildAnswerDetailWorksheetAlignment = buildAnswerDetailWorksheet;

buildAnswerDetailWorksheet = function(workbook, rows) {
  _previousBuildAnswerDetailWorksheetAlignment(workbook, rows);
  const ws = workbook.getWorksheet('個人作答明細');
  if (!ws) return;

  // 課程代碼｜Q＝測驗作答；滿1～滿10＝滿意度題目：整列靠左。
  ws.getCell('A2').alignment = {
    horizontal: 'left',
    vertical: 'middle',
    wrapText: true
  };

  // 姓名、單位：表頭與所有資料列水平、垂直置中。
  [2, 3].forEach(col => {
    ws.getCell(3, col).alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true
    };

    for (let r = 4; r <= ws.rowCount; r += 1) {
      ws.getCell(r, col).alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true
      };
    }
  });
};
