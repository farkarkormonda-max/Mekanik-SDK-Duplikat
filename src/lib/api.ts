import { 
  User, 
  Pemeriksaan, 
  Dokumen, 
  Temuan, 
  MasterSatwas, 
  DashboardStats,
  ActivityLog 
} from "../types";
import { googleSheetsApi } from "./googleSheets";
import { getAccessToken } from "./firebaseAuth";

const BASE_URL = "/api";

// Cached configuration inside API context to drive offline/direct-routing
let cachedConfig: { 
  DATA_PERSISTENCE_MODE: string; 
  GAS_WEB_APP_URL: string; 
  SPREADSHEET_ID: string;
  PAGU_ANGGARAN?: number;
  REALISASI_ANGGARAN?: number;
  TARGET_REALISASI?: number;
  TARGET_Q1?: number;
  TARGET_Q2?: number;
  TARGET_Q3?: number;
  TARGET_Q4?: number;
  REALISASI_Q1?: number;
  REALISASI_Q2?: number;
  REALISASI_Q3?: number;
  REALISASI_Q4?: number;
} | null = null;

const OFFLINE_QUEUE_KEY = "sdkp_offline_queue";

export interface QueueItem {
  id: string;
  action: "create" | "update" | "delete";
  entity: "pemeriksaan" | "temuan" | "dokumen" | "notes" | "users";
  entityId: string;
  payload: any;
  timestamp: number;
}

function getOfflineQueue(): QueueItem[] {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || "[]");
  } catch (e) {
    return [];
  }
}

function saveOfflineQueue(queue: QueueItem[]) {
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  window.dispatchEvent(new Event("offline_queue_changed"));
}

function addToQueue(action: "create" | "update" | "delete", entity: QueueItem["entity"], entityId: string, payload: any) {
  const queue = getOfflineQueue();
  queue.push({
    id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    action,
    entity,
    entityId,
    payload,
    timestamp: Date.now()
  });
  saveOfflineQueue(queue);
}

function getCache<T>(key: string): T | null {
  try {
    const val = localStorage.getItem(`cached_${key}`);
    return val ? JSON.parse(val) : null;
  } catch (e) {
    return null;
  }
}

function setCache<T>(key: string, data: T) {
  try {
    localStorage.setItem(`cached_${key}`, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to write cache for " + key, e);
  }
}

function applyOfflineQueue<T extends { id: any }>(entity: QueueItem["entity"], baseData: T[]): T[] {
  const queue = getOfflineQueue();
  let result = [...baseData];

  for (const item of queue) {
    if (item.entity !== entity) continue;

    if (item.action === "create") {
      if (!result.some(r => String(r.id) === String(item.entityId))) {
        result.push({ id: item.entityId, ...item.payload });
      }
    } else if (item.action === "update") {
      result = result.map(r => String(r.id) === String(item.entityId) ? { ...r, ...item.payload } : r);
    } else if (item.action === "delete") {
      result = result.filter(r => String(r.id) !== String(item.entityId));
    }
  }

  return result;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  const text = await res.text();
  if (!text) {
    throw new Error(`Respon kosong dari server (Status: ${res.status}).`);
  }
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    throw new Error(`Respon server bukan JSON yang valid (Status: ${res.status}): ${text.slice(0, 100)}`);
  }
  if (!res.ok) {
    throw new Error(json.message || "Permintaan gagal");
  }
  return json.data as T;
}

// Interceptor predicate
function isDirectSheetMode(): boolean {
  return cachedConfig?.DATA_PERSISTENCE_MODE === "direct-sheet" && !!cachedConfig?.SPREADSHEET_ID;
}

