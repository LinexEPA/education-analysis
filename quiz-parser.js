// 題目文字解析補強：
// 1) 支援常見的「1.題目 + (1)選項」格式。
// 2) 支援選項不用括號：題目下一行可直接寫 1.選項、2.選項、3.選項、4.選項。
// 3) 支援同一行貼上：1.題目 1.選項 2.選項 3.選項 4.選項，不必手動換行。
// 4) 正確答案只接受使用者明確提供（答案：3／正確答案：B），不從學員成績反推。
// 本檔在 app.js 後載入，覆寫同名解析函式。

function parseQuizText(raw) {
  const text = normalizeFullWidth(raw).replace(/\r\n?/g, '\n');
  const lines = text.split('\n');
  const questions = [];
  let current = null;
  let lastOption = null;

  function startQuestion(number, questionText) {
    const answerInfo = stripExplicitAnswer(String(questionText || ''));
    current = {
      number: Number(number),
      question: answerInfo.text.trim(),
      options: [],
      correctAnswer: answerInfo.answer || '',
      warnings: []
    };
    questions.push(current);
    lastOption = null;

    // 題目與選項整段黏在同一行時，自動拆開。
    const inline = extractInlineOptionSequence(current.question);
    if (inline) {
      current.question = inline.prefix.trim();
      inline.options.forEach(option => addOption(option.code, option.text));
    }
  }

  function addOption(code, optionText) {
    if (!current) return;
    const answerInfo = stripExplicitAnswer(String(optionText || ''));
    lastOption = {
      code: normalizeCode(code),
      text: answerInfo.text.trim()
    };
    current.options.push(lastOption);
    if (answerInfo.answer) current.correctAnswer = normalizeCode(answerInfo.answer);
  }

  for (const rawLine of lines) {
    let line = rawLine.trim();
    if (!line) continue;

    // 明確答案：答案：3、正確答案 B、[答案] 2、Answer: A、Ans=C。
    const answerMatch = line.match(/^\[?\s*(?:正確答案|標準答案|答案|answer|ans)\s*\]?\s*[:：=]?\s*[\(\[]?\s*([A-Za-z]|\d+|O|X)\s*[\)\]]?\s*$/i);
    if (answerMatch && current) {
      current.correctAnswer = normalizeCode(answerMatch[1]);
      continue;
    }

    // 若目前已有題目，先處理「裸數字」的歧義：
    // 既可能是選項（1.選項、2.選項），也可能是下一題（5.題目）。
    // 若目前已有至少 2 個選項，且數字剛好是下一題號，同時：
    // - 已有 4 個以上選項，或
    // - 文字看起來像問句
    // 就優先視為下一題，避免 Q5 被誤吃成 Q4 的第 5 個選項。
    if (current) {
      const bareNumbered = line.match(/^(\d+)\s*[.．、:：)]\s*(.*)$/);
      if (bareNumbered) {
        const number = Number(bareNumbered[1]);
        const body = String(bareNumbered[2] || '').trim();
        const looksLikeQuestion = /[？?]$/.test(body)
          || /下列何者|何者最|何者正確|為何|何時|如何|是否|什麼|哪一|評估|確認|判斷/.test(body);
        const isNextQuestion = current.options.length >= 2
          && number === current.number + 1
          && (current.options.length >= 4 || looksLikeQuestion);

        if (isNextQuestion) {
          startQuestion(number, body);
          continue;
        }

        const expectedOption = current.options.length + 1;
        if (number === expectedOption) {
          addOption(bareNumbered[1], body);
          continue;
        }
      }

      // 同一行包含多個選項，例如：
      // (1)甲 (2)乙 (3)丙 (4)丁
      // 1.甲 2.乙 3.丙 4.丁
      const inlineOnly = extractInlineOptionSequence(line);
      if (inlineOnly && !inlineOnly.prefix.trim()) {
        inlineOnly.options.forEach(option => addOption(option.code, option.text));
        continue;
      }
    }

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
    // 為避免把一般數字誤判成題號，只接受「剛好是上一題 + 1」。
    if (current && current.options.length >= 2) {
      const expected = current.number + 1;
      const looseQ = line.match(/^(\d+)\s*([\u3400-\u9FFF].+)$/);
      if (looseQ && Number(looseQ[1]) === expected) {
        startQuestion(looseQ[1], looseQ[2]);
        continue;
      }
    }

    // 括號／字母選項：
    // (1)選項、[1]選項、(A)選項、[A]選項、A.選項、O.選項、X.選項
    const optionMatch = line.match(/^\(\s*([A-Za-z]|\d+|O|X)\s*\)\s*(.*)$/i)
      || line.match(/^\[\s*([A-Za-z]|\d+|O|X)\s*\]\s*(.*)$/i)
      || line.match(/^([A-Za-z]|O|X)\s*[.、:：)]\s*(.*)$/i);

    if (optionMatch && current) {
      let optionText = optionMatch[2].trim();

      // 有些來源會把下一題黏在上一題最後一個選項後面，例如：
      // (4)A.B.C.D.E 3腦中風維持期的復健目標為以下何者？
      const expected = current.number + 1;
      const embedded = optionText.match(new RegExp(`^(.*?)(?:\\s+|　+)${expected}\\s*([\\u3400-\\u9FFF].+)$`));

      if (embedded) {
        addOption(optionMatch[1], embedded[1]);
        startQuestion(expected, embedded[2]);
        continue;
      }

      // 一行內如果還接著其他括號選項，也一起拆開。
      const reconstructed = `(${optionMatch[1]})${optionText}`;
      const inline = extractInlineOptionSequence(reconstructed);
      if (inline && inline.options.length >= 2) {
        inline.options.forEach(option => addOption(option.code, option.text));
      } else {
        addOption(optionMatch[1], optionText);
      }
      continue;
    }

    // 題幹或選項文字若換行，接續到上一段，不直接丟失。
    if (current) {
      if (lastOption) {
        const answerInfo = stripExplicitAnswer(`${lastOption.text} ${line}`.trim());
        lastOption.text = answerInfo.text.trim();
        if (answerInfo.answer) current.correctAnswer = normalizeCode(answerInfo.answer);
      } else {
        const joined = `${current.question} ${line}`.trim();
        const inline = extractInlineOptionSequence(joined);
        if (inline) {
          current.question = inline.prefix.trim();
          inline.options.forEach(option => addOption(option.code, option.text));
        } else {
          const answerInfo = stripExplicitAnswer(joined);
          current.question = answerInfo.text.trim();
          if (answerInfo.answer) current.correctAnswer = normalizeCode(answerInfo.answer);
        }
      }
    }
  }

  questions.sort((a, b) => a.number - b.number);

  questions.forEach(question => {
    if (!question.question) question.warnings.push('缺少題目文字');
    if (question.options.length < 2) question.warnings.push('辨識到的選項少於 2 個');

    const unique = new Set(question.options.map(opt => normalizeCode(opt.code)));
    if (unique.size !== question.options.length) question.warnings.push('選項代碼重複');

    if (question.correctAnswer) {
      const codes = new Set(question.options.map(opt => normalizeCode(opt.code)));
      if (question.options.length && !codes.has(normalizeCode(question.correctAnswer))) {
        question.warnings.push('提供的正確答案未對應到已辨識選項');
      }
    }
  });

  return questions;
}

