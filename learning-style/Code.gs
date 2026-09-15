const RESULT_SHEET = '測驗結果';

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName(RESULT_SHEET);
    if (!sh) throw new Error('找不到工作表：' + RESULT_SHEET);

    const scores = data.scores || {};
    const profile = data.profile || {};
    const answers = Array.isArray(data.answers) ? data.answers.slice(0, 70) : [];
    while (answers.length < 70) answers.push('');

    const scorePairs = [
      ['Visual 視覺', Number(scores.V || 0)],
      ['Aural 聽覺', Number(scores.A || 0)],
      ['Verbal 語文', Number(scores.W || 0)],
      ['Physical 動覺', Number(scores.P || 0)],
      ['Logical 邏輯', Number(scores.L || 0)],
      ['Social 社交', Number(scores.S || 0)],
      ['Solitary 獨立', Number(scores.I || 0)]
    ];
    const max = Math.max.apply(null, scorePairs.map(x => x[1]));
    const top = scorePairs.filter(x => x[1] >= max - 1).map(x => x[0]).join('、');

    sh.appendRow([
      new Date(),
      profile.testDate || '',
      String(profile.emp || ''),
      String(profile.unit || ''),
      String(profile.birthMonth || ''),
      Number(profile.age || ''),
      String(profile.ageBand || ''),
      String(profile.zodiac || ''),
      Number(scores.V || 0),
      Number(scores.A || 0),
      Number(scores.W || 0),
      Number(scores.P || 0),
      Number(scores.L || 0),
      Number(scores.S || 0),
      Number(scores.I || 0),
      top,
      ...answers
    ]);

    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
