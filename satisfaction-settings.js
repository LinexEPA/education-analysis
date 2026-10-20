// 滿意度題目設定：保留「專科在職教育」公版 10 題，並可一鍵切換「教學課程」10 題。
(() => {
  const STORAGE_KEY = 'education-analysis-satisfaction-labels-v1';

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

  function sameLabels(a, b) {
    return Array.isArray(a) && Array.isArray(b)
      && a.length === b.length
      && a.every((item, index) => String(item || '').trim() === String(b[index] || '').trim());
  }

  function detectPreset(labels) {
    if (sameLabels(labels, SPECIALTY_LABELS)) return 'specialty';
    if (sameLabels(labels, TEACHING_LABELS)) return 'teaching';
    return 'custom';
  }

  function loadLabels() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (Array.isArray(saved) && saved.length === SPECIALTY_LABELS.length) {
        return saved.map((item, index) => String(item || '').trim() || SPECIALTY_LABELS[index]);
      }
    } catch (error) {
      console.warn('無法讀取滿意度題目設定：', error);
    }
    return [...SPECIALTY_LABELS];
  }

  function applyLabels(labels) {
    if (typeof SAT_LABELS === 'undefined') return;
    SAT_LABELS.splice(0, SAT_LABELS.length, ...labels);
  }

  function saveLabels(labels) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(labels));
    } catch (error) {
      console.warn('無法儲存滿意度題目設定：', error);
    }
  }

  function refreshAnalysisIfNeeded() {
    if (typeof state !== 'undefined' && state.rows?.length && typeof renderAnalysis === 'function') {
      renderAnalysis();
    }
  }

  const activeLabels = loadLabels();
  applyLabels(activeLabels);

  const quizSection = document.querySelector('#quizText')?.closest('.step-card');
  if (!quizSection) return;

  const section = document.createElement('section');
  section.className = 'step-card satisfaction-settings-card';
  section.innerHTML = `
    <details class="sat-settings-details">
      <summary class="sat-settings-summary">
        <span><strong>滿意度題目設定</strong> <span class="optional">需要更換時再開啟</span></span>
        <span class="sat-settings-hint" id="satSettingsHint"></span>
      </summary>
      <div class="sat-settings-body">
        <p class="sat-settings-copy">常規專科在職教育維持原本 10 題；若是教學課程，可直接按下按鈕切換。也可再個別修改題目文字。</p>

        <div class="sat-preset-bar" aria-label="滿意度題目快速切換">
          <span class="sat-preset-label">快速切換</span>
          <button id="useSpecialtySat" class="sat-preset-btn" type="button">專科在職教育 10 題</button>
          <button id="useTeachingSat" class="sat-preset-btn" type="button">教學課程 10 題</button>
        </div>

        <div id="satSettingsInputs" class="sat-settings-grid"></div>

        <div class="sat-settings-actions">
          <span id="satSettingsStatus" class="status-line muted">修改後會自動記住在這台瀏覽器</span>
        </div>
      </div>
    </details>
  `;
  quizSection.parentNode.insertBefore(section, quizSection);

  const inputsWrap = section.querySelector('#satSettingsInputs');
  const status = section.querySelector('#satSettingsStatus');
  const hint = section.querySelector('#satSettingsHint');
  const specialtyBtn = section.querySelector('#useSpecialtySat');
  const teachingBtn = section.querySelector('#useTeachingSat');

  function updatePresetUI(labels) {
    const preset = detectPreset(labels);

    specialtyBtn.classList.toggle('active', preset === 'specialty');
    teachingBtn.classList.toggle('active', preset === 'teaching');

    if (preset === 'specialty') {
      hint.textContent = '目前：專科在職教育 10 題';
    } else if (preset === 'teaching') {
      hint.textContent = '目前：教學課程 10 題';
    } else {
      hint.textContent = '目前：自訂 10 題';
    }
  }

  function renderInputs(labels) {
    inputsWrap.innerHTML = labels.map((label, index) => `
      <label class="sat-setting-row">
        <span>滿意度${index + 1}</span>
        <input type="text" data-sat-index="${index}" value="${escapeHtml(label)}" />
      </label>
    `).join('');
    updatePresetUI(labels);
  }

  function usePreset(key) {
    const preset = PRESETS[key];
    if (!preset) return;
    const labels = [...preset.labels];
    applyLabels(labels);
    saveLabels(labels);
    renderInputs(labels);
    status.className = 'status-line ok';
    status.textContent = `✓ 已切換為「${preset.name} 10 題」，分析與 Excel 會使用這組題目`;
    refreshAnalysisIfNeeded();
  }

  renderInputs(activeLabels);

  inputsWrap.addEventListener('input', event => {
    const input = event.target.closest('input[data-sat-index]');
    if (!input) return;
    const index = Number(input.dataset.satIndex);
    const labels = [...SAT_LABELS];
    labels[index] = input.value.trim() || SPECIALTY_LABELS[index];
    applyLabels(labels);
    saveLabels(labels);
    updatePresetUI(labels);
    status.className = 'status-line ok';
    status.textContent = '✓ 已自動儲存，分析與 Excel 會使用目前題目名稱';
    refreshAnalysisIfNeeded();
  });

  specialtyBtn.addEventListener('click', () => usePreset('specialty'));
  teachingBtn.addEventListener('click', () => usePreset('teaching'));
})();
