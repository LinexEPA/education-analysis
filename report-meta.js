// 報表上方基本資料：使用者可自由填寫；留白就不硬補。
// 回收率若未填，但有填參與人數，會用「問卷回收筆數 ÷ 參與人數」自動計算。

const REPORT_META_KEY = 'education-analysis-report-meta-v1';

window.getReportMeta = function(rows = (window.state?.rows || [])) {
  const lecturer = cleanMetaText(document.getElementById('metaLecturer')?.value || '');
  const participantRaw = cleanMetaText(document.getElementById('metaParticipants')?.value || '');
  const dateRaw = cleanMetaText(document.getElementById('metaDate')?.value || '');
  const responseRaw = cleanMetaText(document.getElementById('metaResponseRate')?.value || '');

  const participantNumber = participantRaw === '' ? null : Number(participantRaw);
  let responseNumber = responseRaw === '' ? null : Number(responseRaw);
  if (responseNumber == null && participantNumber && participantNumber > 0) {
    responseNumber = (rows.length / participantNumber) * 100;
  }

  return {
    lecturer,
    participantCount: Number.isFinite(participantNumber) ? participantNumber : '',
    date: dateRaw,
    dateDisplay: dateRaw ? dateRaw.replace(/-/g, '/') : '',
    responseRate: Number.isFinite(responseNumber) ? responseNumber : '',
    returnedCount: rows.length
  };
};

(function initReportMetaEditor() {
  const outputStep = document.getElementById('outputStep');
  if (!outputStep || document.getElementById('reportMetaBox')) return;

  const saved = loadSavedMeta();
  const box = document.createElement('div');
  box.id = 'reportMetaBox';
  box.className = 'report-meta-box';
  box.innerHTML = `
    <div class="report-meta-title">
      <div>
        <strong>報表上方資料</strong>
        <span>選填；填入後會直接帶進滿意度統計表</span>
      </div>
    </div>
    <div class="report-meta-grid">
      <label>
        <span>講師</span>
        <input id="metaLecturer" type="text" placeholder="例如：王○○" />
      </label>
      <label>
        <span>參與人數</span>
        <input id="metaParticipants" type="number" min="0" step="1" placeholder="例如：8" />
      </label>
      <label>
        <span>日期</span>
        <input id="metaDate" type="date" />
      </label>
      <label>
        <span>回收率（%）</span>
        <input id="metaResponseRate" type="number" min="0" step="0.1" placeholder="留白可自動計算" />
      </label>
    </div>
    <div class="report-meta-note">回收率留白時，只要有填「參與人數」，系統會用問卷回收筆數 ÷ 參與人數自動計算。</div>
  `;

  const exportBtn = document.getElementById('exportBtn');
  outputStep.insertBefore(box, exportBtn);

  document.getElementById('metaLecturer').value = saved.lecturer || '';
  document.getElementById('metaParticipants').value = saved.participantCount ?? '';
  document.getElementById('metaDate').value = saved.date || '';
  document.getElementById('metaResponseRate').value = saved.responseRate ?? '';

  ['metaLecturer', 'metaParticipants', 'metaDate', 'metaResponseRate'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', saveMeta);
    document.getElementById(id)?.addEventListener('change', saveMeta);
  });

  const description = outputStep.querySelector('.step-heading p');
  if (description) {
    description.textContent = '可先補上報表資料，再下載完整 Excel；滿意度統計表也可直接輸出 PDF。';
  }
})();

function saveMeta() {
  try {
    const payload = {
      lecturer: document.getElementById('metaLecturer')?.value || '',
      participantCount: document.getElementById('metaParticipants')?.value || '',
      date: document.getElementById('metaDate')?.value || '',
      responseRate: document.getElementById('metaResponseRate')?.value || ''
    };
    localStorage.setItem(REPORT_META_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('報表資料未能保存於瀏覽器：', error);
  }
}

function loadSavedMeta() {
  try {
    return JSON.parse(localStorage.getItem(REPORT_META_KEY) || '{}') || {};
  } catch (error) {
    return {};
  }
}

function cleanMetaText(value) {
  return String(value ?? '').replace(/\u3000/g, ' ').trim();
}
