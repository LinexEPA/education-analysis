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

  function isIOSDevice() {
    return /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  if (isIOSDevice()) btn.textContent = '儲存／分享 PDF';

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

  function buildPdf() {
    const result = window.__learningStyleResult;
    if (!result) throw new Error('尚未完成測驗');
    if (!window.jspdf || !window.jspdf.jsPDF) throw new Error('PDF 元件尚未載入，請重新整理後再試');

    const profile = result.profile || {};
    const scores = result.scores || {};
    const guidance = window.__teachingGuidance || {};
    const radar = document.getElementById('radar');
    const advice = document.getElementById('advice')?.textContent?.trim() || '';
    const top = document.getElementById('topBadges')?.textContent?.replace(/\s+/g, ' ').trim() || '';

    const page = document.createElement('canvas');
    page.width = 1240;
    page.height = 1754;
    const ctx = page.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, page.width, page.height);
    ctx.textBaseline = 'top';

    ctx.fillStyle = '#2f3340';
    ctx.font = '700 50px system-ui, -apple-system, "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillText('新進人員學習偏好分析', 82, 62);

    ctx.font = '400 23px system-ui, -apple-system, "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillStyle = '#676b78';
    const metaLine1 = [
      `員工編號：${profile.emp || ''}`,
      `單位：${profile.unit || ''}`,
      profile.education ? `學歷：${profile.education}` : '',
      `測驗日期：${profile.testDate || ''}`
    ].filter(Boolean).join('　｜　');
    ctx.fillText(metaLine1, 84, 132);

    const metaLine2 = [
      profile.ageBand ? `年齡層：${profile.ageBand}` : '',
      profile.zodiac ? `星座：${profile.zodiac}` : ''
    ].filter(Boolean).join('　｜　');
    if (metaLine2) ctx.fillText(metaLine2, 84, 166);

    ctx.strokeStyle = '#e2dee8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(82, 210);
    ctx.lineTo(1158, 210);
    ctx.stroke();

    ctx.fillStyle = '#2f3340';
    ctx.font = '700 30px system-ui, -apple-system, "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillText('學習偏好雷達圖', 86, 238);
    ctx.fillText('七類分數', 704, 238);

    if (radar) ctx.drawImage(radar, 68, 286, 570, 570);

    let sy = 294;
    LABELS.forEach(([key, label]) => {
      ctx.fillStyle = '#f7f4fa';
      ctx.fillRect(690, sy - 4, 466, 58);
      ctx.fillStyle = '#353944';
      ctx.font = '600 22px system-ui, -apple-system, "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
      ctx.fillText(label, 712, sy + 11);
      ctx.font = '800 25px system-ui, -apple-system, "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${Number(scores[key] || 0)}/20`, 1128, sy + 8);
      ctx.textAlign = 'left';
      sy += 66;
    });

    ctx.fillStyle = '#2f3340';
    ctx.font = '700 28px system-ui, -apple-system, "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillText('較突出的偏好', 86, 878);
    ctx.font = '700 26px system-ui, -apple-system, "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillStyle = '#6f5d83';
    drawWrapped(ctx, top || '—', 86, 918, 1070, 36, 2);

    ctx.fillStyle = '#2f3340';
    ctx.font = '700 28px system-ui, -apple-system, "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillText('給學員的學習建議', 86, 988);
    ctx.font = '400 23px system-ui, -apple-system, "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillStyle = '#4f5360';
    drawWrapped(ctx, advice || '可以先從自己比較容易上手的方式開始，再搭配其他方法一起學。', 86, 1028, 1070, 34, 3);

    ctx.fillStyle = '#f8f5fb';
    ctx.fillRect(72, 1130, 1096, 322);
    ctx.fillStyle = '#2f3340';
    ctx.font = '700 29px system-ui, -apple-system, "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillText('給帶教老師的小提醒', 96, 1154);

    ctx.font = '700 23px system-ui, -apple-system, "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillStyle = '#5d4e6a';
    drawWrapped(ctx, `這位學員怎麼帶比較順？ ${guidance.start || '先從他比較容易上手的方式開始，再依實際表現調整。'}`, 96, 1198, 1024, 32, 2);

    ctx.font = '400 22px system-ui, -apple-system, "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillStyle = '#4f5360';
    drawWrapped(ctx, `老師可以這樣做：${guidance.methods || '先示範或說明一小段，再讓學員自己做、自己說，當下給具體回饋。'}`, 96, 1272, 1024, 31, 2);

    const qs = Array.isArray(guidance.questions) ? guidance.questions.slice(0, 2).join('　／　') : '';
    drawWrapped(ctx, `可以直接問：${qs || '「你現在怎麼想？」／「下一次你會怎麼做？」'}`, 96, 1346, 1024, 31, 2);

    ctx.fillStyle = '#f6f3f8';
    ctx.fillRect(72, 1466, 1096, 96);
    ctx.fillStyle = '#4f5360';
    ctx.font = '600 21px system-ui, -apple-system, "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillText('存檔提醒', 94, 1484);
    ctx.font = '400 19px system-ui, -apple-system, "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
    drawWrapped(ctx, '請將本 PDF 儲存後，依書記指示掃描護理部雲端 QR Code 上傳，作為新進人員教育資料存檔。', 94, 1517, 1030, 26, 2);

    ctx.font = '400 16px system-ui, -apple-system, "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillStyle = '#777b8a';
    drawWrapped(ctx, '本結果僅作新進人員學習與帶教參考，不作心理診斷或能力判定。', 82, 1610, 1080, 24, 2);
    drawWrapped(ctx, '官方網站：Learning-Styles-Online.com', 82, 1652, 1080, 24, 2);

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    const imgData = page.toDataURL('image/jpeg', 0.92);
    doc.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');

    const filename = `${cleanFilePart(profile.emp)}_${cleanFilePart(profile.unit)}_${cleanFilePart(profile.testDate)}_學習偏好.pdf`;
    return { doc, filename };
  }

  async function savePdf(doc, filename) {
    if (isIOSDevice()) {
      const blob = doc.output('blob');
      const file = new File([blob], filename, { type: 'application/pdf' });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: '新進人員學習偏好分析' });
        return 'shared';
      }

      const url = URL.createObjectURL(blob);
      const opened = window.open(url, '_blank');
      if (!opened) {
        URL.revokeObjectURL(url);
        throw new Error('此內嵌瀏覽器無法儲存 PDF，請用 Safari 開啟本頁後再試');
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      return 'preview';
    }

    doc.save(filename);
    return 'downloaded';
  }

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    if (status) status.textContent = '正在產生 PDF…';

    try {
      const { doc, filename } = buildPdf();
      const action = await savePdf(doc, filename);

      if (!status) return;
      if (action === 'shared') {
        status.textContent = `PDF 已產生：${filename}。建議優先選「儲存到檔案」，再依書記指示上傳護理部雲端。`;
      } else if (action === 'preview') {
        status.textContent = `PDF 已開啟預覽：${filename}。請從瀏覽器分享功能選擇「儲存到檔案」。`;
      } else {
        status.textContent = `PDF 已下載：${filename}`;
      }
    } catch (err) {
      console.error(err);
      if (status) {
        if (err && err.name === 'AbortError') {
          status.textContent = '已取消 PDF 儲存；需要時可再按一次。';
        } else {
          status.textContent = `PDF 產生失敗：${err.message || err}`;
        }
      }
    } finally {
      btn.disabled = false;
    }
  });
})();
