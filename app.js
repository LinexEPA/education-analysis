const state = {
  fileName: '',
  headers: [],
  rows: [],
  quizColumns: [],
  satisfactionColumns: [],
  parsedQuiz: []
};

const SAT_LABELS = [
  '課程內容充實',
  '課程內容符合實際運作',
  '課程可促進團隊照護共識',
  '對於授課內容收穫度',
  '課程可提升個人知能',
  '課程設計符合個人需求',
  '課程內容可增進人文素養',
  '主講者表達適切',
  '時間控制適宜',
  '地點適合'
];

const SENSITIVE_PATTERNS = [
  /姓名/i,
  /身分證/i,
  /身份證/i,
  /證號/i
];

const els = {
  fileInput: document.getElementById('fileInput'),
  dropZone: document.getElementById('dropZone'),
  fileStatus: document.getElementById('fileStatus'),
  summaryCards: document.getElementById('summaryCards'),
  courseCode: document.getElementById('courseCode'),
  rowCount: document.getElementById('rowCount'),
  quizCount: document.getElementById('quizCount'),
  satCount: document.getElementById('satCount'),
  formatCheck: document.getElementById('formatCheck'),
  quizText: document.getElementById('quizText'),
  parseQuizBtn: document.getElementById('parseQuizBtn'),
  quizParseStatus: document.getElementById('quizParseStatus'),
  quizPreview: document.getElementById('quizPreview'),
  analysisStep: document.getElementById('analysisStep'),
  outputStep: document.getElementById('outputStep'),
  examSummary: document.getElementById('examSummary'),
  satSummary: document.getElementById('satSummary'),
  satTableBody: document.getElementById('satTableBody'),
  quizDistribution: document.getElementById('quizDistribution'),
  resetBtn: document.getElementById('resetBtn')
};

els.fileInput.addEventListener('change', event => {
  const file = event.target.files?.[0];
  if (file) handleFile(file);
});

['dragenter', 'dragover'].forEach(name => {
  els.dropZone.addEventListener(name, event => {
    event.preventDefault();
    els.dropZone.classList.add('dragover');
  });
});

['dragleave', 'drop'].forEach(name => {
  els.dropZone.addEventListener(name, event => {
    event.preventDefault();
    els.dropZone.classList.remove('dragover');
  });
});

els.dropZone.addEventListener('drop', event => {
  const file = event.dataTransfer.files?.[0];
  if (file) handleFile(file);
});

els.parseQuizBtn.addEventListener('click', () => {
  state.parsedQuiz = parseQuizText(els.quizText.value);
  renderQuizPreview();
  if (state.rows.length) renderAnalysis();
});

els.resetBtn.addEventListener('click', resetAll);

async function handleFile(file) {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!['ods', 'xlsx', 'xls'].includes(ext)) {
    setStatus(els.fileStatus, 'error', '檔案格式不支援，請選擇 .ods、.xlsx 或 .xls。');
    return;
  }

  setStatus(els.fileStatus, 'muted', `正在解析：${file.name}`);

  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: false, raw: false });
    const detected = detectDataSheet(workbook);

    if (!detected) {
      throw new Error('找不到符合院內教育訓練格式的資料表。');
    }

    state.fileName = file.name;
    state.headers = detected.headers;
    state.rows = detected.rows;
    state.quizColumns = detected.headers.filter(header => /^問題\s*\d+$/i.test(normalizeText(header)));
    state.satisfactionColumns = detected.headers.filter(header => /^滿意度/.test(normalizeText(header)));

    renderFileSummary();
    renderAnalysis();
    setStatus(els.fileStatus, 'ok', `✓ 已解析 ${file.name}；原始檔未上傳至 GitHub。`);
  } catch (error) {
    console.error(error);
    setStatus(els.fileStatus, 'error', `解析失敗：${error.message || '未知錯誤'}`);
    hideAfterFailure();
  }
}

function detectDataSheet(workbook) {
  let fallback = null;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
    if (!matrix.length) continue;

    const maxScan = Math.min(matrix.length, 20);
    for (let i = 0; i < maxScan; i += 1) {
      const candidate = matrix[i].map(normalizeText);
      const score = headerScore(candidate);
      if (score >= 3) {
        const parsed = matrixToRows(matrix, i);
        if (parsed.rows.length) return parsed;
      }
      if (!fallback && score >= 2) {
        fallback = matrixToRows(matrix, i);
      }
    }
  }

  return fallback?.rows?.length ? fallback : null;
}

