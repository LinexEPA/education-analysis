(() => {
  const btn = document.getElementById('pdfBtn');
  const status = document.getElementById('pdfStatus');
  if (!btn) return;

  const LABELS = [
    ['V', 'Visual 視覺型'],
    ['A', 'Aural 聽覺型'],
    ['W', 'Verbal 語文型'],
    ['P', 'Physical 動覺／實作型'],
    ['L', 'Logical 邏輯型'],
    ['S', 'Social 社交型'],
    ['I', 'Solitary 獨立型']
  ];

  function cleanFilePart(value) {
    return String(value || '')
      .trim()
      .replace(/[\\/:*?"<>|]/g, '-')
      .replace(/\s+/g, '_')
      .slice(0, 40) || '未填';
  }

  function wrapText(ctx, text, maxWidth) {
    const chars = Array.from(String(text || ''));
    const lines = [];
    let line = '';
    chars.forEach(ch => {
      const test = line + ch;
      if (line && ctx.measureText(test).width > maxWidth) {
        lines.push(line);
        line = ch;
      } else {
        line = test;
      }
    });
    if (line) lines.push(line);
    return lines;
  }

  function drawWrapped(ctx, text, x, y, maxWidth, lineHeight, maxLines = 99) {
    const lines = wrapText(ctx, text, maxWidth).slice(0, maxLines);
    lines.forEach((line, i) => ctx.fillText(line, x, y + i * lineHeight));
    return y + lines.length * lineHeight;
  }

  async function buildPdf() {
    const result = window.__learningStyleResult;
    if (!result) throw new Error('尚未完成測驗');
    if (!window.jspdf || !window.jspdf.jsPDF) throw new Error('PDF 元件尚未載入，請重新整理後再試');

    const profile = result.profile || {};
    const scores = result.scores || {};
    const radar = document.getElementById('radar');
    const advice = document.getElementById('advice')?.textContent?.trim() || '';
    const top = document.getElementById('topBadges')?.textContent?.replace(/\s+/g, ' ').trim() || '';

    // 先在瀏覽器 Canvas 產生完整 A4 頁面，再嵌入 PDF。
    // 中文由瀏覽器字型渲染，因此不需把字型檔放進 PDF。
    const page = document.createElement('canvas');
    page.width = 1240;
    page.height = 1754;
    const ctx = page.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, page.width, page.height);
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#2f3340';
    ctx.font = '700 52px system-ui, -apple-system, "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillText('新進人員學習偏好分析', 86, 78);

    ctx.font = '400 26px system-ui, -apple-system, "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillStyle = '#676b78';
    const metaParts = [
      `員工編號：${profile.emp || ''}`,
      `單位：${profile.unit || ''}`,
      profile.education ? `學歷：${profile.education}` : '',
      `測驗日期：${profile.testDate || ''}`
    ].filter(Boolean);
    ctx.fillText(metaParts.join('　｜　'), 88, 154);

    ctx.strokeStyle = '#e2dee8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(86, 208);
    ctx.lineTo(1154, 208);
    ctx.stroke();

    ctx.fillStyle = '#2f3340';
    ctx.font = '700 32px system-ui, -apple-system, "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillText('學習偏好雷達圖', 92, 246);

    if (radar) {
      const radarImg = radar.toDataURL('image/png');
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = radarImg;
      });
      ctx.drawImage(img, 78, 302, 650, 650);
    }

    ctx.font = '700 32px system-ui, -apple-system, "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillStyle = '#2f3340';
    ctx.fillText('七類分數', 770, 246);

    let sy = 310;
    LABELS.forEach(([key, label]) => {
      ctx.fillStyle = '#f7f4fa';
      ctx.fillRect(760, sy - 8, 390, 68);
      ctx.fillStyle = '#353944';
      ctx.font = '600 24px system-ui, -apple-system, "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
      ctx.fillText(label, 780, sy + 10);
      ctx.font = '800 28px system-ui, -apple-system, "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${Number(scores[key] || 0)}/20`, 1125, sy + 7);
      ctx.textAlign = 'left';
      sy += 82;
    });

    ctx.fillStyle = '#2f3340';
    ctx.font = '700 30px system-ui, -apple-system, "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillText('較突出的偏好', 92, 1010);
    ctx.font = '600 28px system-ui, -apple-system, "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillStyle = '#6f5d83';
    drawWrapped(ctx, top || '—', 92, 1056, 1060, 42, 2);

    ctx.fillStyle = '#2f3340';
    ctx.font = '700 30px system-ui, -apple-system, "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillText('學習建議', 92, 1162);
    ctx.font = '400 26px system-ui, -apple-system, "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillStyle = '#4f5360';
    drawWrapped(ctx, advice || '建議依較突出的偏好選擇適合的學習入口，並搭配其他方式交叉學習。', 92, 1210, 1060, 42, 5);

    ctx.fillStyle = '#f6f3f8';
    ctx.fillRect(86, 1450, 1068, 132);
    ctx.fillStyle = '#4f5360';
    ctx.font = '600 24px system-ui, -apple-system, "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillText('存檔提醒', 110, 1474);
    ctx.font = '400 23px system-ui, -apple-system, "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
    drawWrapped(ctx, '請將本 PDF 儲存後，依書記指示掃描護理部雲端 QR Code 上傳，作為新進人員教育資料存檔。', 110, 1514, 1010, 35, 2);

    ctx.font = '400 20px system-ui, -apple-system, "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillStyle = '#777b8a';
    drawWrapped(ctx, '本結果呈現學習偏好，作為教學與自我學習參考，不代表能力高低，也不是固定人格分類。', 88, 1640, 1060, 30, 2);

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    const imgData = page.toDataURL('image/jpeg', 0.92);
    doc.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');

    const filename = `${cleanFilePart(profile.emp)}_${cleanFilePart(profile.unit)}_${cleanFilePart(profile.testDate)}_學習偏好.pdf`;
    doc.save(filename);
    return filename;
  }

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    if (status) status.textContent = '正在產生 PDF…';
    try {
      const filename = await buildPdf();
      if (status) status.textContent = `PDF 已產生：${filename}`;
    } catch (err) {
      console.error(err);
      if (status) status.textContent = `PDF 產生失敗：${err.message || err}`;
    } finally {
      btn.disabled = false;
    }
  });
})();
