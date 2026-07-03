import express from "express";
import path from "path";
import fs from "fs/promises";
import dotenv from "dotenv";
import { GoogleGenAI, Modality } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Path to local JSON DB
const DB_PATH = path.join(process.cwd(), "data", "db.json");

let dbCache: any = null;

// Helper to read local database
async function readDB() {
  if (dbCache) {
    return dbCache;
  }
  const defaultUsers = [
    {
      "id": "u1",
      "nama": "Administrator SDKP Biak",
      "username": "admin",
      "password": "admin123",
      "role": "Administrator",
      "status": "Aktif"
    },
    {
      "id": "u2",
      "nama": "Ariyanto Basuki (Kepala Stasiun)",
      "username": "kepala",
      "password": "kepala123",
      "role": "Kepala Stasiun",
      "status": "Aktif"
    },
    {
      "id": "u3",
      "nama": "Hendra Wijaya (Verifikator)",
      "username": "verifikator",
      "password": "veri123",
      "role": "Verifikator",
      "status": "Aktif"
    },
    {
      "id": "u4",
      "nama": "Petugas Satwas Manokwari",
      "username": "manokwari",
      "password": "satwas123",
      "role": "Satwas",
      "status": "Aktif"
    },
    {
      "id": "u5",
      "nama": "Petugas Satwas Jayapura",
      "username": "jayapura",
      "password": "satwas123",
      "role": "Satwas",
      "status": "Aktif"
    }
  ];

  try {
    const data = await fs.readFile(DB_PATH, "utf-8");
    const json = JSON.parse(data);
    if (!json.logs) {
      json.logs = [];
    }
    if (!json.users || json.users.length === 0) {
      json.users = defaultUsers;
    }
    if (json.config) {
      if (json.config.DATA_PERSISTENCE_MODE) {
        configEnv.DATA_PERSISTENCE_MODE = json.config.DATA_PERSISTENCE_MODE;
      }
      if (json.config.GAS_WEB_APP_URL !== undefined) {
        configEnv.GAS_WEB_APP_URL = json.config.GAS_WEB_APP_URL;
      }
      if (json.config.SPREADSHEET_ID !== undefined) {
        configEnv.SPREADSHEET_ID = json.config.SPREADSHEET_ID;
      }
      if (json.config.PAGU_ANGGARAN !== undefined) {
        configEnv.PAGU_ANGGARAN = Number(json.config.PAGU_ANGGARAN) || 0;
      }
      if (json.config.REALISASI_ANGGARAN !== undefined) {
        configEnv.REALISASI_ANGGARAN = Number(json.config.REALISASI_ANGGARAN) || 0;
      }
      if (json.config.TARGET_REALISASI !== undefined) {
        configEnv.TARGET_REALISASI = Number(json.config.TARGET_REALISASI) || 0;
      }
      if (json.config.TARGET_Q1 !== undefined) configEnv.TARGET_Q1 = Number(json.config.TARGET_Q1) || 0;
      if (json.config.TARGET_Q2 !== undefined) configEnv.TARGET_Q2 = Number(json.config.TARGET_Q2) || 0;
      if (json.config.TARGET_Q3 !== undefined) configEnv.TARGET_Q3 = Number(json.config.TARGET_Q3) || 0;
      if (json.config.TARGET_Q4 !== undefined) configEnv.TARGET_Q4 = Number(json.config.TARGET_Q4) || 0;
      if (json.config.REALISASI_Q1 !== undefined) configEnv.REALISASI_Q1 = Number(json.config.REALISASI_Q1) || 0;
      if (json.config.REALISASI_Q2 !== undefined) configEnv.REALISASI_Q2 = Number(json.config.REALISASI_Q2) || 0;
      if (json.config.REALISASI_Q3 !== undefined) configEnv.REALISASI_Q3 = Number(json.config.REALISASI_Q3) || 0;
      if (json.config.REALISASI_Q4 !== undefined) configEnv.REALISASI_Q4 = Number(json.config.REALISASI_Q4) || 0;
      if (json.config.TARGET_SATWAS !== undefined) {
        configEnv.TARGET_SATWAS = json.config.TARGET_SATWAS;
      }
    }
    dbCache = json;
    return json;
  } catch (error) {
    console.error("Error reading local DB, initializing empty with default users fallback:", error);
    dbCache = { 
      config: { DATA_PERSISTENCE_MODE: "local", GAS_WEB_APP_URL: "", SPREADSHEET_ID: "" },
      users: defaultUsers, 
      pemeriksaan: [], 
      dokumen: [], 
      temuan: [], 
      satwas: [],
      logs: [] 
    };
    return dbCache;
  }
}

