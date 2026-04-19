// Google Apps Script for 勤怠管理システム
// Google Sheets と同期するコード

// スプレッドシート ID（設定が必要）
const SPREADSHEET_ID = '1oGDAg6Oxpw4tsqTQqiZkfuR26uNgUqvEx6c3ioWye-M';
const SHEET = SpreadsheetApp.openById(SPREADSHEET_ID);

// シート定義
const SHEETS = {
  users: 'users',
  records: 'records',
  grants: 'grants'
};

// POST リクエストハンドラー（保存）
function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const action = params.action;

    if (action === 'saveRecords') {
      saveRecords(params.records);
      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    if (action === 'saveUsers') {
      saveUsers(params.users);
      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    if (action === 'saveGrants') {
      saveGrants(params.grants);
      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    if (action === 'fetchAll') {
      const data = {
        records: loadRecords(),
        users: loadUsers(),
        grants: loadGrants()
      };
      return ContentService.createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ error: 'Unknown action' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// GET リクエストハンドラー（取得）
function doGet(e) {
  try {
    const action = e.parameter.action;

    if (action === 'fetchAll') {
      const data = {
        records: loadRecords(),
        users: loadUsers(),
        grants: loadGrants()
      };
      return ContentService.createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ error: 'Unknown action' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── users シート操作 ──
function initUsersSheet() {
  let ws = SHEET.getSheetByName(SHEETS.users);
  if (!ws) {
    ws = SHEET.insertSheet(SHEETS.users);
  } else {
    ws.clear();
  }
  ws.appendRow(['id', 'name', 'department', 'role', 'joinedDate']);
}

function saveUsers(users) {
  let ws = SHEET.getSheetByName(SHEETS.users);
  if (!ws) initUsersSheet();
  ws.clearContents();
  ws.appendRow(['id', 'name', 'department', 'role', 'joinedDate']);
  users.forEach(u => {
    ws.appendRow([u.id, u.name, u.department, u.role, u.joinedDate]);
  });
}

function loadUsers() {
  let ws = SHEET.getSheetByName(SHEETS.users);
  if (!ws) return [];
  const data = ws.getDataRange().getValues();
  if (data.length <= 1) return [];

  return data.slice(1).map(row => ({
    id: row[0],
    name: row[1],
    department: row[2],
    role: row[3],
    joinedDate: row[4]
  })).filter(u => u.id);
}

// ── records シート操作 ──
function initRecordsSheet() {
  let ws = SHEET.getSheetByName(SHEETS.records);
  if (!ws) {
    ws = SHEET.insertSheet(SHEETS.records);
  } else {
    ws.clear();
  }
  ws.appendRow(['id', 'userId', 'date', 'shiftType', 'overtimeStart', 'overtimeEnd', 'overtimeDescription', 'isHoliday']);
}

function saveRecords(records) {
  let ws = SHEET.getSheetByName(SHEETS.records);
  if (!ws) initRecordsSheet();
  ws.clearContents();
  ws.appendRow(['id', 'userId', 'date', 'shiftType', 'overtimeStart', 'overtimeEnd', 'overtimeDescription', 'isHoliday']);
  records.forEach(r => {
    ws.appendRow([
      r.id,
      r.userId,
      r.date,
      r.shiftType,
      r.overtimeStart || '',
      r.overtimeEnd || '',
      r.overtimeDescription || '',
      r.isHoliday ? 'TRUE' : 'FALSE'
    ]);
  });
}

function loadRecords() {
  let ws = SHEET.getSheetByName(SHEETS.records);
  if (!ws) return [];
  const data = ws.getDataRange().getValues();
  if (data.length <= 1) return [];

  return data.slice(1).map(row => ({
    id: row[0],
    userId: row[1],
    date: row[2],
    shiftType: row[3],
    overtimeStart: row[4] || null,
    overtimeEnd: row[5] || null,
    overtimeDescription: row[6] || '',
    isHoliday: row[7] === 'TRUE' || row[7] === true
  })).filter(r => r.id);
}

// ── grants シート操作 ──
function initGrantsSheet() {
  let ws = SHEET.getSheetByName(SHEETS.grants);
  if (!ws) {
    ws = SHEET.insertSheet(SHEETS.grants);
  } else {
    ws.clear();
  }
  ws.appendRow(['id', 'userId', 'grantDate', 'days']);
}

function saveGrants(grants) {
  let ws = SHEET.getSheetByName(SHEETS.grants);
  if (!ws) initGrantsSheet();
  ws.clearContents();
  ws.appendRow(['id', 'userId', 'grantDate', 'days']);
  grants.forEach(g => {
    ws.appendRow([g.id, g.userId, g.grantDate, g.days]);
  });
}

function loadGrants() {
  let ws = SHEET.getSheetByName(SHEETS.grants);
  if (!ws) return [];
  const data = ws.getDataRange().getValues();
  if (data.length <= 1) return [];

  return data.slice(1).map(row => ({
    id: row[0],
    userId: row[1],
    grantDate: row[2],
    days: row[3]
  })).filter(g => g.id);
}

// 初期化関数（最初に1回実行）
function initialize() {
  initUsersSheet();
  initRecordsSheet();
  initGrantsSheet();
}
