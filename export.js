const exportBtn = document.getElementById('exportBtn');

exportBtn.addEventListener('click', () => {
  if (!state.rows.length) {
    alert('請先上傳院內 ODS / XLSX 檔案。');
    return;
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, buildSatisfactionSheet(), '滿意度統計表');
  XLSX.utils.book_append_sheet(wb, buildExamSheet(), '測驗統計');

  const code = (state.rows[0]?.['課程代碼'] || '教育訓練').toString().replace(/[\\/:*?"<>|]/g, '_');
  XLSX.writeFile(wb, `${code}_教育訓練統計.xlsx`);
});

function buildSatisfactionSheet() {
  const sat = calculateSatisfaction();
  const comments = state.rows
    .map(row => normalizeText(row['感想與建議']))
    .filter(Boolean);

  const aoa = [
    ['教育訓練課程滿意度統計表', '', '', '', '', '', '', ''],
    ['課程名稱', '', '講師', '', '日期', '', '課程代碼', state.rows[0]?.['課程代碼'] || ''],
    ['參與人數', '', '問卷回收', state.rows.length, '回收率', '', '總滿意度', sat.overall == null ? '' : `${sat.overall}%`],
    [],
    ['評估項目', '5分', '4分', '3分', '2分', '1分', '平均分數', '滿意度']
  ];

  sat.items.forEach(item => {
    aoa.push([
      item.label,
      item.counts[5],
      item.counts[4],
      item.counts[3],
      item.counts[2],
      item.counts[1],
      Number(item.average.toFixed(2)),
      `${item.satisfaction.toFixed(1)}%`
    ]);
  });

  aoa.push([]);
  aoa.push(['感想與建議', '', '', '', '', '', '', '']);
  if (comments.length) {
    comments.forEach(comment => aoa.push([comment, '', '', '', '', '', '', '']));
  } else {
    aoa.push(['', '', '', '', '', '', '', '']);
  }

  aoa.push([]);
  aoa.push(['製表人', '', '單位護理長', '', '單位督導', '', '', '']);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!merges'] = [
    XLSX.utils.decode_range('A1:H1'),
    XLSX.utils.decode_range(`A${sat.items.length + 7}:H${sat.items.length + 7}`)
  ];
  ws['!cols'] = [
    { wch: 34 }, { wch: 9 }, { wch: 9 }, { wch: 9 },
    { wch: 9 }, { wch: 9 }, { wch: 12 }, { wch: 13 }
  ];
  return ws;
}

function buildExamSheet() {
  const exam = calculateExamSummary();
  const aoa = [
    ['教育訓練測驗統計', '', '', ''],
    ['課程代碼', state.rows[0]?.['課程代碼'] || '', '', ''],
    ['資料筆數', state.rows.length, '完測人數', exam.completed ?? ''],
    ['平均分數', exam.averageScore ?? '', '及格率', exam.passRate == null ? '' : `${exam.passRate}%`],
    ['最高分', exam.maxScore ?? '', '最低分', exam.minScore ?? ''],
    [],
    ['題目 / 選項', '人數', '比例', '']
  ];

  state.quizColumns.forEach((column, index) => {
    const parsed = state.parsedQuiz[index];
    const title = parsed?.question || column;
    const labels = Object.fromEntries((parsed?.options || []).map(opt => [normalizeCode(opt.code), opt.text]));
    const distribution = getDistribution(column);
    const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);

    aoa.push([`${index + 1}. ${title}`, '', '', '']);
    Object.entries(distribution)
      .sort(([a], [b]) => naturalSort(a, b))
      .forEach(([code, count]) => {
        const mapped = labels[normalizeCode(code)];
        const label = mapped ? `${code}. ${mapped}` : code;
        const pct = total ? `${((count / total) * 100).toFixed(1)}%` : '0%';
        aoa.push([label, count, pct, '']);
      });
    aoa.push([]);
  });

  const scoreDistribution = {};
  state.rows.forEach(row => {
    const score = normalizeText(row['得分']);
    if (score) scoreDistribution[score] = (scoreDistribution[score] || 0) + 1;
  });

  aoa.push(['分數分布', '人數', '', '']);
  Object.entries(scoreDistribution)
    .sort((a, b) => Number(b[0]) - Number(a[0]))
    .forEach(([score, count]) => aoa.push([score, count, '', '']));

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!merges'] = [XLSX.utils.decode_range('A1:D1')];
  ws['!cols'] = [{ wch: 58 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
  return ws;
}
