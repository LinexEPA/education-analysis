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

  // 文字刻意不用教學術語，讓沒有受過教學訓練的臨床老師也能直接使用。
  const SINGLE = {
    V: {
      start: '先給他看，再進入細節。',
      methods: '先用一張流程、圖片或簡單示意讓他看到整體，再請他自己說一次或照著做一次。',
      questions: ['「你先告訴我，你看到哪幾個重點？」', '「如果要把這件事排成順序，你會怎麼排？」']
    },
    A: {
      start: '先講一小段，再讓他說回來。',
      methods: '一次不要講太多。說完一個重點就停一下，請他用自己的話說一次，確認有沒有聽懂。',
      questions: ['「你用自己的話說一次，剛才最重要的是什麼？」', '「你現在會怎麼跟我說這件事？」']
    },
    W: {
      start: '重點寫短一點，讓他自己整理。',
      methods: '給幾個關鍵字、短重點或簡單清單就好，不要一次塞很多文字；再請他整理成自己的版本。',
      questions: ['「如果只能留下三句話，你會寫什麼？」', '「你會用哪幾個關鍵字提醒自己？」']
    },
    P: {
      start: '少講一點，早點讓他動手。',
      methods: '先示範一小段，馬上換他做；有問題當下修正，再讓他重做一次，比講很久更有用。',
      questions: ['「這一段你先做，我在旁邊看。」', '「做完後，你覺得哪裡最容易卡住？」']
    },
    L: {
      start: '先告訴他「為什麼」，再讓他做判斷。',
      methods: '不要只說照流程做，也要補一句原因；遇到不同情況時，請他想想哪個資訊會讓做法改變。',
      questions: ['「你為什麼會先做這一步？」', '「如果病人的情況變了，你會改哪裡？」']
    },
    S: {
      start: '先問他怎麼想，再一起修。',
      methods: '不要急著直接給答案。先讓他說自己的想法，再一起補漏掉的地方；可多用短問答或一起討論案例。',
      questions: ['「你先說說看，你現在怎麼想？」', '「如果是你要教別人，你會怎麼說？」']
    },
    I: {
      start: '先給他想一下，再來討論。',
      methods: '遇到問題時可以先給一兩分鐘讓他自己整理，再請他說做法和理由；不要因為他沒有馬上回答就認為他不會。',
      questions: ['「你先想一下，等等告訴我你的做法。」', '「你現在最不確定的是哪一點？」']
    }
  };

  const PAIRS = {
    'V+A': {
      start: '先給他看，再用口頭帶一遍。',
      methods: '先用圖或流程讓他知道整體，再簡短說明；最後請他看著圖自己說一次。',
      questions: ['「你先看這張圖，告訴我你看到什麼？」', '「照這個順序，你會怎麼做？」']
    },
    'V+W': {
      start: '圖配短文字，會比一大段說明更好用。',
      methods: '流程旁放幾個關鍵字就好，再請他把圖整理成自己的三句重點。',
      questions: ['「這張圖你會留下哪三個重點？」', '「把這個流程用三句話說給我聽。」']
    },
    'V+P': {
      start: '先看一次，馬上讓他做。',
      methods: '先讓他看關鍵位置或短示範，不用講完整套；接著直接操作，做完再回頭看哪裡漏掉。',
      questions: ['「先看這幾個地方，接著你自己做一次。」', '「做完後，哪一步跟你剛才看到的不一樣？」']
    },
    'V+L': {
      start: '先把關係畫出來，再問他為什麼。',
      methods: '用簡單流程把線索、判斷和下一步連起來；再換一個小情況，看他會不會跟著調整。',
      questions: ['「是哪一個線索讓你做這個決定？」', '「如果這個條件改了，下一步會不會變？」']
    },
    'V+S': {
      start: '一起看，再一起說。',
      methods: '用一張圖或一個現場情境當起點，先請他指出重點，再一起補還沒看到的地方。',
      questions: ['「你先指出你看到的三個重點。」', '「我們一起看，還有哪裡可能漏掉？」']
    },
    'V+I': {
      start: '先給他看，再留一點時間自己整理。',
      methods: '給流程或圖片後先不要急著追問，讓他自己標重點或排順序，再一起討論。',
      questions: ['「你先自己標出重點。」', '「整理好後，告訴我你為什麼這樣排。」']
    },
    'A+W': {
      start: '先聽一小段，再說一次，最後留下短重點。',
      methods: '老師先簡短說明，請他重述，再寫成幾個關鍵字或一兩句話，避免資訊一下太多。',
      questions: ['「你先說一次，再把最重要的寫下來。」', '「剛才哪一句是你最需要記住的？」']
    },
    'A+P': {
      start: '邊做邊說，效果通常比較好。',
      methods: '示範時把關鍵原因順口說出來；換他做時，也請他簡短說自己正在做什麼。',
      questions: ['「你現在做這一步是為了什麼？」', '「一邊做，一邊告訴我你在確認什麼。」']
    },
    'A+L': {
      start: '用短問答把原因問出來。',
      methods: '不要一次講完整答案，改成一題一題問：「為什麼？」「如果變了呢？」讓他把想法說清楚。',
      questions: ['「你為什麼先做這件事？」', '「什麼情況出現時，你會改變原本的做法？」']
    },
    'A+S': {
      start: '多讓他說，老師不要一路講到底。',
      methods: '適合用短問答和案例討論。先聽他怎麼說，再補充或修正，比直接公布答案更容易進入狀況。',
      questions: ['「先說你的想法，我再跟你一起看。」', '「如果要交班，你會怎麼說這個重點？」']
    },
    'A+I': {
      start: '先聽，再給他一點時間消化。',
      methods: '說明後不用馬上追問答案，讓他想一下再重述；反應比較慢不代表沒有理解。',
      questions: ['「你先整理一下，等等再用自己的話說一次。」', '「想過之後，你還想確認哪一點？」']
    },
    'W+P': {
      start: '給一張很短的清單，馬上做。',
      methods: '一次只看幾個重點，做完一段就留一句提醒，再進下一段，不要先讀完整份資料才開始。',
      questions: ['「先照這三個重點做一次。」', '「剛才這一段，如果只留一句提醒會是什麼？」']
    },
    'W+L': {
      start: '把規則寫短，再拿病例來試。',
      methods: '可用「如果…就…」的短句幫他抓規則，再換一個不同情況，確認他不是只背答案。',
      questions: ['「你可以把這個判斷寫成一句『如果…就…』嗎？」', '「哪種情況不能直接照這句做？」']
    },
    'W+S': {
      start: '先寫自己的想法，再一起討論。',
      methods: '先讓他留下簡短答案或重點，再和老師討論；這樣比較不會一開始就跟著老師答案走。',
      questions: ['「先寫下你的做法和一個理由。」', '「現在我們一起看，還有哪裡可以補？」']
    },
    'W+I': {
      start: '先自己讀、自己整理，再來談。',
      methods: '給短資料和一點安靜時間，讓他先整理三個重點，再由老師針對不確定的地方討論。',
      questions: ['「你先自己整理三個重點。」', '「哪一點最需要我再跟你說明？」']
    },
    'P+L': {
      start: '原因說清楚一點，操作開始早一點。',
      methods: '不用先把整套理論講完。說明一個重點就讓他做一段，再問為什麼、當下修正，接著往下一段。',
      questions: ['「你為什麼先做這一步？」', '「如果病人的情況變了，你會改哪裡？」']
    },
    'P+S': {
      start: '一起做幾次，再慢慢放手。',
      methods: '前幾次老師可以陪著做、邊做邊提醒；熟悉後逐步減少提示，讓他自己完成。',
      questions: ['「這次我們一起做，下一次換你主導。」', '「剛才哪一步你最需要我提醒？」']
    },
    'P+I': {
      start: '先讓他自己試，再一起回頭看。',
      methods: '先把安全底線說清楚，讓他自己做；做完再請他指出哪裡最不確定，再針對那一點教。',
      questions: ['「你先自己做一次，我在旁邊看。」', '「做完後，你自己最想修哪一個地方？」']
    },
    'L+S': {
      start: '用對話把他的理由問出來。',
      methods: '先讓他提出判斷，再問依據、其他可能和什麼情況會改變決定；老師負責追問，不急著給答案。',
      questions: ['「你的依據是什麼？」', '「還有沒有另一種可能？」']
    },
    'L+I': {
      start: '先讓他自己想出答案，再追問理由。',
      methods: '不要太早公布答案。先給時間形成自己的做法，再問他為什麼、還缺什麼資訊。',
      questions: ['「你先自己想一個做法和理由。」', '「你還需要知道什麼，才會更有把握？」']
    },
    'S+I': {
      start: '先自己想，再拿出來討論。',
      methods: '先給他短暫獨立思考，再透過對話修正；這類學員不是不喜歡討論，而是通常先有自己的想法會更好談。',
      questions: ['「你先自己想一下，等等我們一起討論。」', '「你原本怎麼想？討論後哪裡有改變？」']
    }
  };

  function pairKey(a, b) {
    return [a, b].sort((x, y) => ORDER.indexOf(x) - ORDER.indexOf(y)).join('+');
  }

  function buildGuidance(scores) {
    const ranked = ORDER
      .map(key => ({ key, score: Number(scores[key] || 0) }))
      .sort((a, b) => b.score - a.score || ORDER.indexOf(a.key) - ORDER.indexOf(b.key));

    const max = ranked[0]?.score ?? 0;
    const close = ranked.filter(item => item.score >= max - 1);
    const selected = close.length >= 2 ? close.slice(0, 2) : ranked.slice(0, 1);

    let guide;
    if (selected.length === 2) {
      guide = PAIRS[pairKey(selected[0].key, selected[1].key)] || SINGLE[selected[0].key];
    } else {
      guide = SINGLE[selected[0]?.key] || SINGLE.V;
    }

    const profile = selected.map(item => NAMES[item.key]).join('＋');
    const extra = close.length > 2
      ? '這次有三項以上分數很接近，下面先用最高的兩項提供起手方式；實際帶教時可以交替使用，不必固定一種。'
      : '';

    return {
      profile,
      keys: selected.map(item => item.key),
      start: guide.start,
      methods: guide.methods,
      questions: guide.questions,
      extra,
      principle: '這只是比較容易讓學員上手的方式，不代表其他方式學不會。臨床安全、實際表現和工作需要仍然優先。'
    };
  }

  function renderGuidance() {
    if (resultPanel.classList.contains('hidden') || !window.__learningStyleResult) return;

    const guidance = buildGuidance(window.__learningStyleResult.scores || {});
    window.__teachingGuidance = guidance;

    const profile = document.getElementById('teacherProfile');
    const start = document.getElementById('teacherStart');
    const methods = document.getElementById('teacherMethods');
    const questions = document.getElementById('teacherQuestions');
    const extra = document.getElementById('teacherExtra');
    const principle = document.getElementById('teacherPrinciple');

    if (profile) profile.textContent = guidance.profile;
    if (start) start.textContent = guidance.start;
    if (methods) methods.textContent = guidance.methods;
    if (questions) questions.innerHTML = guidance.questions.map(q => `<li>${q}</li>`).join('');
    if (extra) {
      extra.textContent = guidance.extra;
      extra.classList.toggle('hidden', !guidance.extra);
    }
    if (principle) principle.textContent = guidance.principle;
  }

  new MutationObserver(renderGuidance).observe(resultPanel, {
    attributes: true,
    attributeFilter: ['class']
  });
})();
