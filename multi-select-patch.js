// 複選題相容層（2026-10-20）
// 預設仍為單選；只有使用者明確切換「複選」的題目才拆分作答。
// 不重新計算考試得分，只負責正確呈現答案、作答分布與正式輸出。

(function multiSelectQuizPatch() {
  window.isMultipleQuizQuestion = function(question) {
    return question?.answerMode === 'multiple';
  };

  window.splitQuizResponseValues = function(rawValue, parsed) {
    const raw = cleanText(rawValue);
    if (!raw) return [];

    // 若整串剛好就是某個選項文字或代碼，先視為單一答案。
    if (parsed && typeof findOption === 'function' && findOption(parsed, raw)) {
      return [raw];
    }

    // 常見院內匯出格式：1,3 / 1、3 / A,C / A；C / 1+3 / 1|3
    const parts = raw
      .split(/[，,、；;／/|+]+/)
      .map(value => cleanText(value))
      .filter(Boolean);

    return parts.length > 1 ? parts : [raw];
  };

  window.getQuizCorrectCodes = function(question) {
    if (!question) return [];

    if (window.isMultipleQuizQuestion(question)) {
      const values = Array.isArray(question.correctAnswers)
        ? question.correctAnswers
        : window.splitQuizResponseValues(question.correctAnswer || '', question);
      return [...new Set(values.map(normalizeCode).filter(Boolean))];
    }

    const one = normalizeCode(question.correctAnswer || '');
    return one ? [one] : [];
  };

  function syncQuestionCorrectAnswer(question) {
    const codes = window.getQuizCorrectCodes(question);
    if (window.isMultipleQuizQuestion(question)) {
      question.correctAnswers = codes;
      question.correctAnswer = codes.join('、');
    } else {
      question.correctAnswers = [];
      question.correctAnswer = codes[0] || '';
    }
  }

  // 覆蓋題目預覽：新增「單選／複選」切換。
  renderQuizPreview = function() {
    const parsed = state.parsedQuiz;

    if (!parsed.length) {
      setStatus(els.quizParseStatus, 'warn', '尚未辨識到題目。建議使用空白列分題，或原本的題號／選項格式。');
      els.quizPreview.classList.add('hidden');
      els.quizPreview.innerHTML = '';
      return;
    }

    parsed.forEach(question => {
      if (!question.answerMode) question.answerMode = 'single';
      if (!Array.isArray(question.correctAnswers)) question.correctAnswers = [];
    });

    const mismatch = state.quizColumns.length && parsed.length !== state.quizColumns.length;
    const warnings = parsed.reduce((sum, q) => sum + (q.warnings?.length || 0), 0);

    if (mismatch) {
      setStatus(els.quizParseStatus, 'warn', `已辨識 ${parsed.length} 題，但原始檔有 ${state.quizColumns.length} 個問題欄位，請確認題數。`);
    } else if (warnings) {
      setStatus(els.quizParseStatus, 'warn', `已辨識 ${parsed.length} 題，其中 ${warnings} 項需要確認。`);
    } else {
      setStatus(els.quizParseStatus, 'ok', `✓ 已辨識 ${parsed.length} 題，格式正常。`);
    }

    els.quizPreview.innerHTML = parsed.map((question, index) => {
      const warningClass = question.warnings?.length ? ' warning' : '';
      const warningText = question.warnings?.length
        ? `<div class="status-line warn">⚠ ${escapeHtml(question.warnings.join('；'))}</div>`
        : '';
      const multiple = window.isMultipleQuizQuestion(question);
      const selectedCodes = new Set(window.getQuizCorrectCodes(question));

      const answerOptions = question.options.map(opt => {
        const code = normalizeCode(opt.code);
        const selected = !multiple && selectedCodes.has(code) ? ' selected' : '';
        const label = opt.text ? `${code}｜${opt.text}` : code;
        return `<option value="${escapeHtml(code)}"${selected}>${escapeHtml(label)}</option>`;
      }).join('');

      const multiChecks = question.options.map(opt => {
        const code = normalizeCode(opt.code);
        const checked = selectedCodes.has(code) ? ' checked' : '';
        return `
          <label class="quiz-multi-choice">
            <input type="checkbox" data-quiz-multi-index="${index}" value="${escapeHtml(code)}"${checked}>
            <span class="quiz-multi-code">${escapeHtml(code)}</span>
            <span>${escapeHtml(opt.text || '未辨識選項內容')}</span>
          </label>`;
      }).join('');

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

          <div class="quiz-answer-row ${multiple ? 'is-multiple' : ''}">
            <div class="quiz-answer-top">
              <div class="quiz-answer-label">
                <span class="quiz-answer-badge">✓</span>
                <span>請選擇正確答案</span>
                <span class="optional">選填</span>
              </div>

              <div class="quiz-mode-switch" role="group" aria-label="Q${question.number} 題型">
                <button type="button" class="${!multiple ? 'active' : ''}" data-quiz-mode-index="${index}" data-quiz-mode="single">單選</button>
                <button type="button" class="${multiple ? 'active' : ''}" data-quiz-mode-index="${index}" data-quiz-mode="multiple">複選</button>
              </div>
            </div>

            ${multiple ? `
              <div class="quiz-multi-options">${multiChecks}</div>
              <span class="quiz-answer-help">複選題會依各選項「被選率」呈現；原始得分與及格結果仍沿用院內匯出資料，不由本工具重新計分。</span>
            ` : `
              <select id="quizAnswer${index}" data-quiz-answer-index="${index}">
                <option value="">尚未設定｜留白後可再補</option>
                ${answerOptions}
              </select>
              <span class="quiz-answer-help">預設為單選；只有實際為複選題時才需要切換。</span>
            `}
          </div>

          ${warningText}
        </article>`;
    }).join('');

    els.quizPreview.classList.remove('hidden');
  };

  // 模式切換與複選答案勾選。
  els.quizPreview.addEventListener('click', event => {
    const button = event.target.closest('button[data-quiz-mode-index]');
    if (!button) return;

    const index = Number(button.dataset.quizModeIndex);
    const question = state.parsedQuiz[index];
    if (!question) return;

    const nextMode = button.dataset.quizMode === 'multiple' ? 'multiple' : 'single';

    if (nextMode === 'multiple') {
      const existing = normalizeCode(question.correctAnswer || '');
      question.answerMode = 'multiple';
      question.correctAnswers = existing ? [existing] : [];
      syncQuestionCorrectAnswer(question);
    } else {
      const existing = window.getQuizCorrectCodes(question);
      question.answerMode = 'single';
      question.correctAnswer = existing[0] || '';
      question.correctAnswers = [];
    }

    renderQuizPreview();
    if (state.rows.length) renderAnalysis();
  });

  els.quizPreview.addEventListener('change', event => {
    const checkbox = event.target.closest('input[type="checkbox"][data-quiz-multi-index]');
    if (checkbox) {
      const index = Number(checkbox.dataset.quizMultiIndex);
      const question = state.parsedQuiz[index];
      if (!question) return;

      const checked = [...els.quizPreview.querySelectorAll(`input[data-quiz-multi-index="${index}"]:checked`)]
        .map(input => normalizeCode(input.value))
        .filter(Boolean);

      question.answerMode = 'multiple';
      question.correctAnswers = [...new Set(checked)];
      question.correctAnswer = question.correctAnswers.join('、');
      if (state.rows.length) renderAnalysis();
      return;
    }

    const select = event.target.closest('select[data-quiz-answer-index]');
    if (select) {
      const index = Number(select.dataset.quizAnswerIndex);
      const question = state.parsedQuiz[index];
      if (!question) return;
      question.answerMode = 'single';
      question.correctAnswers = [];
      question.correctAnswer = normalizeCode(select.value);
    }
  });

  // 複選題：每個選項獨立計算被選人數／有效填答人數。
  window.getQuizDistributionForQuestion = function(column, question) {
    if (!window.isMultipleQuizQuestion(question)) {
      const raw = getDistribution(column);
      const total = Object.values(raw).reduce((sum, count) => sum + count, 0);
      return {
        multiple: false,
        total,
        entries: Object.entries(raw).map(([rawCode, count]) => ({ rawCode, count }))
      };
    }

    const counts = new Map();
    (question.options || []).forEach(option => counts.set(normalizeCode(option.code), 0));
    let respondents = 0;

    state.rows.forEach(row => {
      const raw = cleanText(row[column]);
      if (!raw) return;
      respondents += 1;

      const selected = new Set();
      window.splitQuizResponseValues(raw, question).forEach(token => {
        const option = typeof findOptionForResponse === 'function'
          ? findOptionForResponse(question, token)
          : null;
        const code = normalizeCode(option?.code || token);
        if (code) selected.add(code);
      });

      selected.forEach(code => {
        counts.set(code, (counts.get(code) || 0) + 1);
      });
    });

    return {
      multiple: true,
      total: respondents,
      entries: [...counts.entries()].map(([rawCode, count]) => ({ rawCode, count }))
    };
  };

  renderQuizDistribution = function() {
    if (!state.quizColumns.length) {
      els.quizDistribution.innerHTML = '<div class="status-line muted">未辨識到測驗作答欄位。</div>';
      return;
    }

    els.quizDistribution.innerHTML = state.quizColumns.map((column, index) => {
      const parsed = state.parsedQuiz[index];
      const title = parsed?.question || column;
      const distribution = window.getQuizDistributionForQuestion(column, parsed);
      const total = distribution.total;

      const rows = distribution.entries
        .sort((a, b) => naturalSort(a.rawCode, b.rawCode))
        .map(({ rawCode, count }) => {
          const pct = total ? (count / total) * 100 : 0;
          const option = typeof findOptionForResponse === 'function'
            ? findOptionForResponse(parsed, rawCode)
            : null;
          const displayCode = option?.code || rawCode;
          const mapped = option?.text || '';
          const displayLabel = mapped ? `${displayCode}. ${mapped}` : rawCode;

          return `
            <div class="bar-row">
              <div>${escapeHtml(displayLabel)}</div>
              <div class="bar-track"><div class="bar-fill" style="width:${Math.min(100, pct).toFixed(1)}%"></div></div>
              <div class="bar-value">${count}人 · ${pct.toFixed(1)}%</div>
            </div>`;
        }).join('');

      return `
        <article class="distribution-item">
          <h4>
            ${index + 1}. ${escapeHtml(title)}
            ${distribution.multiple ? '<span class="multi-distribution-tag">複選｜選項被選率</span>' : ''}
          </h4>
          ${rows || '<div class="status-line muted">沒有有效作答資料</div>'}
        </article>`;
    }).join('');
  };

  // 個人作答明細：複選答案以「、」串接，保留原始順位，不重新判分。
  formatAnswer = function(parsed, rawValue) {
    const raw = cleanText(rawValue);
    if (!raw) return '';
    if (!parsed) return raw;

    if (window.isMultipleQuizQuestion(parsed)) {
      const values = window.splitQuizResponseValues(raw, parsed);
      return values.join('、');
    }

    const option = typeof findOption === 'function' ? findOption(parsed, raw) : null;
    if (!option) return raw;
    return cleanText(option.code) || raw;
  };
})();