// Helper to write local database
async function writeDB(data: any) {
  dbCache = data;
  try {
    // Keep config synced inside the output
    data.config = {
      DATA_PERSISTENCE_MODE: configEnv.DATA_PERSISTENCE_MODE,
      GAS_WEB_APP_URL: configEnv.GAS_WEB_APP_URL,
      SPREADSHEET_ID: configEnv.SPREADSHEET_ID,
      PAGU_ANGGARAN: Number(configEnv.PAGU_ANGGARAN) || 0,
      REALISASI_ANGGARAN: Number(configEnv.REALISASI_ANGGARAN) || 0,
      TARGET_REALISASI: Number(configEnv.TARGET_REALISASI) || 0,
      TARGET_Q1: Number(configEnv.TARGET_Q1) || 0,
      TARGET_Q2: Number(configEnv.TARGET_Q2) || 0,
      TARGET_Q3: Number(configEnv.TARGET_Q3) || 0,
      TARGET_Q4: Number(configEnv.TARGET_Q4) || 0,
      REALISASI_Q1: Number(configEnv.REALISASI_Q1) || 0,
      REALISASI_Q2: Number(configEnv.REALISASI_Q2) || 0,
      REALISASI_Q3: Number(configEnv.REALISASI_Q3) || 0,
      REALISASI_Q4: Number(configEnv.REALISASI_Q4) || 0,
      TARGET_SATWAS: configEnv.TARGET_SATWAS,
    };
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing local DB:", error);
  }
}

// Memory configuration, allowing user to dynamically set GAS URL from the client
let configEnv: any = {
  DATA_PERSISTENCE_MODE: process.env.DATA_PERSISTENCE_MODE || "local",
  GAS_WEB_APP_URL: process.env.GAS_WEB_APP_URL || "",
  SPREADSHEET_ID: process.env.SPREADSHEET_ID || "",
  PAGU_ANGGARAN: 1250000000,
  REALISASI_ANGGARAN: 825000000,
  TARGET_REALISASI: 1000000000,
  TARGET_Q1: 250000000,
  TARGET_Q2: 250000000,
  TARGET_Q3: 250000000,
  TARGET_Q4: 250000000,
  REALISASI_Q1: 220000000,
  REALISASI_Q2: 230000000,
  REALISASI_Q3: 200000000,
  REALISASI_Q4: 175000000,
  TARGET_SATWAS: {
    "Stasiun PSDKP Biak": { pagu: 500000000, target: 400000000, realisasi: 330000000 },
    "Satwas SDKP Manokwari": { pagu: 250000000, target: 200000000, realisasi: 165000000 },
    "Satwas SDKP Jayapura": { pagu: 312500000, target: 250000000, realisasi: 206250000 },
    "Satwas SDK Nabire": { pagu: 187500000, target: 150000000, realisasi: 123750000 }
  }
};

