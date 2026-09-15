(() => {
  const unitField = document.getElementById('unit')?.closest('.field');
  if (!unitField) return;

  const field = document.createElement('div');
  field.className = 'field';
  field.innerHTML = `
    <label for="education">學歷</label>
    <select id="education" aria-label="學歷">
      <option value="">請選擇</option>
      <option value="五專">五專</option>
      <option value="二技">二技</option>
      <option value="四技">四技</option>
      <option value="大學">大學</option>
      <option value="碩班">碩班</option>
      <option value="博班">博班</option>
    </select>`;
  unitField.insertAdjacentElement('afterend', field);

  const startBtn = document.getElementById('startBtn');
  startBtn?.addEventListener('click', (e) => {
    if (!document.getElementById('education')?.value) {
      e.preventDefault();
      e.stopImmediatePropagation();
      alert('請選擇學歷。');
    }
  }, true);

  const result = document.getElementById('result');
  const addEducation = () => {
    if (result?.classList.contains('hidden') || !window.__learningStyleResult) return;
    const education = document.getElementById('education')?.value || '';
    window.__learningStyleResult.profile.education = education;
    const meta = document.getElementById('meta');
    if (meta && education && !meta.textContent.includes(education)) {
      meta.textContent += `｜${education}`;
    }
  };
  new MutationObserver(addEducation).observe(result, {attributes:true, attributeFilter:['class']});
})();
