// 滿意度題目設定：
// - 預設永遠為「專科在職教育」10 題。
// - 可切換「教學課程」10 題。
// - 可切換「自訂」，預先提供 10 個空白欄位，並可自由增減。
// - 解析測驗題目後，跳出一次提醒視窗，請使用者確認本次滿意度設定。
(() => {
  const SPECIALTY_LABELS = [
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

  const TEACHING_LABELS = [
    '教師對授課時間掌握情形',
    '教師授課內容與課程主題契合',
    '教師的專業知識能力',
    '教師的授課技巧與表達能力',
    '教師授課進行互動',
    '課程內容明確易懂',
    '課程內容豐富具有多樣性',
    '課程內容具有實用性',
    '我認為上完此課程對我有實質的幫助',
    '本次訓練有助於提昇自己的臨床教學能力'
  ];

  const PRESETS = {
    specialty: {
      name: '專科在職教育',
      labels: SPECIALTY_LABELS
    },
    teaching: {
      name: '教學課程',
      labels: TEACHING_LABELS
    }
  };

  let currentMode = 'specialty';
  let promptShown = false;

  function applyLabels(labels) {
    if (typeof SAT_LABELS === 'undefined') return;
    SAT_LABELS.splice(0, SAT_LABELS.length, ...labels);
    window.__satActiveCount = labels.length;
    window.__satSettingMode = currentMode;
  }

  window.getActiveSatisfactionColumns = function() {
    const columns = (typeof state !== 'undefined' && Array.isArray(state.satisfactionColumns))
      ? state.satisfactionColumns
      : [];
    if (window.__formResponseMode) return [...columns];
    const count = Math.max(1, Number(window.__satActiveCount) || SAT_LABELS.length || columns.length);
    return columns.slice(0, count);
  };

  function refreshAnalysisIfNeeded() {
    if (typeof state !== 'undefined' && state.rows?.length && typeof renderAnalysis === 'function') {
      renderAnalysis();
    }
  }

  // 每次開啟頁面都從專科在職教育 10 題開始，不沿用上次瀏覽器設定。
  applyLabels([...SPECIALTY_LABELS]);

  const quizSection = document.querySelector('#quizText')?.closest('.step-card');
  if (!quizSection) return;

  const section = document.createElement('section');
  section.className = 'step-card satisfaction-settings-card';
  section.innerHTML = `
    <details class="sat-settings-details">
      <summary class="sat-settings-summary">
        <span><strong>滿意度題目設定</strong> <span class="optional">預設：專科在職教育 10 題</span></span>
        <span class="sat-settings-hint" id="satSettingsHint">目前：專科在職教育 10 題</span>
      </summary>
      <div class="sat-settings-body">
        <p class="sat-settings-copy">選擇本次課程使用的滿意度題目。一般課程維持預設即可；特殊課程可切換教學課程或自訂。</p>

        <div class="sat-preset-bar" aria-label="滿意度題目快速切換">
          <span class="sat-preset-label">題型</span>
          <button id="useSpecialtySat" class="sat-preset-btn active" type="button">專科在職教育 10 題</button>
          <button id="useTeachingSat" class="sat-preset-btn" type="button">教學課程 10 題</button>
          <button id="useCustomSat" class="sat-preset-btn" type="button">自訂</button>
        </div>

        <div id="satSettingsInputs" class="sat-settings-grid"></div>

        <div id="satCustomActions" class="sat-custom-actions hidden">
          <button id="addSatItem" class="sat-custom-btn" type="button">＋ 增加一題</button>
          <span>自訂題目可增減；實際統計仍以原始檔中存在的滿意度欄位為準。</span>
        </div>

        <div class="sat-settings-actions">
          <span id="satSettingsStatus" class="status-line muted">本次頁面會使用目前設定；重新開啟時仍預設為專科在職教育 10 題。</span>
        </div>
      </div>
    </details>
  `;
  quizSection.parentNode.insertBefore(section, quizSection);

  const details = section.querySelector('.sat-settings-details');
  const inputsWrap = section.querySelector('#satSettingsInputs');
  const status = section.querySelector('#satSettingsStatus');
  const hint = section.querySelector('#satSettingsHint');
  const specialtyBtn = section.querySelector('#useSpecialtySat');
  const teachingBtn = section.querySelector('#useTeachingSat');
  const customBtn = section.querySelector('#useCustomSat');
  const customActions = section.querySelector('#satCustomActions');
  const addBtn = section.querySelector('#addSatItem');

  function isPresetMode() {
    return currentMode === 'specialty' || currentMode === 'teaching';
  }

  function updatePresetUI() {
    specialtyBtn.classList.toggle('active', currentMode === 'specialty');
    teachingBtn.classList.toggle('active', currentMode === 'teaching');
    customBtn.classList.toggle('active', currentMode === 'custom');
    customActions.classList.toggle('hidden', currentMode !== 'custom');

    if (currentMode === 'specialty') {
      hint.textContent = '目前：專科在職教育 10 題';
    } else if (currentMode === 'teaching') {
      hint.textContent = '目前：教學課程 10 題';
    } else {
      hint.textContent = `目前：自訂 ${SAT_LABELS.length} 題`;
    }
  }

  function renderInputs() {
    const removable = currentMode === 'custom';
    inputsWrap.innerHTML = SAT_LABELS.map((label, index) => `
      <div class="sat-setting-row${removable ? ' custom' : ''}">
        <span>滿意度${index + 1}</span>
        <input
          type="text"
          data-sat-index="${index}"
          value="${escapeHtml(label)}"
          placeholder="${removable ? '請輸入題目名稱' : ''}"
        />
        ${removable ? `<button class="sat-remove-btn" type="button" data-remove-sat="${index}" aria-label="移除滿意度${index + 1}">－</button>` : ''}
      </div>
    `).join('');
    updatePresetUI();
  }

  function announce(message, type = 'ok') {
    status.className = `status-line ${type}`;
    status.textContent = message;
  }

  function usePreset(key, options = {}) {
    const preset = PRESETS[key];
    if (!preset) return;
    currentMode = key;
    applyLabels([...preset.labels]);
    renderInputs();
    announce(`✓ 已切換為「${preset.name} 10 題」；分析與 Excel 會使用這組題目。`);
    refreshAnalysisIfNeeded();
    if (options.openSettings) {
      details.open = true;
      section.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function useCustom(options = {}) {
    currentMode = 'custom';
    const count = options.keepCurrent ? Math.max(1, SAT_LABELS.length) : 10;
    const labels = options.keepCurrent ? [...SAT_LABELS] : Array(count).fill('');
    applyLabels(labels);
    renderInputs();
    announce('✓ 已切換為自訂題型；先提供 10 個空白欄位，可自行增加、刪除或填入題目名稱。');
    refreshAnalysisIfNeeded();
    if (options.openSettings !== false) {
      details.open = true;
      setTimeout(() => section.scrollIntoView({ behavior: 'smooth', block: 'center' }), 40);
    }
  }

  function switchEditedPresetToCustom() {
    if (!isPresetMode()) return;
    currentMode = 'custom';
    window.__satSettingMode = currentMode;
    updatePresetUI();
  }

  renderInputs();

  inputsWrap.addEventListener('input', event => {
    const input = event.target.closest('input[data-sat-index]');
    if (!input) return;

    const index = Number(input.dataset.satIndex);
    const value = input.value;

    if (isPresetMode()) {
      currentMode = 'custom';
      SAT_LABELS[index] = value;
      window.__satSettingMode = currentMode;
      window.__satActiveCount = SAT_LABELS.length;
      renderInputs();
      const nextInput = inputsWrap.querySelector(`input[data-sat-index="${index}"]`);
      nextInput?.focus();
      if (nextInput) nextInput.setSelectionRange(nextInput.value.length, nextInput.value.length);
    } else {
      SAT_LABELS[index] = value;
      window.__satActiveCount = SAT_LABELS.length;
      hint.textContent = `目前：自訂 ${SAT_LABELS.length} 題`;
    }

    announce('✓ 已更新自訂滿意度題目。');
    refreshAnalysisIfNeeded();
  });

  inputsWrap.addEventListener('click', event => {
    const button = event.target.closest('button[data-remove-sat]');
    if (!button || currentMode !== 'custom') return;
    if (SAT_LABELS.length <= 1) {
      announce('至少保留 1 個滿意度欄位。', 'warn');
      return;
    }

    const index = Number(button.dataset.removeSat);
    SAT_LABELS.splice(index, 1);
    window.__satActiveCount = SAT_LABELS.length;
    renderInputs();
    announce(`✓ 已調整為自訂 ${SAT_LABELS.length} 題。`);
    refreshAnalysisIfNeeded();
  });

  addBtn.addEventListener('click', () => {
    if (currentMode !== 'custom') return;
    SAT_LABELS.push('');
    window.__satActiveCount = SAT_LABELS.length;
    renderInputs();
    announce(`✓ 已增加一題，目前自訂 ${SAT_LABELS.length} 題。`);
    refreshAnalysisIfNeeded();
    const allInputs = inputsWrap.querySelectorAll('input[data-sat-index]');
    allInputs[allInputs.length - 1]?.focus();
  });

  specialtyBtn.addEventListener('click', () => usePreset('specialty'));
  teachingBtn.addEventListener('click', () => usePreset('teaching'));
  customBtn.addEventListener('click', () => useCustom());

  // ---------- 解析題目後提醒 ----------
  const modal = document.createElement('div');
  modal.className = 'sat-reminder-modal hidden';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'satReminderTitle');
  modal.innerHTML = `
    <div class="sat-reminder-backdrop" data-close-sat-reminder></div>
    <div class="sat-reminder-dialog">
      <button class="sat-reminder-close" type="button" aria-label="關閉" data-close-sat-reminder>×</button>
      <div class="sat-reminder-icon">♡</div>
      <p class="sat-reminder-eyebrow">題目已解析</p>
      <h3 id="satReminderTitle">請確認這次的滿意度題目</h3>
      <p class="sat-reminder-copy">預設使用「專科在職教育 10 題」。如果本次課程不同，可在這裡直接切換。</p>

      <div class="sat-reminder-options">
        <button type="button" class="sat-reminder-choice recommended" data-sat-choice="specialty">
          <strong>專科在職教育</strong>
          <span>預設 10 題</span>
        </button>
        <button type="button" class="sat-reminder-choice" data-sat-choice="teaching">
          <strong>教學課程</strong>
          <span>教學能力相關 10 題</span>
        </button>
        <button type="button" class="sat-reminder-choice" data-sat-choice="custom">
          <strong>自訂</strong>
          <span>10 個空白欄位，可增減</span>
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  function openReminder() {
    modal.classList.remove('hidden');
    document.body.classList.add('sat-modal-open');
  }

  function closeReminder() {
    modal.classList.add('hidden');
    document.body.classList.remove('sat-modal-open');
  }

  modal.addEventListener('click', event => {
    if (event.target.closest('[data-close-sat-reminder]')) {
      closeReminder();
      return;
    }

    const choice = event.target.closest('[data-sat-choice]')?.dataset.satChoice;
    if (!choice) return;

    if (choice === 'specialty') {
      usePreset('specialty');
      closeReminder();
    } else if (choice === 'teaching') {
      usePreset('teaching');
      closeReminder();
    } else if (choice === 'custom') {
      useCustom({ openSettings: true });
      closeReminder();
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !modal.classList.contains('hidden')) closeReminder();
  });

  // app.js 的解析事件先執行；此監聽器後執行，再依解析結果決定是否提醒。
  const parseBtn = document.getElementById('parseQuizBtn');
  parseBtn?.addEventListener('click', () => {
    setTimeout(() => {
      if (promptShown) return;
      if (window.__formResponseMode) return;
      if (!document.getElementById('quizText')?.value.trim()) return;
      if (!state.parsedQuiz?.length) return;

      promptShown = true;
      openReminder();
    }, 0);
  });

  document.getElementById('resetBtn')?.addEventListener('click', () => {
    promptShown = false;
    currentMode = 'specialty';
    applyLabels([...SPECIALTY_LABELS]);
    renderInputs();
    announce('已恢復預設：專科在職教育 10 題。', 'muted');
  });
})();