// Generic Apps Script Proxy Handler
async function proxyToGAS(action: string, method: "GET" | "POST", body: any = null): Promise<any> {
  const url = configEnv.GAS_WEB_APP_URL;
  if (!url) {
    throw new Error("Google Apps Script Web App URL is not configured.");
  }

  let finalUrl: URL;
  try {
    finalUrl = new URL(url);
  } catch (err) {
    throw new Error(`URL Google Apps Script tidak valid: ${url}`);
  }
  finalUrl.searchParams.set("action", action);

  const options: RequestInit = {
    method: method,
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (method === "POST" && body) {
    // Inject the action so the body has it as a backup
    if (typeof body === "object" && body !== null && !Array.isArray(body)) {
      body.action = action;
    }
    options.body = JSON.stringify(body);
  }

  const response = await fetch(finalUrl.toString(), options);
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Layanan Google Apps Script belum dikonfigurasi dengan benar (URL tidak ditemukan)");
    }
    throw new Error(`GAS Request Failed: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();

  if (text.trim().startsWith("<") || contentType.includes("text/html")) {
    throw new Error("Respon dari Google Apps Script berupa dokumen HTML. Pastikan Web App dipos sebagai 'Anyone' (Siapa Saja) dan URL Web App (akhiran /exec) sudah benar.");
  }

  try {
    const json = JSON.parse(text);
    if (json && typeof json === "object") {
      if (json.success === false) {
        throw new Error(json.message || `Error dari Google Apps Script untuk aksi ${action}`);
      }
      return json.hasOwnProperty("data") ? json.data : json;
    }
    return json;
  } catch (err: any) {
    throw new Error(`Gagal memproses JSON dari Google Apps Script: ${err.message}. Respons mentah: ${text.slice(0, 150)}`);
  }
}

// Helper to trigger automated notifications via Google Apps Script Web App
async function triggerNotification(type: string, data: any) {
  if (configEnv.GAS_WEB_APP_URL) {
    try {
      await proxyToGAS("sendNotification", "POST", { type, data });
      console.log(`Notification sent successfully via GAS Web App for type: ${type}`);
    } catch (err: any) {
      console.warn(`Failed to send notification via GAS Web App: ${err.message}`);
    }
  } else {
    console.log(`GAS Web App URL not configured. Skipping automated notification for type: ${type}`);
  }
}

// API CONFIG ENDPOINT
app.get("/api/config", (req, res) => {
  res.json({ success: true, data: configEnv });
});

app.get("/api/appsscript-code", async (req, res) => {
  try {
    const codePath = path.join(process.cwd(), "AppsScript_Code.gs");
    const code = await fs.readFile(codePath, "utf-8");
    res.json({ success: true, code });
  } catch (err: any) {
    res.status(500).json({ success: false, message: "Gagal membaca berkas AppsScript_Code.gs: " + err.message });
  }
});

app.post("/api/config", async (req, res) => {
  const { 
    DATA_PERSISTENCE_MODE, 
    GAS_WEB_APP_URL, 
    SPREADSHEET_ID, 
    PAGU_ANGGARAN, 
    REALISASI_ANGGARAN, 
    TARGET_REALISASI,
    TARGET_Q1,
    TARGET_Q2,
    TARGET_Q3,
    TARGET_Q4,
    REALISASI_Q1,
    REALISASI_Q2,
    REALISASI_Q3,
    REALISASI_Q4,
    TARGET_SATWAS
  } = req.body;
  if (DATA_PERSISTENCE_MODE) configEnv.DATA_PERSISTENCE_MODE = DATA_PERSISTENCE_MODE;
  if (GAS_WEB_APP_URL !== undefined) configEnv.GAS_WEB_APP_URL = GAS_WEB_APP_URL;
  if (SPREADSHEET_ID !== undefined) configEnv.SPREADSHEET_ID = SPREADSHEET_ID;
  if (PAGU_ANGGARAN !== undefined) configEnv.PAGU_ANGGARAN = Number(PAGU_ANGGARAN) || 0;
  if (REALISASI_ANGGARAN !== undefined) configEnv.REALISASI_ANGGARAN = Number(REALISASI_ANGGARAN) || 0;
  if (TARGET_REALISASI !== undefined) configEnv.TARGET_REALISASI = Number(TARGET_REALISASI) || 0;
  if (TARGET_Q1 !== undefined) configEnv.TARGET_Q1 = Number(TARGET_Q1) || 0;
  if (TARGET_Q2 !== undefined) configEnv.TARGET_Q2 = Number(TARGET_Q2) || 0;
  if (TARGET_Q3 !== undefined) configEnv.TARGET_Q3 = Number(TARGET_Q3) || 0;
  if (TARGET_Q4 !== undefined) configEnv.TARGET_Q4 = Number(TARGET_Q4) || 0;
  if (REALISASI_Q1 !== undefined) configEnv.REALISASI_Q1 = Number(REALISASI_Q1) || 0;
  if (REALISASI_Q2 !== undefined) configEnv.REALISASI_Q2 = Number(REALISASI_Q2) || 0;
  if (REALISASI_Q3 !== undefined) configEnv.REALISASI_Q3 = Number(REALISASI_Q3) || 0;
  if (REALISASI_Q4 !== undefined) configEnv.REALISASI_Q4 = Number(REALISASI_Q4) || 0;
  if (TARGET_SATWAS !== undefined) configEnv.TARGET_SATWAS = TARGET_SATWAS;

  try {
    const db = await readDB();
    db.config = {
      DATA_PERSISTENCE_MODE: configEnv.DATA_PERSISTENCE_MODE,
      GAS_WEB_APP_URL: configEnv.GAS_WEB_APP_URL,
      SPREADSHEET_ID: configEnv.SPREADSHEET_ID,
      PAGU_ANGGARAN: configEnv.PAGU_ANGGARAN,
      REALISASI_ANGGARAN: configEnv.REALISASI_ANGGARAN,
      TARGET_REALISASI: configEnv.TARGET_REALISASI,
      TARGET_Q1: configEnv.TARGET_Q1,
      TARGET_Q2: configEnv.TARGET_Q2,
      TARGET_Q3: configEnv.TARGET_Q3,
      TARGET_Q4: configEnv.TARGET_Q4,
      REALISASI_Q1: configEnv.REALISASI_Q1,
      REALISASI_Q2: configEnv.REALISASI_Q2,
      REALISASI_Q3: configEnv.REALISASI_Q3,
      REALISASI_Q4: configEnv.REALISASI_Q4,
      TARGET_SATWAS: configEnv.TARGET_SATWAS,
    };
    await writeDB(db);
    res.json({ success: true, message: "Konfigurasi berhasil disimpan dan dipersistensi!", data: configEnv });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Gagal menyimpan konfigurasi ke file database." });
  }
});

// AUTH LOGIN ENDPOINT
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ success: false, message: "Username dan password wajib diisi." });
    }

    if (configEnv.DATA_PERSISTENCE_MODE === "sheet" && configEnv.GAS_WEB_APP_URL) {
      try {
        const gasResult = await proxyToGAS("getUsers", "GET");
        if (gasResult && Array.isArray(gasResult)) {
          const found = gasResult.find((u: any) => u.username === username && u.password === password);
          if (found) {
            if (found.status === "Nonaktif") {
              return res.status(403).json({ success: false, message: "Akun Anda dinonaktifkan." });
            }
            const { password, ...userWithoutPassword } = found;
            return res.json({ success: true, user: userWithoutPassword });
          }
        }
      } catch (e: any) {
        console.log(`GAS Sync info: Using local DB auth (Reason: ${e.message})`);
      }
    }

    // Fallback / Local Login
    const db = await readDB();
    const users = db?.users || [];
    const user = users.find((u: any) => u.username === username && u.password === password);
    if (user) {
      if (user.status === "Nonaktif") {
        return res.status(403).json({ success: false, message: "Akun Anda dinonaktifkan." });
      }
      const { password: _, ...userWithoutPassword } = user;
      return res.json({ success: true, user: userWithoutPassword });
    }

    return res.status(401).json({ success: false, message: "Username atau Password salah." });
  } catch (error: any) {
    console.error("Critical error in /api/auth/login:", error);
    return res.status(500).json({ success: false, message: "Terjadi kesalahan internal pada server: " + (error.message || "Unknown error") });
  }
});

// USERS CRUD
app.get("/api/users", async (req, res) => {
  if (configEnv.DATA_PERSISTENCE_MODE === "sheet" && configEnv.GAS_WEB_APP_URL) {
    try {
      const data = await proxyToGAS("getUsers", "GET");
      return res.json({ success: true, data });
    } catch (e: any) {
      console.log(`GAS Sync info: Using local DB for users (Reason: ${e.message})`);
      const db = await readDB();
      return res.json({ success: true, data: db.users, warning: e.message });
    }
  }
  const db = await readDB();
  res.json({ success: true, data: db.users });
});

app.post("/api/users", async (req, res) => {
  const newUser = { id: "u_" + Date.now(), status: "Aktif", ...req.body };
  if (configEnv.DATA_PERSISTENCE_MODE === "sheet" && configEnv.GAS_WEB_APP_URL) {
    try {
      const data = await proxyToGAS("createUser", "POST", newUser);
      return res.json({ success: true, data });
    } catch (e: any) {
      return res.status(500).json({ success: false, message: e.message });
    }
  }
  const db = await readDB();
  db.users.push(newUser);
  await writeDB(db);
  res.json({ success: true, data: newUser });
});

app.put("/api/users/:id", async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;

  if (configEnv.DATA_PERSISTENCE_MODE === "sheet" && configEnv.GAS_WEB_APP_URL) {
    try {
      const data = await proxyToGAS("updateUser", "POST", { id, ...updatedData });
      return res.json({ success: true, data });
    } catch (e: any) {
      return res.status(500).json({ success: false, message: e.message });
    }
  }

  const db = await readDB();
  const index = db.users.findIndex((u: any) => u.id === id);
  if (index !== -1) {
    db.users[index] = { ...db.users[index], ...updatedData };
    await writeDB(db);
    return res.json({ success: true, data: db.users[index] });
  }
  res.status(404).json({ success: false, message: "User tidak ditemukan" });
});

app.delete("/api/users/:id", async (req, res) => {
  const { id } = req.params;

  if (configEnv.DATA_PERSISTENCE_MODE === "sheet" && configEnv.GAS_WEB_APP_URL) {
    try {
      const data = await proxyToGAS("deleteUser", "POST", { id });
      return res.json({ success: true, data });
    } catch (e: any) {
      return res.status(500).json({ success: false, message: e.message });
    }
  }

  const db = await readDB();
  db.users = db.users.filter((u: any) => u.id !== id);
  await writeDB(db);
  res.json({ success: true, message: "User berhasil dihapus" });
});


// PEMERIKSAAN CRUD
app.get("/api/pemeriksaan", async (req, res) => {
  if (configEnv.DATA_PERSISTENCE_MODE === "sheet" && configEnv.GAS_WEB_APP_URL) {
    try {
      const data = await proxyToGAS("getPemeriksaan", "GET");
      return res.json({ success: true, data });
    } catch (e: any) {
      console.log(`GAS Sync info: Using local DB for pemeriksaan (Reason: ${e.message})`);
      const db = await readDB();
      return res.json({ success: true, data: db.pemeriksaan, warning: e.message });
    }
  }
  const db = await readDB();
  res.json({ success: true, data: db.pemeriksaan });
});

app.post("/api/pemeriksaan", async (req, res) => {
  const newRecord = {
    id: "p_" + Date.now(),
    created_at: new Date().toISOString(),
    ...req.body,
  };

  if (configEnv.DATA_PERSISTENCE_MODE === "sheet" && configEnv.GAS_WEB_APP_URL) {
    try {
      const data = await proxyToGAS("createPemeriksaan", "POST", newRecord);
      return res.json({ success: true, data });
    } catch (e: any) {
      return res.status(500).json({ success: false, message: e.message });
    }
  }

  const db = await readDB();
  db.pemeriksaan.push(newRecord);
  await writeDB(db);
  res.json({ success: true, data: newRecord });
});

app.put("/api/pemeriksaan/:id", async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;

  if (configEnv.DATA_PERSISTENCE_MODE === "sheet" && configEnv.GAS_WEB_APP_URL) {
    try {
      const data = await proxyToGAS("updatePemeriksaan", "POST", { id, ...updatedData });
      return res.json({ success: true, data });
    } catch (e: any) {
      return res.status(500).json({ success: false, message: e.message });
    }
  }

  const db = await readDB();
  const index = db.pemeriksaan.findIndex((p: any) => p.id === id);
  if (index !== -1) {
    db.pemeriksaan[index] = { ...db.pemeriksaan[index], ...updatedData };
    await writeDB(db);
    return res.json({ success: true, data: db.pemeriksaan[index] });
  }
  res.status(404).json({ success: false, message: "Pemeriksaan tidak ditemukan" });
});

app.delete("/api/pemeriksaan/:id", async (req, res) => {
  const { id } = req.params;

  if (configEnv.DATA_PERSISTENCE_MODE === "sheet" && configEnv.GAS_WEB_APP_URL) {
    try {
      const data = await proxyToGAS("deletePemeriksaan", "POST", { id });
      return res.json({ success: true, data });
    } catch (e: any) {
      return res.status(500).json({ success: false, message: e.message });
    }
  }

  const db = await readDB();
  db.pemeriksaan = db.pemeriksaan.filter((p: any) => p.id !== id);
  // Also filter connected docs and temuan
  db.dokumen = db.dokumen.filter((d: any) => d.pemeriksaan_id !== id);
  db.temuan = db.temuan.filter((t: any) => t.pemeriksaan_id !== id);
  await writeDB(db);
  res.json({ success: true, message: "Pemeriksaan berhasil dihapus" });
});


// DOKUMEN CRUD
app.get("/api/dokumen", async (req, res) => {
  if (configEnv.DATA_PERSISTENCE_MODE === "sheet" && configEnv.GAS_WEB_APP_URL) {
    try {
      const data = await proxyToGAS("getDokumen", "GET");
      return res.json({ success: true, data });
    } catch (e: any) {
      console.log(`GAS Sync info: Using local DB for dokumen (Reason: ${e.message})`);
      const db = await readDB();
      return res.json({ success: true, data: db.dokumen, warning: e.message });
    }
  }
  const db = await readDB();
  res.json({ success: true, data: db.dokumen });
});

app.post("/api/dokumen", async (req, res) => {
  const newDoc = { id: "d_" + Date.now(), status: "Belum Verifikasi", ...req.body };

  if (configEnv.DATA_PERSISTENCE_MODE === "sheet" && configEnv.GAS_WEB_APP_URL) {
    try {
      const data = await proxyToGAS("createDokumen", "POST", newDoc);
      return res.json({ success: true, data });
    } catch (e: any) {
      return res.status(500).json({ success: false, message: e.message });
    }
  }

  const db = await readDB();
  db.dokumen.push(newDoc);
  await writeDB(db);

  // Trigger notification if not in sheet mode (sheet mode handles it inside Apps Script)
  if (configEnv.DATA_PERSISTENCE_MODE !== "sheet") {
    triggerNotification("dokumen_baru", newDoc);
  }

  res.json({ success: true, data: newDoc });
});

app.put("/api/dokumen/:id", async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;

  if (configEnv.DATA_PERSISTENCE_MODE === "sheet" && configEnv.GAS_WEB_APP_URL) {
    try {
      const data = await proxyToGAS("updateDokumen", "POST", { id, ...updatedData });
      return res.json({ success: true, data });
    } catch (e: any) {
      return res.status(500).json({ success: false, message: e.message });
    }
  }

  const db = await readDB();
  const index = db.dokumen.findIndex((d: any) => d.id === id);
  if (index !== -1) {
    db.dokumen[index] = { ...db.dokumen[index], ...updatedData };
    await writeDB(db);
    return res.json({ success: true, data: db.dokumen[index] });
  }
  res.status(404).json({ success: false, message: "Dokumen tidak ditemukan" });
});

app.delete("/api/dokumen/:id", async (req, res) => {
  const { id } = req.params;

  if (configEnv.DATA_PERSISTENCE_MODE === "sheet" && configEnv.GAS_WEB_APP_URL) {
    try {
      const data = await proxyToGAS("deleteDokumen", "POST", { id });
      return res.json({ success: true, data });
    } catch (e: any) {
      return res.status(500).json({ success: false, message: e.message });
    }
  }

  const db = await readDB();
  db.dokumen = db.dokumen.filter((d: any) => d.id !== id);
  await writeDB(db);
  res.json({ success: true, message: "Dokumen berhasil dihapus" });
});


// TEMUAN CRUD
app.get("/api/temuan", async (req, res) => {
  if (configEnv.DATA_PERSISTENCE_MODE === "sheet" && configEnv.GAS_WEB_APP_URL) {
    try {
      const data = await proxyToGAS("getTemuan", "GET");
      return res.json({ success: true, data });
    } catch (e: any) {
      console.log(`GAS Sync info: Using local DB for temuan (Reason: ${e.message})`);
      const db = await readDB();
      return res.json({ success: true, data: db.temuan, warning: e.message });
    }
  }
  const db = await readDB();
  res.json({ success: true, data: db.temuan });
});

app.post("/api/temuan", async (req, res) => {
  const newTemuan = {
    id: "t_" + Date.now(),
    tanggal_update: new Date().toISOString().split("T")[0],
    ...req.body,
  };

  if (configEnv.DATA_PERSISTENCE_MODE === "sheet" && configEnv.GAS_WEB_APP_URL) {
    try {
      const data = await proxyToGAS("createTemuan", "POST", newTemuan);
      return res.json({ success: true, data });
    } catch (e: any) {
      return res.status(500).json({ success: false, message: e.message });
    }
  }

  const db = await readDB();
  db.temuan.push(newTemuan);
  await writeDB(db);

  // Trigger notification if status is Selesai or Closed (and not in sheet mode)
  if (configEnv.DATA_PERSISTENCE_MODE !== "sheet") {
    if (newTemuan.status_tindak_lanjut === "Selesai" || newTemuan.status_tindak_lanjut === "Closed") {
      triggerNotification("temuan_closed", newTemuan);
    }
  }

  res.json({ success: true, data: newTemuan });
});

app.put("/api/temuan/:id", async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;

  if (configEnv.DATA_PERSISTENCE_MODE === "sheet" && configEnv.GAS_WEB_APP_URL) {
    try {
      const data = await proxyToGAS("updateTemuan", "POST", { id, ...updatedData });
      return res.json({ success: true, data });
    } catch (e: any) {
      return res.status(500).json({ success: false, message: e.message });
    }
  }

  const db = await readDB();
  const index = db.temuan.findIndex((t: any) => t.id === id);
  if (index !== -1) {
    const originalStatus = db.temuan[index].status_tindak_lanjut;
    db.temuan[index] = { ...db.temuan[index], ...updatedData };
    await writeDB(db);

    // Trigger notification if status is changed to Selesai or Closed (and not in sheet mode)
    if (configEnv.DATA_PERSISTENCE_MODE !== "sheet") {
      if ((updatedData.status_tindak_lanjut === "Selesai" || updatedData.status_tindak_lanjut === "Closed") && originalStatus !== "Selesai" && originalStatus !== "Closed") {
        triggerNotification("temuan_closed", db.temuan[index]);
      }
    }

    return res.json({ success: true, data: db.temuan[index] });
  }
  res.status(404).json({ success: false, message: "Temuan tidak ditemukan" });
});

app.delete("/api/temuan/:id", async (req, res) => {
  const { id } = req.params;

  if (configEnv.DATA_PERSISTENCE_MODE === "sheet" && configEnv.GAS_WEB_APP_URL) {
    try {
      const data = await proxyToGAS("deleteTemuan", "POST", { id });
      return res.json({ success: true, data });
    } catch (e: any) {
      return res.status(500).json({ success: false, message: e.message });
    }
  }

  const db = await readDB();
  db.temuan = db.temuan.filter((t: any) => t.id !== id);
  await writeDB(db);
  res.json({ success: true, message: "Temuan berhasil dihapus" });
});

// MASTER SATWAS
app.get("/api/satwas", async (req, res) => {
  if (configEnv.DATA_PERSISTENCE_MODE === "sheet" && configEnv.GAS_WEB_APP_URL) {
    try {
      const data = await proxyToGAS("getSatwas", "GET");
      return res.json({ success: true, data });
    } catch (e: any) {
      console.log(`GAS Sync info: Using local DB for satwas (Reason: ${e.message})`);
      const db = await readDB();
      return res.json({ success: true, data: db.satwas, warning: e.message });
    }
  }
  const db = await readDB();
  res.json({ success: true, data: db.satwas });
});


// DASHBOARD STATS ENDPOINT
app.get("/api/dashboard", async (req, res) => {
  let list: any[] = [];
  const isSheetMode = configEnv.DATA_PERSISTENCE_MODE === "sheet" && !!configEnv.GAS_WEB_APP_URL;

  if (isSheetMode) {
    try {
      // First attempt: Get pre-computed stats directly from Google Apps Script
      const data = await proxyToGAS("getDashboard", "GET");
      if (data && typeof data === "object" && !Array.isArray(data)) {
        return res.json({ success: true, data });
      }
    } catch (e: any) {
      console.log(`GAS Sync info: Falling back to local calculation from live sheet data (Reason: ${e.message})`);
    }

    try {
      // Second attempt (Active fallback): Fetch live examinations directly from Google Sheet and compute stats locally
      const fetched = await proxyToGAS("getPemeriksaan", "GET");
      if (Array.isArray(fetched)) {
        list = fetched;
      } else {
        const db = await readDB();
        list = db.pemeriksaan || [];
      }
    } catch (e: any) {
      console.warn("Fallback to Google Sheet getPemeriksaan failed, using local JSON database fallback:", e.message);
      const db = await readDB();
      list = db.pemeriksaan || [];
    }
  } else {
    // Standard Local Persistence Mode
    const db = await readDB();
    list = db.pemeriksaan || [];
  }

  // Calculate live statistics
  const totalPemeriksaan = list.length;
  const totalTaat = list.filter((p: any) => p.status_ketaatan === "TAAT").length;
  const totalTidakTaat = list.filter((p: any) => p.status_ketaatan === "TIDAK TAAT").length;

  let totalNilai = 0;
  let nilaiTertinggi = 0;
  let nilaiTerendah = list.length > 0 ? 100 : 0;

  list.forEach((p: any) => {
    const val = Number(p.nilai_total) || 0;
    totalNilai += val;
    if (val > nilaiTertinggi) nilaiTertinggi = val;
    if (val < nilaiTerendah) nilaiTerendah = val;
  });

  const rataRataNilai = totalPemeriksaan > 0 ? Number((totalNilai / totalPemeriksaan).toFixed(2)) : 0;

  // Monthly breakdown partition
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
  const monthlyCounts = Array(12).fill(0);
  list.forEach((p: any) => {
    if (p.tanggal) {
      const m = new Date(p.tanggal).getMonth();
      if (m >= 0 && m < 12) {
        monthlyCounts[m]++;
      }
    }
  });

  const chartPemeriksaanBulanan = months.map((bulan, idx) => ({
    bulan,
    jumlah: monthlyCounts[idx],
  }));

  // Ketaatan Pie representation
  const chartKetaatan = [
    { name: "Taat", value: totalTaat },
    { name: "Tidak Taat", value: totalTidakTaat },
  ];

  // Satwas Performance statistics
  const satwasMap: Record<string, { total: number; count: number }> = {};
  list.forEach((p: any) => {
    const s = p.satwas || "Lainnya";
    const v = Number(p.nilai_total) || 0;
    if (!satwasMap[s]) {
      satwasMap[s] = { total: 0, count: 0 };
    }
    satwasMap[s].total += v;
    satwasMap[s].count++;
  });

  const chartNilaiSatwas = Object.keys(satwasMap).map((satwas) => ({
    satwas,
    rataRata: Number((satwasMap[satwas].total / satwasMap[satwas].count).toFixed(2)),
    jumlah: satwasMap[satwas].count,
  }));

  // Annual level evaluations representation
  const chartTrendTahunan = [
    { tahun: "2024", rataRata: 75.2 },
    { tahun: "2025", rataRata: 78.5 },
    { tahun: "2026", rataRata: rataRataNilai || 82.8 },
  ];

  const paguVal = Number(configEnv.PAGU_ANGGARAN) || 0;
  const realisasiVal = Number(configEnv.REALISASI_ANGGARAN) || 0;
  const targetVal = Number(configEnv.TARGET_REALISASI) || 0;
  const sisaVal = paguVal - realisasiVal;
  const persentaseVal = paguVal > 0 ? Number(((realisasiVal / paguVal) * 100).toFixed(2)) : 0;
  const persentaseTargetVal = targetVal > 0 ? Number(((realisasiVal / targetVal) * 100).toFixed(2)) : 0;

  const targetQ1Val = configEnv.TARGET_Q1 !== undefined ? Number(configEnv.TARGET_Q1) : 250000000;
  const targetQ2Val = configEnv.TARGET_Q2 !== undefined ? Number(configEnv.TARGET_Q2) : 250000000;
  const targetQ3Val = configEnv.TARGET_Q3 !== undefined ? Number(configEnv.TARGET_Q3) : 250000000;
  const targetQ4Val = configEnv.TARGET_Q4 !== undefined ? Number(configEnv.TARGET_Q4) : 250000000;

  const realisasiQ1Val = configEnv.REALISASI_Q1 !== undefined ? Number(configEnv.REALISASI_Q1) : 220000000;
  const realisasiQ2Val = configEnv.REALISASI_Q2 !== undefined ? Number(configEnv.REALISASI_Q2) : 230000000;
  const realisasiQ3Val = configEnv.REALISASI_Q3 !== undefined ? Number(configEnv.REALISASI_Q3) : 200000000;
  const realisasiQ4Val = configEnv.REALISASI_Q4 !== undefined ? Number(configEnv.REALISASI_Q4) : 175000000;

  res.json({
    success: true,
    data: {
      totalPemeriksaan,
      totalTaat,
      totalTidakTaat,
      rataRataNilai,
      nilaiTertinggi,
      nilaiTerendah,
      chartPemeriksaanBulanan,
      chartKetaatan,
      chartNilaiSatwas,
      chartTrendTahunan,
      paguAnggaran: paguVal,
      realisasiAnggaran: realisasiVal,
      sisaAnggaran: sisaVal,
      persentasePenyerapan: persentaseVal,
      targetRealisasi: targetVal,
      persentasePenyerapanTarget: persentaseTargetVal,
      targetQ1: targetQ1Val,
      targetQ2: targetQ2Val,
      targetQ3: targetQ3Val,
      targetQ4: targetQ4Val,
      realisasiQ1: realisasiQ1Val,
      realisasiQ2: realisasiQ2Val,
      realisasiQ3: realisasiQ3Val,
      realisasiQ4: realisasiQ4Val,
    },
  });
});


// AUDIT LOGS ENDPOINTS
app.get("/api/logs", async (req, res) => {
  try {
    const db = await readDB();
    const logs = db.logs || [];
    const sortedLogs = [...logs].sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    res.json({ success: true, data: sortedLogs });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Gagal mengambil log aktivitas." });
  }
});

app.post("/api/logs", async (req, res) => {
  try {
    const db = await readDB();
    const newLog = {
      id: "log_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      timestamp: new Date().toISOString(),
      ...req.body
    };
    if (!db.logs) {
      db.logs = [];
    }
    db.logs.push(newLog);
    if (db.logs.length > 2000) {
      db.logs = db.logs.slice(-2000);
    }
    await writeDB(db);
    res.json({ success: true, data: newLog });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Gagal menyimpan log aktivitas." });
  }
});


// NOTES ENDPOINTS
app.get("/api/notes", async (req, res) => {
  try {
    const db = await readDB();
    if (!db.notes) db.notes = [];
    res.json({ success: true, data: db.notes });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/api/notes", async (req, res) => {
  try {
    const db = await readDB();
    if (!db.notes) db.notes = [];
    const newNote = { id: "note_" + Date.now(), timestamp: new Date().toISOString(), ...req.body };
    db.notes.push(newNote);
    await writeDB(db);
    res.json({ success: true, data: newNote });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put("/api/notes/:id", async (req, res) => {
  try {
    const db = await readDB();
    if (!db.notes) db.notes = [];
    const index = db.notes.findIndex((n: any) => n.id === req.params.id);
    if (index !== -1) {
      db.notes[index] = { ...db.notes[index], ...req.body, timestamp: new Date().toISOString() };
      await writeDB(db);
      res.json({ success: true, data: db.notes[index] });
    } else {
      res.status(404).json({ success: false, message: "Catatan tidak ditemukan" });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete("/api/notes/:id", async (req, res) => {
  try {
    const db = await readDB();
    if (!db.notes) db.notes = [];
    db.notes = db.notes.filter((n: any) => n.id !== req.params.id);
    await writeDB(db);
    res.json({ success: true, message: "Catatan berhasil dihapus" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// CALENDAR EVENTS ENDPOINTS
app.get("/api/calendar-events", async (req, res) => {
  try {
    const db = await readDB();
    if (!db.calendar_events) db.calendar_events = [];
    res.json({ success: true, data: db.calendar_events });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/api/calendar-events", async (req, res) => {
  try {
    const db = await readDB();
    if (!db.calendar_events) db.calendar_events = [];
    const newEvent = { id: "event_" + Date.now(), ...req.body };
    db.calendar_events.push(newEvent);
    await writeDB(db);
    res.json({ success: true, data: newEvent });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete("/api/calendar-events/:id", async (req, res) => {
  try {
    const db = await readDB();
    if (!db.calendar_events) db.calendar_events = [];
    db.calendar_events = db.calendar_events.filter((e: any) => e.id !== req.params.id);
    await writeDB(db);
    res.json({ success: true, message: "Agenda berhasil dihapus" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GOOGLE FORMS ENDPOINTS
app.get("/api/google-forms", async (req, res) => {
  try {
    const db = await readDB();
    if (!db.google_forms) db.google_forms = [];
    res.json({ success: true, data: db.google_forms });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/api/google-forms", async (req, res) => {
  try {
    const db = await readDB();
    if (!db.google_forms) db.google_forms = [];
    const newForm = { id: "form_" + Date.now(), created_at: new Date().toISOString(), ...req.body };
    db.google_forms.push(newForm);
    await writeDB(db);
    res.json({ success: true, data: newForm });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete("/api/google-forms/:id", async (req, res) => {
  try {
    const db = await readDB();
    if (!db.google_forms) db.google_forms = [];
    db.google_forms = db.google_forms.filter((f: any) => f.id !== req.params.id);
    await writeDB(db);
    res.json({ success: true, message: "Formulir berhasil dihapus" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// AI GEMINI & TEXT-TO-SPEECH SERVICE
// ==========================================
let aiClient: any = null;
function getAIClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing. Silakan tambahkan kunci API Anda di Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
        timeout: 180000,
      }
    });
  }
  return aiClient;
}

// 1. Text Generation Endpoint (to generate reports, briefings, or custom announcements)
app.post("/api/ai/generate", async (req, res) => {
  try {
    const { prompt, contextSystem } = req.body;
    if (!prompt) {
      return res.status(400).json({ success: false, message: "Prompt tidak boleh kosong" });
    }

    const ai = getAIClient();
    const systemInstruction = contextSystem || "Anda adalah asisten AI profesional untuk Tim Kerja Sumber Daya Kelautan (Timja SDK) Stasiun PSDKP Biak. Jawablah dalam Bahasa Indonesia yang formal, ringkas, santun, dan informatif.";
    
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const text = response.text || "";
    res.json({ success: true, data: { text } });
  } catch (error: any) {
    console.error("Error generating content:", error);
    res.status(500).json({ success: false, message: error.message || "Gagal menghasilkan teks menggunakan AI" });
  }
});

// 2. Text to Speech Endpoint (using gemini-3.1-flash-tts-preview)
app.post("/api/ai/tts", async (req, res) => {
  try {
    const { text, voiceName } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, message: "Teks tidak boleh kosong untuk dibacakan" });
    }

    const ai = getAIClient();
    const voice = voiceName || "Kore"; // Puck, Charon, Kore, Fenrir, Zephyr

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error("Tidak ada data audio yang diterima dari model TTS.");
    }

    res.json({ success: true, data: { audio: base64Audio } });
  } catch (error: any) {
    console.error("Error generating speech:", error);
    res.status(500).json({ success: false, message: error.message || "Gagal mengubah teks menjadi suara (TTS)" });
  }
});


// Start server & handle Vite environment
async function startServer() {
  // Read DB on start to populate persistent config options
  try {
    await readDB();
    console.log("Persistent configuration loaded:", configEnv);
  } catch (err: any) {
    console.warn("Could not pre-load persistent config on server startup:", err.message);
  }

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server SDKP Biak running on http://localhost:${PORT}`);
    });
  }
}

startServer();

export default app;
