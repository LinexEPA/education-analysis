(() => {
  const dobField = document.getElementById('dobField') || document.getElementById('year')?.closest('.field');
  if (!dobField) return;

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
  dobField.insertAdjacentElement('afterend', field);

  const startBtn = document.getElementById('startBtn');
  startBtn?.addEventListener('click', (e) => {
    if (!document.getElementById('education')?.value) {
      e.preventDefault();
      e.stopImmediatePropagation();
      alert('請選擇學歷。');
    }
  }, true);
})();