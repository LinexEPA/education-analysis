(() => {
  const status = document.getElementById('saveStatus');
  const result = document.getElementById('result');
  let sent = false;

  async function sendIfReady() {
    if (sent || result.classList.contains('hidden') || !window.__learningStyleResult) return;
    const url = String(window.LEARNING_STYLE_SUBMIT_URL || '').trim();
    const token = String(window.LEARNING_STYLE_SUBMIT_TOKEN || '').trim();
    if (!url || !token) {
      status.textContent = '目前為測試版：結果尚未連接後端資料表。';
      return;
    }

    sent = true;
    status.textContent = '正在送出測驗資料…';

    try {
      const payload = {
        ...window.__learningStyleResult,
        token
      };

      // Apps Script Web App 與 GitHub Pages 為跨網域，因此使用 no-cors 傳送。
      // 瀏覽器只能確認請求已送出，無法讀取 Apps Script 回傳內容。
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });

      status.textContent = '資料已送出；測試階段請由管理者確認試算表是否收到。';
    } catch (err) {
      sent = false;
      status.textContent = '資料送出失敗，請通知管理者。';
      console.error(err);
    }
  }

  new MutationObserver(sendIfReady).observe(result, { attributes: true, attributeFilter: ['class'] });
})();
