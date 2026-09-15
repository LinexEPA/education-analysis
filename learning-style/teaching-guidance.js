(() => {
  const resultPanel = document.getElementById('result');
  if (!resultPanel) return;

  const ORDER = ['V', 'A', 'W', 'P', 'L', 'S', 'I'];
  const NAMES = {
    V: 'Visual 視覺',
    A: 'Aural 聽覺',
    W: 'Verbal 語文',
    P: 'Physical 動覺／實作',
    L: 'Logical 邏輯',
    S: 'Social 社交',
    I: 'Solitary 獨立'
  };

  const SINGLE = {
    V: {
      start: '先讓學員看見整體架構與關鍵線索，再進入細節。',
      methods: '可先用流程圖、位置關係、示意圖或關鍵線索標示；完成後請學員自己重新排列、畫出或說明整體流程。',
      questions: ['你可以把剛才的資訊整理成一個流程給我看嗎？', '你目前看到最重要的三個線索是什麼？']
    },
    A: {
      start: '用短而有重點的口頭說明起步，再讓學員自己說一次。',
      methods: '老師可適度把判斷過程說出來（think aloud），但避免一路講到底；之後請學員用自己的話重述、提問與確認。',
      questions: ['你用自己的話說一次，剛才最重要的是什麼？', '你目前為什麼會做這個判斷？']
    },
    W: {
      start: '先給清楚的關鍵字或短文字架構，再讓學員整理成自己的版本。',
      methods: '使用簡短 checklist、關鍵字或 1–3 句重點；避免一次丟大量文字。完成後請學員寫短摘要或重新組織重點。',
      questions: ['如果只能留下三句話，你會寫什麼？', '你會用哪幾個關鍵字提醒自己？']
    },
    P: {
      start: '講解不要太久，短示範後盡快讓學員實際做。',
      methods: '採「短示範 → 立即操作 → 即時回饋 → 再做一次」；複雜技能可先分段，熟悉後再整合成完整流程。',
      questions: ['這一段你先做，我只在關鍵安全點提醒你。', '實際做完後，你發現哪裡和原本想的不一樣？']
    },
    L: {
      start: '先說清楚關鍵原理、因果與判斷規則，再進入情境應用。',
      methods: '除了 SOP，也要說明「為什麼」與例外；適合比較兩個相近情境，找出哪個線索會改變決策。',
      questions: ['哪一個資訊如果改變，你的處置就會跟著改？', '你現在最重要的判斷依據是什麼？']
    },
    S: {
      start: '先聽學員怎麼想，再透過互動與回饋一起修正。',
      methods: '可用短問答、共同推理、teach-back 或同儕討論；老師先引出學員想法，再補足缺少的資訊。',
      questions: ['先告訴我你的想法，我們一起找還缺什麼資訊。', '如果要教同學這一段，你會怎麼說？']
    },
    I: {
      start: '先給短暫獨立整理時間，再要求學員說出做法與理由。',
      methods: '可先讓學員自行評估、列出方案或完成短反思，再進入教師追問與回饋；獨立思考不等於完全放手。',
      questions: ['我先給你兩分鐘整理，等等告訴我你的做法和理由。', '你自己目前最不確定的是哪一點？']
    }
  };

  const PAIRS = {
    'V+A': {
      start: '先看架構，再聽老師說明判斷。',
      methods: '用簡圖或流程先呈現情境，老師同步說出關鍵思考，最後讓學員對著圖用自己的話重述。',
      questions: ['你看見哪些關鍵線索？', '請對著這個流程說一次你會怎麼處理。']
    },
    'V+W': {
      start: '圖像與短文字並列，讓資訊位置與文字重點互相對應。',
      methods: '流程圖旁只保留關鍵字，再請學員把圖轉成自己的短摘要，避免圖很多、文字也很多。',
      questions: ['這張圖如果只能留下三個關鍵字，你會留什麼？', '請把這個流程改寫成三句話。']
    },
    'V+P': {
      start: '先看一次關鍵位置或動作，再立即操作。',
      methods: '以示意圖或短示範建立整體概念後就讓學員做；操作後再回到圖像檢查遺漏的步驟與安全點。',
      questions: ['先看這三個關鍵位置，接著你自己做一次。', '做完後，哪個步驟和你剛才看到的不一樣？']
    },
    'V+L': {
      start: '先把關係畫出來，再分析原因與決策點。',
      methods: '適合用流程分支、因果圖或情境關係圖，將「線索 → 判斷 → 行動」連起來，再用不同情境驗證。',
      questions: ['哪個線索導致你做這個決定？', '如果這個條件改變，流程會從哪裡分岔？']
    },
    'V+S': {
      start: '先共同看，再共同說。',
      methods: '用一張圖、情境畫面或流程當討論媒介，請學員先指出自己看到的線索，再透過對話補足遺漏。',
      questions: ['你先指出你看到的三個重點。', '我們一起看，還有哪個地方可能被忽略？']
    },
    'V+I': {
      start: '先給視覺架構，再讓學員自己整理後再討論。',
      methods: '提供簡圖或流程後保留短暫安靜時間，讓學員先標示重點、形成自己的版本，再進入教師追問。',
      questions: ['你先自己在圖上標出關鍵點。', '整理好後，告訴我你為什麼這樣排序。']
    },
    'A+W': {
      start: '先聽、再說、最後寫。',
      methods: '老師短講後讓學員重述，再用 1–3 句或幾個關鍵字留下重點，讓口頭與文字互相鞏固。',
      questions: ['你先說一次，再把最重要的內容寫成三句。', '你剛才聽到哪個關鍵字最重要？']
    },
    'A+P': {
      start: '邊說理由、邊做。',
      methods: '老師示範時把關鍵判斷說出來；換學員操作時，也請他簡短說明正在做什麼與原因。',
      questions: ['你現在做這一步的理由是什麼？', '一邊做，一邊告訴我你正在確認什麼。']
    },
    'A+L': {
      start: '用問答把因果與判斷規則說清楚。',
      methods: '以短問題串起推理，不只問答案；持續追問「為什麼」「什麼情況會改變」，再讓學員重述完整邏輯。',
      questions: ['你為什麼先做這件事？', '什麼情況出現時，你會改變原本的處置？']
    },
    'A+S': {
      start: '把對話當成主要入口，但避免老師自己說太多。',
      methods: '適合短問答、case discussion 與 teach-back；先讓學員說，再由老師追問、澄清與補充。',
      questions: ['先說你的想法，我再追問。', '如果要跟同事交班，你會怎麼說這個重點？']
    },
    'A+I': {
      start: '先聽說明，再給安靜消化時間。',
      methods: '短講後不必馬上要求回答，可讓學員先整理，再請他重新說明或提出疑問，避免反應速度被誤當理解程度。',
      questions: ['你先整理一下，等等再用自己的話說一次。', '想過之後，你最想再確認哪一點？']
    },
    'W+P': {
      start: '給一張很短的 checklist，然後立刻做。',
      methods: '每次只給少量文字提示，操作後請學員用一句話記錄該段最重要的安全點，再進入下一段。',
      questions: ['先照這三個重點做一次。', '剛才這一段如果只能留一句提醒，你會寫什麼？']
    },
    'W+L': {
      start: '用短文字架構把條件與理由寫清楚，再進案例。',
      methods: '適合使用「如果 A → 那麼 B」或條件式重點，讓學員先建立規則，再用例外情境檢查是否真正理解。',
      questions: ['你可以把判斷規則寫成一句「如果…就…」嗎？', '哪個例外會讓這條規則不能直接套用？']
    },
    'W+S': {
      start: '先寫自己的答案，再拿來討論。',
      methods: '先讓學員留下短摘要或判斷，再進入教師或同儕討論，可減少一開始就被別人的答案帶走。',
      questions: ['先寫下你的判斷和一個理由。', '現在我們一起比較，你的想法和另一種做法差在哪裡？']
    },
    'W+I': {
      start: '先讀／寫，再對話。',
      methods: '給短資料與獨立整理時間，讓學員形成自己的筆記或判斷版本，再由老師針對推理與遺漏處討論。',
      questions: ['你先自己整理三個重點。', '你寫完後，哪一點最需要我跟你一起確認？']
    },
    'P+L': {
      start: '原理說清楚一點，操作開始得早一點。',
      methods: '採「一個判斷點 → 一段操作 → 說出原因 → 即時修正 → 下一段」，不要等完整理論講完才開始做。',
      questions: ['你現在為什麼選擇這個做法？', '實際做過之後，哪個判斷和原本想的不一樣？']
    },
    'P+S': {
      start: '一起做、立即回饋，再逐步減少提示。',
      methods: '前幾次可由教師共同完成與即時回饋，之後逐漸撤除提示，讓學員接手更多步驟直到能獨立完成。',
      questions: ['這一段換你主導，我只在必要時提醒。', '剛才哪個回饋對你下一次最有幫助？']
    },
    'P+I': {
      start: '先在清楚安全界線內自己做，再回顧。',
      methods: '教師先說清楚不可跨越的安全點，讓學員自行嘗試；完成後要求他指出卡住處、做得好的地方與下一次調整。',
      questions: ['安全界線確認後，這次你自己做看看。', '做完後，你自己最想調整哪一個地方？']
    },
    'L+S': {
      start: '用對話挑戰推理，而不是直接給答案。',
      methods: '請學員先提出判斷，再用追問測試依據、替代可能與改變決策的條件，讓對話成為臨床推理練習。',
      questions: ['你的依據是什麼？', '還有第二種可能嗎？什麼資訊會讓你改變決定？']
    },
    'L+I': {
      start: '先自己形成假設，再接受教師追問。',
      methods: '避免老師太早公布答案；先給學員時間整理推理鏈與下一步，再用追問檢查因果、缺漏與例外。',
      questions: ['你先自己形成一個判斷，再告訴我理由。', '你的推理鏈中，哪一個環節最需要再確認？']
    },
    'S+I': {
      start: '先獨立形成看法，再透過互動修正。',
      methods: '先給短暫獨立思考或書寫時間，再進入教師／同儕討論；兼顧自己整理與互動回饋，不把兩者視為矛盾。',
      questions: ['你先自己想一版，等等我們再一起討論。', '討論之後，你有哪個原本的想法被修正了？']
    }
  };

  function pairKey(a, b) {
    const ai = ORDER.indexOf(a);
    const bi = ORDER.indexOf(b);
    return ai < bi ? `${a}+${b}` : `${b}+${a}`;
  }

  function buildGuidance(scores) {
    const sorted = ORDER
      .map(key => ({ key, score: Number(scores[key] || 0) }))
      .sort((a, b) => b.score - a.score || ORDER.indexOf(a.key) - ORDER.indexOf(b.key));

    const max = sorted[0]?.score ?? 0;
    const nearTop = sorted.filter(item => item.score >= max - 1);
    const selected = nearTop.length >= 2 ? nearTop.slice(0, 2).map(x => x.key) : [sorted[0].key];

    let guidance;
    let profileName;
    if (selected.length === 2) {
      const key = pairKey(selected[0], selected[1]);
      guidance = PAIRS[key] || SINGLE[selected[0]];
      profileName = `${NAMES[selected[0]]}＋${NAMES[selected[1]]}`;
    } else {
      guidance = SINGLE[selected[0]];
      profileName = NAMES[selected[0]];
    }

    const extra = nearTop.length > 2
      ? `另有 ${nearTop.slice(2).map(x => NAMES[x.key]).join('、')} 分數接近，帶教時也可彈性加入相關方式。`
      : '';

    return {
      profileName,
      selected,
      start: guidance.start,
      methods: guidance.methods,
      questions: guidance.questions,
      extra,
      principle: '偏好只決定較容易進入學習的入口；臨床任務、實際表現與安全需求仍優先。帶教仍應包含實作、思考外顯、具體回饋與再次確認。'
    };
  }

  function render() {
    if (resultPanel.classList.contains('hidden') || !window.__learningStyleResult) return;

    const guidance = buildGuidance(window.__learningStyleResult.scores || {});
    window.__teachingGuidance = guidance;

    const profile = document.getElementById('teacherProfile');
    const start = document.getElementById('teacherStart');
    const methods = document.getElementById('teacherMethods');
    const questions = document.getElementById('teacherQuestions');
    const extra = document.getElementById('teacherExtra');
    const principle = document.getElementById('teacherPrinciple');

    if (profile) profile.textContent = guidance.profileName;
    if (start) start.textContent = guidance.start;
    if (methods) methods.textContent = guidance.methods;
    if (questions) {
      questions.innerHTML = guidance.questions.map(q => `<li>${q}</li>`).join('');
    }
    if (extra) {
      extra.textContent = guidance.extra;
      extra.classList.toggle('hidden', !guidance.extra);
    }
    if (principle) principle.textContent = guidance.principle;
  }

  new MutationObserver(render).observe(resultPanel, {
    attributes: true,
    attributeFilter: ['class']
  });
})();