function stripExplicitAnswer(value) {
  const text = String(value || '').trim();
  const match = text.match(/^(.*?)(?:\s+|　+)?\[?\s*(?:正確答案|標準答案|答案|answer|ans)\s*\]?\s*[:：=]?\s*[\(\[]?\s*([A-Za-z]|\d+|O|X)\s*[\)\]]?\s*$/i);
  if (!match) return { text, answer: '' };

  // 避免把整段普通文字中剛好出現「答案」兩字誤切；答案標記需位於尾端。
  return {
    text: String(match[1] || '').trim(),
    answer: normalizeCode(match[2])
  };
}

function extractInlineOptionSequence(value) {
  const text = String(value || '');
  if (!text.trim()) return null;

  // 優先：括號／方括號格式，可沒有空白或換行。
  const bracketMatches = collectMatches(text, /[\(\[]\s*([A-Za-z]|\d+|O|X)\s*[\)\]]\s*/gi);
  const bracketSequence = chooseOptionSequence(bracketMatches, false);
  if (bracketSequence) return splitByMarkers(text, bracketSequence);

  // 其次：裸數字 1. 2. 3. 4.。至少形成連續 1→2 的序列才視為選項。
  // 可直接黏在題幹後，例如「請選擇四項1.甲2.乙3.丙4.丁」。
  const numericMatches = collectMatches(text, /(\d{1,2})\s*[.．、:：)]\s*/g)
    .filter(item => {
      const before = item.index > 0 ? text[item.index - 1] : '';
      return !/[0-9]/.test(before);
    });

  const numericSequence = chooseOptionSequence(numericMatches, true);
  if (numericSequence) return splitByMarkers(text, numericSequence);

  return null;
}

function collectMatches(text, regex) {
  const matches = [];
  let match;
  while ((match = regex.exec(text))) {
    matches.push({
      code: normalizeCode(match[1]),
      index: match.index,
      end: regex.lastIndex
    });
    if (match.index === regex.lastIndex) regex.lastIndex += 1;
  }
  return matches;
}

function chooseOptionSequence(matches, numericOnly) {
  if (!matches.length) return null;

  if (!numericOnly) {
    // 括號格式只要同一段有至少兩個選項標記即可。
    if (matches.length >= 2) return matches;
    return null;
  }

  // 裸數字必須從 1 開始，並且連續 1、2（通常會一路到 3、4），
  // 避免把題幹中的單一數字／劑量誤判成選項。
  let best = null;
  for (let i = 0; i < matches.length; i += 1) {
    if (Number(matches[i].code) !== 1) continue;
    const seq = [matches[i]];
    let expected = 2;
    for (let j = i + 1; j < matches.length; j += 1) {
      const code = Number(matches[j].code);
      if (code === expected) {
        seq.push(matches[j]);
        expected += 1;
      } else if (code === 1) {
        break;
      }
    }
    if (seq.length >= 2 && (!best || seq.length > best.length)) best = seq;
  }
  return best;
}

function splitByMarkers(text, markers) {
  if (!markers?.length) return null;
  const prefix = text.slice(0, markers[0].index).trim();
  const options = markers.map((marker, index) => {
    const next = markers[index + 1];
    const end = next ? next.index : text.length;
    const rawText = text.slice(marker.end, end).trim();
    return {
      code: marker.code,
      text: rawText
    };
  });

  return { prefix, options };
}
