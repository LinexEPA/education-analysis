// 題目文字解析補強：支援院內常見的「1.題目 + (1)選項」整段貼上格式。
// 也容忍從題庫複製時遺失題號後標點或換行，例如「3腦中風…」或「(4)以上皆是 3腦中風…」。
// 本檔在 app.js 後載入，覆寫同名解析函式。

function parseQuizText(raw) {
  const text = normalizeFullWidth(raw).replace(/\r\n?/g, '\n');
  const lines = text.split('\n');
  const questions = [];
  let current = null;
  let lastOption = null;

  function startQuestion(number, questionText) {
    current = {
      number: Number(number),
      question: String(questionText || '').trim(),
      options: [],
      warnings: []
    };
    questions.push(current);
    lastOption = null;
  }

  for (const rawLine of lines) {
    let line = rawLine.trim();
    if (!line) continue;

    // 題目支援：
    // [Q1] 題目、Q1 題目、第1題 題目、1.題目、1、題目、1)題目
    let qMatch = line.match(/^\[\s*Q\s*(\d+)\s*\]\s*(.*)$/i)
      || line.match(/^Q\s*(\d+)\s*[.:：、-]?\s*(.*)$/i)
      || line.match(/^第\s*(\d+)\s*題\s*[.:：、-]?\s*(.*)$/i)
      || line.match(/^(\d+)\s*[.．、:：)]\s*(.+)$/);

    if (qMatch) {
      startQuestion(qMatch[1], qMatch[2]);
      continue;
    }

    // 若上一題已經有選項，容忍下一題題號後沒有標點：例如「3腦中風維持期…」。
    // 為避免把一般數字誤判成題號，只接受「剛好是上一題 + 1」的數字。
    if (current && current.options.length >= 2) {
      const expected = current.number + 1;
      const looseQ = line.match(/^(\d+)\s*([\u3400-\u9FFF].+)$/);
      if (looseQ && Number(looseQ[1]) === expected) {
        startQuestion(looseQ[1], looseQ[2]);
        continue;
      }
    }

    // 選項支援：
    // (1)選項、[1]選項、(A)選項、[A]選項、A.選項、O.選項、X.選項
    // 數字選項刻意不支援裸寫「1.選項」，避免與「1.題目」混淆。
    const optionMatch = line.match(/^\(\s*([A-Za-z]|\d+|O|X)\s*\)\s*(.*)$/i)
      || line.match(/^\[\s*([A-Za-z]|\d+|O|X)\s*\]\s*(.*)$/i)
      || line.match(/^([A-Za-z]|O|X)\s*[.、:：)]\s*(.*)$/i);

    if (optionMatch && current) {
      let optionText = optionMatch[2].trim();

      // 有些來源會把下一題黏在上一題最後一個選項後面，例如：
      // (4)A.B.C.D.E 3腦中風維持期的復健目標為以下何者？
      // 若尾端數字剛好是下一題號，就自動切開，避免後續 (1)～(4) 被判定為重複選項。
      const expected = current.number + 1;
      const embedded = optionText.match(new RegExp(`^(.*?)(?:\\s+|　+)${expected}\\s*([\\u3400-\\u9FFF].+)$`));

      if (embedded) {
        lastOption = {
          code: normalizeCode(optionMatch[1]),
          text: embedded[1].trim()
        };
        current.options.push(lastOption);
        startQuestion(expected, embedded[2]);
        continue;
      }

      lastOption = {
        code: normalizeCode(optionMatch[1]),
        text: optionText
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
