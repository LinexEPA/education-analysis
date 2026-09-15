const SPREADSHEET_ID = '1oViteX1zUHDImka2oj4qqIFtpUDvDsOnfUkQuNQaSp0';
const RESULT_SHEET = '測驗結果';
const SUBMIT_TOKEN = 'xt5sNqkzln5pihFeAVq5jm1rvisnjnBM';
const APP_VERSION = '2026-09-16.2';

// 開啟 Web App /exec 網址時，只做連線檢查，不會寫入任何資料。
function doGet() {
  return jsonResponse_({
    ok: true,
    service: 'learning-style-assessment',
    version: APP_VERSION
  });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    if (!data || data.token !== SUBMIT_TOKEN) {
      return jsonResponse_({ ok: false, error: 'unauthorized' });
    }

    const profile = data.profile || {};
    const answers = Array.isArray(data.answers) ? data.answers.slice(0, 70).map(Number) : [];

    if (!String(profile.emp || '').trim()) throw new Error('缺少員工編號');
    if (!String(profile.unit || '').trim()) throw new Error('缺少單位');
    if (answers.length !== 70 || answers.some(v => ![0, 1, 2].includes(v))) {
      throw new Error('70 題答案格式不完整');
    }

    // 後端重新計分，不直接信任瀏覽器送來的分數。
    const keys = ['V', 'A', 'W', 'P', 'L', 'S', 'I'];
    const scores = {};
    keys.forEach((key, i) => {
      scores[key] = answers.slice(i * 10, i * 10 + 10).reduce((sum, v) => sum + v, 0);
    });

    const scorePairs = [
      ['Visual 視覺', scores.V],
      ['Aural 聽覺', scores.A],
      ['Verbal 語文', scores.W],
      ['Physical 動覺', scores.P],
      ['Logical 邏輯', scores.L],
      ['Social 社交', scores.S],
      ['Solitary 獨立', scores.I]
    ];
    const max = Math.max.apply(null, scorePairs.map(x => x[1]));
    const top = scorePairs.filter(x => x[1] >= max - 1).map(x => x[0]).join('、');

    // 不依賴「目前開啟中的試算表」，直接指定正式資料表。
    // 因此 Google Sheet 本身可以維持私人，不需開放知道連結者編輯。
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sh = ss.getSheetByName(RESULT_SHEET);
    if (!sh) throw new Error('找不到工作表：' + RESULT_SHEET);

    sh.appendRow([
      new Date(),
      profile.testDate || '',
      String(profile.emp || ''),
      String(profile.unit || ''),
      String(profile.education || ''),
      String(profile.birthMonth || ''),
      Number(profile.age || ''),
      String(profile.ageBand || ''),
      String(profile.zodiac || ''),
      scores.V,
      scores.A,
      scores.W,
      scores.P,
      scores.L,
      scores.S,
      scores.I,
      top,
      ...answers
    ]);

    return jsonResponse_({ ok: true, version: APP_VERSION });
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err), version: APP_VERSION });
  } finally {
    lock.releaseLock();
  }
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
