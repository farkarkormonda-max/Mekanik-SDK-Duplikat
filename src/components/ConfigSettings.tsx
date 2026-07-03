import React, { useState, useEffect } from "react";
import { 
  Database, 
  CloudLightning, 
  Link, 
  Save, 
  CheckCircle,
  HelpCircle,
  Info,
  Copy,
  FileCode,
  Terminal,
  AlertTriangle,
  Play,
  Share2,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  LogOut,
  Chrome
} from "lucide-react";
import { googleSheetsApi } from "../lib/googleSheets";
import { googleSignIn, googleLogout, getAccessToken } from "../lib/firebaseAuth";

interface ConfigSettingsProps {
  config: { 
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
    TARGET_SATWAS?: Record<string, { pagu: number; target: number; realisasi: number }>;
  };
  satwasList: { id: string; nama_satwas: string; wilayah: string }[];
  onUpdateConfig: (newConfig: { 
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
    TARGET_SATWAS?: Record<string, { pagu: number; target: number; realisasi: number }>;
  }) => Promise<void>;
}

export const ConfigSettings: React.FC<ConfigSettingsProps> = ({ config, satwasList, onUpdateConfig }) => {
  const [mode, setMode] = useState<string>(config.DATA_PERSISTENCE_MODE);
  const [gasUrl, setGasUrl] = useState<string>(config.GAS_WEB_APP_URL);
  const [spreadsheetId, setSpreadsheetId] = useState<string>(config.SPREADSHEET_ID);
  const [pagu, setPagu] = useState<number>(config.PAGU_ANGGARAN ?? 1250000000);
  const [realisasi, setRealisasi] = useState<number>(config.REALISASI_ANGGARAN ?? 825000000);
  const [targetRealisasi, setTargetRealisasi] = useState<number>(config.TARGET_REALISASI ?? 1000000000);

  const [targetQ1, setTargetQ1] = useState<number>(config.TARGET_Q1 ?? 250000000);
  const [targetQ2, setTargetQ2] = useState<number>(config.TARGET_Q2 ?? 250000000);
  const [targetQ3, setTargetQ3] = useState<number>(config.TARGET_Q3 ?? 250000000);
  const [targetQ4, setTargetQ4] = useState<number>(config.TARGET_Q4 ?? 250000000);

  const [realisasiQ1, setRealisasiQ1] = useState<number>(config.REALISASI_Q1 ?? 220000000);
  const [realisasiQ2, setRealisasiQ2] = useState<number>(config.REALISASI_Q2 ?? 230000000);
  const [realisasiQ3, setRealisasiQ3] = useState<number>(config.REALISASI_Q3 ?? 200000000);
  const [realisasiQ4, setRealisasiQ4] = useState<number>(config.REALISASI_Q4 ?? 175000000);

  const [targetSatwasMap, setTargetSatwasMap] = useState<Record<string, { pagu: number; target: number; realisasi: number }>>(() => {
    return config.TARGET_SATWAS || {
      "Stasiun PSDKP Biak": { pagu: 500000000, target: 400000000, realisasi: 330000000 },
      "Satwas SDKP Manokwari": { pagu: 250000000, target: 200000000, realisasi: 165000000 },
      "Satwas SDKP Jayapura": { pagu: 312500000, target: 250000000, realisasi: 206250000 },
      "Satwas SDK Nabire": { pagu: 187500000, target: 150000000, realisasi: 123750000 }
    };
  });

  useEffect(() => {
    if (config.DATA_PERSISTENCE_MODE) setMode(config.DATA_PERSISTENCE_MODE);
    if (config.GAS_WEB_APP_URL !== undefined) setGasUrl(config.GAS_WEB_APP_URL);
    if (config.SPREADSHEET_ID !== undefined) setSpreadsheetId(config.SPREADSHEET_ID);
    if (config.PAGU_ANGGARAN !== undefined) setPagu(config.PAGU_ANGGARAN);
    if (config.REALISASI_ANGGARAN !== undefined) setRealisasi(config.REALISASI_ANGGARAN);
    if (config.TARGET_REALISASI !== undefined) setTargetRealisasi(config.TARGET_REALISASI);
    if (config.TARGET_Q1 !== undefined) setTargetQ1(config.TARGET_Q1);
    if (config.TARGET_Q2 !== undefined) setTargetQ2(config.TARGET_Q2);
    if (config.TARGET_Q3 !== undefined) setTargetQ3(config.TARGET_Q3);
    if (config.TARGET_Q4 !== undefined) setTargetQ4(config.TARGET_Q4);
    if (config.REALISASI_Q1 !== undefined) setRealisasiQ1(config.REALISASI_Q1);
    if (config.REALISASI_Q2 !== undefined) setRealisasiQ2(config.REALISASI_Q2);
    if (config.REALISASI_Q3 !== undefined) setRealisasiQ3(config.REALISASI_Q3);
    if (config.REALISASI_Q4 !== undefined) setRealisasiQ4(config.REALISASI_Q4);
    if (config.TARGET_SATWAS !== undefined) setTargetSatwasMap(config.TARGET_SATWAS);
  }, [config]);

  const handleSatwasValueChange = (satwasName: string, field: 'pagu' | 'target' | 'realisasi', value: number) => {
    const updated = {
      ...targetSatwasMap,
      [satwasName]: {
        ...(targetSatwasMap[satwasName] || { pagu: 0, target: 0, realisasi: 0 }),
        [field]: value
      }
    };
    setTargetSatwasMap(updated);

    // Auto-sum to top total fields!
    let sumPagu = 0;
    let sumTarget = 0;
    let sumRealisasi = 0;
    Object.entries(updated).forEach(([name, item]: [string, any]) => {
      sumPagu += Number(item.pagu) || 0;
      sumTarget += Number(item.target) || 0;
      sumRealisasi += Number(item.realisasi) || 0;
    });

    setPagu(sumPagu);
    setTargetRealisasi(sumTarget);
    setRealisasi(sumRealisasi);

    // Recalculate quarterly values proportionally
    if (sumTarget > 0) {
      const q1Prop = targetQ1 / (targetRealisasi || 1);
      const q2Prop = targetQ2 / (targetRealisasi || 1);
      const q3Prop = targetQ3 / (targetRealisasi || 1);
      const q4Prop = targetQ4 / (targetRealisasi || 1);

      setTargetQ1(Math.round(sumTarget * (q1Prop || 0.25)));
      setTargetQ2(Math.round(sumTarget * (q2Prop || 0.25)));
      setTargetQ3(Math.round(sumTarget * (q3Prop || 0.25)));
      setTargetQ4(Math.round(sumTarget * (q4Prop || 0.25)));
    }

    if (sumRealisasi > 0) {
      const q1RealProp = realisasiQ1 / (realisasi || 1);
      const q2RealProp = realisasiQ2 / (realisasi || 1);
      const q3RealProp = realisasiQ3 / (realisasi || 1);
      const q4RealProp = realisasiQ4 / (realisasi || 1);

      setRealisasiQ1(Math.round(sumRealisasi * (q1RealProp || 0.25)));
      setRealisasiQ2(Math.round(sumRealisasi * (q2RealProp || 0.25)));
      setRealisasiQ3(Math.round(sumRealisasi * (q3RealProp || 0.25)));
      setRealisasiQ4(Math.round(sumRealisasi * (q4RealProp || 0.25)));
    }
  };

  const handleApplyProportionalShare = () => {
    const budgetShareMap: Record<string, number> = {
      "Stasiun PSDKP Biak": 0.40,
      "Satwas SDKP Manokwari": 0.20,
      "Satwas SDKP Jayapura": 0.25,
      "Satwas SDK Nabire": 0.15,
    };

    const updated: Record<string, { pagu: number; target: number; realisasi: number }> = {};
    satwasList.forEach(sat => {
      const share = budgetShareMap[sat.nama_satwas] !== undefined ? budgetShareMap[sat.nama_satwas] : 0.20;
      updated[sat.nama_satwas] = {
        pagu: Math.round(pagu * share),
        target: Math.round(targetRealisasi * share),
        realisasi: Math.round(realisasi * share),
      };
    });
    setTargetSatwasMap(updated);
  };

  const handleTargetQChange = (qIndex: number, val: number) => {
    if (qIndex === 1) {
      setTargetQ1(val);
      setTargetRealisasi(val + targetQ2 + targetQ3 + targetQ4);
    } else if (qIndex === 2) {
      setTargetQ2(val);
      setTargetRealisasi(targetQ1 + val + targetQ3 + targetQ4);
    } else if (qIndex === 3) {
      setTargetQ3(val);
      setTargetRealisasi(targetQ1 + targetQ2 + val + targetQ4);
    } else if (qIndex === 4) {
      setTargetQ4(val);
      setTargetRealisasi(targetQ1 + targetQ2 + targetQ3 + val);
    }
  };

  const handleRealisasiQChange = (qIndex: number, val: number) => {
    if (qIndex === 1) {
      setRealisasiQ1(val);
      setRealisasi(val + realisasiQ2 + realisasiQ3 + realisasiQ4);
    } else if (qIndex === 2) {
      setRealisasiQ2(val);
      setRealisasi(realisasiQ1 + val + realisasiQ3 + realisasiQ4);
    } else if (qIndex === 3) {
      setRealisasiQ3(val);
      setRealisasi(realisasiQ1 + realisasiQ2 + val + realisasiQ4);
    } else if (qIndex === 4) {
      setRealisasiQ4(val);
      setRealisasi(realisasiQ1 + realisasiQ2 + realisasiQ3 + val);
    }
  };
  
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  
  const [appsScriptCode, setAppsScriptCode] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [loadingCode, setLoadingCode] = useState(false);
  const [showCodeViewer, setShowCodeViewer] = useState(false);

  // Direct sheets auth & list states
  const [isGoogleAuthorized, setIsGoogleAuthorized] = useState(false);
  const [googleEmail, setGoogleEmail] = useState<string>("");
  const [loadingSheets, setLoadingSheets] = useState(false);
  const [mySpreadsheets, setMySpreadsheets] = useState<{ id: string; name: string }[]>([]);
  const [creatingSheet, setCreatingSheet] = useState(false);

  useEffect(() => {
    // Load Apps Script code template
    setLoadingCode(true);
    fetch("/api/appsscript-code")
      .then(async (res) => {
        const text = await res.text();
        if (!text) return { success: false };
        try {
          return JSON.parse(text);
        } catch {
          return { success: false };
        }
      })
      .then((res) => {
        if (res.success) {
          setAppsScriptCode(res.code);
        }
      })
      .catch((err) => console.error("Gagal memuat kode Apps Script:", err))
      .finally(() => setLoadingCode(false));

    // Check if token exists on load
    checkGoogleToken();
  }, []);

  const checkGoogleToken = async () => {
    try {
      const token = await getAccessToken();
      if (token) {
        setIsGoogleAuthorized(true);
        // Load recent spreadsheets
        loadDriveSpreadsheets(token);
      } else {
        setIsGoogleAuthorized(false);
      }
    } catch {
      setIsGoogleAuthorized(false);
    }
  };

  const loadDriveSpreadsheets = async (token: string) => {
    setLoadingSheets(true);
    try {
      const files = await googleSheetsApi.listSpreadsheets(token);
      setMySpreadsheets(files);
    } catch (err: any) {
      console.error("Gagal memuat spreadsheet dari Drive:", err);
    } finally {
      setLoadingSheets(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg("");
    try {
      const result = await googleSignIn();
      if (result) {
        setIsGoogleAuthorized(true);
        setGoogleEmail(result.user.email || "Google Account");
        await loadDriveSpreadsheets(result.accessToken);
        setSuccessMsg("Berhasil terhubung dengan Google Account!");
        setTimeout(() => setSuccessMsg(""), 4000);
      }
    } catch (err: any) {
      setErrorMsg("Gagal melakukan login Google: " + err.message);
    }
  };

  const handleGoogleLogoutClick = async () => {
    await googleLogout();
    setIsGoogleAuthorized(false);
    setGoogleEmail("");
    setMySpreadsheets([]);
  };

  const handleCreateNewSheetAutomatically = async () => {
    setErrorMsg("");
    setCreatingSheet(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error("Sesi Google Anda kedaluwarsa. Silakan masuk kembali.");
      }
      const title = `Mekanik Timja SDK Biak (Auto-Sync) - ${new Date().getFullYear()}`;
      const newSheetId = await googleSheetsApi.createSpreadsheet(token, title);
      setSpreadsheetId(newSheetId);
      
      // Load spreadsheet list again
      await loadDriveSpreadsheets(token);
      
      setSuccessMsg(`Spreadsheet "${title}" berhasil dibuat secara gratis dan diintegrasi!`);
      setTimeout(() => setSuccessMsg(""), 6000);
    } catch (err: any) {
      setErrorMsg("Gagal membuat spreadsheet otomatis: " + err.message);
    } finally {
      setCreatingSheet(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      await onUpdateConfig({
        DATA_PERSISTENCE_MODE: mode,
        GAS_WEB_APP_URL: gasUrl.trim(),
        SPREADSHEET_ID: spreadsheetId.trim(),
        PAGU_ANGGARAN: Number(pagu) || 0,
        REALISASI_ANGGARAN: Number(realisasi) || 0,
        TARGET_REALISASI: Number(targetRealisasi) || 0,
        TARGET_Q1: Number(targetQ1) || 0,
        TARGET_Q2: Number(targetQ2) || 0,
        TARGET_Q3: Number(targetQ3) || 0,
        TARGET_Q4: Number(targetQ4) || 0,
        REALISASI_Q1: Number(realisasiQ1) || 0,
        REALISASI_Q2: Number(realisasiQ2) || 0,
        REALISASI_Q3: Number(realisasiQ3) || 0,
        REALISASI_Q4: Number(realisasiQ4) || 0,
        TARGET_SATWAS: targetSatwasMap,
      });
      setSuccessMsg("Konfigurasi penyimpanan & target anggaran berhasil diperbarui!");
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (e: any) {
      setErrorMsg("Gagal memperbarui konfigurasi: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Informational banner alert */}
      <div className="p-4 rounded-xl bg-sky-50 border border-sky-100 flex gap-3 text-slate-700">
        <Info className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-bold">Informasi Sinkronisasi Database</p>
          <p className="mt-1 leading-relaxed opacity-90 font-medium">
            Aplikasi Mekanik Timja SDK sekarang mendukung <strong>Google Sheets Direct API (Satu-Klik)</strong>! 
            Anda tidak perlu lagi mengoreksi kode Web App Apps Script, melainkan cukup masuk dengan akun Google 
            dan biarkan sistem membuat serta menyinkronkan seluruh database sheet secara langsung.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-800 rounded-lg flex items-center gap-2 font-semibold">
          <AlertTriangle className="w-4 h-4 text-rose-650 shrink-0" />
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-3 text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex items-center gap-2 font-bold">
          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
          {successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Settings Card */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
            <Link className="w-5 h-5 text-sky-600" />
            Konfigurasi Database Utama
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Pilih Saluran Penyimpanan Data
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setMode("local")}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                    mode === "local"
                      ? "border-sky-600 bg-sky-50/50 text-sky-900 ring-2 ring-sky-100 font-bold"
                      : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 font-semibold"
                  }`}
                >
                  <Database className={`w-6 h-6 mb-1.5 ${mode === "local" ? "text-sky-600" : "text-slate-400"}`} />
                  <span className="text-xs">Local DB</span>
                  <span className="text-[8px] mt-1 opacity-70 leading-snug">Penyimpanan internal aman & instan.</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode("direct-sheet")}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                    mode === "direct-sheet"
                      ? "border-emerald-600 bg-emerald-50/50 text-emerald-900 ring-2 ring-emerald-100 font-bold"
                      : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 font-semibold"
                  }`}
                >
                  <Chrome className={`w-6 h-6 mb-1.5 ${mode === "direct-sheet" ? "text-emerald-600" : "text-slate-400"}`} />
                  <span className="text-xs">Direct Sheet</span>
                  <span className="text-[8px] mt-1 opacity-70 leading-snug">Koneksi langsung, Tanpa Coding Apps Script.</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode("sheet")}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                    mode === "sheet"
                      ? "border-amber-600 bg-amber-50/50 text-amber-900 ring-2 ring-amber-100 font-bold"
                      : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 font-semibold"
                  }`}
                >
                  <CloudLightning className={`w-6 h-6 mb-1.5 ${mode === "sheet" ? "text-amber-600" : "text-slate-400"}`} />
                  <span className="text-xs">Apps Script</span>
                  <span className="text-[8px] mt-1 opacity-70 leading-snug">Sinkronisasi ganda via script exec URL.</span>
                </button>
              </div>
            </div>

            {/* CASE 1: DIRECT GOOGLE SHEETS API SYNC */}
            {mode === "direct-sheet" && (
              <div className="space-y-5 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="block text-[11px] font-black tracking-wider uppercase text-sky-850">Langkah 1: Hubungkan Akun Google</span>
                
                {!isGoogleAuthorized ? (
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow cursor-pointer transition-all active:scale-95"
                  >
                    <Chrome className="w-4 h-4" />
                    Hubungkan dengan Google Account (Drive/Sheets)
                  </button>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="font-semibold text-slate-700">Mekanik Direct Auth: Aktif</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleGoogleLogoutClick}
                      className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Putus Koneksi
                    </button>
                  </div>
                )}

                {isGoogleAuthorized && (
                  <div className="space-y-4 border-t border-slate-200 pt-3">
                    <span className="block text-[11px] font-black tracking-wider uppercase text-sky-850">Langkah 2: Pilih / Buat Spreadsheet</span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-1">
                      <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col justify-between">
                        <div>
                          <span className="font-bold text-xs text-slate-800 block">Buat Otomatis</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5 leading-relaxed font-medium">Buat file Google Sheet spreadsheet kosong terstruktur baru di Google Drive Anda secara instan.</span>
                        </div>
                        <button
                          type="button"
                          disabled={creatingSheet}
                          onClick={handleCreateNewSheetAutomatically}
                          className="mt-3 w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors disabled:bg-slate-350"
                        >
                          {creatingSheet ? (
                            <>
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              Memproses...
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              Buat Sheet Baru
                            </>
                          )}
                        </button>
                      </div>

                      <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col justify-between">
                        <div>
                          <span className="font-bold text-xs text-slate-800 block">Atur ID Manual</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5 leading-relaxed font-medium">Tempel ID google sheet Anda (Rangkaian karakter panjang di URL google doc sheet).</span>
                        </div>
                        <div className="mt-3">
                          <input
                            type="text"
                            value={spreadsheetId}
                            onChange={(e) => setSpreadsheetId(e.target.value)}
                            placeholder="Contoh: 1b_X9m_..."
                            className="w-full px-3 py-1 bg-slate-50 border border-slate-200 rounded text-[11px] font-mono text-slate-700 focus:outline-none focus:bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Drive spreadsheets list */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Pilih dari Drive Anda (30 Terakhir):</label>
                      {loadingSheets ? (
                        <div className="text-[10.5px] text-slate-500 italic py-2 flex items-center gap-1">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                          Memuat spreadsheet dari Google Drive...
                        </div>
                      ) : mySpreadsheets.length === 0 ? (
                        <div className="text-[10.5px] text-slate-400 italic py-1">Tidak ditemukan spreadsheet Google di Drive Anda. Silakan klik tombol "Buat Sheet Baru" di atas.</div>
                      ) : (
                        <div className="max-h-36 overflow-y-auto border border-slate-200 bg-white rounded-xl divide-y divide-slate-100">
                          {mySpreadsheets.map((s) => (
                            <button
                              type="button"
                              key={s.id}
                              onClick={() => {
                                setSpreadsheetId(s.id);
                                setSuccessMsg(`Spreadsheet "${s.name}" terpilih! Silakan tekan tombol Simpan Konfigurasi untuk mendaftarkan.`);
                                setTimeout(() => setSuccessMsg(""), 5000);
                              }}
                              className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                                spreadsheetId === s.id ? "bg-emerald-50/60 font-bold" : ""
                              }`}
                            >
                              <span className="flex items-center gap-1.5 truncate text-slate-700">
                                <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span className="truncate">{s.name}</span>
                              </span>
                              {spreadsheetId === s.id ? (
                                <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md font-mono">Aktif</span>
                              ) : (
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Hubungkan</span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* CASE 2: GOOGLE APPS SCRIPT WEB APP */}
            {mode === "sheet" && (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Google Apps Script Web App URL
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <input
                    type="url"
                    value={gasUrl}
                    onChange={(e) => setGasUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/xxxxxxxxxxxxxxxxxxxxx/exec"
                    required={mode === "sheet"}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-mono text-xs text-slate-700 bg-slate-50 focus:bg-white"
                  />
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed font-semibold font-sans">
                  Pastikan deploy URL didefinisikan sebagai <strong>"Web App"</strong>, Execute as <strong>"Me"</strong>, dan Who has access <strong>"Anyone"</strong> di lingkungan Google Script Anda agar terintegrasi.
                </p>
              </div>
            )}

            {/* Target Keuangan & Anggaran Section */}
            <div className="border-t border-slate-100 pt-5 space-y-6">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                Target Keuangan & Anggaran Kerja Timja
              </h3>
              
              {/* Annual Totals */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-200/60">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                    Pagu Anggaran Kerja (Rp)
                  </label>
                  <input
                    type="number"
                    value={pagu}
                    onChange={(e) => setPagu(Number(e.target.value) || 0)}
                    placeholder="Contoh: 1250000000"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-mono text-xs text-slate-700 bg-white"
                  />
                  <p className="text-[9px] text-slate-400 mt-1 leading-relaxed font-semibold">
                    Total alokasi anggaran belanja setahun.
                  </p>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                    Target Realisasi (Rp) <span className="text-sky-600 text-[9px] font-bold font-sans">(Auto-Sum)</span>
                  </label>
                  <input
                    type="number"
                    value={targetRealisasi}
                    onChange={(e) => setTargetRealisasi(Number(e.target.value) || 0)}
                    placeholder="Contoh: 1000000000"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-mono text-xs text-slate-700 bg-white"
                  />
                  <p className="text-[9px] text-slate-400 mt-1 leading-relaxed font-semibold">
                    Target penyerapan yang direncanakan.
                  </p>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                    Realisasi Anggaran Kerja (Rp) <span className="text-sky-600 text-[9px] font-bold font-sans">(Auto-Sum)</span>
                  </label>
                  <input
                    type="number"
                    value={realisasi}
                    onChange={(e) => setRealisasi(Number(e.target.value) || 0)}
                    placeholder="Contoh: 825000000"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-mono text-xs text-slate-700 bg-white"
                  />
                  <p className="text-[9px] text-slate-400 mt-1 leading-relaxed font-semibold">
                    Total dana alokasi yang telah terserap.
                  </p>
                </div>
              </div>

              {/* Dynamic per-Satwas Target Settings */}
              <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      ⚓ Detail Alokasi Target & Realisasi Spesifik per Satwas
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-medium leading-normal">
                      Mengatur alokasi anggaran khusus masing-masing Satwas. Total di atas akan terupdate otomatis (Auto-Sum).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyProportionalShare}
                    className="px-3 py-1.5 text-[10px] font-bold text-sky-700 bg-sky-50 hover:bg-sky-100/80 rounded-lg flex items-center gap-1.5 transition-colors border border-sky-100 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Reset Ke Proporsi Default
                  </button>
                </div>

                <div className="space-y-3">
                  {satwasList.map((sat) => {
                    const satConfig = targetSatwasMap[sat.nama_satwas] || { pagu: 0, target: 0, realisasi: 0 };
                    return (
                      <div 
                        key={sat.id} 
                        className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center p-3 rounded-lg border border-slate-100 bg-slate-50/30 hover:bg-slate-50/75 transition-colors"
                      >
                        <div className="sm:col-span-1">
                          <span className="block text-xs font-bold text-slate-700">{sat.nama_satwas}</span>
                          <span className="inline-block text-[8px] font-extrabold text-slate-400 uppercase tracking-wider mt-0.5 bg-slate-100 px-1.5 py-0.5 rounded">
                            {sat.wilayah}
                          </span>
                        </div>
                        <div>
                          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">
                            Pagu Anggaran (Rp)
                          </label>
                          <input
                            type="number"
                            value={satConfig.pagu}
                            onChange={(e) => handleSatwasValueChange(sat.nama_satwas, 'pagu', Number(e.target.value) || 0)}
                            placeholder="0"
                            className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/15 focus:border-sky-500 font-mono text-[11px] text-slate-700 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">
                            Target Realisasi (Rp)
                          </label>
                          <input
                            type="number"
                            value={satConfig.target}
                            onChange={(e) => handleSatwasValueChange(sat.nama_satwas, 'target', Number(e.target.value) || 0)}
                            placeholder="0"
                            className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/15 focus:border-sky-500 font-mono text-[11px] text-slate-700 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">
                            Realisasi Berjalan (Rp)
                          </label>
                          <input
                            type="number"
                            value={satConfig.realisasi}
                            onChange={(e) => handleSatwasValueChange(sat.nama_satwas, 'realisasi', Number(e.target.value) || 0)}
                            placeholder="0"
                            className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/15 focus:border-sky-500 font-mono text-[11px] text-slate-700 bg-white"
                          />
                        </div>
                      </div>
                    );
                  })}
                  {satwasList.length === 0 && (
                    <div className="text-center py-4 text-xs font-semibold text-slate-400">
                      Belum ada data Satwas Master yang terdaftar.
                    </div>
                  )}
                </div>
              </div>

              {/* Quarterly Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Target Q1 - Q4 */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-3">
                  <span className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">
                    🎯 Rencana Target Penyerapan Triwulan
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase">Target Q1 (Rp)</label>
                      <input
                        type="number"
                        value={targetQ1}
                        onChange={(e) => handleTargetQChange(1, Number(e.target.value) || 0)}
                        className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 font-mono text-xs text-slate-700 bg-slate-50/50 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase">Target Q2 (Rp)</label>
                      <input
                        type="number"
                        value={targetQ2}
                        onChange={(e) => handleTargetQChange(2, Number(e.target.value) || 0)}
                        className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 font-mono text-xs text-slate-700 bg-slate-50/50 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase">Target Q3 (Rp)</label>
                      <input
                        type="number"
                        value={targetQ3}
                        onChange={(e) => handleTargetQChange(3, Number(e.target.value) || 0)}
                        className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 font-mono text-xs text-slate-700 bg-slate-50/50 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase">Target Q4 (Rp)</label>
                      <input
                        type="number"
                        value={targetQ4}
                        onChange={(e) => handleTargetQChange(4, Number(e.target.value) || 0)}
                        className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 font-mono text-xs text-slate-700 bg-slate-50/50 focus:bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Realisasi Q1 - Q4 */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-3">
                  <span className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">
                    💰 Realisasi Penyerapan Triwulan
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase">Realisasi Q1 (Rp)</label>
                      <input
                        type="number"
                        value={realisasiQ1}
                        onChange={(e) => handleRealisasiQChange(1, Number(e.target.value) || 0)}
                        className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 font-mono text-xs text-slate-700 bg-slate-50/50 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase">Realisasi Q2 (Rp)</label>
                      <input
                        type="number"
                        value={realisasiQ2}
                        onChange={(e) => handleRealisasiQChange(2, Number(e.target.value) || 0)}
                        className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 font-mono text-xs text-slate-700 bg-slate-50/50 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase">Realisasi Q3 (Rp)</label>
                      <input
                        type="number"
                        value={realisasiQ3}
                        onChange={(e) => handleRealisasiQChange(3, Number(e.target.value) || 0)}
                        className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 font-mono text-xs text-slate-700 bg-slate-50/50 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase">Realisasi Q4 (Rp)</label>
                      <input
                        type="number"
                        value={realisasiQ4}
                        onChange={(e) => handleRealisasiQChange(4, Number(e.target.value) || 0)}
                        className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 font-mono text-xs text-slate-700 bg-slate-50/50 focus:bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="submit"
                disabled={saving || (mode === "direct-sheet" && !spreadsheetId)}
                className="px-5 py-2.5 bg-sky-700 text-white hover:bg-sky-850 disabled:bg-slate-350 rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm cursor-pointer transition-colors"
              >
                <Save className="w-4 h-4" />
                {saving ? "Menyimpan..." : "Simpan Konfigurasi"}
              </button>
            </div>
          </form>
        </div>

        {/* Informative Side Card */}
        <div className="bg-slate-900 text-slate-300 rounded-2xl p-6 shadow-sm border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
              <HelpCircle className="w-5 h-5 text-cyan-400" />
              Langkah Integrasi Sheet
            </h3>
            {mode === "direct-sheet" ? (
              <ul className="space-y-4 text-xs font-medium">
                <li className="flex gap-2">
                  <span className="w-5 h-5 shrink-0 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-mono font-bold text-cyan-400 text-[10px]">1</span>
                  <span>Hubungkan akun Google Drive dengan mengklik tombol integrasi di sebelah kiri.</span>
                </li>
                <li className="flex gap-2">
                  <span className="w-5 h-5 shrink-0 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-mono font-bold text-cyan-400 text-[10px]">2</span>
                  <span>Klik tombol <strong>"Buat Sheet Baru"</strong> untuk otomatis menginisialisasi spreadsheet terstruktur 2026.</span>
                </li>
                <li className="flex gap-2">
                  <span className="w-5 h-5 shrink-0 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-mono font-bold text-cyan-400 text-[10px]">3</span>
                  <span>Simpan konfigurasi untuk mendaftarkan database ke akun Anda. Seluruh input data akan disinkronasikan langsung!</span>
                </li>
              </ul>
            ) : (
              <ul className="space-y-4 text-xs font-medium">
                <li className="flex gap-2">
                  <span className="w-5 h-5 shrink-0 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-mono font-bold text-cyan-400 text-[10px]">1</span>
                  <span>Buat Google Sheet baru secara manual atau duplikasi yang sudah ada.</span>
                </li>
                <li className="flex gap-2">
                  <span className="w-5 h-5 shrink-0 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-mono font-bold text-cyan-400 text-[10px]">2</span>
                  <span>Buka menu <strong>Extension &gt; Apps Script</strong> dari Google Sheet Anda.</span>
                </li>
                <li className="flex gap-2">
                  <span className="w-5 h-5 shrink-0 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-mono font-bold text-cyan-400 text-[10px]">3</span>
                  <span>Salin kode Apps Script lengkap dari panel bawah ke editor.</span>
                </li>
                <li className="flex gap-2">
                  <span className="w-5 h-5 shrink-0 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-mono font-bold text-cyan-400 text-[10px]">4</span>
                  <span>Klik <strong>Deploy &gt; New Deployment</strong>, pilih "Web App", salin link URL ke form.</span>
                </li>
              </ul>
            )}
          </div>

          <div className="pt-6 border-t border-slate-800 mt-6 text-[10px] text-slate-400 font-medium">
            *Worksheets Tabel Sheet yang dicakup: <br />
            <code className="text-cyan-450 font-mono font-bold bg-slate-950 px-1 py-0.5 rounded">Users</code>,{" "}
            <code className="text-cyan-450 font-mono font-bold bg-slate-950 px-1 py-0.5 rounded">Pemeriksaan</code>,{" "}
            <code className="text-cyan-450 font-mono font-bold bg-slate-950 px-1 py-0.5 rounded">Dokumen</code>,{" "}
            <code className="text-cyan-450 font-mono font-bold bg-slate-950 px-1 py-0.5 rounded">Temuan</code>,{" "}
            <code className="text-cyan-450 font-mono font-bold bg-slate-950 px-1 py-0.5 rounded">MasterSatwas</code>
          </div>
        </div>
      </div>

      {/* Google Apps Script Code Copy Section (Show always for developer guidance) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <FileCode className="w-5 h-5 text-sky-600 animate-pulse" />
              Kode Google Apps Script Berkapabilitas Auto-Table
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Hanya digunakan jika Anda memilih mode penyimpanan "Apps Script" Web App URL di atas.
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
              if (!appsScriptCode) return;
              try {
                await navigator.clipboard.writeText(appsScriptCode);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch (e) {
                alert("Gagal menyalin kode, silakan salin teks di bawah secara manual.");
              }
            }}
            disabled={!appsScriptCode}
            className={`px-4 py-2.5 text-xs font-bold rounded-lg flex items-center gap-2 cursor-pointer transition-all ${
              copied 
                ? "bg-emerald-600 text-white hover:bg-emerald-700" 
                : "bg-slate-800 hover:bg-slate-900 text-white"
            }`}
          >
            {copied ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Disalin!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Salin Kode Apps Script
              </>
            )}
          </button>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-950">
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900 text-slate-400 text-[10px] font-mono leading-none">
            <span className="flex items-center gap-1.5 font-bold">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              AppsScript_Code.gs
            </span>
            <button
              onClick={() => setShowCodeViewer(!showCodeViewer)}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold tracking-tight cursor-pointer"
            >
              {showCodeViewer ? "Sembunyikan Kode" : "Tampilkan Detail Kode"}
            </button>
          </div>
          {showCodeViewer ? (
            <div className="max-h-72 overflow-y-auto p-4 text-[11px] font-mono text-slate-300 leading-relaxed whitespace-pre font-medium antialiased">
              {appsScriptCode || "Memuat kode..."}
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-slate-400 font-medium">
              Sembunyikan kode panjang. Anda tetap dapat langsung menekan tombol <strong className="text-white">"Salin Kode Apps Script"</strong> di atas untuk menyalin seluruh baris kode.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
