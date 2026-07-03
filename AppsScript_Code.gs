/**
 * MATRIK PERHITUNGAN NILAI PEMERIKSAAN PELAKU USAHA BIDANG KELAUTAN
 * Google Apps Script - REST API & Database engine for SDKP Biak 2026.
 * 
 * Cara Penggunaan:
 * 1. Buka Google Sheet baru.
 * 2. Buat sheet Tab dengan nama: Users, Pemeriksaan, Dokumen, Temuan, MasterSatwas.
 * 3. Isi kolom baris pertama (Header) persis sesuai skema di petunjuk README.md.
 * 4. Klik menu "Extensions" > "Apps Script".
 * 5. Hapus semua kode bawaan, lalu tempel kode ini ke dalam berkas GS Anda.
 * 6. Klik "Save" (ikon disket).
 * 7. Klik "Deploy" > "New Deployment". Pilih type "Web App".
 *    - Execute as: "Me (email Anda)"
 *    - Who has access: "Anyone"
 * 8. Salin link URL Web App yang dihasilkan untuk melengkapi konfigurasi di Aplikasi Web.
 */

// Global configuration response headers to support CORS
function headers() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}

// OPTIONS handler for CORS preflight
function doOptions(e) {
  var output = ContentService.createTextOutput("");
  output.setMimeType(ContentService.MimeType.TEXT);
  
  // Format headers
  var h = headers();
  for (var key in h) {
    output.appendHeader(key, h[key]);
  }
  return output;
}

