export const DEFAULT_APPS_SCRIPT_CODE = `/**
 * GOOGLE APPS SCRIPT WEB APP - SDKP BIAK
 * Database & API Engine untuk Google Sheets
 */

function headers() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}

function doOptions(e) {
  var output = ContentService.createTextOutput("");
  output.setMimeType(ContentService.MimeType.TEXT);
  var h = headers();
  for (var key in h) {
    output.appendHeader(key, h[key]);
  }
  return output;
}

function jsonResponse(data) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  var h = headers();
  for (var key in h) {
    output.appendHeader(key, h[key]);
  }
  return output;
}

function doGet(e) {
  var action = e && e.parameter ? e.parameter.action : "getDashboard";
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  try {
    var sheetName = "Pemeriksaan";
    if (action === "getUsers") sheetName = "Users";
    else if (action === "getDokumen") sheetName = "Dokumen";
    else if (action === "getTemuan") sheetName = "Temuan";
    else if (action === "getSatwas") sheetName = "MasterSatwas";
    
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return jsonResponse({ success: true, data: [] });
    
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return jsonResponse({ success: true, data: [] });
    
    var headers = data[0];
    var rows = data.slice(1);
    var result = rows.map(function(row) {
      var obj = {};
      headers.forEach(function(h, idx) {
        obj[h] = row[idx];
      });
      return obj;
    });
    return jsonResponse({ success: true, data: result });
  } catch (err) {
    return jsonResponse({ success: false, message: err.message });
  }
}

function doPost(e) {
  try {
    var contents = e.postData ? JSON.parse(e.postData.contents) : {};
    var action = contents.action || (e.parameter ? e.parameter.action : "");
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    return jsonResponse({ success: true, message: "OK", action: action });
  } catch (err) {
    return jsonResponse({ success: false, message: err.message });
  }
}
`;
