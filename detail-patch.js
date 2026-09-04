// 個人作答明細：只保留作答選項代碼，不帶選項內文。
function formatAnswer(parsed, rawValue) {
  const raw = cleanText(rawValue);
  if (!raw) return '';
  if (!parsed) return raw;

  const option = findOption(parsed, raw);
  if (!option) return raw;

  return cleanText(option.code) || raw;
}
