// 完整 PDF 頁面方向：第一頁「滿意度統計表」維持 A4 直式；後續明細／題庫統一 A4 橫式。
// 必須在 pdf-export.js 之前載入。

(function setMixedPdfOrientation() {
  if (!window.jspdf?.jsPDF || window.__mixedPdfOrientationApplied) return;

  const OriginalJsPDF = window.jspdf.jsPDF;

  function MixedOrientationJsPDF(options, ...rest) {
    // 第一頁固定直式，符合院內滿意度統計表的使用習慣。
    let normalized = options;
    if (options && typeof options === 'object' && !Array.isArray(options)) {
      normalized = { ...options, orientation: 'portrait' };
    }

    const instance = new OriginalJsPDF(normalized, ...rest);
    const originalAddPage = instance.addPage.bind(instance);

    // 第二頁之後全部固定橫式，避免題庫頁面方向來回切換。
    instance.addPage = function(format) {
      return originalAddPage(format || 'a4', 'landscape');
    };

    return instance;
  }

  Object.keys(OriginalJsPDF).forEach(key => {
    try { MixedOrientationJsPDF[key] = OriginalJsPDF[key]; } catch (_) {}
  });

  window.jspdf.jsPDF = MixedOrientationJsPDF;
  window.__mixedPdfOrientationApplied = true;
})();
