import { User, Pemeriksaan, Dokumen, Temuan, MasterSatwas } from "../types";

/**
 * Universal Client-Side Google Sheets API Service
 * Interacts directly with Google Sheets and Google Drive REST APIs via user OAuth token.
 */

// Basic GET request fetcher
async function googleApiFetch<T>(url: string, token: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
    ...options.headers,
  };
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const errorText = await res.text();
    let parsedErr;
    try {
      parsedErr = JSON.parse(errorText);
    } catch {
      parsedErr = { error: { message: errorText } };
    }
    throw new Error(parsedErr.error?.message || `Google Sheets API Error (${res.status})`);
  }
  const text = await res.text();
  if (!text) {
    return {} as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch (e) {
    throw new Error(`Google Sheets API Error: Respon bukan JSON yang valid. ${text.slice(0, 100)}`);
  }
}

export const googleSheetsApi = {
  /**
   * Search user's Google Drive for existing spreadsheets
   */
  async listSpreadsheets(token: string): Promise<{ id: string; name: string }[]> {
    const url = `https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.spreadsheet' and trashed=false&fields=files(id,name)&pageSize=30`;
    const data = await googleApiFetch<{ files: { id: string; name: string }[] }>(url, token);
    return data.files || [];
  },

  /**
   * Search user's entire Google Drive for files matching search query
   */
  async listDriveFiles(token: string, keyword: string = ""): Promise<{ id: string; name: string; mimeType: string; webViewLink?: string }[]> {
    const qClause = keyword 
      ? `name contains '${keyword.replace(/'/g, "\\'")}' and trashed = false` 
      : "trashed = false";
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(qClause)}&fields=files(id,name,mimeType,webViewLink)&pageSize=50`;
    const data = await googleApiFetch<{ files: { id: string; name: string; mimeType: string; webViewLink?: string }[] }>(url, token);
    return data.files || [];
  },

  /**
   * Create a new structured Spreadsheet and populate tabs & default rows
   */
  async createSpreadsheet(token: string, title: string): Promise<string> {
    const createUrl = "https://sheets.googleapis.com/v4/spreadsheets";
    const body = {
      properties: {
        title: title,
      },
      sheets: [
        { properties: { title: "Users" } },
        { properties: { title: "Pemeriksaan" } },
        { properties: { title: "Dokumen" } },
        { properties: { title: "Temuan" } },
        { properties: { title: "MasterSatwas" } },
      ],
    };

    const sheetResult = await googleApiFetch<{ spreadsheetId: string }>(createUrl, token, {
      method: "POST",
      body: JSON.stringify(body),
    });

    const spreadsheetId = sheetResult.spreadsheetId;

    // Initialize headers and default rows
    const defaultUsers = [
      ["id", "nama", "username", "password", "role", "status"],
      ["u1", "Administrator SDKP Biak", "admin", "admin123", "Administrator", "Aktif"],
      ["u2", "Ariyanto Basuki (Kepala Stasiun)", "kepala", "kepala123", "Kepala Stasiun", "Aktif"],
      ["u3", "Hendra Wijaya (Verifikator)", "verifikator", "veri123", "Verifikator", "Aktif"],
      ["u4", "Petugas Satwas Manokwari", "manokwari", "satwas123", "Satwas", "Aktif"],
      ["u5", "Petugas Satwas Jayapura", "jayapura", "satwas123", "Satwas", "Aktif"]
    ];

    const defaultSatwas = [
      ["id", "nama_satwas", "wilayah"],
      ["s1", "Stasiun PSDKP Biak", "Wilayah Kerja Biak & Numfor"],
      ["s2", "Satwas SDKP Manokwari", "Kabupaten Manokwari"],
      ["s3", "Satwas SDKP Jayapura", "Kabupaten & Kota Jayapura"],
      ["s4", "Satwas SDK Nabire", "Kabupaten Nabire"]
    ];

    const defaultPemeriksaan = [
      [
        "id", "tanggal", "nomor_spt", "satwas", "pelaku_usaha", "perusahaan", 
        "jenis_usaha", "alamat", "status_ketaatan", "persiapan_spt", "persiapan_st", 
        "pelaksanaan_dhp", "pelaksanaan_no_revisi", "pelaporan_lengkap", 
        "nilai_persiapan", "nilai_pelaksanaan", "nilai_pelaporan", "nilai_total", 
        "predikat", "temuan", "rekomendasi", "created_at"
      ],
      [
        "p1", "2026-02-09", "B.353/PSDKPSta.8/KP.440/II/2026", "Satwas SDKP Manokwari", "CV. Regina Rachel", "CV. Regina Rachel", "Aktivitas Pelabuhan Perikanan", "JALAN PASIR PUTIH, KENARI TINGGI, Desa/Kelurahan Pasir Putih, Kec. Manokwari Timur, Kab. Manokwari, Provinsi Papua Barat", "TAAT", "TRUE", "TRUE", "TRUE", "TRUE", "TRUE", "40", "40", "20", "100", "Sangat Baik", "PKKPRL NO. 31122510519200001", "Berdasarkan hasil pengawasan CV Regina Rachel telah memiliki dokumen perizinan yang lengkap dan tidak ditemukan adanya dugaan pelanggaran. Pihak perusahaan juga menyatakan siap untuk menyampaikan laporan tahunan secara berkala sesuai ketentuan yang berlaku.", "2026-02-09T08:00:00Z"
      ],
      [
        "p2", "2026-02-18", "B.394/PSDKPSta.8/KP.440/II/2026", "Satwas SDKP Jayapura", "PT. SKIP (DEMTA BULKING STATION)", "PT. SKIP (DEMTA BULKING STATION)", "Aktivitas Pelayanan Kepelabuhan Laut", "Muris Kecil, Desa Muris Kecil, Kec. Demta, Kab. Jayapura", "TIDAK TAAT", "TRUE", "TRUE", "TRUE", "FALSE", "TRUE", "40", "20", "20", "80", "Baik", "1. NIB, 2. PB UMKU, 3. Belum ada PKKPRL", "Berdasarkan hasil pengawasan pemenuhan PKKPRL di PT SKIP (Demta Bulking Station), diketahui bahwa PT SKIP memanfaatkan ruang laut tanpa memiliki PKKPRL. Sehubungan dengan hal tersebut, UPT merekomendasikan untuk dilakukan pengajuan supervisi kepada Direktorat Pengawasan Sumber Daya Kelautan.", "2026-02-18T09:30:00Z"
      ]
    ];

    const defaultDokumen = [
      ["id", "pemeriksaan_id", "jenis_dokumen", "link_file", "status"],
      ["d1", "p1", "Persiapan", "https://drive.google.com/file/d/1NY3aZ08A_xGgCi9j4UOSfvIj_yr6IPYm/view?usp=sharing", "Verifikasi"],
      ["d2", "p1", "Pelaksanaan", "https://drive.google.com/file/d/1fbvPPGYlGZ6D_vLczEMyaayAsGhfVzzb/view?usp=sharing", "Verifikasi"],
      ["d3", "p1", "Pelaporan", "https://drive.google.com/file/d/1PyjM-0-ji4VsH82S6dwk9q59m8njae-y/view?usp=sharing", "Verifikasi"]
    ];

    const defaultTemuan = [
      ["id", "pemeriksaan_id", "uraian_temuan", "status_tindak_lanjut", "tanggal_update"],
      ["t1", "p1", "CV Regina Rachel menyatakan siap untuk menyampaikan laporan tahunan secara berkala.", "Selesai", "2026-02-15"],
      ["t2", "p2", "PT SKIP memanfaatkan ruang laut tanpa memiliki PKKPRL. Direkomendasikan supervisi lanjutan.", "Selesai", "2026-03-01"]
    ];

    // Bulk populate worksheets using v4 values.batchUpdate
    const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
    await googleApiFetch(updateUrl, token, {
      method: "POST",
      body: JSON.stringify({
        valueInputOption: "RAW",
        data: [
          { range: "Users!A1", values: defaultUsers },
          { range: "MasterSatwas!A1", values: defaultSatwas },
          { range: "Pemeriksaan!A1", values: defaultPemeriksaan },
          { range: "Dokumen!A1", values: defaultDokumen },
          { range: "Temuan!A1", values: defaultTemuan },
        ],
      }),
    });

    return spreadsheetId;
  },

  /**
   * Load data rows for a specified sheet name
   */
  async getRows(token: string, spreadsheetId: string, sheetName: string): Promise<any[]> {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:Z500`;
    const response = await googleApiFetch<{ values?: string[][] }>(url, token);
    
    const rows = response.values;
    if (!rows || rows.length < 1) return [];

    const headers = rows[0];
    const rawData = rows.slice(1);

    return rawData.map(row => {
      const obj: any = {};
      headers.forEach((header, index) => {
        let val: any = row[index] !== undefined ? row[index] : "";
        // Convert pseudo boolean strings or numbers appropriately
        if (val === "TRUE" || val === "true" || val === true) {
          obj[header] = true;
        } else if (val === "FALSE" || val === "false" || val === false) {
          obj[header] = false;
        } else if (!isNaN(Number(val)) && val !== "" && header.includes("nilai")) {
          obj[header] = Number(val);
        } else {
          obj[header] = val;
        }
      });
      return obj;
    });
  },

  /**
   * Append a single row map mapping fields dynamically to headers
   */
  async appendRow(token: string, spreadsheetId: string, sheetName: string, data: any): Promise<void> {
    // 1. Get current headers in row 1
    const headersUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:Z1`;
    const response = await googleApiFetch<{ values?: string[][] }>(headersUrl, token);
    const headers = response.values?.[0] || [];
    if (headers.length === 0) throw new Error(`Headers not found in sheet: ${sheetName}`);

    // 2. Align fields in data with found headers
    const newRow = headers.map(header => {
      const val = data[header];
      if (val === undefined || val === null) return "";
      return String(val);
    });

    // 3. Append to worksheet
    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:append?valueInputOption=USER_ENTERED`;
    await googleApiFetch(appendUrl, token, {
      method: "POST",
      body: JSON.stringify({
        values: [newRow]
      })
    });
  },

  /**
   * Find record by ID field in column A/index-matched element, and rewrite columns to match updated form
   */
  async updateRow(token: string, spreadsheetId: string, sheetName: string, id: string, data: any): Promise<void> {
    // 1. Load full range of sheet
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:Z500`;
    const response = await googleApiFetch<{ values?: string[][] }>(url, token);
    const rows = response.values || [];
    if (rows.length < 2) throw new Error(`Data is empty in ${sheetName}.`);

    const headers = rows[0];
    const idColIndex = headers.indexOf("id");
    if (idColIndex === -1) throw new Error(`"id" column not found in ${sheetName}`);

    // 2. Find row index matching record ID
    let rowNum = -1;
    for (let r = 1; r < rows.length; r++) {
      if (String(rows[r][idColIndex]) === String(id)) {
        rowNum = r + 1; // 1-indexed for Google Sheets
        break;
      }
    }

    if (rowNum === -1) throw new Error(`Record with ID ${id} is not found in ${sheetName}.`);

    // 3. Align updated values with headers
    const updatedRow = headers.map((header, index) => {
      if (data[header] !== undefined) {
        return String(data[header]);
      }
      return rows[rowNum - 1][index] !== undefined ? String(rows[rowNum - 1][index]) : "";
    });

    // 4. Update the cells in the specific row range
    const cellsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A${rowNum}:Z${rowNum}?valueInputOption=USER_ENTERED`;
    await googleApiFetch(cellsUrl, token, {
      method: "PUT",
      body: JSON.stringify({
        values: [updatedRow]
      })
    });
  },

  /**
   * Delete row matching ID by clearing value or wiping it completely
   */
  async deleteRow(token: string, spreadsheetId: string, sheetName: string, id: string): Promise<void> {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:Z500`;
    const response = await googleApiFetch<{ values?: string[][] }>(url, token);
    const rows = response.values || [];
    if (rows.length < 2) return;

    const headers = rows[0];
    const idColIndex = headers.indexOf("id");
    if (idColIndex === -1) return;

    let targetRowIndex = -1;
    for (let r = 1; r < rows.length; r++) {
      if (String(rows[r][idColIndex]) === String(id)) {
        targetRowIndex = r;
        break;
      }
    }

    if (targetRowIndex === -1) return;

    // To prevent empty row gaps we can retrieve all rows except target row, clear ranges and batch rewrite
    const remainingRows = rows.filter((_, idx) => idx !== targetRowIndex);

    // Add empty rows fill to clear original trailing lines
    while (remainingRows.length < rows.length) {
      remainingRows.push(new Array(headers.length).fill(""));
    }

    // Rewrite sheet
    const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:Z500?valueInputOption=USER_ENTERED`;
    await googleApiFetch(clearUrl, token, {
      method: "PUT",
      body: JSON.stringify({
        values: remainingRows
      })
    });
  }
};