function headerScore(headers) {
  let score = 0;
  if (headers.some(v => v === '課程代碼')) score += 1;
  if (headers.some(v => v === '是否完測')) score += 1;
  if (headers.some(v => v === '得分')) score += 1;
  if (headers.some(v => /^問題\s*\d+$/i.test(v))) score += 1;
  if (headers.some(v => /^滿意度/.test(v))) score += 1;
  return score;
}

function matrixToRows(matrix, headerIndex) {
  const headers = matrix[headerIndex].map((value, index) => normalizeText(value) || `欄位${index + 1}`);
  const rows = [];

  for (let r = headerIndex + 1; r < matrix.length; r += 1) {
    const rawRow = matrix[r] || [];
    const isEmpty = rawRow.every(value => normalizeText(value) === '');
    if (isEmpty) continue;

    const row = {};
    headers.forEach((header, index) => {
      row[header] = rawRow[index] ?? '';
    });
    rows.push(stripSensitiveFields(row));
  }

  return { headers, rows };
}

function stripSensitiveFields(row) {
  const safe = {};
  Object.entries(row).forEach(([key, value]) => {
    if (!SENSITIVE_PATTERNS.some(pattern => pattern.test(key))) {
      safe[key] = value;
    }
  });
  return safe;
}

function renderFileSummary() {
  const first = state.rows[0] || {};
  const courseCode = first['課程代碼'] || '—';

  els.courseCode.textContent = courseCode || '—';
  els.rowCount.textContent = state.rows.length;
  els.quizCount.textContent = state.quizColumns.length;
  els.satCount.textContent = state.satisfactionColumns.length;
  els.summaryCards.classList.remove('hidden');

  const checks = [];
  checks.push(`✓ 已辨識 ${state.rows.length} 筆資料`);
  checks.push(state.quizColumns.length ? `✓ 已辨識 ${state.quizColumns.length} 題測驗` : '⚠ 未辨識到測驗題欄位');
  checks.push(state.satisfactionColumns.length ? `✓ 已辨識 ${state.satisfactionColumns.length} 題滿意度` : '⚠ 未辨識到滿意度欄位');
  checks.push('✓ 個人姓名／身分證字號不顯示於分析資料');

  els.formatCheck.innerHTML = checks.map(item => `<div>${escapeHtml(item)}</div>`).join('');
  els.formatCheck.classList.remove('hidden');
}

function renderAnalysis() {
  if (!state.rows.length) return;

  const exam = calculateExamSummary();
  const sat = calculateSatisfaction();

  els.examSummary.innerHTML = [
    metric('資料筆數', state.rows.length),
    metric('完測人數', exam.completed ?? '—'),
    metric('平均分數', exam.averageScore ?? '—'),
    metric('及格率', exam.passRate == null ? '—' : `${exam.passRate}%`),
    metric('最高分', exam.maxScore ?? '—'),
    metric('最低分', exam.minScore ?? '—')
  ].join('');

  els.satSummary.innerHTML = [
    metric('有效滿意度題', sat.items.length),
    metric('總滿意度', sat.overall == null ? '—' : `${sat.overall}%`),
    metric('最高項目', sat.highest?.label || '—'),
    metric('最低項目', sat.lowest?.label || '—')
  ].join('');

  els.satTableBody.innerHTML = sat.items.length
    ? sat.items.map(item => `
      <tr>
        <td>${escapeHtml(item.label)}</td>
        <td>${item.counts[5]}</td>
        <td>${item.counts[4]}</td>
        <td>${item.counts[3]}</td>
        <td>${item.counts[2]}</td>
        <td>${item.counts[1]}</td>
        <td>${item.average.toFixed(2)}</td>
        <td>${item.satisfaction.toFixed(1)}%</td>
      </tr>`).join('')
    : '<tr><td colspan="8">未辨識到可計算的滿意度資料</td></tr>';

  renderQuizDistribution();
  els.analysisStep.classList.remove('hidden');
  els.outputStep.classList.remove('hidden');
}

function calculateExamSummary() {
  const scoreValues = state.rows
    .map(row => toNumber(row['得分']))
    .filter(value => value != null);

  const completed = countPositiveFlag('是否完測');
  const passCount = countPositiveFlag('是否及格');
  const passDenominator = state.rows.filter(row => normalizeText(row['是否及格']) !== '').length;

  return {
    completed: hasColumn('是否完測') ? completed : null,
    averageScore: scoreValues.length ? round(mean(scoreValues), 1) : null,
    maxScore: scoreValues.length ? Math.max(...scoreValues) : null,
    minScore: scoreValues.length ? Math.min(...scoreValues) : null,
    passRate: passDenominator ? round((passCount / passDenominator) * 100, 1) : null
  };
}