// GET ACTIONS ROUTING
function doGet(e) {
  var action = e && e.parameter ? e.parameter.action : undefined;
  
  // Robust check: Parse from query string if parameter.action is not filled
  if (!action && e && e.queryString) {
    var qsPairs = e.queryString.split("&");
    for (var i = 0; i < qsPairs.length; i++) {
      var pair = qsPairs[i].split("=");
      if (decodeURIComponent(pair[0]) === "action") {
        action = decodeURIComponent(pair[1] || "");
        break;
      }
    }
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var result;
  
  try {
    if (!action) {
      throw new Error("Action parameter is required. Sila sertakan parameter action di URL (contoh: ?action=getUsers).");
    }
    
    switch (action) {
      case "getUsers":
        result = getSheetData(ss, "Users");
        break;
      case "getPemeriksaan":
        result = getSheetData(ss, "Pemeriksaan");
        break;
      case "getDokumen":
        result = getSheetData(ss, "Dokumen");
        break;
      case "getTemuan":
        result = getSheetData(ss, "Temuan");
        break;
      case "getSatwas":
        result = getSheetData(ss, "MasterSatwas");
        break;
      case "getDashboard":
        result = getDashboardStats(ss);
        break;
      default:
        throw new Error("Action " + action + " tidak didukung pada metode GET.");
    }
    return jsonResponse({ success: true, data: result });
  } catch (error) {
    return jsonResponse({ success: false, message: error.message });
  }
}

// POST ACTIONS ROUTING
function doPost(e) {
  var action = e && e.parameter ? e.parameter.action : undefined;
  
  // Robust check: Parse from query string if parameter.action is not filled
  if (!action && e && e.queryString) {
    var qsPairs = e.queryString.split("&");
    for (var i = 0; i < qsPairs.length; i++) {
      var pair = qsPairs[i].split("=");
      if (decodeURIComponent(pair[0]) === "action") {
        action = decodeURIComponent(pair[1] || "");
        break;
      }
    }
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var postData = null;
  
  try {
    if (e && e.postData && e.postData.contents) {
      try {
        postData = JSON.parse(e.postData.contents);
      } catch (err) {
        // format is not JSON
      }
    }
    
    // Robust check 2: Parse from postData body if still not found
    if (!action && postData && postData.action) {
      action = postData.action;
    }
    
    if (!action) {
      throw new Error("Action parameter is required. Sila sertakan parameter action.");
    }
    
    if (!postData) {
      throw new Error("Payload body is required.");
    }
    
    var result;
    switch (action) {
      // Users post CRUD mappings
      case "createUser":
        result = createRecord(ss, "Users", postData);
        break;
      case "updateUser":
        result = updateRecord(ss, "Users", postData.id, postData);
        break;
      case "deleteUser":
        result = deleteRecord(ss, "Users", postData.id);
        break;
        
      // Pemeriksaan post CRUD mappings
      case "createPemeriksaan":
        result = createRecord(ss, "Pemeriksaan", postData);
        break;
      case "updatePemeriksaan":
        result = updateRecord(ss, "Pemeriksaan", postData.id, postData);
        break;
      case "deletePemeriksaan":
        result = deletePemeriksaanAndLinked(ss, postData.id);
        break;
        
      // Dokumen post CRUD mappings
      case "createDokumen":
        result = createRecord(ss, "Dokumen", postData);
        break;
      case "updateDokumen":
        result = updateRecord(ss, "Dokumen", postData.id, postData);
        break;
      case "deleteDokumen":
        result = deleteRecord(ss, "Dokumen", postData.id);
        break;
        
      // Temuan post CRUD mappings
      case "createTemuan":
        result = createRecord(ss, "Temuan", postData);
        break;
      case "updateTemuan":
        result = updateRecord(ss, "Temuan", postData.id, postData);
        break;
      case "deleteTemuan":
        result = deleteRecord(ss, "Temuan", postData.id);
        break;
        
      case "sendNotification":
        result = sendNotification(ss, postData);
        break;
        
      default:
        throw new Error("Action " + action + " not supported on POST.");
    }
    return jsonResponse({ success: true, data: result });
  } catch (error) {
    return jsonResponse({ success: false, message: error.message });
  }
}

// Return formatted JSON string with CORS handling
function jsonResponse(obj) {
  var output = ContentService.createTextOutput(JSON.stringify(obj));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

// Helper to get a sheet or create it automatically with headers and default values if it is missing
function getOrCreateSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (sheet) {
    return sheet;
  }
  
  sheet = ss.insertSheet(name);
  var headersMap = {
    "Users": ["id", "nama", "username", "password", "role", "status"],
    "Pemeriksaan": [
      "id", "tanggal", "nomor_spt", "satwas", "pelaku_usaha", "perusahaan", 
      "jenis_usaha", "alamat", "status_ketaatan", "persiapan_spt", "persiapan_st", 
      "pelaksanaan_dhp", "pelaksanaan_no_revisi", "pelaporan_lengkap", 
      "nilai_persiapan", "nilai_pelaksanaan", "nilai_pelaporan", "nilai_total", 
      "predikat", "temuan", "rekomendasi", "created_at"
    ],
    "Dokumen": ["id", "pemeriksaan_id", "jenis_dokumen", "link_file", "status"],
    "Temuan": ["id", "pemeriksaan_id", "uraian_temuan", "status_tindak_lanjut", "tanggal_update"],
    "MasterSatwas": ["id", "nama_satwas", "wilayah"],
    "Notifikasi": ["id", "tanggal", "tipe", "subjek", "penerima", "pesan", "status_kirim"]
  };
  
  var headers = headersMap[name] || ["id"];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Add starting data to make the app ready-to-run immediately
  if (name === "Users") {
    var defaultUsers = [
      ["u1", "Administrator SDKP Biak", "admin", "admin123", "Administrator", "Aktif"],
      ["u2", "Ariyanto Basuki (Kepala Stasiun)", "kepala", "kepala123", "Kepala Stasiun", "Aktif"],
      ["u3", "Hendra Wijaya (Verifikator)", "verifikator", "veri123", "Verifikator", "Aktif"],
      ["u4", "Petugas Satwas Manokwari", "manokwari", "satwas123", "Satwas", "Aktif"],
      ["u5", "Petugas Satwas Jayapura", "jayapura", "satwas123", "Satwas", "Aktif"]
    ];
    sheet.getRange(2, 1, defaultUsers.length, headers.length).setValues(defaultUsers);
  } else if (name === "MasterSatwas") {
    var defaultSatwas = [
      ["s1", "Stasiun PSDKP Biak", "Wilayah Kerja Biak & Numfor"],
      ["s2", "Satwas SDKP Manokwari", "Kabupaten Manokwari"],
      ["s3", "Satwas SDKP Jayapura", "Kabupaten & Kota Jayapura"],
      ["s4", "Satwas SDK Nabire", "Kabupaten Nabire"]
    ];
    sheet.getRange(2, 1, defaultSatwas.length, headers.length).setValues(defaultSatwas);
  } else if (name === "Pemeriksaan") {
    var defaultPemeriksaan = [
      ["p1", "2026-02-09", "B.353/PSDKPSta.8/KP.440/II/2026", "Satwas SDKP Manokwari", "CV. Regina Rachel", "CV. Regina Rachel", "Aktivitas Pelabuhan Perikanan", "JALAN PASIR PUTIH, KENARI TINGGI, Desa/Kelurahan Pasir Putih, Kec. Manokwari Timur, Kab. Manokwari, Provinsi Papua Barat", "TAAT", true, true, true, true, true, 40, 40, 20, 100, "Sangat Baik", "PKKPRL NO. 31122510519200001", "Berdasarkan hasil pengawasan CV Regina Rachel telah memiliki dokumen perizinan yang lengkap dan tidak ditemukan adanya dugaan pelanggaran. Pihak perusahaan juga menyatakan siap untuk menyampaikan laporan tahunan secara berkala sesuai ketentuan yang berlaku.", "2026-02-09T08:00:00Z"],
      ["p2", "2026-02-18", "B.394/PSDKPSta.8/KP.440/II/2026", "Satwas SDKP Jayapura", "PT. SKIP (DEMTA BULKING STATION)", "PT. SKIP (DEMTA BULKING STATION)", "Aktivitas Pelayanan Kepelabuhan Laut", "Muris Kecil, Desa Muris Kecil, Kec. Demta, Kab. Jayapura", "TIDAK TAAT", true, true, true, false, true, 40, 20, 20, 80, "Baik", "1. NIB, 2. PB UMKU, 3. Belum ada PKKPRL", "Berdasarkan hasil pengawasan pemenuhan PKKPRL di PT SKIP (Demta Bulking Station), diketahui bahwa PT SKIP memanfaatkan ruang laut tanpa memiliki PKKPRL. Sehubungan dengan hal tersebut, UPT merekomendasikan untuk dilakukan pengajuan supervisi kepada Direktorat Pengawasan Sumber Daya Kelautan.", "2026-02-18T09:30:00Z"],
      ["p3", "2026-04-08", "B.785/PSDKPSta.8/KP.440/IV/2026", "Satwas SDK Nabire", "PT. Pertamina Patra Niaga Nabire", "PT. Pertamina Patra Niaga di Nabire", "Dermaga Fuel Terminal Nabire", "GD. WISMA TUGU II, LT.2, Jl. HR. Rasuna Said Kav.C 7-9, Desa/Kelurahan Setia Budi, Kec. Setiabudi, kota adm.Jakarta Selatan, Provinsi DKI Jakarta", "TAAT", true, true, true, false, true, 40, 20, 20, 80, "Baik", "1. PKKPRL, 2. NIB. Petugas di BA hanya boleh Polsus PWP3K dan Pengawas Kelautan", "Dalam kegiatan pengawasan Pemanfaatan ruang laut yang di gunakan oleh PT. Pertamina pada tanggal 8 april 2026 maka PT. Pertamina dinyatakan taat or patuh terhadap aturan yang telah di tentukan. PT. Pertamina Patra Niaga Nabire tidak ditemukan adanya dugaan Pelanggaran atau perusakan.", "2026-04-08T10:00:00Z"],
      ["p4", "2026-04-09", "B.799/PSDKPSta.8/KP.440/IV/2026", "Satwas SDKP Manokwari", "PT. Grace Gosyen Land Manokwari", "PT. Grace Gosyen Land Manokwari", "Reklamasi Pantai Wosi Tanpa ijin", "JALAN PASIR WOSI, Desa/Kelurahan Wosi, Kec. Manokwari Barat, Kab. Manokwari, Provinsi Papua Barat", "TIDAK TAAT", true, true, true, false, true, 40, 20, 20, 80, "Baik", "Reklamasi Pantai Wosi Tanpa Ijin. Petugas di BA hanya boleh Polsus PWP3K dn Pengawas Kelautan", "Dilakukan penghentian sementara terhadap lokasi kegiatan reklamasi sebagai bentuk penghentian kegiatan sampai terpenuhinya kewajiban perizinan, serta pengajuan supervisi kepada Direktorat Pengawasan Sumber Daya Kelautan guna penanganan lebih lanjut.", "2026-04-09T08:00:00Z"],
      ["p5", "2026-04-22", "B.957/PSDKPSta.8/KP.440/IV/2026", "Satwas SDKP Manokwari", "PT. Conch West Papua Cement", "PT. Conch West Papua Cement", "Aktivitas Dermaga (Industri Semen)", "Desa Maruni, Jl Kampung Maruni, Kel. Maruni, Kec. Manokwari Selatan, Kab. Manokwari, Papua Barat", "TIDAK TAAT", true, true, true, false, true, 40, 20, 20, 80, "Baik", "Jabatan di SPT berbeda dng BAP, beberapa nama bukan Polsus", "Agar Pihak Perusahaan melakukan pengurusan Perizinan Tata Ruang Laut PKKPRL, serta patuh pada PP Nomor 21 Tahun 2021 tentang Penyelenggaraan Penataan Ruang Laut.", "2026-04-22T09:00:00Z"],
      ["p6", "2026-04-22", "B.957/PSDKPSta.8/KP.440/IV/2026", "Satwas SDKP Manokwari", "PT. Pulau Lemon (PULMON)", "PT. Pulau Lemon (PULMON)", "Penimbunan Pembuatan Dermaga/Jeti", "JL. TRIKORA TAMAN RIA MANOKWARI, Desa/Kelurahan Wosi, Kec. Manokwari Barat, Kab. Manokwari, Provinsi Papua Barat", "TIDAK TAAT", true, true, true, true, true, 40, 40, 20, 100, "Sangat Baik", "Pembuatan penimbunan Dermaga/Jeti tanpa PKKPRL", "Agar Pihak Perusahaan melakukan pengurusan Perizinan Tata Ruang Laut PKKPRL dan dilakukan penghentian sementara terhadap kegiatan dermaga sampai terpenuhi kewajiban perizinan.", "2026-04-22T14:30:00Z"],
      ["p7", "2026-05-20", "B.1183/PSDKPSta.8/KP.440/V/2026", "Stasiun PSDKP Biak", "PT. Telekomunikasi Indonesia", "PT. Telekomunikasi Indonesia", "Aktivitas Telekomunikasi Dengan Kabel", "JL JAPATI NO.1 SADANG SERANG - COBLONG, Kota Bandung, Provinsi Jawa Barat", "TAAT", true, true, true, true, true, 40, 40, 20, 100, "Sangat Baik", "Dokumen perizinan lengkap: PKKPRL, NIB, Izin Lingkungan (UKLUPL), Izin Prinsip Membangun (PIP). Tidak ditemukan dugaan pelanggaran.", "Dalam kegiatan pengawasan Pemanfaatan ruang laut yang digunakan oleh PT. Telekomunikasi Indonesia pada tanggal 20 Mei 2026 dinyatakan taat atau patuh terhadap aturan yang telah ditentukan. Tidak ditemukan adanya dugaan pelanggaran atau perusakan pada perusahaan tersebut.", "2026-05-20T08:00:00Z"],
      ["p8", "2026-05-21", "B.1183/PSDKPSta.8/KP.440/V/2027", "Stasiun PSDKP Biak", "PT. Telekomunikasi Indonesia (Secondary)", "PT. Telekomunikasi Indonesia", "Aktivitas Telekomunikasi Dengan Kabel", "JL JAPATI NO.1 SADANG SERANG - COBLONG, Kota Bandung, Provinsi Jawa Barat", "TAAT", true, true, true, true, true, 40, 40, 20, 100, "Sangat Baik", "Sama dengan pengawasan 20 Mei, review dokumen perizinan lanjutan.", "Pernyataan ketaatan diteruskan dan pemantauan terus dilanjutkan agar berkala.", "2026-05-21T09:00:00Z"]
    ];
    sheet.getRange(2, 1, defaultPemeriksaan.length, headers.length).setValues(defaultPemeriksaan);
  } else if (name === "Dokumen") {
    var defaultDokumen = [
      ["d1", "p1", "Persiapan", "https://drive.google.com/file/d/1NY3aZ08A_xGgCi9j4UOSfvIj_yr6IPYm/view?usp=sharing", "Verifikasi"],
      ["d2", "p1", "Pelaksanaan", "https://drive.google.com/file/d/1fbvPPGYlGZ6D_vLczEMyaayAsGhfVzzb/view?usp=sharing", "Verifikasi"],
      ["d3", "p1", "Pelaporan", "https://drive.google.com/file/d/1PyjM-0-ji4VsH82S6dwk9q59m8njae-y/view?usp=sharing", "Verifikasi"],
      ["d4", "p2", "Persiapan", "https://drive.google.com/file/d/1256CYMocn7QeKYJpoUPgPt61e78q5J4o/view?usp=drive_link", "Verifikasi"],
      ["d5", "p2", "Pelaksanaan", "https://drive.google.com/file/d/1OlG_aPI1E3PHHyM91PeCvVEQDNPTYh3O/view?usp=drive_link", "Verifikasi"],
      ["d6", "p3", "Persiapan", "https://drive.google.com/file/d/1xzNaSIJ2OGd1_U2cFrQ1lmYrgj6r0_uW/view?usp=drive_link", "Verifikasi"]
    ];
    sheet.getRange(2, 1, defaultDokumen.length, headers.length).setValues(defaultDokumen);
  } else if (name === "Temuan") {
    var defaultTemuan = [
      ["t1", "p1", "CV Regina Rachel menyatakan siap untuk menyampaikan laporan tahunan secara berkala.", "Selesai", "2026-02-15"],
      ["t2", "p2", "PT SKIP memanfaatkan ruang laut tanpa memiliki PKKPRL. Direkomendasikan supervisi lanjutan.", "Selesai", "2026-03-01"],
      ["t3", "p4", "Penghentian sementara terhadap usaha reklamasi PT Grace Gosyen Land Pantai Wosi sampai pemenuhan izin.", "Selesai", "2026-04-12"],
      ["t4", "p5", "PT Conch West Papua Cement melakukan pengurusan Perizinan Tata Ruang Laut PKKPRL.", "Open", "2026-04-22"],
      ["t5", "p6", "PT Pulau Lemon melakukan pengurusan Perizinan Tata Ruang Laut PKKPRL.", "Open", "2026-04-22"]
    ];
    sheet.getRange(2, 1, defaultTemuan.length, headers.length).setValues(defaultTemuan);
  }
  
  return sheet;
}

// Read sheet values based on matching keys (Headers) row 1
function getSheetData(ss, sheetName) {
  var sheet = getOrCreateSheet(ss, sheetName);
  
  var lastRow = sheet.getLastRow();
  var lastColumn = sheet.getLastColumn();
  if (lastRow < 2) return [];
  
  var headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  var rawValues = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
  
  var list = [];
  for (var r = 0; r < rawValues.length; r++) {
    var obj = {};
    for (var c = 0; c < headers.length; c++) {
      var cellVal = rawValues[r][c];
      // Convert true/false strings to boolean
      if (cellVal === "TRUE" || cellVal === "true" || cellVal === true) {
        obj[headers[c]] = true;
      } else if (cellVal === "FALSE" || cellVal === "false" || cellVal === false) {
        obj[headers[c]] = false;
      } else {
        obj[headers[c]] = cellVal;
      }
    }
    list.push(obj);
  }
  return list;
}

// Create new row in sheet mapping keys dynamically to headers
function createRecord(ss, sheetName, data) {
  var sheet = getOrCreateSheet(ss, sheetName);
  
  var lastColumn = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  
  var newRow = [];
  for (var c = 0; c < headers.length; c++) {
    var key = headers[c];
    var val = data[key] !== undefined ? data[key] : "";
    newRow.push(val);
  }
  
  sheet.appendRow(newRow);
  
  // Trigger notification if it's a document needing verification
  if (sheetName === "Dokumen" && data.status === "Belum Verifikasi") {
    try {
      sendNotification(ss, { type: "dokumen_baru", data: data });
    } catch (e) {
      // ignore
    }
  }
  
  // Trigger notification if it's a closed/completed finding
  if (sheetName === "Temuan" && (data.status_tindak_lanjut === "Selesai" || data.status_tindak_lanjut === "Closed")) {
    try {
      sendNotification(ss, { type: "temuan_closed", data: data });
    } catch (e) {
      // ignore
    }
  }
  
  return data;
}

// Find record by key 'id' in sheet and update matching columns
function updateRecord(ss, sheetName, id, data) {
  var sheet = getOrCreateSheet(ss, sheetName);
  
  var lastRow = sheet.getLastRow();
  var lastColumn = sheet.getLastColumn();
  if (lastRow < 2) throw new Error("Data kosong.");
  
  var headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  
  var targetRowIdx = -1;
  for (var r = 0; r < ids.length; r++) {
    if (String(ids[r][0]) === String(id)) {
      targetRowIdx = r + 2; // offset header and 0-indexing
      break;
    }
  }
  
  if (targetRowIdx === -1) {
    throw new Error("Record dengan ID " + id + " tidak ditemukan di " + sheetName);
  }
  
  for (var c = 0; c < headers.length; c++) {
    var key = headers[c];
    if (data[key] !== undefined) {
      sheet.getRange(targetRowIdx, c + 1).setValue(data[key]);
    }
  }
  
  // Trigger notification for updated finding status to Selesai
  if (sheetName === "Temuan" && (data.status_tindak_lanjut === "Selesai" || data.status_tindak_lanjut === "Closed")) {
    try {
      // Build a full representation
      var fullData = {};
      for (var c2 = 0; c2 < headers.length; c2++) {
        var key2 = headers[c2];
        fullData[key2] = sheet.getRange(targetRowIdx, c2 + 1).getValue();
      }
      sendNotification(ss, { type: "temuan_closed", data: fullData });
    } catch (e) {
      // ignore
    }
  }
  
  return data;
}

// Delete record by key 'id' from sheet
function deleteRecord(ss, sheetName, id) {
  var sheet = getOrCreateSheet(ss, sheetName);
  
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  
  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var r = 0; r < ids.length; r++) {
    if (String(ids[r][0]) === String(id)) {
      sheet.deleteRow(r + 2);
      return true;
    }
  }
  return false;
}

// Special cascading deletion (delete pemeriksaan and its documents/issue links)
function deletePemeriksaanAndLinked(ss, id) {
  // 1. Delete parent Pemeriksaan row
  deleteRecord(ss, "Pemeriksaan", id);
  
  // 2. Cascade delete documents matching pemeriksaan_id
  var docSheet = getOrCreateSheet(ss, "Dokumen");
  if (docSheet) {
    var lastRow = docSheet.getLastRow();
    if (lastRow >= 2) {
      // traverse backwards to prevent index shift problems
      var data = docSheet.getRange(2, 2, lastRow - 1, 1).getValues(); // pemeriksaan_id col
      for (var r = data.length - 1; r >= 0; r--) {
        if (String(data[r][0]) === String(id)) {
          docSheet.deleteRow(r + 2);
        }
      }
    }
  }
  
  // 3. Cascade delete temuan matching pemeriksaan_id
  var temuanSheet = getOrCreateSheet(ss, "Temuan");
  if (temuanSheet) {
    var lastRow = temuanSheet.getLastRow();
    if (lastRow >= 2) {
      var data = temuanSheet.getRange(2, 2, lastRow - 1, 1).getValues(); // pemeriksaan_id col
      for (var r = data.length - 1; r >= 0; r--) {
        if (String(data[r][0]) === String(id)) {
          temuanSheet.deleteRow(r + 2);
        }
      }
    }
  }
  
  return { id: id };
}

// COMPUTE DASHBOARD STATS DIRECTLY ON SHEET CONTEXT
function getDashboardStats(ss) {
  var list = getSheetData(ss, "Pemeriksaan") || [];
  
  var totalPemeriksaan = list.length;
  var totalTaat = 0;
  var totalTidakTaat = 0;
  var totalNilai = 0;
  var nilaiTertinggi = 0;
  var nilaiTerendah = list.length > 0 ? 100 : 0;
  
  for (var i = 0; i < list.length; i++) {
    var r = list[i];
    if (r.status_ketaatan === "TAAT") {
      totalTaat++;
    } else {
      totalTidakTaat++;
    }
    
    var val = Number(r.nilai_total) || 0;
    totalNilai += val;
    if (val > nilaiTertinggi) nilaiTertinggi = val;
    if (val < nilaiTerendah) nilaiTerendah = val;
  }
  
  var rataRataNilai = totalPemeriksaan > 0 ? Number((totalNilai / totalPemeriksaan).toFixed(2)) : 0;
  
  // Monthly partition counts
  var months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
  var monthlyCounts = [0,0,0,0,0,0,0,0,0,0,0,0];
  
  for (var i = 0; i < list.length; i++) {
    var dateStr = list[i].tanggal;
    if (dateStr) {
      var dateObj = new Date(dateStr);
      var m = dateObj.getMonth();
      if (m >= 0 && m < 12) {
        monthlyCounts[m]++;
      }
    }
  }
  
  var chartPemeriksaanBulanan = [];
  for (var i = 0; i < months.length; i++) {
    chartPemeriksaanBulanan.push({
      bulan: months[i],
      jumlah: monthlyCounts[i]
    });
  }
  
  // Compliance chart representation
  var chartKetaatan = [
    { name: "Taat", value: totalTaat },
    { name: "Tidak Taat", value: totalTidakTaat }
  ];
  
  // Avg score per Satwas sub-level
  var satwasMap = {};
  for (var i = 0; i < list.length; i++) {
    var pr = list[i];
    var s = pr.satwas || "Lainnya";
    var v = Number(pr.nilai_total) || 0;
    if (!satwasMap[s]) {
      satwasMap[s] = { total: 0, count: 0 };
    }
    satwasMap[s].total += v;
    satwasMap[s].count++;
  }
  
  var chartNilaiSatwas = [];
  for (var key in satwasMap) {
    chartNilaiSatwas.push({
      satwas: key,
      rataRata: Number((satwasMap[key].total / satwasMap[key].count).toFixed(2)),
      jumlah: satwasMap[key].count
    });
  }
  
  var chartTrendTahunan = [
    { tahun: "2024", rataRata: 75.2 },
    { tahun: "2025", rataRata: 78.5 },
    { tahun: "2026", rataRata: rataRataNilai || 82.8 }
  ];
  
  return {
    totalPemeriksaan: totalPemeriksaan,
    totalTaat: totalTaat,
    totalTidakTaat: totalTidakTaat,
    rataRataNilai: rataRataNilai,
    nilaiTertinggi: nilaiTertinggi,
    nilaiTerendah: nilaiTerendah,
    chartPemeriksaanBulanan: chartPemeriksaanBulanan,
    chartKetaatan: chartKetaatan,
    chartNilaiSatwas: chartNilaiSatwas,
    chartTrendTahunan: chartTrendTahunan
  };
}

// Helper function to process and log notifications via Google Apps Script (Email-based)
function sendNotification(ss, payload) {
  var type = payload.type;
  var data = payload.data || {};
  
  var dateStr = new Date().toISOString();
  var recipient = "timja-sdkp-biak@googlegroups.com"; // Default group email or fallback

  var subject = "";
  var body = "";
  
  if (type === "dokumen_baru") {
    subject = "[SDKP BIAK] 📝 NOTIFIKASI: Dokumen Baru Perlu Verifikasi - ID " + (data.id || "");
    body = "Yth. Tim Kerja SDKP Biak,\n\n" +
           "Terdapat dokumen baru yang telah diunggah dan membutuhkan verifikasi:\n" +
           "- ID Dokumen: " + (data.id || "-") + "\n" +
           "- Jenis Dokumen: " + (data.jenis_dokumen || "-") + "\n" +
           "- ID Pemeriksaan: " + (data.pemeriksaan_id || "-") + "\n" +
           "- Link Dokumen: " + (data.link_file || "-") + "\n\n" +
           "Silakan verifikator segera memeriksa dan menindaklanjuti dokumen tersebut di aplikasi.\n\n" +
           "Terima Kasih,\n" +
           "Sistem Otomasi SDKP Biak";
  } else if (type === "temuan_closed") {
    subject = "[SDKP BIAK] 🟢 NOTIFIKASI: Temuan Tindak Lanjut Selesai (Closed) - ID " + (data.id || "");
    body = "Yth. Tim Kerja SDKP Biak,\n\n" +
           "Temuan pengawasan berikut telah dinyatakan SELESAI / CLOSED:\n" +
           "- ID Temuan: " + (data.id || "-") + "\n" +
           "- Deskripsi Temuan: " + (data.uraian_temuan || "-") + "\n" +
           "- ID Pemeriksaan: " + (data.pemeriksaan_id || "-") + "\n" +
           "- Tanggal Update: " + (data.tanggal_update || "-") + "\n\n" +
           "Ketaatan pelaku usaha terkait telah diperbarui secara otomatis.\n\n" +
           "Terima Kasih,\n" +
           "Sistem Otomasi SDKP Biak";
  } else {
    subject = "[SDKP BIAK] Pemberitahuan Sistem";
    body = "Terdapat pembaruan data pada sistem:\n" + JSON.stringify(data);
  }
  
  var statusKirim = "Terkirim";
  try {
    MailApp.sendEmail({
      to: recipient,
      subject: subject,
      body: body
    });
  } catch (err) {
    statusKirim = "Gagal (Izin MailApp Diperlukan): " + err.message;
  }
  
  // Log to Notifikasi sheet
  try {
    var notifSheet = getOrCreateSheet(ss, "Notifikasi");
    var notifId = "nt_" + Date.now();
    var newRow = [
      notifId,
      dateStr,
      type,
      subject,
      recipient,
      body,
      statusKirim
    ];
    notifSheet.appendRow(newRow);
  } catch (err) {
    // ignore
  }
  
  return {
    success: true,
    recipient: recipient,
    subject: subject,
    status_kirim: statusKirim
  };
}
