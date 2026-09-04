// 將網頁上自由填寫的講師、參與人數、日期、回收率帶入滿意度統計表。

const _reportMetaBuildSatisfactionWorksheet = buildSatisfactionWorksheet;

buildSatisfactionWorksheet = function(workbook, rows) {
  _reportMetaBuildSatisfactionWorksheet(workbook, rows);

  const ws = workbook.getWorksheet('滿意度統計表');
  if (!ws || typeof window.getReportMeta !== 'function') return;

  const meta = window.getReportMeta(rows);

  ws.getCell('B3').value = `講師：${meta.lecturer || ''}`;
  ws.getCell('D3').value = `參與人數：${meta.participantCount === '' ? '' : meta.participantCount}`;
  ws.getCell('H3').value = `回收率：${meta.responseRate === '' ? '' : `${Number(meta.responseRate).toFixed(1)}%`}`;
  ws.getCell('B4').value = `日期：${meta.dateDisplay || ''}`;

  ['B3', 'D3', 'H3', 'B4'].forEach(addr => {
    const cell = ws.getCell(addr);
    cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
  });

  // 新填入的字串再套一次中英文混排字型。
  if (typeof applyBilingualFontsToWorksheet === 'function') {
    applyBilingualFontsToWorksheet(ws);
  }
};
