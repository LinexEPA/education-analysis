// 完整 PDF 統一使用 A4 橫式，避免同一份 PDF 在直式／橫式之間切換。
// 必須在 pdf-export.js 之前載入。

(function forceLandscapePdfPages() {
  if (!window.jspdf?.jsPDF || window.__uniformLandscapePdfApplied) return;

  const OriginalJsPDF = window.jspdf.jsPDF;

  function LandscapeJsPDF(options, ...rest) {
    let normalized = options;
    if (options && typeof options === 'object' && !Array.isArray(options)) {
      normalized = { ...options, orientation: 'landscape' };
    }

    const instance = new OriginalJsPDF(normalized, ...rest);
    const originalAddPage = instance.addPage.bind(instance);

    instance.addPage = function(format, orientation) {
      return originalAddPage(format || 'a4', 'landscape');
    };

    return instance;
  }

  Object.keys(OriginalJsPDF).forEach(key => {
    try { LandscapeJsPDF[key] = OriginalJsPDF[key]; } catch (_) {}
  });

  window.jspdf.jsPDF = LandscapeJsPDF;
  window.__uniformLandscapePdfApplied = true;
})();