// Client-side computation of statistics directly from data list
function calculateDashboardStats(pemeriksaan: Pemeriksaan[]): DashboardStats {
  const totalPemeriksaan = pemeriksaan.length;
  let totalTaat = 0;
  let totalTidakTaat = 0;
  let totalNilai = 0;
  let nilaiTertinggi = 0;
  let nilaiTerendah = pemeriksaan.length > 0 ? 100 : 0;

  pemeriksaan.forEach((r) => {
    if (r.status_ketaatan === "TAAT") {
      totalTaat++;
    } else {
      totalTidakTaat++;
    }
    const val = Number(r.nilai_total) || 0;
    totalNilai += val;
    if (val > nilaiTertinggi) nilaiTertinggi = val;
    if (val < nilaiTerendah) nilaiTerendah = val;
  });

  const rataRataNilai = totalPemeriksaan > 0 ? Number((totalNilai / totalPemeriksaan).toFixed(2)) : 0;

  // Monthly counts
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
  const monthlyCounts = Array(12).fill(0);
  pemeriksaan.forEach((r) => {
    if (r.tanggal) {
      const dateObj = new Date(r.tanggal);
      const m = dateObj.getMonth();
      if (m >= 0 && m < 12) {
        monthlyCounts[m]++;
      }
    }
  });

  const chartPemeriksaanBulanan = months.map((bulan, idx) => ({
    bulan,
    jumlah: monthlyCounts[idx],
  }));

  const chartKetaatan = [
    { name: "Taat", value: totalTaat },
    { name: "Tidak Taat", value: totalTidakTaat },
  ];

  // Nilai per Satwas
  const satwasMap: Record<string, { total: number; count: number }> = {};
  pemeriksaan.forEach((pr) => {
    const s = pr.satwas || "Lainnya";
    const v = Number(pr.nilai_total) || 0;
    if (!satwasMap[s]) {
      satwasMap[s] = { total: 0, count: 0 };
    }
    satwasMap[s].total += v;
    satwasMap[s].count++;
  });

  const chartNilaiSatwas = Object.keys(satwasMap).map((key) => ({
    satwas: key,
    rataRata: Number((satwasMap[key].total / satwasMap[key].count).toFixed(2)),
    jumlah: satwasMap[key].count,
  }));

  const chartTrendTahunan = [
    { tahun: "2024", rataRata: 75.2 },
    { tahun: "2025", rataRata: 78.5 },
    { tahun: "2026", rataRata: rataRataNilai || 82.8 },
  ];

  const paguVal = Number(cachedConfig?.PAGU_ANGGARAN) || 1250000000;
  const realisasiVal = Number(cachedConfig?.REALISASI_ANGGARAN) || 825000000;
  const targetVal = Number(cachedConfig?.TARGET_REALISASI) || 1000000000;
  const sisaVal = paguVal - realisasiVal;
  const persentaseVal = paguVal > 0 ? Number(((realisasiVal / paguVal) * 100).toFixed(2)) : 0;
  const persentaseTargetVal = targetVal > 0 ? Number(((realisasiVal / targetVal) * 100).toFixed(2)) : 0;

  const targetQ1Val = cachedConfig?.TARGET_Q1 !== undefined ? Number(cachedConfig.TARGET_Q1) : 250000000;
  const targetQ2Val = cachedConfig?.TARGET_Q2 !== undefined ? Number(cachedConfig.TARGET_Q2) : 250000000;
  const targetQ3Val = cachedConfig?.TARGET_Q3 !== undefined ? Number(cachedConfig.TARGET_Q3) : 250000000;
  const targetQ4Val = cachedConfig?.TARGET_Q4 !== undefined ? Number(cachedConfig.TARGET_Q4) : 250000000;

  const realisasiQ1Val = cachedConfig?.REALISASI_Q1 !== undefined ? Number(cachedConfig.REALISASI_Q1) : 220000000;
  const realisasiQ2Val = cachedConfig?.REALISASI_Q2 !== undefined ? Number(cachedConfig.REALISASI_Q2) : 230000000;
  const realisasiQ3Val = cachedConfig?.REALISASI_Q3 !== undefined ? Number(cachedConfig.REALISASI_Q3) : 200000000;
  const realisasiQ4Val = cachedConfig?.REALISASI_Q4 !== undefined ? Number(cachedConfig.REALISASI_Q4) : 175000000;

  return {
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
  };
}