function calculateSatisfaction() {
  const items = state.satisfactionColumns.map((column, index) => {
    const values = state.rows
      .map(row => toNumber(row[column]))
      .filter(value => value != null && value >= 1 && value <= 5);

    if (!values.length) return null;

    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    values.forEach(value => {
      const key = Math.round(value);
      if (counts[key] != null) counts[key] += 1;
    });

    const average = mean(values);
    const satisfaction = (average / 5) * 100;

    return {
      column,
      label: SAT_LABELS[index] || column,
      counts,
      average,
      satisfaction
    };
  }).filter(Boolean);

  const overall = items.length ? round(mean(items.map(item => item.satisfaction)), 1) : null;
  const ordered = [...items].sort((a, b) => b.satisfaction - a.satisfaction);

  return {
    items,
    overall,
    highest: ordered[0] || null,
    lowest: ordered.at(-1) || null
  };
}

function renderQuizDistribution() {
  if (!state.quizColumns.length) {
    els.quizDistribution.innerHTML = '<div class="status-line muted">未辨識到測驗作答欄位。</div>';
    return;
  }

  els.quizDistribution.innerHTML = state.quizColumns.map((column, index) => {
    const parsed = state.parsedQuiz[index];
    const title = parsed?.question || column;
    const labels = Object.fromEntries((parsed?.options || []).map(opt => [normalizeCode(opt.code), opt.text]));
    const distribution = getDistribution(column);
    const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);

    const rows = Object.entries(distribution)
      .sort(([a], [b]) => naturalSort(a, b))
      .map(([code, count]) => {
        const pct = total ? (count / total) * 100 : 0;
        const mapped = labels[normalizeCode(code)];
        const displayLabel = mapped ? `${code}. ${mapped}` : code;
        return `
          <div class="bar-row">
            <div>${escapeHtml(displayLabel)}</div>
            <div class="bar-track"><div class="bar-fill" style="width:${pct.toFixed(1)}%"></div></div>
            <div class="bar-value">${count}人 · ${pct.toFixed(1)}%</div>
          </div>`;
      }).join('');

    return `
      <article class="distribution-item">
        <h4>${index + 1}. ${escapeHtml(title)}</h4>
        ${rows || '<div class="status-line muted">沒有有效作答資料</div>'}
      </article>`;
  }).join('');
}

function getDistribution(column) {
  const counts = {};
  state.rows.forEach(row => {
    const code = normalizeText(row[column]);
    if (!code) return;
    counts[code] = (counts[code] || 0) + 1;
  });
  return counts;
}

function parseQuizText(raw) {
  const text = normalizeFullWidth(raw).replace(/\r\n?/g, '\n');
  const lines = text.split('\n');
  const questions = [];
  let current = null;
  let lastOption = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const qMatch = line.match(/^\[\s*Q\s*(\d+)\s*\]\s*(.*)$/i)
      || line.match(/^Q\s*(\d+)\s*[.:：、-]?\s*(.*)$/i)
      || line.match(/^第\s*(\d+)\s*題\s*[.:：、-]?\s*(.*)$/i);

    if (qMatch) {
      current = {
        number: Number(qMatch[1]),
        question: qMatch[2].trim(),
        options: [],
        warnings: []
      };
      questions.push(current);
      lastOption = null;
      continue;
    }

    const optionMatch = line.match(/^\[\s*([A-Za-z]|\d+|O|X)\s*\]\s*(.*)$/i)
      || line.match(/^\(\s*([A-Za-z]|\d+|O|X)\s*\)\s*(.*)$/i)
      || line.match(/^([A-Za-z]|O|X)\s*[.、:：)]\s*(.*)$/i);

    if (optionMatch && current) {
      lastOption = {
        code: normalizeCode(optionMatch[1]),
        text: optionMatch[2].trim()
      };
      current.options.push(lastOption);
      continue;
    }

    if (current) {
      if (lastOption) {
        lastOption.text = `${lastOption.text} ${line}`.trim();
      } else {
        current.question = `${current.question} ${line}`.trim();
      }
    }
  }

  questions.sort((a, b) => a.number - b.number);

  questions.forEach(question => {
    if (!question.question) question.warnings.push('缺少題目文字');
    if (question.options.length < 2) question.warnings.push('辨識到的選項少於 2 個');
    const unique = new Set(question.options.map(opt => normalizeCode(opt.code)));
    if (unique.size !== question.options.length) question.warnings.push('選項代碼重複');
  });

  return questions;
}

