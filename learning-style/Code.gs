const SPREADSHEET_ID = '1oViteX1zUHDImka2oj4qqIFtpUDvDsOnfUkQuNQaSp0';
const RESULT_SHEET = '測驗結果';
const BACKUP_LOG_SHEET = '備份紀錄';
const SUBMIT_TOKEN = 'xt5sNqkzln5pihFeAVq5jm1rvisnjnBM';
const BACKUP_ROOT_FOLDER_ID = '1EO40xMk-2W-aTwQnqWqlZl39JkG0Hv-w';
const APP_VERSION = '2026-09-16.4';

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
  lock.waitLock(15000);

  let data = {};
  try {
    data = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    if (!data || data.token !== SUBMIT_TOKEN) {
      return jsonResponse_({ ok: false, error: 'unauthorized', version: APP_VERSION });
    }

    if (data.action === 'backupPdf') {
      return backupPdf_(data);
    }

    return saveAssessment_(data);
  } catch (err) {
    if (data && data.action === 'backupPdf') {
      logBackupSafely_('失敗', data, String(err));
    }
    return jsonResponse_({ ok: false, error: String(err), version: APP_VERSION });
  } finally {
    lock.releaseLock();
  }
}

function saveAssessment_(data) {
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

  return jsonResponse_({ ok: true, action: 'assessment', version: APP_VERSION });
}

function backupPdf_(data) {
  const profile = data.profile || {};
  const emp = String(profile.emp || '').trim();
  const unit = String(profile.unit || '').trim();
  const testDate = String(profile.testDate || '').trim();
  const pdfBase64 = String(data.pdfBase64 || '').replace(/^data:application\/pdf;base64,/, '');

  logBackupSafely_('收到備份請求', data, '');

  if (!emp) throw new Error('PDF 備份缺少員工編號');
  if (!unit) throw new Error('PDF 備份缺少單位');
  if (!pdfBase64) throw new Error('PDF 備份內容為空');

  // 約 5 MB PDF 的 base64 上限，避免公開 Web App 被拿來塞入過大的檔案。
  if (pdfBase64.length > 7000000) throw new Error('PDF 檔案過大');

  const bytes = Utilities.base64Decode(pdfBase64);
  if (bytes.length < 4 || bytes[0] !== 37 || bytes[1] !== 80 || bytes[2] !== 68 || bytes[3] !== 70) {
    throw new Error('備份內容不是有效的 PDF');
  }

  const root = DriveApp.getFolderById(BACKUP_ROOT_FOLDER_ID);
  const monthName = monthFolderName_(testDate);
  const monthFolder = getOrCreateMonthFolder_(root, monthName);

  const requestedName = String(data.filename || `${emp}_${unit}_${testDate || monthName}_學習風格與偏好.pdf`);
  const safeName = uniquePdfName_(monthFolder, sanitizePdfName_(requestedName));
  const blob = Utilities.newBlob(bytes, 'application/pdf', safeName);
  const file = monthFolder.createFile(blob);

  logBackupSafely_('備份成功', data, `${monthName}/${safeName}`);

  return jsonResponse_({
    ok: true,
    action: 'backupPdf',
    month: monthName,
    filename: safeName,
    fileId: file.getId(),
    version: APP_VERSION
  });
}

// 在 Apps Script 編輯器中手動執行一次。
// 用途：觸發 Drive 權限授權，並確認目前部署帳號確實能寫入指定備份資料夾。
function testBackupFolderAccess() {
  const root = DriveApp.getFolderById(BACKUP_ROOT_FOLDER_ID);
  const monthName = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM');
  const monthFolder = getOrCreateMonthFolder_(root, monthName);
  const testName = `__backup_test_${Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMdd_HHmmss')}.txt`;
  const testFile = monthFolder.createFile(testName, 'backup test', MimeType.PLAIN_TEXT);
  const result = {
    ok: true,
    rootFolder: root.getName(),
    month: monthName,
    testFileId: testFile.getId(),
    version: APP_VERSION
  };
  logBackupSafely_('手動測試成功', { profile: { emp: 'TEST', unit: 'SYSTEM', testDate: monthName + '-01' }, filename: testName }, testName);
  testFile.setTrashed(true);
  Logger.log(JSON.stringify(result));
  return result;
}

function monthFolderName_(testDate) {
  const match = String(testDate || '').match(/^(\d{4})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}`;
  return Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM');
}

function getOrCreateMonthFolder_(root, monthName) {
  const folders = root.getFoldersByName(monthName);
  if (folders.hasNext()) return folders.next();
  return root.createFolder(monthName);
}

function sanitizePdfName_(name) {
  let safe = String(name || '學習風格與偏好.pdf')
    .trim()
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '_')
    .slice(0, 160);
  if (!/\.pdf$/i.test(safe)) safe += '.pdf';
  return safe;
}

function uniquePdfName_(folder, filename) {
  if (!folder.getFilesByName(filename).hasNext()) return filename;

  const stem = filename.replace(/\.pdf$/i, '');
  for (let i = 2; i <= 99; i++) {
    const candidate = `${stem}_${i}.pdf`;
    if (!folder.getFilesByName(candidate).hasNext()) return candidate;
  }

  return `${stem}_${Utilities.formatDate(new Date(), 'Asia/Taipei', 'HHmmss')}.pdf`;
}

function logBackupSafely_(status, data, detail) {
  try {
    const profile = (data && data.profile) || {};
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sh = ss.getSheetByName(BACKUP_LOG_SHEET);
    if (!sh) {
      sh = ss.insertSheet(BACKUP_LOG_SHEET);
      sh.appendRow(['時間', '狀態', '員工編號', '單位', '測驗日期', '檔名', '詳細訊息', '版本']);
    }
    sh.appendRow([
      new Date(),
      status,
      String(profile.emp || ''),
      String(profile.unit || ''),
      String(profile.testDate || ''),
      String((data && data.filename) || ''),
      String(detail || ''),
      APP_VERSION
    ]);
  } catch (logErr) {
    console.error('backup log failed', logErr);
  }
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
