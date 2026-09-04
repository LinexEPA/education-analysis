// 題目文字解析補強：支援院內常見的「1.題目 + (1)選項」整段貼上格式。
// 本檔在 app.js 後載入，覆寫同名解析函式。

function parseQuizText(raw) {
  const text = normalizeFullWidth(raw).replace(/\r\n?/g, '\n');
  const lines = text.split('\n');
  const questions = [];
  let current = null;
  let lastOption = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // 題目支援：
    // [Q1] 題目、Q1 題目、第1題 題目、1.題目、1、題目、1)題目
    const qMatch = line.match(/^\[\s*Q\s*(\d+)\s*\]\s*(.*)$/i)
      || line.match(/^Q\s*(\d+)\s*[.:：、-]?\s*(.*)$/i)
      || line.match(/^第\s*(\d+)\s*題\s*[.:：、-]?\s*(.*)$/i)
      || line.match(/^(\d+)\s*[.．、:：)]\s*(.+)$/);

    if (qMatch) {
      current = {
        number: Number(qMatch[1]),
        question: qMatch[2].trim(),
        options: [],
        warnings: []
      };
      questions.push(current);
      lastOption = null;
      continue;
    }

    // 選項支援：
    // (1)選項、[1]選項、(A)選項、[A]選項、A.選項、O.選項、X.選項
    // 數字選項刻意不支援裸寫「1.選項」，避免與「1.題目」混淆。
    const optionMatch = line.match(/^\(\s*([A-Za-z]|\d+|O|X)\s*\)\s*(.*)$/i)
      || line.match(/^\[\s*([A-Za-z]|\d+|O|X)\s*\]\s*(.*)$/i)
      || line.match(/^([A-Za-z]|O|X)\s*[.、:：)]\s*(.*)$/i);

    if (optionMatch && current) {
      lastOption = {
        code: normalizeCode(optionMatch[1]),
        text: optionMatch[2].trim()
      };
      current.options.push(lastOption);
      continue;
    }

    // 題幹或選項文字若換行，接續到上一段，不直接丟失。
    if (current) {
      if (lastOption) {
        lastOption.text = `${lastOption.text} ${line}`.trim();
      } else {
        current.question = `${current.question} ${line}`.trim();
      }
    }
  }

  questions.sort((a, b) => a.number - b.number);

  questions.forEach(question => {
    if (!question.question) question.warnings.push('缺少題目文字');
    if (question.options.length < 2) question.warnings.push('辨識到的選項少於 2 個');

    const unique = new Set(question.options.map(opt => normalizeCode(opt.code)));
    if (unique.size !== question.options.length) question.warnings.push('選項代碼重複');
  });

  return questions;
}