function renderQuizPreview() {
  const parsed = state.parsedQuiz;
  if (!parsed.length) {
    setStatus(els.quizParseStatus, 'warn', '尚未辨識到題目。建議使用 [Q1]、[A]、[B]… 的格式。');
    els.quizPreview.classList.add('hidden');
    els.quizPreview.innerHTML = '';
    return;
  }

  const mismatch = state.quizColumns.length && parsed.length !== state.quizColumns.length;
  const warnings = parsed.reduce((sum, q) => sum + q.warnings.length, 0);

  if (mismatch) {
    setStatus(els.quizParseStatus, 'warn', `已辨識 ${parsed.length} 題，但原始檔有 ${state.quizColumns.length} 個問題欄位，請確認題數。`);
  } else if (warnings) {
    setStatus(els.quizParseStatus, 'warn', `已辨識 ${parsed.length} 題，其中 ${warnings} 項需要確認。`);
  } else {
    setStatus(els.quizParseStatus, 'ok', `✓ 已辨識 ${parsed.length} 題，格式正常。`);
  }

  els.quizPreview.innerHTML = parsed.map(question => {
    const warningClass = question.warnings.length ? ' warning' : '';
    const warningText = question.warnings.length
      ? `<div class="status-line warn">⚠ ${escapeHtml(question.warnings.join('；'))}</div>`
      : '';

    return `
      <article class="preview-item${warningClass}">
        <h4>Q${question.number}｜${escapeHtml(question.question || '未辨識題目')}</h4>
        <div class="option-list">
          ${question.options.map(opt => `
            <div class="option-row">
              <span class="option-code">${escapeHtml(opt.code)}</span>
              <span>${escapeHtml(opt.text || '未辨識選項內容')}</span>
            </div>`).join('')}
        </div>
        ${warningText}
      </article>`;
  }).join('');

  els.quizPreview.classList.remove('hidden');
}

function countPositiveFlag(column) {
  return state.rows.reduce((sum, row) => sum + (isPositiveFlag(row[column]) ? 1 : 0), 0);
}

function isPositiveFlag(value) {
  const text = normalizeText(value).toLowerCase();
  return ['是', 'yes', 'y', 'true', '1', '完成', '及格', '通過', 'pass'].includes(text);
}

function hasColumn(column) {
  return state.headers.includes(column);
}

function toNumber(value) {
  if (value == null || value === '') return null;
  const cleaned = String(value).replace(/[%％,，\s]/g, '');
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function metric(label, value) {
  return `<div class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong></div>`;
}

function setStatus(element, type, message) {
  element.className = `status-line ${type}`;
  element.textContent = message;
}

function normalizeText(value) {
  return String(value ?? '').replace(/\u3000/g, ' ').trim();
}

function normalizeFullWidth(value) {
  return String(value ?? '')
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, char => String.fromCharCode(char.charCodeAt(0) - 0xFEE0))
    .replace(/［/g, '[')
    .replace(/］/g, ']')
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/：/g, ':')
    .replace(/．/g, '.')
    .replace(/，/g, ',');
}

function normalizeCode(value) {
  return normalizeFullWidth(value).trim().toUpperCase();
}

function naturalSort(a, b) {
  return String(a).localeCompare(String(b), 'zh-Hant', { numeric: true, sensitivity: 'base' });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function hideAfterFailure() {
  els.summaryCards.classList.add('hidden');
  els.formatCheck.classList.add('hidden');
  els.analysisStep.classList.add('hidden');
  els.outputStep.classList.add('hidden');
}

function resetAll() {
  state.fileName = '';
  state.headers = [];
  state.rows = [];
  state.quizColumns = [];
  state.satisfactionColumns = [];
  state.parsedQuiz = [];

  els.fileInput.value = '';
  els.quizText.value = '';
  setStatus(els.fileStatus, 'muted', '尚未選擇檔案');
  setStatus(els.quizParseStatus, 'muted', '尚未解析題目');
  els.summaryCards.classList.add('hidden');
  els.formatCheck.classList.add('hidden');
  els.quizPreview.classList.add('hidden');
  els.quizPreview.innerHTML = '';
  els.analysisStep.classList.add('hidden');
  els.outputStep.classList.add('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
