/**
 * Backend for the Bothy Christmas Party availability site.
 * Stores one row per person in the Google Sheet this script is bound to.
 * Setup steps are in README.md.
 */
const SHEET_NAME = 'Responses';
const HEADERS = ['Updated', 'Name', 'Yes', 'Maybe', 'Note'];

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
  }
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const cleanDates_ = (arr) => (Array.isArray(arr) ? arr : [])
  .map(String).filter((d) => ISO.test(d)).slice(0, 100);
const cleanText_ = (s, max) => String(s || '').replace(/^[=+\-@]/, "'$&").trim().slice(0, max);

function doGet() {
  try {
    const rows = sheet_().getDataRange().getValues().slice(1);
    const responses = rows.filter((r) => r[1]).map((r) => ({
      updated: r[0] instanceof Date ? r[0].toISOString() : String(r[0]),
      name: String(r[1]).replace(/^'/, ''),
      yes: String(r[2] || '').split(',').map((s) => s.trim()).filter(Boolean),
      maybe: String(r[3] || '').split(',').map((s) => s.trim()).filter(Boolean),
      note: String(r[4] || '').replace(/^'/, ''),
    }));
    return json_({ ok: true, responses });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const name = cleanText_(body.name, 60);
    if (!name) return json_({ ok: false, error: 'Name is required' });

    const row = [new Date(), name, cleanDates_(body.yes).join(', '),
                 cleanDates_(body.maybe).join(', '), cleanText_(body.note, 200)];

    // Replace any existing row for the same name (case-insensitive).
    const sh = sheet_();
    const names = sh.getRange(1, 2, Math.max(sh.getLastRow(), 1), 1).getValues();
    const key = name.replace(/^'/, '').toLowerCase();
    let target = -1;
    for (let i = 1; i < names.length; i++) {
      if (String(names[i][0]).replace(/^'/, '').trim().toLowerCase() === key) { target = i + 1; break; }
    }
    if (target > 0) sh.getRange(target, 1, 1, row.length).setValues([row]);
    else sh.appendRow(row);

    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}
