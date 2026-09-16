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

  // 每一段都寫成老師當下可做的動作，避免只寫「關鍵點、整體、引導、支架」等抽象詞。
  const SINGLE = {
    V: {
      start: '先讓他看到「先做什麼、接著做什麼、哪裡要再確認」，再開始教。',
      methods: '用一張流程、照片或簡單示意圖，把步驟順序、要看的位置和需要再次確認的地方標出來；看完後，請他照著圖重新排一次順序或指給你看。',
      questions: ['「你照這張圖說一次：第一步做什麼？接著做什麼？哪裡要停下來再確認？」', '「請你在圖上指出，哪一個地方如果漏掉，後面會出問題？」']
    },
    A: {
      start: '一次講一小段，講完就請他用自己的話說回來。',
      methods: '每次只說 1～2 個動作或注意事項，說完停下來，請他依「先做什麼、要確認什麼、什麼情況要找老師」重述一次，再往下教。',
      questions: ['「我剛才講的內容，你照順序說一次給我聽。」', '「什麼情況出現時，你會先停下來問我？」']
    },
    W: {
      start: '把內容寫成短句，讓他自己整理成可帶走的版本。',
      methods: '不要給一大段文字。可以只給三行：要做的事、要確認的資料、不能直接往下做的情況；之後請他改寫成自己的三句提醒。',
      questions: ['「請你寫三行：要做什麼、要確認什麼、什麼情況不能自己繼續。」', '「如果明天只看這張紙，你會留下哪三句提醒？」']
    },
    P: {
      start: '老師先做一小段，馬上換他做同一段。',
      methods: '不要先講完整套流程。示範一段後就讓他照做；只有遇到可能影響安全或做錯後會很難修正的地方才立即打斷，其餘做完再一起修。',
      questions: ['「這一段換你做，我在旁邊看；你做到需要我確認的地方再停。」', '「剛才實際做完，哪一步跟你原本想的不一樣？」']
    },
    L: {
      start: '每教一個做法，都補一句「為什麼要這樣做」。',
      methods: '不要只要求照流程。請他把「現在看到的資料 → 為什麼這樣處理 → 哪個資料改變時要換做法」說出來；再換一個資料，請他重新決定。',
      questions: ['「你現在是根據哪一個資料做這個決定？」', '「如果這個資料變了，你下一步會改成什麼？」']
    },
    S: {
      start: '先讓他把自己的做法完整說一遍，老師再補。',
      methods: '老師先不要公布答案。請他說出處理順序和理由，再逐項問「還要確認什麼」「哪裡需要協助」，最後才補上遺漏的內容。',
      questions: ['「你先從頭說一次你會怎麼做，我先不打斷。」', '「你覺得做到哪一步時，需要再找我一起確認？」']
    },
    I: {
      start: '先給他 1～2 分鐘自己整理，再開始討論。',
      methods: '遇到新問題時，先讓他寫下處理順序和一個不確定的地方，再請他說明；不要因為沒有立刻回答，就直接把答案告訴他。',
      questions: ['「你先自己寫下處理順序，兩分鐘後跟我說。」', '「你寫完後，哪一個地方最沒有把握？」']
    }
  };

  const PAIRS = {
    'V+A': {
      start: '先給他看流程，再用口頭帶一遍。',
      methods: '用一張圖標出步驟順序和需要再確認的位置，老師一邊指一邊說；講完後，請他看著同一張圖自己說一次。',
      questions: ['「你看著這張圖，從第一步開始說給我聽。」', '「講到哪一個地方時，你會先停下來確認？」']
    },
    'V+W': {
      start: '一張圖配短句，比一大段文字更適合。',
      methods: '每個步驟旁只放一行文字，例如「做什麼／看什麼／何時停下來確認」；看完後請他把整張圖改寫成自己的三句提醒。',
      questions: ['「你把這張圖改寫成三句提醒給自己。」', '「哪一句是做之前一定要先確認的？」']
    },
    'V+P': {
      start: '先看位置和順序，接著立刻做同一段。',
      methods: '先用照片、流程圖或短示範指出要看的位置和動作順序，接著讓他立刻做；做完再對照原圖，找出漏掉或順序不同的地方。',
      questions: ['「先看這張圖，接著照這個順序自己做一次。」', '「做完後，請你對著圖找出剛才漏掉或順序不同的地方。」']
    },
    'V+L': {
      start: '把「看到什麼、所以做什麼、什麼變了就要換做法」畫在一起。',
      methods: '可以畫成三欄：目前資料／現在的做法／資料改變後的做法。先一起填一個例子，再請他自己完成下一個。',
      questions: ['「你把現在看到的資料放左邊，右邊寫你會怎麼做。」', '「如果左邊這個資料改掉，右邊要跟著改什麼？」']
    },
    'V+S': {
      start: '一起看同一張圖，但先讓學員自己指出來。',
      methods: '把流程、照片或紀錄放在兩人中間，先請他圈出先做的事、需要再確認的地方和可能要找老師的地方；老師最後再補漏掉的部分。',
      questions: ['「你先在圖上圈出：先做什麼、哪裡要再確認、哪裡需要找我。」', '「我們一起對一次，還有哪一個地方你剛才沒有圈到？」']
    },
    'V+I': {
      start: '先給圖，再讓他自己標記 1～2 分鐘。',
      methods: '給流程或圖片後先不要講答案，請他自己標出步驟順序、要確認的位置和不確定的地方；完成後再一起討論。',
      questions: ['「你先自己在圖上標好順序和不確定的地方。」', '「你標完後，先說你最想確認哪一個地方。」']
    },
    'A+W': {
      start: '先聽一小段，再說一次，最後寫成一句提醒。',
      methods: '老師每次只講 1～2 件事，請他重述後，再把內容寫成一句自己的提醒；下一段再用同樣方式進行。',
      questions: ['「你先把我剛才說的重述一次，再寫成一句話。」', '「這一句提醒要怎麼寫，明天你一看就知道要做什麼？」']
    },
    'A+P': {
      start: '老師做的時候把原因說出來，換他做時也請他說。',
      methods: '示範時不要只做動作，同時簡短說明「我現在在確認什麼、為什麼現在做」；換學員操作時，請他用同樣方式邊做邊說。',
      questions: ['「你現在正在確認什麼？」', '「你做這一步的原因是什麼？」']
    },
    'A+L': {
      start: '用一問一答把他的理由說完整。',
      methods: '老師不要一次公布整個答案。依序問「你現在看到什麼資料」「所以你要做什麼」「哪個資料改變時會換做法」，讓他自己把因果說出來。',
      questions: ['「你現在是根據哪一個資料做決定？」', '「如果這個資料改變，你會換成什麼做法？」']
    },
    'A+S': {
      start: '先讓學員說完整一輪，老師只用問題往下追。',
      methods: '請他先說處理順序，老師先不插入答案；說完後再問兩三個具體問題，例如還要確認哪個資料、哪一步需要請別人一起看。',
      questions: ['「你先完整說一遍，我先不打斷。」', '「哪一步你會請同事或老師一起確認？」']
    },
    'A+I': {
      start: '老師先說明，接著留 1 分鐘不追問。',
      methods: '說完一小段後先讓他安靜整理，再請他用自己的話重述；若他需要較久時間組織語句，不要把反應慢直接當成不會。',
      questions: ['「你先想一分鐘，等等照順序說一次。」', '「整理完後，你還有哪一件事需要我再說一次？」']
    },
    'W+P': {
      start: '給三行小清單，接著立刻操作。',
      methods: '清單只寫「做之前確認什麼／操作時注意什麼／做完後確認什麼」，不要先讀完整份資料；做完一輪後，再由學員自己修改這三行。',
      questions: ['「先照這三行做一次，做完再看哪一行要改。」', '「做完後，你會在哪一行多加一句什麼提醒？」']
    },
    'W+L': {
      start: '把做法寫成「如果…就…，因為…」。',
      methods: '請他把一個決定寫成短句，例如「如果出現 A，就做 B，因為 C」；再換掉 A，看他能不能重新寫出下一個做法。',
      questions: ['「你把現在的做法寫成一句『如果…就…，因為…』。」', '「如果前面的條件改了，這一句要怎麼改？」']
    },
    'W+S': {
      start: '先各自寫，再拿出來討論。',
      methods: '先讓學員寫下自己的處理順序和一個理由，老師暫時不給答案；寫完後再逐項比較，問他哪些地方要保留、哪些地方要修改。',
      questions: ['「你先寫下你的做法和理由，我們等一下再一起看。」', '「討論後，你會把哪一行改掉？為什麼？」']
    },
    'W+I': {
      start: '先自己讀、自己寫，再跟老師談。',
      methods: '給一小段資料後，請他先寫三行：接下來要做什麼、還要確認什麼、哪裡沒有把握；完成後老師只針對這三行討論。',
      questions: ['「你先寫三行：要做什麼、要確認什麼、哪裡沒把握。」', '「三行裡面，你最想先跟我討論哪一行？」']
    },
    'P+L': {
      start: '說明一個原因，就讓他做一段；做完馬上問理由。',
      methods: '不要先講完整理論。老師先說「這一段為什麼要這樣做」，接著讓學員立刻做同一段；做完後請他說理由，有錯就在當下修正，再進下一段。',
      questions: ['「你剛才這一步為什麼這樣做？」', '「如果病人的資料改變，這一步要不要跟著改？」']
    },
    'P+S': {
      start: '第一輪一起做，第二輪讓學員主導。',
      methods: '第一輪由老師和學員一起完成，老師只在需要確認或可能影響安全時提醒；第二輪改由學員決定順序，老師最後再回饋。',
      questions: ['「第一輪我們一起做；第二輪你自己決定順序。」', '「第二輪哪一步你還希望我在旁邊一起確認？」']
    },
    'P+I': {
      start: '先說清楚哪些地方一定要停下來確認，再讓他自己做。',
      methods: '開始前先講明不能自行往下做的情況；其餘部分讓他自己完成。做完後請他先自己指出一個做得順的地方和一個想修改的地方，再由老師補充。',
      questions: ['「哪些情況出現時，你一定要先停下來找我？」', '「做完後，你自己會保留哪個做法？哪個地方想重做？」']
    },
    'L+S': {
      start: '讓他先做決定，再用問題檢查理由。',
      methods: '請他先說「我會怎麼做、因為什麼」；老師接著問還有沒有第二種可能、哪個資料會讓他改變決定，不急著公布標準答案。',
      questions: ['「你會怎麼做？你的依據是什麼？」', '「還有另一種可能嗎？什麼資料出現時你會改變決定？」']
    },
    'L+I': {
      start: '先讓他自己形成做法，再問缺少什麼資料。',
      methods: '先給 1～2 分鐘讓他寫下自己的決定和理由；之後老師只追問兩件事：還缺哪個資料、哪個資料改變會讓做法不同。',
      questions: ['「你先寫下你的做法和理由。」', '「你還缺哪一個資料，才會更有把握？」']
    },
    'S+I': {
      start: '先自己整理，再進入對話。',
      methods: '先讓他獨立寫下處理順序和一個疑問，再開始討論；討論結束後請他說出自己原本的做法改了哪裡。',
      questions: ['「你先自己寫好，再拿來跟我討論。」', '「討論完後，你原本的做法有哪一個地方改變了？」']
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
      ? '這次有三項以上分數很接近，下面先依最高的兩項提供一種帶法；實際帶教時可以交替使用，不必固定只用一種方式。'
      : '';

    return {
      profile,
      keys: selected.map(item => item.key),
      start: guide.start,
      methods: guide.methods,
      questions: guide.questions,
      extra,
      principle: '這只是比較容易讓學員進入狀況的方式，不代表其他方式學不會。臨床安全、實際表現和工作需要仍然優先。'
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