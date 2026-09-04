// 滿意度題目設定：預設使用護理部公版 10 題，可臨時修改並一鍵恢復。
(() => {
  const STORAGE_KEY = 'education-analysis-satisfaction-labels-v1';
  const DEFAULT_LABELS = [
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

  function loadLabels() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (Array.isArray(saved) && saved.length === DEFAULT_LABELS.length) {
        return saved.map((item, index) => String(item || '').trim() || DEFAULT_LABELS[index]);
      }
    } catch (error) {
      console.warn('無法讀取滿意度題目設定：', error);
    }
    return [...DEFAULT_LABELS];
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
        <span class="sat-settings-hint">目前使用護理部預設 10 題</span>
      </summary>
      <div class="sat-settings-body">
        <p class="sat-settings-copy">一般課程不用修改。特殊課程若更換滿意度文字，只改這裡；統計與 Excel 會同步使用新名稱。</p>
        <div id="satSettingsInputs" class="sat-settings-grid"></div>
        <div class="sat-settings-actions">
          <button id="resetSatDefaults" class="secondary-btn" type="button">恢復預設10題</button>
          <span id="satSettingsStatus" class="status-line muted">修改後會自動記住在這台瀏覽器</span>
        </div>
      </div>
    </details>
  `;
  quizSection.parentNode.insertBefore(section, quizSection);

  const inputsWrap = section.querySelector('#satSettingsInputs');
  const status = section.querySelector('#satSettingsStatus');

  function renderInputs(labels) {
    inputsWrap.innerHTML = labels.map((label, index) => `
      <label class="sat-setting-row">
        <span>滿意度${index + 1}</span>
        <input type="text" data-sat-index="${index}" value="${escapeHtml(label)}" />
      </label>
    `).join('');
  }

  renderInputs(activeLabels);

  inputsWrap.addEventListener('input', event => {
    const input = event.target.closest('input[data-sat-index]');
    if (!input) return;
    const index = Number(input.dataset.satIndex);
    const labels = [...SAT_LABELS];
    labels[index] = input.value.trim() || DEFAULT_LABELS[index];
    applyLabels(labels);
    saveLabels(labels);
    status.className = 'status-line ok';
    status.textContent = '✓ 已自動儲存，分析與 Excel 會使用目前題目名稱';
    refreshAnalysisIfNeeded();
  });

  section.querySelector('#resetSatDefaults').addEventListener('click', () => {
    const labels = [...DEFAULT_LABELS];
    applyLabels(labels);
    saveLabels(labels);
    renderInputs(labels);
    status.className = 'status-line ok';
    status.textContent = '✓ 已恢復護理部預設 10 題';
    refreshAnalysisIfNeeded();
  });
})();
