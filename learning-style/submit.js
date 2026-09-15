(() => {
  const status = document.getElementById('saveStatus');
  const result = document.getElementById('result');
  let sent = false;

  async function sendIfReady() {
    if (sent || result.classList.contains('hidden') || !window.__learningStyleResult) return;
    const url = String(window.LEARNING_STYLE_SUBMIT_URL || '').trim();
    if (!url) {
      status.textContent = '目前為測試版：結果尚未寫入 Google Sheet。';
      return;
    }
    sent = true;
    status.textContent = '正在儲存結果…';
    try {
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(window.__learningStyleResult)
      });
      status.textContent = '結果已送出。';
    } catch (err) {
      sent = false;
      status.textContent = '結果儲存失敗，請通知管理者。';
      console.error(err);
    }
  }

  new MutationObserver(sendIfReady).observe(result, { attributes: true, attributeFilter: ['class'] });
})();