export const api = {
  // Auth
  login: async (username: string, password: string): Promise<User> => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    
    const text = await res.text();
    if (!text) {
      throw new Error(`Koneksi atau respon server kosong (Status: ${res.status}).`);
    }

    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      throw new Error(`Gagal memproses respon server: Respon bukan JSON yang valid (Status: ${res.status}).`);
    }

    if (!res.ok || !json.success) {
      throw new Error(json.message || "Username atau password salah");
    }
    return json.user as User;
  },

  // Config management
  getConfig: async () => {
    try {
      const data = await request<{ DATA_PERSISTENCE_MODE: string; GAS_WEB_APP_URL: string; SPREADSHEET_ID: string }>(`${BASE_URL}/config`);
      cachedConfig = data;
      setCache("config", data);
      return data;
    } catch (err: any) {
      console.warn("Fetch getConfig failed, loading offline fallback:", err.message);
      const data = getCache<{ DATA_PERSISTENCE_MODE: string; GAS_WEB_APP_URL: string; SPREADSHEET_ID: string }>("config");
      if (data) {
        cachedConfig = data;
        return data;
      }
      return { DATA_PERSISTENCE_MODE: "local", GAS_WEB_APP_URL: "", SPREADSHEET_ID: "" };
    }
  },

  updateConfig: async (data: { DATA_PERSISTENCE_MODE: string; GAS_WEB_APP_URL: string; SPREADSHEET_ID: string }) => {
    try {
      const result = await request<any>(`${BASE_URL}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      cachedConfig = data;
      setCache("config", data);
      return result;
    } catch (err: any) {
      cachedConfig = data;
      setCache("config", data);
      // For config we don't queue, just allow offline fallback of variables
      return { success: true };
    }
  },

  // Users management
  getUsers: async (): Promise<User[]> => {
    try {
      let data: User[] = [];
      if (isDirectSheetMode()) {
        const token = await getAccessToken();
        if (token) {
          data = await googleSheetsApi.getRows(token, cachedConfig!.SPREADSHEET_ID, "Users") as User[];
        } else {
          data = await request<User[]>(`${BASE_URL}/users`);
        }
      } else {
        data = await request<User[]>(`${BASE_URL}/users`);
      }
      setCache("users", data);
      return applyOfflineQueue("users", data);
    } catch (err: any) {
      console.warn("Fetch getUsers failed, loading offline fallback:", err.message);
      const cached = getCache<User[]>("users") || [];
      return applyOfflineQueue("users", cached);
    }
  },

  createUser: async (user: Partial<User>) => {
    const payload = {
      id: user.id || `u_${Date.now()}`,
      ...user
    } as User;

    if (!navigator.onLine) {
      addToQueue("create", "users", payload.id, payload);
      const cached = getCache<User[]>("users") || [];
      setCache("users", [...cached, payload]);
      return payload;
    }

    try {
      if (isDirectSheetMode()) {
        const token = await getAccessToken();
        if (token) {
          await googleSheetsApi.appendRow(token, cachedConfig!.SPREADSHEET_ID, "Users", payload);
          return payload as User;
        }
      }
      return await request<User>(`${BASE_URL}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      addToQueue("create", "users", payload.id, payload);
      const cached = getCache<User[]>("users") || [];
      setCache("users", [...cached, payload]);
      return payload;
    }
  },

  updateUser: async (id: string, user: Partial<User>) => {
    if (!navigator.onLine) {
      addToQueue("update", "users", id, user);
      const cached = getCache<User[]>("users") || [];
      const updated = cached.map(item => item.id === id ? { ...item, ...user } : item);
      setCache("users", updated);
      return { id, ...user } as User;
    }

    try {
      if (isDirectSheetMode()) {
        const token = await getAccessToken();
        if (token) {
          await googleSheetsApi.updateRow(token, cachedConfig!.SPREADSHEET_ID, "Users", id, user);
          return { id, ...user } as User;
        }
      }
      return await request<User>(`${BASE_URL}/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user),
      });
    } catch (err) {
      addToQueue("update", "users", id, user);
      const cached = getCache<User[]>("users") || [];
      const updated = cached.map(item => item.id === id ? { ...item, ...user } : item);
      setCache("users", updated);
      return { id, ...user } as User;
    }
  },

  deleteUser: async (id: string) => {
    if (!navigator.onLine) {
      addToQueue("delete", "users", id, null);
      const cached = getCache<User[]>("users") || [];
      const filtered = cached.filter(item => item.id !== id);
      setCache("users", filtered);
      return { success: true };
    }

    try {
      if (isDirectSheetMode()) {
        const token = await getAccessToken();
        if (token) {
          await googleSheetsApi.deleteRow(token, cachedConfig!.SPREADSHEET_ID, "Users", id);
          return { success: true };
        }
      }
      return await request<any>(`${BASE_URL}/users/${id}`, {
        method: "DELETE",
      });
    } catch (err) {
      addToQueue("delete", "users", id, null);
      const cached = getCache<User[]>("users") || [];
      const filtered = cached.filter(item => item.id !== id);
      setCache("users", filtered);
      return { success: true };
    }
  },

  // Pemeriksaan
  getPemeriksaan: async (): Promise<Pemeriksaan[]> => {
    try {
      let data: Pemeriksaan[] = [];
      if (isDirectSheetMode()) {
        const token = await getAccessToken();
        if (token) {
          data = await googleSheetsApi.getRows(token, cachedConfig!.SPREADSHEET_ID, "Pemeriksaan") as Pemeriksaan[];
        } else {
          data = await request<Pemeriksaan[]>(`${BASE_URL}/pemeriksaan`);
        }
      } else {
        data = await request<Pemeriksaan[]>(`${BASE_URL}/pemeriksaan`);
      }
      setCache("pemeriksaan", data);
      return applyOfflineQueue("pemeriksaan", data);
    } catch (err: any) {
      console.warn("Fetch getPemeriksaan failed, loading offline fallback:", err.message);
      const cached = getCache<Pemeriksaan[]>("pemeriksaan") || [];
      return applyOfflineQueue("pemeriksaan", cached);
    }
  },

  createPemeriksaan: async (form: Partial<Pemeriksaan>) => {
    const payload = {
      id: form.id || `p_${Date.now()}`,
      created_at: new Date().toISOString(),
      ...form
    } as Pemeriksaan;

    if (!navigator.onLine) {
      addToQueue("create", "pemeriksaan", payload.id, payload);
      const cached = getCache<Pemeriksaan[]>("pemeriksaan") || [];
      setCache("pemeriksaan", [...cached, payload]);
      return payload;
    }

    try {
      if (isDirectSheetMode()) {
        const token = await getAccessToken();
        if (token) {
          await googleSheetsApi.appendRow(token, cachedConfig!.SPREADSHEET_ID, "Pemeriksaan", payload);
          return payload as Pemeriksaan;
        }
      }
      return await request<Pemeriksaan>(`${BASE_URL}/pemeriksaan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      addToQueue("create", "pemeriksaan", payload.id, payload);
      const cached = getCache<Pemeriksaan[]>("pemeriksaan") || [];
      setCache("pemeriksaan", [...cached, payload]);
      return payload;
    }
  },

  updatePemeriksaan: async (id: string, form: Partial<Pemeriksaan>) => {
    if (!navigator.onLine) {
      addToQueue("update", "pemeriksaan", id, form);
      const cached = getCache<Pemeriksaan[]>("pemeriksaan") || [];
      const updated = cached.map(item => item.id === id ? { ...item, ...form } : item);
      setCache("pemeriksaan", updated);
      return { id, ...form } as Pemeriksaan;
    }

    try {
      if (isDirectSheetMode()) {
        const token = await getAccessToken();
        if (token) {
          await googleSheetsApi.updateRow(token, cachedConfig!.SPREADSHEET_ID, "Pemeriksaan", id, form);
          return { id, ...form } as Pemeriksaan;
        }
      }
      return await request<Pemeriksaan>(`${BASE_URL}/pemeriksaan/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } catch (err) {
      addToQueue("update", "pemeriksaan", id, form);
      const cached = getCache<Pemeriksaan[]>("pemeriksaan") || [];
      const updated = cached.map(item => item.id === id ? { ...item, ...form } : item);
      setCache("pemeriksaan", updated);
      return { id, ...form } as Pemeriksaan;
    }
  },

  deletePemeriksaan: async (id: string) => {
    if (!navigator.onLine) {
      addToQueue("delete", "pemeriksaan", id, null);
      const cached = getCache<Pemeriksaan[]>("pemeriksaan") || [];
      const filtered = cached.filter(item => item.id !== id);
      setCache("pemeriksaan", filtered);
      return { success: true };
    }

    try {
      if (isDirectSheetMode()) {
        const token = await getAccessToken();
        if (token) {
          // Cascade delete parent
          await googleSheetsApi.deleteRow(token, cachedConfig!.SPREADSHEET_ID, "Pemeriksaan", id);
          
          // Cascade delete Documents matching pemeriksaan_id
          try {
            const docs = await googleSheetsApi.getRows(token, cachedConfig!.SPREADSHEET_ID, "Dokumen");
            for (const d of docs) {
              if (String(d.pemeriksaan_id) === String(id)) {
                await googleSheetsApi.deleteRow(token, cachedConfig!.SPREADSHEET_ID, "Dokumen", d.id);
              }
            }
          } catch (err) {
            console.error("Cascade documents delete skip:", err);
          }

          // Cascade delete Temuan matching pemeriksaan_id
          try {
            const tems = await googleSheetsApi.getRows(token, cachedConfig!.SPREADSHEET_ID, "Temuan");
            for (const t of tems) {
              if (String(t.pemeriksaan_id) === String(id)) {
                await googleSheetsApi.deleteRow(token, cachedConfig!.SPREADSHEET_ID, "Temuan", t.id);
              }
            }
          } catch (err) {
            console.error("Cascade temuan delete skip:", err);
          }

          return { success: true };
        }
      }
      return await request<any>(`${BASE_URL}/pemeriksaan/${id}`, {
        method: "DELETE",
      });
    } catch (err) {
      addToQueue("delete", "pemeriksaan", id, null);
      const cached = getCache<Pemeriksaan[]>("pemeriksaan") || [];
      const filtered = cached.filter(item => item.id !== id);
      setCache("pemeriksaan", filtered);
      return { success: true };
    }
  },

  // Dokumen
  getDokumen: async (): Promise<Dokumen[]> => {
    try {
      let data: Dokumen[] = [];
      if (isDirectSheetMode()) {
        const token = await getAccessToken();
        if (token) {
          data = await googleSheetsApi.getRows(token, cachedConfig!.SPREADSHEET_ID, "Dokumen") as Dokumen[];
        } else {
          data = await request<Dokumen[]>(`${BASE_URL}/dokumen`);
        }
      } else {
        data = await request<Dokumen[]>(`${BASE_URL}/dokumen`);
      }
      setCache("dokumen", data);
      return applyOfflineQueue("dokumen", data);
    } catch (err: any) {
      console.warn("Fetch getDokumen failed, loading offline fallback:", err.message);
      const cached = getCache<Dokumen[]>("dokumen") || [];
      return applyOfflineQueue("dokumen", cached);
    }
  },

  createDokumen: async (doc: Partial<Dokumen>) => {
    const payload = {
      id: doc.id || `d_${Date.now()}`,
      status: doc.status || "Verifikasi",
      ...doc
    } as Dokumen;

    if (!navigator.onLine) {
      addToQueue("create", "dokumen", payload.id, payload);
      const cached = getCache<Dokumen[]>("dokumen") || [];
      setCache("dokumen", [...cached, payload]);
      return payload;
    }

    try {
      if (isDirectSheetMode()) {
        const token = await getAccessToken();
        if (token) {
          await googleSheetsApi.appendRow(token, cachedConfig!.SPREADSHEET_ID, "Dokumen", payload);
          return payload as Dokumen;
        }
      }
      return await request<Dokumen>(`${BASE_URL}/dokumen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      addToQueue("create", "dokumen", payload.id, payload);
      const cached = getCache<Dokumen[]>("dokumen") || [];
      setCache("dokumen", [...cached, payload]);
      return payload;
    }
  },

  updateDokumen: async (id: string, doc: Partial<Dokumen>) => {
    if (!navigator.onLine) {
      addToQueue("update", "dokumen", id, doc);
      const cached = getCache<Dokumen[]>("dokumen") || [];
      const updated = cached.map(item => item.id === id ? { ...item, ...doc } : item);
      setCache("dokumen", updated);
      return { id, ...doc } as Dokumen;
    }

    try {
      if (isDirectSheetMode()) {
        const token = await getAccessToken();
        if (token) {
          await googleSheetsApi.updateRow(token, cachedConfig!.SPREADSHEET_ID, "Dokumen", id, doc);
          return { id, ...doc } as Dokumen;
        }
      }
      return await request<Dokumen>(`${BASE_URL}/dokumen/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(doc),
      });
    } catch (err) {
      addToQueue("update", "dokumen", id, doc);
      const cached = getCache<Dokumen[]>("dokumen") || [];
      const updated = cached.map(item => item.id === id ? { ...item, ...doc } : item);
      setCache("dokumen", updated);
      return { id, ...doc } as Dokumen;
    }
  },

  deleteDokumen: async (id: string) => {
    if (!navigator.onLine) {
      addToQueue("delete", "dokumen", id, null);
      const cached = getCache<Dokumen[]>("dokumen") || [];
      const filtered = cached.filter(item => item.id !== id);
      setCache("dokumen", filtered);
      return { success: true };
    }

    try {
      if (isDirectSheetMode()) {
        const token = await getAccessToken();
        if (token) {
          await googleSheetsApi.deleteRow(token, cachedConfig!.SPREADSHEET_ID, "Dokumen", id);
          return { success: true };
        }
      }
      return await request<any>(`${BASE_URL}/dokumen/${id}`, {
        method: "DELETE",
      });
    } catch (err) {
      addToQueue("delete", "dokumen", id, null);
      const cached = getCache<Dokumen[]>("dokumen") || [];
      const filtered = cached.filter(item => item.id !== id);
      setCache("dokumen", filtered);
      return { success: true };
    }
  },

  // Temuan
  getTemuan: async (): Promise<Temuan[]> => {
    try {
      let data: Temuan[] = [];
      if (isDirectSheetMode()) {
        const token = await getAccessToken();
        if (token) {
          data = await googleSheetsApi.getRows(token, cachedConfig!.SPREADSHEET_ID, "Temuan") as Temuan[];
        } else {
          data = await request<Temuan[]>(`${BASE_URL}/temuan`);
        }
      } else {
        data = await request<Temuan[]>(`${BASE_URL}/temuan`);
      }
      setCache("temuan", data);
      return applyOfflineQueue("temuan", data);
    } catch (err: any) {
      console.warn("Fetch getTemuan failed, loading offline fallback:", err.message);
      const cached = getCache<Temuan[]>("temuan") || [];
      return applyOfflineQueue("temuan", cached);
    }
  },

  createTemuan: async (item: Partial<Temuan>) => {
    const payload = {
      id: item.id || `t_${Date.now()}`,
      status_tindak_lanjut: item.status_tindak_lanjut || "Open",
      tanggal_update: new Date().toISOString().split("T")[0],
      ...item
    } as Temuan;

    if (!navigator.onLine) {
      addToQueue("create", "temuan", payload.id, payload);
      const cached = getCache<Temuan[]>("temuan") || [];
      setCache("temuan", [...cached, payload]);
      return payload;
    }

    try {
      if (isDirectSheetMode()) {
        const token = await getAccessToken();
        if (token) {
          await googleSheetsApi.appendRow(token, cachedConfig!.SPREADSHEET_ID, "Temuan", payload);
          return payload as Temuan;
        }
      }
      return await request<Temuan>(`${BASE_URL}/temuan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      addToQueue("create", "temuan", payload.id, payload);
      const cached = getCache<Temuan[]>("temuan") || [];
      setCache("temuan", [...cached, payload]);
      return payload;
    }
  },

  updateTemuan: async (id: string, item: Partial<Temuan>) => {
    const payload = {
      tanggal_update: new Date().toISOString().split("T")[0],
      ...item
    };

    if (!navigator.onLine) {
      addToQueue("update", "temuan", id, payload);
      const cached = getCache<Temuan[]>("temuan") || [];
      const updated = cached.map(item => item.id === id ? { ...item, ...payload } : item);
      setCache("temuan", updated);
      return { id, ...payload } as Temuan;
    }

    try {
      if (isDirectSheetMode()) {
        const token = await getAccessToken();
        if (token) {
          await googleSheetsApi.updateRow(token, cachedConfig!.SPREADSHEET_ID, "Temuan", id, payload);
          return { id, ...payload } as Temuan;
        }
      }
      return await request<Temuan>(`${BASE_URL}/temuan/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      addToQueue("update", "temuan", id, payload);
      const cached = getCache<Temuan[]>("temuan") || [];
      const updated = cached.map(item => item.id === id ? { ...item, ...payload } : item);
      setCache("temuan", updated);
      return { id, ...payload } as Temuan;
    }
  },

  deleteTemuan: async (id: string) => {
    if (!navigator.onLine) {
      addToQueue("delete", "temuan", id, null);
      const cached = getCache<Temuan[]>("temuan") || [];
      const filtered = cached.filter(item => item.id !== id);
      setCache("temuan", filtered);
      return { success: true };
    }

    try {
      if (isDirectSheetMode()) {
        const token = await getAccessToken();
        if (token) {
          await googleSheetsApi.deleteRow(token, cachedConfig!.SPREADSHEET_ID, "Temuan", id);
          return { success: true };
        }
      }
      return await request<any>(`${BASE_URL}/temuan/${id}`, {
        method: "DELETE",
      });
    } catch (err) {
      addToQueue("delete", "temuan", id, null);
      const cached = getCache<Temuan[]>("temuan") || [];
      const filtered = cached.filter(item => item.id !== id);
      setCache("temuan", filtered);
      return { success: true };
    }
  },

  // Master Satwas
  getSatwas: async (): Promise<MasterSatwas[]> => {
    try {
      let data: MasterSatwas[] = [];
      if (isDirectSheetMode()) {
        const token = await getAccessToken();
        if (token) {
          data = await googleSheetsApi.getRows(token, cachedConfig!.SPREADSHEET_ID, "MasterSatwas") as MasterSatwas[];
        } else {
          data = await request<MasterSatwas[]>(`${BASE_URL}/satwas`);
        }
      } else {
        data = await request<MasterSatwas[]>(`${BASE_URL}/satwas`);
      }
      setCache("satwas", data);
      return data;
    } catch (err: any) {
      console.warn("Fetch getSatwas failed, loading offline fallback:", err.message);
      return getCache<MasterSatwas[]>("satwas") || [];
    }
  },

  // Dashboard Stats
  getDashboardStats: async (): Promise<DashboardStats> => {
    try {
      let stats: DashboardStats;
      if (isDirectSheetMode()) {
        const token = await getAccessToken();
        if (token) {
          const pems = await googleSheetsApi.getRows(token, cachedConfig!.SPREADSHEET_ID, "Pemeriksaan") as Pemeriksaan[];
          stats = calculateDashboardStats(pems);
        } else {
          stats = await request<DashboardStats>(`${BASE_URL}/dashboard`);
        }
      } else {
        stats = await request<DashboardStats>(`${BASE_URL}/dashboard`);
      }
      setCache("dashboard", stats);
      return stats;
    } catch (err: any) {
      console.warn("Fetch getDashboardStats failed, calculating on offline data:", err.message);
      try {
        const pems = await api.getPemeriksaan();
        const calculated = calculateDashboardStats(pems);
        setCache("dashboard", calculated);
        return calculated;
      } catch (calcErr) {
        return getCache<DashboardStats>("dashboard") || {
          totalPemeriksaan: 0,
          totalTaat: 0,
          totalTidakTaat: 0,
          rataRataNilai: 0,
          nilaiTertinggi: 0,
          nilaiTerendah: 0,
          chartPemeriksaanBulanan: [],
          chartKetaatan: [],
          chartNilaiSatwas: [],
          chartTrendTahunan: [],
          paguAnggaran: 0,
          realisasiAnggaran: 0,
          sisaAnggaran: 0,
          persentasePenyerapan: 0,
          targetRealisasi: 0,
          persentasePenyerapanTarget: 0,
          targetQ1: 0,
          targetQ2: 0,
          targetQ3: 0,
          targetQ4: 0,
          realisasiQ1: 0,
          realisasiQ2: 0,
          realisasiQ3: 0,
          realisasiQ4: 0
        };
      }
    }
  },

  // Activity Logs
  getLogs: async (): Promise<ActivityLog[]> => {
    try {
      const logs = await request<ActivityLog[]>(`${BASE_URL}/logs`);
      setCache("logs", logs);
      return logs;
    } catch (err) {
      return getCache<ActivityLog[]>("logs") || [];
    }
  },

  createLog: async (log: Omit<ActivityLog, "id" | "timestamp">) => {
    try {
      return await request<ActivityLog>(`${BASE_URL}/logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(log),
      });
    } catch (err) {
      // Just return a dummy log for UI consistency
      return {
        id: `log_${Date.now()}`,
        timestamp: new Date().toISOString(),
        ...log
      } as ActivityLog;
    }
  },

  // Keep Notes Local DB CRUD
  getNotes: async (): Promise<any[]> => {
    try {
      const data = await request<any[]>(`${BASE_URL}/notes`);
      setCache("notes", data);
      return applyOfflineQueue("notes", data);
    } catch (err: any) {
      console.warn("Fetch getNotes failed, loading offline fallback:", err.message);
      const cached = getCache<any[]>("notes") || [];
      return applyOfflineQueue("notes", cached);
    }
  },

  createNote: async (note: { title: string; content: string; color?: string; pinned?: boolean }) => {
    const id = `n_${Date.now()}`;
    const payload = { id, ...note };

    if (!navigator.onLine) {
      addToQueue("create", "notes", id, payload);
      const cached = getCache<any[]>("notes") || [];
      setCache("notes", [...cached, payload]);
      return payload;
    }

    try {
      return await request<any>(`${BASE_URL}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(note),
      });
    } catch (err) {
      addToQueue("create", "notes", id, payload);
      const cached = getCache<any[]>("notes") || [];
      setCache("notes", [...cached, payload]);
      return payload;
    }
  },

  updateNote: async (id: string, note: { title?: string; content?: string; color?: string; pinned?: boolean }) => {
    if (!navigator.onLine) {
      addToQueue("update", "notes", id, note);
      const cached = getCache<any[]>("notes") || [];
      const updated = cached.map(item => item.id === id ? { ...item, ...note } : item);
      setCache("notes", updated);
      return { id, ...note };
    }

    try {
      return await request<any>(`${BASE_URL}/notes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(note),
      });
    } catch (err) {
      addToQueue("update", "notes", id, note);
      const cached = getCache<any[]>("notes") || [];
      const updated = cached.map(item => item.id === id ? { ...item, ...note } : item);
      setCache("notes", updated);
      return { id, ...note };
    }
  },

  deleteNote: async (id: string) => {
    if (!navigator.onLine) {
      addToQueue("delete", "notes", id, null);
      const cached = getCache<any[]>("notes") || [];
      const filtered = cached.filter(item => item.id !== id);
      setCache("notes", filtered);
      return { success: true };
    }

    try {
      return await request<any>(`${BASE_URL}/notes/${id}`, {
        method: "DELETE",
      });
    } catch (err) {
      addToQueue("delete", "notes", id, null);
      const cached = getCache<any[]>("notes") || [];
      const filtered = cached.filter(item => item.id !== id);
      setCache("notes", filtered);
      return { success: true };
    }
  },

  // Local Calendar Schedules CRUD
  getCalendarEvents: async (): Promise<any[]> => {
    try {
      const data = await request<any[]>(`${BASE_URL}/calendar-events`);
      setCache("calendar", data);
      return data;
    } catch (err) {
      return getCache<any[]>("calendar") || [];
    }
  },

  createCalendarEvent: async (event: { 
    summary: string; 
    description: string; 
    start: string; 
    end: string; 
    googleEventId?: string; 
    pelakuUsahaId?: string; 
  }) => {
    try {
      return await request<any>(`${BASE_URL}/calendar-events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      });
    } catch (err) {
      const id = `ev_${Date.now()}`;
      const payload = { id, ...event };
      const cached = getCache<any[]>("calendar") || [];
      setCache("calendar", [...cached, payload]);
      return payload;
    }
  },

  deleteCalendarEvent: async (id: string) => {
    try {
      return await request<any>(`${BASE_URL}/calendar-events/${id}`, {
        method: "DELETE",
      });
    } catch (err) {
      const cached = getCache<any[]>("calendar") || [];
      const filtered = cached.filter(item => item.id !== id);
      setCache("calendar", filtered);
      return { success: true };
    }
  },

  // Google Forms Register CRUD
  getGoogleForms: async (): Promise<any[]> => {
    try {
      const data = await request<any[]>(`${BASE_URL}/google-forms`);
      setCache("google-forms", data);
      return data;
    } catch (err) {
      return getCache<any[]>("google-forms") || [];
    }
  },

  createGoogleForm: async (form: { 
    formId: string; 
    title: string; 
    description?: string; 
    responderUri?: string; 
    editUri?: string; 
  }) => {
    try {
      return await request<any>(`${BASE_URL}/google-forms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } catch (err) {
      const id = `form_${Date.now()}`;
      const payload = { id, ...form };
      const cached = getCache<any[]>("google-forms") || [];
      setCache("google-forms", [...cached, payload]);
      return payload;
    }
  },

  deleteGoogleForm: async (id: string) => {
    try {
      return await request<any>(`${BASE_URL}/google-forms/${id}`, {
        method: "DELETE",
      });
    } catch (err) {
      const cached = getCache<any[]>("google-forms") || [];
      const filtered = cached.filter(item => item.id !== id);
      setCache("google-forms", filtered);
      return { success: true };
    }
  },

  // AI Gemini & Text-to-Speech Assistant
  aiGenerateText: async (prompt: string, contextSystem?: string): Promise<string> => {
    return request<{ text: string }>(`${BASE_URL}/ai/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, contextSystem }),
    }).then(data => data.text);
  },

  aiTextToSpeech: async (text: string, voiceName: string = "Kore"): Promise<string> => {
    return request<{ audio: string }>(`${BASE_URL}/ai/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voiceName }),
    }).then(data => data.audio);
  },

  // Offline Sync Layer Actions
  getOfflineQueue,
  clearOfflineQueue: () => saveOfflineQueue([]),
  syncOfflineQueue: async (): Promise<{ successCount: number; failedCount: number }> => {
    const queue = getOfflineQueue();
    if (queue.length === 0) return { successCount: 0, failedCount: 0 };

    let successCount = 0;
    let failedCount = 0;
    const remainingQueue: QueueItem[] = [];

    for (const item of queue) {
      try {
        if (item.entity === "pemeriksaan") {
          if (item.action === "create") {
            if (isDirectSheetMode()) {
              const token = await getAccessToken();
              if (token) await googleSheetsApi.appendRow(token, cachedConfig!.SPREADSHEET_ID, "Pemeriksaan", item.payload);
            } else {
              await request(`${BASE_URL}/pemeriksaan`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(item.payload),
              });
            }
          } else if (item.action === "update") {
            if (isDirectSheetMode()) {
              const token = await getAccessToken();
              if (token) await googleSheetsApi.updateRow(token, cachedConfig!.SPREADSHEET_ID, "Pemeriksaan", item.entityId, item.payload);
            } else {
              await request(`${BASE_URL}/pemeriksaan/${item.entityId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(item.payload),
              });
            }
          } else if (item.action === "delete") {
            if (isDirectSheetMode()) {
              const token = await getAccessToken();
              if (token) await googleSheetsApi.deleteRow(token, cachedConfig!.SPREADSHEET_ID, "Pemeriksaan", item.entityId);
            } else {
              await request(`${BASE_URL}/pemeriksaan/${item.entityId}`, {
                method: "DELETE",
              });
            }
          }
        } else if (item.entity === "temuan") {
          if (item.action === "create") {
            if (isDirectSheetMode()) {
              const token = await getAccessToken();
              if (token) await googleSheetsApi.appendRow(token, cachedConfig!.SPREADSHEET_ID, "Temuan", item.payload);
            } else {
              await request(`${BASE_URL}/temuan`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(item.payload),
              });
            }
          } else if (item.action === "update") {
            if (isDirectSheetMode()) {
              const token = await getAccessToken();
              if (token) await googleSheetsApi.updateRow(token, cachedConfig!.SPREADSHEET_ID, "Temuan", item.entityId, item.payload);
            } else {
              await request(`${BASE_URL}/temuan/${item.entityId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(item.payload),
              });
            }
          } else if (item.action === "delete") {
            if (isDirectSheetMode()) {
              const token = await getAccessToken();
              if (token) await googleSheetsApi.deleteRow(token, cachedConfig!.SPREADSHEET_ID, "Temuan", item.entityId);
            } else {
              await request(`${BASE_URL}/temuan/${item.entityId}`, {
                method: "DELETE",
              });
            }
          }
        } else if (item.entity === "dokumen") {
          if (item.action === "create") {
            if (isDirectSheetMode()) {
              const token = await getAccessToken();
              if (token) await googleSheetsApi.appendRow(token, cachedConfig!.SPREADSHEET_ID, "Dokumen", item.payload);
            } else {
              await request(`${BASE_URL}/dokumen`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(item.payload),
              });
            }
          } else if (item.action === "update") {
            if (isDirectSheetMode()) {
              const token = await getAccessToken();
              if (token) await googleSheetsApi.updateRow(token, cachedConfig!.SPREADSHEET_ID, "Dokumen", item.entityId, item.payload);
            } else {
              await request(`${BASE_URL}/dokumen/${item.entityId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(item.payload),
              });
            }
          } else if (item.action === "delete") {
            if (isDirectSheetMode()) {
              const token = await getAccessToken();
              if (token) await googleSheetsApi.deleteRow(token, cachedConfig!.SPREADSHEET_ID, "Dokumen", item.entityId);
            } else {
              await request(`${BASE_URL}/dokumen/${item.entityId}`, {
                method: "DELETE",
              });
            }
          }
        } else if (item.entity === "notes") {
          if (item.action === "create") {
            await request(`${BASE_URL}/notes`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(item.payload),
            });
          } else if (item.action === "update") {
            await request(`${BASE_URL}/notes/${item.entityId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(item.payload),
            });
          } else if (item.action === "delete") {
            await request(`${BASE_URL}/notes/${item.entityId}`, {
              method: "DELETE",
            });
          }
        } else if (item.entity === "users") {
          if (item.action === "create") {
            if (isDirectSheetMode()) {
              const token = await getAccessToken();
              if (token) await googleSheetsApi.appendRow(token, cachedConfig!.SPREADSHEET_ID, "Users", item.payload);
            } else {
              await request(`${BASE_URL}/users`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(item.payload),
              });
            }
          } else if (item.action === "update") {
            if (isDirectSheetMode()) {
              const token = await getAccessToken();
              if (token) await googleSheetsApi.updateRow(token, cachedConfig!.SPREADSHEET_ID, "Users", item.entityId, item.payload);
            } else {
              await request(`${BASE_URL}/users/${item.entityId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(item.payload),
              });
            }
          } else if (item.action === "delete") {
            if (isDirectSheetMode()) {
              const token = await getAccessToken();
              if (token) await googleSheetsApi.deleteRow(token, cachedConfig!.SPREADSHEET_ID, "Users", item.entityId);
            } else {
              await request(`${BASE_URL}/users/${item.entityId}`, {
                method: "DELETE",
              });
            }
          }
        }
        successCount++;
      } catch (err: any) {
        console.error(`Failed to sync offline item:`, err);
        remainingQueue.push(item);
        failedCount++;
      }
    }

    saveOfflineQueue(remainingQueue);
    return { successCount, failedCount };
  }
};
