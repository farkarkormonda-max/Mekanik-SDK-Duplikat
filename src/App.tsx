import React, { useState, useEffect, useMemo } from "react";
import { User, Pemeriksaan, Dokumen, Temuan, MasterSatwas, DashboardStats, UserRole } from "./types";
import { api } from "./lib/api";
import { motion } from "motion/react";
import kepolisianKhususLogo from "./assets/images/polsus_badge_real_1782639227590.jpg";

// Sub-component imports
import { Sidebar } from "./components/Sidebar";
import { Navbar } from "./components/Navbar";
import { KPICards } from "./components/KPICards";
import { 
  PemeriksaanBulananChart, 
  KetaatanPieChart, 
  NilaiSatwasChart, 
  TrendTahunanChart,
  AnggaranSatwasStackedBarChart
} from "./components/DashboardCharts";
import { PemeriksaanList } from "./components/PemeriksaanList";
import { PemeriksaanForm } from "./components/PemeriksaanForm";
import { TemuanList } from "./components/TemuanList";
import { TemuanForm } from "./components/TemuanForm";
import { DokumenList } from "./components/DokumenList";
import { LaporanFilter } from "./components/LaporanFilter";
import { UserManagement } from "./components/UserManagement";
import { ConfigSettings } from "./components/ConfigSettings";
import { ActivityLogList } from "./components/ActivityLogList";
import { GoogleWorkspaceManager } from "./components/GoogleWorkspaceManager";
import { AIVoiceAssistant } from "./components/AIVoiceAssistant";
import { useToast } from "./components/Toast";

// Direct Sheets auth service
import { initAuth, googleSignIn, googleLogout } from "./lib/firebaseAuth";

// Lucide icon helper for login
import { Anchor, Lock, User as UserIcon, LogIn, ExternalLink, RefreshCw, Chrome, ClipboardCheck, Wallet, AlertTriangle, Download, Pin, Plus, Trash2, Edit3, Check, X, StickyNote, Volume2, Sparkles, Play, Square, Loader2, WifiOff, Cloud } from "lucide-react";

export default function App() {
  const { success, error, info, warning } = useToast();

  // Session State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [authenticating, setAuthenticating] = useState(false);

  // App Navigation tab
  const [activeTab, setActiveTab] = useState("dashboard");
  const [pemeriksaanSubTab, setPemeriksaanSubTab] = useState<"kegiatan" | "anggaran">("kegiatan");

  // Core Sync Data
  const [pemeriksaan, setPemeriksaan] = useState<Pemeriksaan[]>([]);
  const [documents, setDocuments] = useState<Dokumen[]>([]);
  const [temuan, setTemuan] = useState<Temuan[]>([]);
  const [satwasList, setSatwasList] = useState<MasterSatwas[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [dashboardNotes, setDashboardNotes] = useState<any[]>([]);
  const [config, setConfig] = useState<{ 
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
  }>({ 
    DATA_PERSISTENCE_MODE: "local", 
    GAS_WEB_APP_URL: "", 
    SPREADSHEET_ID: "", 
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
      "Satwas SDKP Nabire": { pagu: 187500000, target: 150000000, realisasi: 123750000 }
    }
  });

  const [loading, setLoading] = useState(false);
  const [hasShownLoginAlerts, setHasShownLoginAlerts] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string>("");
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);

  const [selectedDashboardSatwas, setSelectedDashboardSatwas] = useState<string>("ALL");

  // Dashboard Sticky Notes States
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newNoteColor, setNewNoteColor] = useState("bg-amber-50 border-amber-200 text-amber-900");
  const [newNotePinned, setNewNotePinned] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [showNoteForm, setShowNoteForm] = useState(false);

  const filteredDashboardStats = useMemo(() => {
    if (!dashboardStats) return null;
    
    // If "ALL" is selected, return the dashboard stats with summed config if present
    if (selectedDashboardSatwas === "ALL") {
      if (config?.TARGET_SATWAS) {
        let sumPagu = 0;
        let sumTarget = 0;
        let sumRealisasi = 0;

        // Sum up configured values
        Object.entries(config.TARGET_SATWAS).forEach(([name, item]: [string, any]) => {
          sumPagu += Number(item.pagu) || 0;
          sumTarget += Number(item.target) || 0;
          sumRealisasi += Number(item.realisasi) || 0;
        });

        if (sumPagu > 0) {
          return {
            ...dashboardStats,
            paguAnggaran: sumPagu,
            targetRealisasi: sumTarget,
            realisasiAnggaran: sumRealisasi,
            sisaAnggaran: sumPagu - sumRealisasi,
            persentasePenyerapan: sumPagu > 0 ? Number(((sumRealisasi / sumPagu) * 100).toFixed(2)) : 0,
            persentasePenyerapanTarget: sumTarget > 0 ? Number(((sumRealisasi / sumTarget) * 100).toFixed(2)) : 0,
          };
        }
      }
      return dashboardStats;
    }

    // Otherwise, filter examinations by selected satwas
    const filteredPems = pemeriksaan ? pemeriksaan.filter(p => p.satwas === selectedDashboardSatwas) : [];
    
    // Recalculate statistics for the selected satwas
    const totalPemeriksaan = filteredPems.length;
    let totalTaat = 0;
    let totalTidakTaat = 0;
    let totalNilai = 0;
    let nilaiTertinggi = 0;
    let nilaiTerendah = filteredPems.length > 0 ? 100 : 0;

    filteredPems.forEach((r) => {
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
    filteredPems.forEach((r) => {
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

    // Satwas representation for the chosen Satwas only
    const chartNilaiSatwas = [{
      satwas: selectedDashboardSatwas,
      rataRata: rataRataNilai,
      jumlah: totalPemeriksaan
    }];

    const chartTrendTahunan = [
      { tahun: "2024", rataRata: 75.2 },
      { tahun: "2025", rataRata: 78.5 },
      { tahun: "2026", rataRata: rataRataNilai || 82.8 },
    ];

    // Recalculate Budget specifically for this Satwas based on custom settings or proportion
    const hasSpecificConfig = config?.TARGET_SATWAS && config.TARGET_SATWAS[selectedDashboardSatwas] !== undefined;

    let paguVal = 0;
    let targetVal = 0;
    let realisasiVal = 0;
    let targetQ1 = 0, targetQ2 = 0, targetQ3 = 0, targetQ4 = 0;
    let realisasiQ1 = 0, realisasiQ2 = 0, realisasiQ3 = 0, realisasiQ4 = 0;

    if (hasSpecificConfig) {
      const satwasConfig = config.TARGET_SATWAS[selectedDashboardSatwas];
      paguVal = Number(satwasConfig.pagu) || 0;
      targetVal = Number(satwasConfig.target) || 0;
      realisasiVal = Number(satwasConfig.realisasi) || 0;

      // Split quarterly values proportionally using the overall quarterly settings
      const totalOverallTarget = config.TARGET_REALISASI || 1000000000;
      const totalOverallReal = config.REALISASI_ANGGARAN || 825000000;

      const q1TargetProp = (config.TARGET_Q1 ?? 250000000) / totalOverallTarget;
      const q2TargetProp = (config.TARGET_Q2 ?? 250000000) / totalOverallTarget;
      const q3TargetProp = (config.TARGET_Q3 ?? 250000000) / totalOverallTarget;
      const q4TargetProp = (config.TARGET_Q4 ?? 250000000) / totalOverallTarget;

      const q1RealProp = (config.REALISASI_Q1 ?? 220000000) / totalOverallReal;
      const q2RealProp = (config.REALISASI_Q2 ?? 230000000) / totalOverallReal;
      const q3RealProp = (config.REALISASI_Q3 ?? 200000000) / totalOverallReal;
      const q4RealProp = (config.REALISASI_Q4 ?? 175000000) / totalOverallReal;

      targetQ1 = Math.round(targetVal * q1TargetProp);
      targetQ2 = Math.round(targetVal * q2TargetProp);
      targetQ3 = Math.round(targetVal * q3TargetProp);
      targetQ4 = Math.round(targetVal * q4TargetProp);

      realisasiQ1 = Math.round(realisasiVal * q1RealProp);
      realisasiQ2 = Math.round(realisasiVal * q2RealProp);
      realisasiQ3 = Math.round(realisasiVal * q3RealProp);
      realisasiQ4 = Math.round(realisasiVal * q4RealProp);
    } else {
      const budgetShareMap: Record<string, number> = {
        "Stasiun PSDKP Biak": 0.40,
        "Satwas SDKP Manokwari": 0.20,
        "Satwas SDKP Jayapura": 0.25,
        "Satwas SDK Nabire": 0.15,
      };

      const share = budgetShareMap[selectedDashboardSatwas] !== undefined 
        ? budgetShareMap[selectedDashboardSatwas] 
        : 0.20;

      paguVal = Math.round((dashboardStats.paguAnggaran || 1250000000) * share);
      targetVal = Math.round((dashboardStats.targetRealisasi || 1000000000) * share);
      realisasiVal = Math.round((dashboardStats.realisasiAnggaran || 825000000) * share);

      targetQ1 = Math.round((dashboardStats.targetQ1 ?? 250000000) * share);
      targetQ2 = Math.round((dashboardStats.targetQ2 ?? 250000000) * share);
      targetQ3 = Math.round((dashboardStats.targetQ3 ?? 250000000) * share);
      targetQ4 = Math.round((dashboardStats.targetQ4 ?? 250000000) * share);

      realisasiQ1 = Math.round((dashboardStats.realisasiQ1 ?? 220000000) * share);
      realisasiQ2 = Math.round((dashboardStats.realisasiQ2 ?? 230000000) * share);
      realisasiQ3 = Math.round((dashboardStats.realisasiQ3 ?? 200000000) * share);
      realisasiQ4 = Math.round((dashboardStats.realisasiQ4 ?? 175000000) * share);
    }

    const sisaVal = paguVal - realisasiVal;
    const persentaseVal = paguVal > 0 ? Number(((realisasiVal / paguVal) * 100).toFixed(2)) : 0;
    const persentaseTargetVal = targetVal > 0 ? Number(((realisasiVal / targetVal) * 100).toFixed(2)) : 0;

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
      targetRealisasi: targetVal,
      realisasiAnggaran: realisasiVal,
      sisaAnggaran: sisaVal,
      persentasePenyerapan: persentaseVal,
      persentasePenyerapanTarget: persentaseTargetVal,
      targetQ1,
      targetQ2,
      targetQ3,
      targetQ4,
      realisasiQ1,
      realisasiQ2,
      realisasiQ3,
      realisasiQ4
    };
  }, [selectedDashboardSatwas, dashboardStats, pemeriksaan, config]);

  // Form toggles & edit parameters
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueLength, setQueueLength] = useState(0);

  const [showPemeriksaanForm, setShowPemeriksaanForm] = useState(false);
  const [editingPemeriksaan, setEditingPemeriksaan] = useState<Pemeriksaan | null>(null);

  const [showTemuanForm, setShowTemuanForm] = useState(false);
  const [editingTemuan, setEditingTemuan] = useState<Temuan | null>(null);
  const [preSelectedPemeriksaanId, setPreSelectedPemeriksaanId] = useState<string | undefined>(undefined);

  // Load session or credentials if saved, and subscribe to Google Auth
  useEffect(() => {
    const savedUser = localStorage.getItem("sdkp_user_session");
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem("sdkp_user_session");
      }
    }
    fetchConfig();

    // Subscribe to Google Auths
    const unsubscribe = initAuth((firebaseUser, token) => {
      setGoogleAccessToken(token);
      const googleSessionUser: User = {
        id: firebaseUser.uid,
        nama: firebaseUser.displayName || firebaseUser.email || "Google User",
        username: firebaseUser.email || "google_user",
        role: "Administrator" as UserRole, // Grant administrator rights on Google Sign-In
        status: "Aktif" as "Aktif"
      };
      setCurrentUser(googleSessionUser);
      localStorage.setItem("sdkp_user_session", JSON.stringify(googleSessionUser));
    });

    return () => unsubscribe();
  }, []);

  // Fetch critical app content once authenticated with automatic 5-minute polling
  useEffect(() => {
    if (currentUser) {
      syncAllData();

      // Poll every 5 minutes to keep budget and examination data up to date
      const pollingInterval = setInterval(() => {
        syncAllData(false, true);
      }, 5 * 60 * 1000);

      return () => {
        clearInterval(pollingInterval);
      };
    }
  }, [currentUser]);

  // Listen to network status for automated syncing and UI updates
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      success("Koneksi internet pulih! Menyinkronkan perubahan offline...");
      try {
        const result = await api.syncOfflineQueue();
        if (result.successCount > 0) {
          success(`Berhasil menyinkronkan ${result.successCount} data ke server!`);
        }
        if (result.failedCount > 0) {
          error(`Gagal menyinkronkan ${result.failedCount} data offline.`);
        }
      } catch (err) {
        console.error("Auto sync failed:", err);
      }
      syncAllData(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
      warning("Koneksi internet terputus! Bekerja dalam Mode Offline.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const updateQueueSize = () => {
      try {
        setQueueLength(api.getOfflineQueue().length);
      } catch (e) {
        setQueueLength(0);
      }
    };
    updateQueueSize();
    window.addEventListener("offline_queue_changed", updateQueueSize);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("offline_queue_changed", updateQueueSize);
    };
  }, []);

  const fetchConfig = async () => {
    try {
      const cfg = await api.getConfig();
      setConfig(cfg);
    } catch (e) {
      console.error("Config fetch failed:", e);
    }
  };

  const triggerLoginUrgentAlerts = (pem: Pemeriksaan[], docs: Dokumen[], tem: Temuan[]) => {
    const unverifiedPemsCount = pem.filter(p => docs.some(d => d.pemeriksaan_id === p.id && d.status === "Belum Verifikasi")).length;
    
    let approachingTindakLanjutCount = 0;
    let overdueTindakLanjutCount = 0;

    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    pem.forEach(p => {
      const inspectDate = new Date(p.tanggal);
      inspectDate.setHours(0, 0, 0, 0);
      const diffTime = currentDate.getTime() - inspectDate.getTime();
      const daysElapsed = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      const findingsForRecord = tem.filter((t) => t.pemeriksaan_id === p.id);
      const hasActiveFindings = findingsForRecord.some((t) => t.status_tindak_lanjut !== "Selesai");
      
      if (hasActiveFindings) {
        const daysRemaining = 30 - daysElapsed;
        if (daysRemaining < 0) {
          overdueTindakLanjutCount++;
        } else if (daysRemaining <= 7) {
          approachingTindakLanjutCount++;
        }
      }
    });

    if (unverifiedPemsCount > 0) {
      warning(`Notifikasi: Terdapat ${unverifiedPemsCount} data pemeriksaan dengan berkas checklist yang belum diverifikasi!`, 8000);
    }

    if (approachingTindakLanjutCount > 0) {
      warning(`Peringatan: Terdapat ${approachingTindakLanjutCount} data pemeriksaan mendekati batas waktu tindak lanjut (sisa ≤ 7 hari)!`, 8000);
    }

    if (overdueTindakLanjutCount > 0) {
      error(`Perhatian: Terdapat ${overdueTindakLanjutCount} data pemeriksaan dengan tindak lanjut temuan yang MELEBIHI batas waktu (30 hari)!`, 8000);
    }
  };

  const syncAllData = async (showNotification = false, isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      // Sync offline queue first if online
      if (navigator.onLine) {
        try {
          const queueResult = await api.syncOfflineQueue();
          if (showNotification && queueResult.successCount > 0) {
            success(`Telah menyinkronkan ${queueResult.successCount} data offline sebelum memuat ulang database.`);
          }
        } catch (queueErr) {
          console.error("Failed to sync offline queue during syncAllData:", queueErr);
        }
      }

      // Run API parallel loads
      const [pem, docs, tem, sat, usrs, stats, nts, cfg] = await Promise.all([
        api.getPemeriksaan(),
        api.getDokumen(),
        api.getTemuan(),
        api.getSatwas(),
        api.getUsers(),
        api.getDashboardStats(),
        api.getNotes(),
        api.getConfig(),
      ]);

      setPemeriksaan(pem || []);
      setDocuments(docs || []);
      setTemuan(tem || []);
      setSatwasList(sat || []);
      setUsersList(usrs || []);
      setDashboardStats(stats || null);
      setDashboardNotes(nts || []);
      if (cfg) setConfig(cfg);
      
      const now = new Date();
      setLastSyncedTime(now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));

      if (showNotification) {
        success("Sinkronisasi database berhasil! Menampilkan data terbaru.");
      }

      // Check for unverified docs or approaching tindak lanjut deadline
      if (!isBackground && !hasShownLoginAlerts) {
        triggerLoginUrgentAlerts(pem || [], docs || [], tem || []);
        setHasShownLoginAlerts(true);
      }
    } catch (e: any) {
      console.error("Synchronizing failed:", e.message);
      if (!isBackground) {
        error(`Sinkronisasi database gagal: ${e.message}`);
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  // Auth operations
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setAuthenticating(true);
    try {
      const authenticatedUser = await api.login(loginUsername, loginPassword);
      setCurrentUser(authenticatedUser);
      localStorage.setItem("sdkp_user_session", JSON.stringify(authenticatedUser));
      success(`Selamat datang kembali, ${authenticatedUser.nama}!`);
    } catch (err: any) {
      const errMsg = err.message || "Username atau password salah";
      setLoginError(errMsg);
      error(errMsg);
    } finally {
      setAuthenticating(false);
    }
  };

  const handleGoogleSignInClick = async () => {
    setLoginError("");
    setAuthenticating(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleAccessToken(result.accessToken);
        const googleSessionUser: User = {
          id: result.user.uid,
          nama: result.user.displayName || result.user.email || "Google Administrator",
          username: result.user.email || "google_admin",
          role: "Administrator",
          status: "Aktif"
        };
        setCurrentUser(googleSessionUser);
        localStorage.setItem("sdkp_user_session", JSON.stringify(googleSessionUser));
        success(`Login Google sukses! Selamat datang, ${googleSessionUser.nama}.`);
      }
    } catch (err: any) {
      const errMsg = err.message || "Gagal masuk dengan Google Account";
      setLoginError(errMsg);
      error(errMsg);
    } finally {
      setAuthenticating(false);
    }
  };

  const handleLogout = async () => {
    setCurrentUser(null);
    setGoogleAccessToken(null);
    setHasShownLoginAlerts(false);
    localStorage.removeItem("sdkp_user_session");
    setLoginUsername("");
    setLoginPassword("");
    // Log out of Google too
    try {
      await googleLogout();
    } catch (err) {
      console.error("Google Auth session sign out skip:", err);
    }
    // reset tab to dashboard
    setActiveTab("dashboard");
    success("Anda telah berhasil keluar dari sistem.");
  };

  // Preset login helper to assist user testing
  const handlePresetLogin = (roleUser: string, rolePass: string) => {
    setLoginUsername(roleUser);
    setLoginPassword(rolePass);
  };

  // Config Update
  const handleUpdateConfig = async (newConfig: { 
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
  }) => {
    try {
      await api.updateConfig(newConfig);
      setConfig(newConfig);
      if (currentUser) {
        try {
          await api.createLog({
            userId: currentUser.id,
            username: currentUser.nama || currentUser.username,
            userRole: currentUser.role,
            action: "CONFIG",
            menu: "Konfigurasi",
            description: `Mengubah konfigurasi persistensi data ke mode: ${newConfig.DATA_PERSISTENCE_MODE}`,
          });
        } catch (err) {
          console.warn("Gagal mencatat log konfigurasi:", err);
        }
      }
      success("Konfigurasi penyimpanan & target anggaran berhasil diperbarui!");
    } catch (err: any) {
      error(`Gagal menyimpan konfigurasi: ${err.message}`);
    }
    await syncAllData();
  };

  const handleDownloadCSV = () => {
    if (!filteredDashboardStats) {
      error("Tidak ada data statistik untuk diunduh!");
      return;
    }

    const stats = filteredDashboardStats;
    const shareName = selectedDashboardSatwas === "ALL" ? "Semua Wilayah" : selectedDashboardSatwas;
    
    // Hitung persentase triwulan
    const pctQ1 = stats.targetQ1 > 0 ? ((stats.realisasiQ1 / stats.targetQ1) * 100).toFixed(2) : "0.00";
    const pctQ2 = stats.targetQ2 > 0 ? ((stats.realisasiQ2 / stats.targetQ2) * 100).toFixed(2) : "0.00";
    const pctQ3 = stats.targetQ3 > 0 ? ((stats.realisasiQ3 / stats.targetQ3) * 100).toFixed(2) : "0.00";
    const pctQ4 = stats.targetQ4 > 0 ? ((stats.realisasiQ4 / stats.targetQ4) * 100).toFixed(2) : "0.00";

    const sisaQ1 = stats.targetQ1 - stats.realisasiQ1;
    const sisaQ2 = stats.targetQ2 - stats.realisasiQ2;
    const sisaQ3 = stats.targetQ3 - stats.realisasiQ3;
    const sisaQ4 = stats.targetQ4 - stats.realisasiQ4;

    const csvRows = [
      ["Laporan Ringkasan Anggaran SDKP 2026"],
      [`Wilayah Kerja: ${shareName}`],
      [`Tanggal Ekspor: ${new Date().toLocaleDateString("id-ID")} ${new Date().toLocaleTimeString("id-ID")}`],
      [],
      ["Kategori / Triwulan", "Target / Pagu Anggaran (IDR)", "Realisasi Penyerapan (IDR)", "Persentase Penyerapan (%)", "Sisa Anggaran (IDR)"],
      ["Pagu Anggaran Total", stats.paguAnggaran, stats.realisasiAnggaran, stats.persentasePenyerapan, stats.sisaAnggaran],
      ["Target Realisasi Total", stats.targetRealisasi, stats.realisasiAnggaran, stats.persentasePenyerapanTarget, stats.targetRealisasi - stats.realisasiAnggaran],
      ["Triwulan I (Q1)", stats.targetQ1, stats.realisasiQ1, pctQ1, sisaQ1],
      ["Triwulan II (Q2)", stats.targetQ2, stats.realisasiQ2, pctQ2, sisaQ2],
      ["Triwulan III (Q3)", stats.targetQ3, stats.realisasiQ3, pctQ3, sisaQ3],
      ["Triwulan IV (Q4)", stats.targetQ4, stats.realisasiQ4, pctQ4, sisaQ4],
    ];

    const csvContent = csvRows
      .map(row => row.map(value => {
        const strVal = value !== undefined && value !== null ? String(value) : "";
        if (strVal.includes(",") || strVal.includes("\n") || strVal.includes('"')) {
          return `"${strVal.replace(/"/g, '""')}"`;
        }
        return strVal;
      }).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Ringkasan_Anggaran_${shareName.replace(/\s+/g, "_")}_2026.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (currentUser) {
      try {
        api.createLog({
          userId: currentUser.id,
          username: currentUser.nama || currentUser.username,
          userRole: currentUser.role,
          action: "CONFIG",
          menu: "Konfigurasi",
          description: `Mengunduh ringkasan data anggaran format CSV untuk wilayah: ${shareName}`,
        });
      } catch (err) {
        console.warn("Gagal mencatat log ekspor CSV:", err);
      }
    }
    success("Ringkasan data anggaran berhasil diunduh dalam format CSV!");
  };

  // DASHBOARD STICKY NOTES ACTIONS
  const handleSaveDashboardNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim()) {
      warning("Isi catatan harian tidak boleh kosong!");
      return;
    }

    try {
      setLoading(true);
      const notePayload = {
        title: newNoteTitle.trim() || "Instruksi Harian",
        content: newNoteContent.trim(),
        color: newNoteColor,
        pinned: newNotePinned,
        author: currentUser ? `${currentUser.nama} (${currentUser.role})` : "Pimpinan Timja",
      };

      if (editingNoteId) {
        await api.updateNote(editingNoteId, notePayload);
        success("Instruksi harian berhasil diperbarui!");
      } else {
        await api.createNote(notePayload);
        success("Instruksi harian baru berhasil ditambahkan!");
      }

      // Reset states
      setNewNoteTitle("");
      setNewNoteContent("");
      setNewNoteColor("bg-amber-50 border-amber-200 text-amber-900");
      setNewNotePinned(false);
      setEditingNoteId(null);
      setShowNoteForm(false);

      // Refresh data
      const nts = await api.getNotes();
      setDashboardNotes(nts || []);

      if (currentUser) {
        try {
          await api.createLog({
            userId: currentUser.id,
            username: currentUser.nama || currentUser.username,
            userRole: currentUser.role,
            action: editingNoteId ? "UPDATE" : "CREATE",
            menu: "Sistem",
            description: `${editingNoteId ? 'Mengubah' : 'Membuat'} catatan instruksi harian: "${notePayload.title}"`,
          });
        } catch (logErr) {
          console.warn("Gagal mencatat log instruksi harian:", logErr);
        }
      }
    } catch (err: any) {
      error(`Gagal menyimpan instruksi harian: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditDashboardNoteClick = (note: any) => {
    setEditingNoteId(note.id);
    setNewNoteTitle(note.title || "");
    setNewNoteContent(note.content || "");
    setNewNoteColor(note.color || "bg-amber-50 border-amber-200 text-amber-900");
    setNewNotePinned(!!note.pinned);
    setShowNoteForm(true);
  };

  const handleDeleteDashboardNote = async (id: string) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus instruksi harian ini?")) return;
    try {
      setLoading(true);
      await api.deleteNote(id);
      success("Instruksi harian berhasil dihapus!");
      
      const nts = await api.getNotes();
      setDashboardNotes(nts || []);

      if (currentUser) {
        try {
          await api.createLog({
            userId: currentUser.id,
            username: currentUser.nama || currentUser.username,
            userRole: currentUser.role,
            action: "DELETE",
            menu: "Sistem",
            description: `Menghapus catatan instruksi harian.`,
          });
        } catch (logErr) {
          console.warn("Gagal mencatat log hapus instruksi harian:", logErr);
        }
      }
    } catch (err: any) {
      error(`Gagal menghapus instruksi harian: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePinDashboardNote = async (note: any) => {
    try {
      setLoading(true);
      await api.updateNote(note.id, { pinned: !note.pinned });
      success(note.pinned ? "Catatan batal disematkan!" : "Catatan berhasil disematkan!");
      
      const nts = await api.getNotes();
      setDashboardNotes(nts || []);
    } catch (err: any) {
      error(`Gagal merubah status sematan: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // USER MANAGEMENT ACTIONS
  const handleCreateUser = async (userForm: Partial<User>) => {
    try {
      await api.createUser(userForm);
      if (currentUser) {
        try {
          await api.createLog({
            userId: currentUser.id,
            username: currentUser.nama || currentUser.username,
            userRole: currentUser.role,
            action: "CREATE",
            menu: "Users",
            description: `Mendaftarkan pengguna baru: ${userForm.nama} (${userForm.role})`,
          });
        } catch (err) {
          console.warn("Gagal mencatat log user:", err);
        }
      }
      success(`Pengguna baru ${userForm.nama} berhasil didaftarkan!`);
    } catch (err: any) {
      error(`Gagal mendaftarkan pengguna: ${err.message}`);
    }
    await syncAllData();
  };
  const handleUpdateUser = async (id: string, userForm: Partial<User>) => {
    try {
      await api.updateUser(id, userForm);
      if (currentUser) {
        try {
          await api.createLog({
            userId: currentUser.id,
            username: currentUser.nama || currentUser.username,
            userRole: currentUser.role,
            action: "UPDATE",
            menu: "Users",
            description: `Memperbarui data pengguna: ${userForm.nama} (ID: ${id})`,
          });
        } catch (err) {
          console.warn("Gagal mencatat log user:", err);
        }
      }
      success(`Data pengguna ${userForm.nama || "terkait"} berhasil diperbarui!`);
    } catch (err: any) {
      error(`Gagal memperbarui pengguna: ${err.message}`);
    }
    await syncAllData();
  };
  const handleDeleteUser = async (id: string) => {
    try {
      await api.deleteUser(id);
      if (currentUser) {
        try {
          await api.createLog({
            userId: currentUser.id,
            username: currentUser.nama || currentUser.username,
            userRole: currentUser.role,
            action: "DELETE",
            menu: "Users",
            description: `Menghapus pengguna dengan ID: ${id}`,
          });
        } catch (err) {
          console.warn("Gagal mencatat log user:", err);
        }
      }
      success("Pengguna berhasil dihapus dari sistem.");
    } catch (err: any) {
      error(`Gagal menghapus pengguna: ${err.message}`);
    }
    await syncAllData();
  };

  // PEMERIKSAAN ACTIONS
  const handlePemeriksaanSubmit = async (formData: Partial<Pemeriksaan>) => {
    try {
      if (editingPemeriksaan) {
        await api.updatePemeriksaan(editingPemeriksaan.id, formData);
        if (currentUser) {
          try {
            await api.createLog({
              userId: currentUser.id,
              username: currentUser.nama || currentUser.username,
              userRole: currentUser.role,
              action: "UPDATE",
              menu: "Pemeriksaan",
              description: `Mengubah data pemeriksaan pelaku usaha ${formData.pelaku_usaha || editingPemeriksaan.pelaku_usaha} (${formData.perusahaan || editingPemeriksaan.perusahaan})`,
            });
          } catch (err) {
            console.warn("Gagal mencatat log pemeriksaan:", err);
          }
        }
        success("Data pemeriksaan pelaku usaha berhasil diperbarui!");
      } else {
        await api.createPemeriksaan(formData);
        if (currentUser) {
          try {
            await api.createLog({
              userId: currentUser.id,
              username: currentUser.nama || currentUser.username,
              userRole: currentUser.role,
              action: "CREATE",
              menu: "Pemeriksaan",
              description: `Menambahkan pemeriksaan baru untuk pelaku usaha ${formData.pelaku_usaha} (${formData.perusahaan}) dengan total nilai ${formData.nilai_total || 0}`,
            });
          } catch (err) {
            console.warn("Gagal mencatat log pemeriksaan:", err);
          }
        }
        success("Pemeriksaan baru berhasil ditambahkan!");
      }
      setShowPemeriksaanForm(false);
      setEditingPemeriksaan(null);
    } catch (err: any) {
      error(`Gagal menyimpan pemeriksaan: ${err.message}`);
    }
    await syncAllData();
  };

  const handlePemeriksaanDelete = async (id: string, targetName: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus data pemeriksaan pelaku usaha ${targetName}? Tindakan ini juga akan menghapus dokumen dan temuan terhubung.`)) {
      try {
        await api.deletePemeriksaan(id);
        if (currentUser) {
          try {
            await api.createLog({
              userId: currentUser.id,
              username: currentUser.nama || currentUser.username,
              userRole: currentUser.role,
              action: "DELETE",
              menu: "Pemeriksaan",
              description: `Menghapus data pemeriksaan pelaku usaha ${targetName}`,
            });
          } catch (err) {
            console.warn("Gagal mencatat log pemeriksaan:", err);
          }
        }
        success(`Data pemeriksaan untuk ${targetName} berhasil dihapus.`);
      } catch (err: any) {
        error(`Gagal menghapus data pemeriksaan: ${err.message}`);
      }
      await syncAllData();
    }
  };

  // TEMUAN ACTIONS
  const handleTemuanSubmit = async (formData: Partial<Temuan>) => {
    try {
      if (editingTemuan) {
        await api.updateTemuan(editingTemuan.id, formData);
        if (currentUser) {
          try {
            await api.createLog({
              userId: currentUser.id,
              username: currentUser.nama || currentUser.username,
              userRole: currentUser.role,
              action: "UPDATE",
              menu: "Temuan",
              description: `Memperbarui tindak lanjut temuan perusahaan ${formData.pemeriksaan_perusahaan || editingTemuan.pemeriksaan_perusahaan} menjadi status: ${formData.status_tindak_lanjut}`,
            });
          } catch (err) {
            console.warn("Gagal mencatat log temuan:", err);
          }
        }
        success("Uraian temuan berhasil diperbarui!");
      } else {
        await api.createTemuan(formData);
        if (currentUser) {
          try {
            await api.createLog({
              userId: currentUser.id,
              username: currentUser.nama || currentUser.username,
              userRole: currentUser.role,
              action: "CREATE",
              menu: "Temuan",
              description: `Menambahkan uraian temuan baru untuk pemeriksaan ID: ${formData.pemeriksaan_id} dengan status: ${formData.status_tindak_lanjut || "Open"}`,
            });
          } catch (err) {
            console.warn("Gagal mencatat log temuan:", err);
          }
        }
        success("Uraian temuan baru berhasil disimpan!");
      }
      setShowTemuanForm(false);
      setEditingTemuan(null);
      setPreSelectedPemeriksaanId(undefined);
    } catch (err: any) {
      error(`Gagal menyimpan temuan: ${err.message}`);
    }
    await syncAllData();
  };

  const handleTemuanDelete = async (id: string, description: string) => {
    if (confirm(`Hapus sisa temuan: "${description}"?`)) {
      try {
        await api.deleteTemuan(id);
        if (currentUser) {
          try {
            await api.createLog({
              userId: currentUser.id,
              username: currentUser.nama || currentUser.username,
              userRole: currentUser.role,
              action: "DELETE",
              menu: "Temuan",
              description: `Menghapus uraian temuan: "${description.substring(0, 60)}..."`,
            });
          } catch (err) {
            console.warn("Gagal mencatat log temuan:", err);
          }
        }
        success("Uraian temuan berhasil dihapus.");
      } catch (err: any) {
        error(`Gagal menghapus temuan: ${err.message}`);
      }
      await syncAllData();
    }
  };

  // DOKUMEN ACTIONS
  const handleCreateDoc = async (docForm: Partial<Dokumen>) => {
    try {
      await api.createDokumen(docForm);
      if (currentUser) {
        try {
          await api.createLog({
            userId: currentUser.id,
            username: currentUser.nama || currentUser.username,
            userRole: currentUser.role,
            action: "CREATE",
            menu: "Dokumen",
            description: `Mengunggah tautan dokumen checklist ${docForm.jenis_dokumen} untuk pemeriksaan ID: ${docForm.pemeriksaan_id}`,
          });
        } catch (err) {
          console.warn("Gagal mencatat log dokumen:", err);
        }
      }
      success("Berkas dokumen checklist berhasil ditambahkan!");
    } catch (err: any) {
      error(`Gagal menyimpan berkas dokumen: ${err.message}`);
    }
    await syncAllData();
  };

  const handleVerifyDoc = async (id: string, newStatus: "Verifikasi" | "Ditolak") => {
    try {
      await api.updateDokumen(id, { status: newStatus });
      if (currentUser) {
        try {
          const doc = documents.find((d) => d.id === id);
          const docName = doc ? `${doc.jenis_dokumen} (${doc.pemeriksaan_perusahaan})` : `ID: ${id}`;
          await api.createLog({
            userId: currentUser.id,
            username: currentUser.nama || currentUser.username,
            userRole: currentUser.role,
            action: "VERIFY",
            menu: "Dokumen",
            description: `Mengubah verifikasi dokumen ${docName} menjadi status: ${newStatus}`,
          });
        } catch (err) {
          console.warn("Gagal mencatat log dokumen:", err);
        }
      }
      success(`Status verifikasi berkas berhasil diubah menjadi: ${newStatus === "Verifikasi" ? "Terverifikasi" : "Ditolak"}`);
    } catch (err: any) {
      error(`Gagal merubah verifikasi berkas: ${err.message}`);
    }
    await syncAllData();
  };

  const handleDeleteDoc = async (id: string) => {
    try {
      const doc = documents.find((d) => d.id === id);
      const docDescription = doc ? `${doc.jenis_dokumen} (${doc.pemeriksaan_perusahaan})` : `ID: ${id}`;
      await api.deleteDokumen(id);
      if (currentUser) {
        try {
          await api.createLog({
            userId: currentUser.id,
            username: currentUser.nama || currentUser.username,
            userRole: currentUser.role,
            action: "DELETE",
            menu: "Dokumen",
            description: `Menghapus dokumen checklist ${docDescription}`,
          });
        } catch (err) {
          console.warn("Gagal mencatat log dokumen:", err);
        }
      }
      success("Berkas dokumen checklist berhasil dihapus dari sistem.");
    } catch (err: any) {
      error(`Gagal menghapus berkas dokumen: ${err.message}`);
    }
    await syncAllData();
  };


  // LOGIN SCREEN
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans select-none">
        
        {/* Sky glow graphics elements */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl -translate-x-12 -translate-y-12" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl translate-x-12 translate-y-12" />

        <div className="max-w-md w-full space-y-6 relative z-10">
          
          {/* Main Logo & Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex gap-3 p-3 bg-sky-950/60 border border-sky-800/40 rounded-2xl shadow-xl justify-center items-center">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/f/f0/Lambang_Kementerian_Kelautan_dan_Perikanan.png" 
                alt="Logo KKP" 
                className="w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 object-contain shrink-0"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div className="w-px h-8 sm:h-10 bg-sky-800/40 shrink-0" />
              <img 
                src={kepolisianKhususLogo} 
                alt="Logo Kepolisian Khusus" 
                className="w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 object-contain shrink-0 filter drop-shadow-[0_2px_8px_rgba(250,204,21,0.15)] animate-pulse"
                referrerPolicy="no-referrer"
              />
            </div>
            <h2 className="font-sans font-black text-2xl tracking-tight uppercase bg-gradient-to-r from-blue-400 via-sky-300 to-yellow-300 text-transparent bg-clip-text select-all">
              MEKANIK TIMJA SDK
            </h2>
            <p className="text-[11px] font-sans font-bold leading-relaxed tracking-wide text-slate-300 mx-auto max-w-sm">
              Monitoring Evaluasi, Kegiatan & Anggaran serta Kinerja Tim Kerja Sumber Daya Kelautan
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-slate-950/90 border border-slate-800/60 p-6 rounded-3xl shadow-2xl relative">
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Username Pengguna</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="Masukkan username"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Kata Sandi</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 text-xs font-mono font-bold"
                  />
                </div>
              </div>

              {loginError && (
                <div className="text-[11px] font-semibold text-rose-400 bg-rose-500/5 border border-rose-500/10 p-2.5 rounded-lg text-center leading-relaxed">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                disabled={authenticating}
                className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-600/10 active:scale-95 transition-all disabled:bg-slate-800 disabled:text-slate-550"
              >
                <LogIn className="w-4 h-4" />
                {authenticating ? "Mengecek Sesi..." : "Masuk Sistem"}
              </button>
            </form>

            {/* Alternatif Sign In with Google */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800"></div>
              </div>
              <div className="relative flex justify-center text-[10px]">
                <span className="px-2 bg-slate-950 text-slate-500 font-bold uppercase tracking-wider text-[8px]">Atau</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignInClick}
              disabled={authenticating}
              className="w-full py-2.5 bg-sky-850 hover:bg-sky-800 text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95 transition-all disabled:opacity-50"
            >
              <Chrome className="w-4 h-4 text-emerald-400" />
              Masuk dengan Google Account
            </button>

            {/* Quick Testing Accounts Section */}
            <div className="border-t border-slate-850 mt-6 pt-4">
              <span className="block text-[9px] font-black uppercase tracking-wider text-slate-450 text-center mb-3">
                Uji Coba Akun Sesuai Peranan (Presets Click)
              </span>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => handlePresetLogin("admin", "admin123")}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-left transition-colors whitespace-nowrap overflow-hidden text-ellipsis cursor-pointer"
                >
                  <span className="text-rose-400">Admin:</span> admin
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetLogin("kepala", "kepala123")}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-left transition-colors whitespace-nowrap overflow-hidden text-ellipsis cursor-pointer"
                >
                  <span className="text-purple-400">Kepala:</span> kepala
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetLogin("verifikator", "veri123")}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-left transition-colors whitespace-nowrap overflow-hidden text-ellipsis cursor-pointer"
                >
                  <span className="text-yellow-400">Verifikator:</span> verifikator
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetLogin("manokwari", "satwas123")}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-left transition-colors whitespace-nowrap overflow-hidden text-ellipsis cursor-pointer"
                >
                  <span className="text-sky-400">Satwas:</span> manokwari
                </button>
              </div>
            </div>
          </div>

          <p className="text-center text-[10px] text-slate-500 font-medium">
            Hak Cipta Terlindungi &copy; {new Date().getFullYear()} Balai/Stasiun SDKP Biak Papua.
          </p>
        </div>
      </div>
    );
  }

  // CORE BACKOFFICE LAYOUT
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 relative font-sans">
      
      {/* 2. Left Navigation Menu */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} user={currentUser} onLogout={handleLogout} />

      {/* Right Core Content Frame */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* 3. Top Header Panel */}
        <Navbar 
          activeTab={activeTab} 
          config={config} 
          onSettingClick={() => setActiveTab("config")} 
          onSyncClick={() => syncAllData(true)} 
          isSyncing={loading} 
          lastSyncedTime={lastSyncedTime}
        />

        {/* Loading overlay panel */}
        {loading && (
          <div className="absolute top-1 border-b right-6 z-50 bg-sky-900 text-white text-[10px] font-bold px-3 py-1 rounded shadow-lg flex items-center gap-1.5 animate-bounce">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Sinkronisasi Database...
          </div>
        )}

        {/* Main core screen renderer inside container limits */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
          
          {/* TAB 1: DASHBOARD MAIN PAGE */}
          {activeTab === "dashboard" && filteredDashboardStats && (
            <div className="space-y-6">
              
              {/* Connection Status Alerts for Dashboard */}
              {!isOnline ? (
                <div 
                  className="bg-rose-50 border border-rose-200 text-rose-900 rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-pulse"
                  id="dashboard-offline-banner"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-rose-100 text-rose-700 rounded-2xl">
                      <WifiOff className="w-5 h-5 text-rose-600" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs text-rose-950">Aplikasi Berjalan dalam Mode Offline</h4>
                      <p className="text-[11px] text-rose-700/90 font-medium">
                        Koneksi internet Anda terputus. Anda masih dapat melihat, menambah, atau merubah data secara offline. Semua perubahan disimpan sementara di database lokal perangkat Anda (localStorage) dan akan disinkronkan secara otomatis saat terhubung kembali.
                      </p>
                    </div>
                  </div>
                  {queueLength > 0 && (
                    <span className="shrink-0 bg-rose-200/60 border border-rose-300 text-rose-950 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider">
                      {queueLength} Antrean Tertunda
                    </span>
                  )}
                </div>
              ) : queueLength > 0 ? (
                <div 
                  className="bg-amber-50 border border-amber-200 text-amber-900 rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm"
                  id="dashboard-pending-sync-banner"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-amber-100 text-amber-700 rounded-2xl">
                      <Cloud className="w-5 h-5 text-amber-600 animate-bounce" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs text-amber-950">Sinkronisasi Data Offline Tertunda ({queueLength} Data)</h4>
                      <p className="text-[11px] text-amber-750 font-medium">
                        Koneksi internet Anda aktif kembali, namun terdapat beberapa perubahan lokal yang belum terunggah ke database utama atau Google Spreadsheet.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => syncAllData(true)}
                    className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-650 active:bg-amber-700 text-white font-extrabold text-xs rounded-2xl shadow-sm transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-100" />
                    Sync Sekarang
                  </button>
                </div>
              ) : null}

              {/* Filter Satwas Wilayah */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-200 p-5 rounded-3xl shadow-xs">
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-slate-850 flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-sky-500 rounded-xs inline-block" />
                    Penyaringan Wilayah Kerja (Satwas)
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold font-sans">
                    Lihat statistik performa ketaatan dan alokasi anggaran spesifik per wilayah kerja satwas
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                  <div className="w-full sm:w-64">
                    <select
                      id="dashboard-satwas-filter"
                      value={selectedDashboardSatwas}
                      onChange={(e) => setSelectedDashboardSatwas(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-extrabold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all cursor-pointer"
                    >
                      <option value="ALL">Semua Satwas Wilayah</option>
                      {satwasList.map((sat) => (
                        <option key={sat.id} value={sat.nama_satwas}>
                          {sat.nama_satwas}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={handleDownloadCSV}
                    className="w-full sm:w-auto px-4 py-2.5 bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white font-extrabold text-xs rounded-2xl transition-all duration-200 shadow-sm flex items-center justify-center gap-2 border border-sky-400/20 whitespace-nowrap cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-sky-100" />
                    Unduh Data
                  </button>
                </div>
              </div>

              {/* Stats Counters Grid */}
              <KPICards stats={filteredDashboardStats} />

              {/* SECTION: CATATAN SINGKAT / STICKY NOTES HARIAN PIMPINAN */}
              <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-slate-850 flex items-center gap-2">
                      <StickyNote className="w-4 h-4 text-amber-500" />
                      Catatan Singkat & Instruksi Harian Pimpinan Timja SDK
                    </h3>
                    <p className="text-[10px] text-slate-400 font-semibold font-sans">
                      Arahan kerja harian, prioritas operasional, dan pesan penting dari pimpinan untuk seluruh anggota tim
                    </p>
                  </div>

                  {(currentUser?.role === "Administrator" || currentUser?.role === "Kepala Stasiun") && (
                    <button
                      onClick={() => {
                        setEditingNoteId(null);
                        setNewNoteTitle("");
                        setNewNoteContent("");
                        setNewNoteColor("bg-amber-100 border-amber-300 text-amber-950");
                        setNewNotePinned(false);
                        setShowNoteForm(!showNoteForm);
                      }}
                      className="w-full sm:w-auto px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[11px] rounded-xl transition-all duration-200 shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {showNoteForm ? (
                        <>
                          <X className="w-3.5 h-3.5" />
                          Tutup Form
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          Tambah Instruksi
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* NOTE ENTRY/EDIT FORM */}
                {showNoteForm && (currentUser?.role === "Administrator" || currentUser?.role === "Kepala Stasiun") && (
                  <motion.form
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onSubmit={handleSaveDashboardNote}
                    className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 shadow-inner"
                  >
                    <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-500" />
                      {editingNoteId ? "Ubah Instruksi Harian" : "Buat Instruksi Harian Baru"}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Judul Instruksi</label>
                        <input
                          type="text"
                          placeholder="Contoh: Fokus Verifikasi SPT Triwulan III"
                          value={newNoteTitle}
                          onChange={(e) => setNewNoteTitle(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-extrabold text-slate-800"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Warna Kertas Catatan</label>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {[
                            { bg: "bg-amber-100 border-amber-300 text-amber-950", dot: "bg-amber-500", label: "Kuning" },
                            { bg: "bg-teal-100 border-teal-300 text-teal-950", dot: "bg-teal-500", label: "Tosca" },
                            { bg: "bg-rose-100 border-rose-300 text-rose-950", dot: "bg-rose-500", label: "Merah" },
                            { bg: "bg-sky-100 border-sky-300 text-sky-950", dot: "bg-sky-500", label: "Biru" },
                            { bg: "bg-emerald-100 border-emerald-300 text-emerald-950", dot: "bg-emerald-500", label: "Hijau" },
                            { bg: "bg-slate-100 border-slate-300 text-slate-950", dot: "bg-slate-500", label: "Abu-abu" }
                          ].map((col) => (
                            <button
                              type="button"
                              key={col.bg}
                              onClick={() => setNewNoteColor(col.bg)}
                              className={`px-2.5 py-1 rounded-lg text-[9px] font-extrabold flex items-center gap-1.5 border transition-all cursor-pointer ${
                                newNoteColor === col.bg 
                                  ? "ring-2 ring-slate-800 ring-offset-1 scale-105 border-transparent font-black" 
                                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${col.dot}`} />
                              {col.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Isi Arahan / Instruksi</label>
                      <textarea
                        id="newNoteContent"
                        rows={3}
                        placeholder="Masukkan instruksi detil harian di sini..."
                        value={newNoteContent}
                        onChange={(e) => setNewNoteContent(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-bold text-slate-800"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={newNotePinned}
                          onChange={(e) => setNewNotePinned(e.target.checked)}
                          className="w-3.5 h-3.5 text-sky-600 border-slate-300 rounded focus:ring-sky-500 cursor-pointer"
                        />
                        <span className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
                          <Pin className="w-3 h-3 text-slate-400 rotate-45" />
                          Sematkan Catatan (Pin di atas)
                        </span>
                      </label>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingNoteId(null);
                            setNewNoteTitle("");
                            setNewNoteContent("");
                            setNewNoteColor("bg-amber-100 border-amber-300 text-amber-950");
                            setNewNotePinned(false);
                            setShowNoteForm(false);
                          }}
                          className="px-3 py-1.5 text-[10px] font-bold text-slate-500 hover:text-slate-800 bg-transparent transition-all cursor-pointer"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-[10px] rounded-lg shadow-sm transition-all cursor-pointer"
                        >
                          {editingNoteId ? "Simpan Perubahan" : "Posting Instruksi"}
                        </button>
                      </div>
                    </div>
                  </motion.form>
                )}

                {/* LIST OF STICKY NOTES */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {dashboardNotes.length === 0 ? (
                    <div className="col-span-full py-8 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200 flex flex-col items-center justify-center gap-2">
                      <StickyNote className="w-8 h-8 text-slate-300 animate-pulse" />
                      <div className="text-xs font-bold text-slate-600">Belum ada Catatan / Instruksi Harian</div>
                      <div className="text-[10px] text-slate-400 max-w-sm px-4 leading-relaxed">
                        Arahan harian dari pimpinan Timja SDK belum dibuat.
                        {currentUser?.role === "Administrator" || currentUser?.role === "Kepala Stasiun" ? " Klik tombol 'Tambah Instruksi' untuk menulis pesan arahan pertama Anda." : " Hubungi Administrator atau Kepala Stasiun untuk meninggalkan instruksi."}
                      </div>
                    </div>
                  ) : (
                    // Sort pinned notes first, then by timestamp descending
                    [...dashboardNotes]
                      .sort((a, b) => {
                        if (a.pinned && !b.pinned) return -1;
                        if (!a.pinned && b.pinned) return 1;
                        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
                      })
                      .map((note) => {
                        const bgClass = note.color || "bg-amber-100 border-amber-300 text-amber-950";
                        return (
                          <div
                            key={note.id}
                            className={`p-5 rounded-2xl border flex flex-col justify-between gap-4 shadow-xs relative hover:shadow-md hover:scale-[1.01] transition-all duration-200 ${bgClass}`}
                          >
                            {/* Pin Stamp Badge */}
                            {note.pinned && (
                              <div className="absolute -top-2 -right-2 bg-rose-500 text-white p-1 rounded-full shadow-md z-10" title="Disematkan oleh pimpinan">
                                <Pin className="w-3.5 h-3.5 rotate-45" />
                              </div>
                            )}

                            <div className="space-y-2">
                              <div className="flex justify-between items-start gap-2">
                                <h4 className="text-xs font-black tracking-tight leading-tight uppercase">
                                  {note.title || "Instruksi Harian"}
                                </h4>
                                
                                {/* CRUD controls for SDK leaders */}
                                {(currentUser?.role === "Administrator" || currentUser?.role === "Kepala Stasiun") && (
                                  <div className="flex items-center gap-1.5 shrink-0 bg-white/40 p-1 rounded-lg">
                                    <button
                                      onClick={() => handleTogglePinDashboardNote(note)}
                                      className="p-1 text-slate-700 hover:text-slate-900 rounded-md hover:bg-white/60 transition-colors cursor-pointer"
                                      title={note.pinned ? "Batal Sematkan" : "Sematkan"}
                                    >
                                      <Pin className={`w-3 h-3 ${note.pinned ? "text-rose-600 fill-rose-600 animate-pulse" : "text-slate-500"}`} />
                                    </button>
                                    <button
                                      onClick={() => handleEditDashboardNoteClick(note)}
                                      className="p-1 text-slate-700 hover:text-slate-900 rounded-md hover:bg-white/60 transition-colors cursor-pointer"
                                      title="Ubah"
                                    >
                                      <Edit3 className="w-3 h-3 text-sky-700" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteDashboardNote(note.id)}
                                      className="p-1 text-slate-700 hover:text-rose-700 rounded-md hover:bg-white/60 transition-colors cursor-pointer"
                                      title="Hapus"
                                    >
                                      <Trash2 className="w-3 h-3 text-rose-700" />
                                    </button>
                                  </div>
                                )}
                              </div>

                              <p className="text-[11px] font-bold leading-relaxed whitespace-pre-wrap opacity-95">
                                {note.content}
                              </p>
                            </div>

                            <div className="border-t border-slate-950/10 pt-2 flex justify-between items-center text-[9px] font-bold opacity-80">
                              <div className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-950/40 inline-block animate-pulse" />
                                <span>{note.author || "Pimpinan SDK"}</span>
                              </div>
                              <span>
                                {new Date(note.timestamp).toLocaleDateString("id-ID", {
                                  day: "numeric",
                                  month: "short",
                                  year: "2026" === new Date(note.timestamp).getFullYear().toString() ? undefined : "numeric"
                                })} {new Date(note.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>



              {/* Grid of Custom SVG Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Chart 1: Pemeriksaan per Bulan (Bar Chart) */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-800">Distribusi Pemeriksaan per Bulan (Giat 2026)</h3>
                  <p className="text-[10px] text-slate-400 mb-4 font-semibold font-sans">Aktivitas kualitatif pengawasan bulanan</p>
                  <PemeriksaanBulananChart data={filteredDashboardStats.chartPemeriksaanBulanan} />
                </div>

                {/* Chart 2: Ketaatan Pelaku Usaha (Doughnut Pie) */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-800">Persentase Tingkat Ketaatan Pelaku Usaha</h3>
                  <p className="text-[10px] text-slate-400 mb-4 font-semibold font-sans">Perbandingan status Taat vs. Tidak Taat</p>
                  <KetaatanPieChart data={filteredDashboardStats.chartKetaatan} />
                </div>

                {/* Chart 3: Nilai per Satwas (Progress Horizontal Performance) */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-800">Skor Kepatuhan Rata-rata per Satwas Wilayah</h3>
                  <p className="text-[10px] text-slate-400 mb-4 font-semibold font-sans">Analisa performa ketaatan di masing-masing area kerja</p>
                  <NilaiSatwasChart data={filteredDashboardStats.chartNilaiSatwas} />
                </div>

                {/* Chart 4: Annual Trend (Area line chart) */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-800">Tren Tingkat Kepatuhan Nasional (2024 - 2026)</h3>
                  <p className="text-[10px] text-slate-400 mb-4 font-semibold font-sans">Perbandingan rata-rata evaluasi nilai tahunan</p>
                  <TrendTahunanChart data={filteredDashboardStats.chartTrendTahunan} />
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: MATRIK PEMERIKSAAN LEDGER */}
          {activeTab === "pemeriksaan" && (
            <div className="space-y-6">
              {/* Sub-menu di atas Matrik Pemeriksaan */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-200 p-4 rounded-3xl shadow-xs">
                <div className="space-y-1">
                  <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-sky-500 rounded-xs inline-block" />
                    Kinerja Tim Kerja (Timja) SDK
                  </h2>
                  <p className="text-[10px] text-slate-400 font-semibold font-sans">
                    Kelola data pemeriksaan lapangan dan pantau penyerapan anggaran tahun 2026
                  </p>
                </div>
                
                <div className="bg-slate-100 p-1 rounded-2xl flex gap-1 w-full sm:w-auto">
                  <button
                    onClick={() => setPemeriksaanSubTab("kegiatan")}
                    className={`flex-1 sm:flex-initial py-2 px-4 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 ${
                      pemeriksaanSubTab === "kegiatan"
                        ? "bg-white text-slate-800 shadow-xs font-black border border-slate-200/50"
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    <ClipboardCheck className="w-3.5 h-3.5 text-cyan-500" />
                    Matrik Pemeriksaan
                  </button>
                  <button
                    onClick={() => setPemeriksaanSubTab("anggaran")}
                    className={`flex-1 sm:flex-initial py-2 px-4 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 ${
                      pemeriksaanSubTab === "anggaran"
                        ? "bg-white text-slate-800 shadow-xs font-black border border-slate-200/50"
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    <Wallet className="w-3.5 h-3.5 text-emerald-500" />
                    Alokasi & Penyerapan Anggaran
                  </button>
                </div>
              </div>

              {pemeriksaanSubTab === "kegiatan" ? (
                <PemeriksaanList
                  records={pemeriksaan}
                  satwasList={satwasList}
                  userRole={currentUser.role}
                  temuanList={temuan}
                  documentList={documents}
                  onAddClick={() => {
                    setEditingPemeriksaan(null);
                    setShowPemeriksaanForm(true);
                  }}
                  onEditClick={(record) => {
                    setEditingPemeriksaan(record);
                    setShowPemeriksaanForm(true);
                  }}
                  onDeleteClick={handlePemeriksaanDelete}
                  onUploadDocClick={(record) => {
                    setPreSelectedPemeriksaanId(record.id);
                    setActiveTab("dokumen");
                    setShowAddFormTriggerInDocumentList();
                  }}
                  onCreateTemuanClick={(record) => {
                    setPreSelectedPemeriksaanId(record.id);
                    setEditingTemuan(null);
                    setShowTemuanForm(true);
                  }}
                />
              ) : (
                filteredDashboardStats && (
                  <div className="space-y-6">
                    {/* Filter Satwas Wilayah untuk Anggaran */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-200 p-5 rounded-3xl shadow-xs">
                      <div className="space-y-1">
                        <h3 className="text-sm font-black text-slate-850 flex items-center gap-2">
                          <span className="w-1.5 h-4 bg-emerald-500 rounded-xs inline-block" />
                          Penyaringan Anggaran Wilayah Kerja (Satwas)
                        </h3>
                        <p className="text-[10px] text-slate-400 font-semibold font-sans">
                          Saring realisasi penyerapan anggaran khusus untuk wilayah Satwas terpilih
                        </p>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                        <div className="w-full sm:w-64">
                          <select
                            id="budget-satwas-filter"
                            value={selectedDashboardSatwas}
                            onChange={(e) => setSelectedDashboardSatwas(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-extrabold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer"
                          >
                            <option value="ALL">Semua Satwas Wilayah</option>
                            {satwasList.map((sat) => (
                              <option key={sat.id} value={sat.nama_satwas}>
                                {sat.nama_satwas}
                              </option>
                            ))}
                          </select>
                        </div>

                        <button
                          onClick={handleDownloadCSV}
                          className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-xs rounded-2xl transition-all duration-200 shadow-sm flex items-center justify-center gap-2 border border-emerald-500/20 whitespace-nowrap cursor-pointer"
                        >
                          <Download className="w-4 h-4 text-emerald-100" />
                          Unduh Data
                        </button>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-4">
                        <div>
                          <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                            <span className="w-1.5 h-4 bg-emerald-500 rounded-xs inline-block" />
                            Pemantauan Penyerapan Anggaran per Triwulan (Q1 - Q4) - {selectedDashboardSatwas === "ALL" ? "Semua Wilayah" : selectedDashboardSatwas}
                          </h3>
                          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                            Evaluasi akurasi realisasi penyerapan anggaran secara berjangka sepanjang tahun 2026
                          </p>
                        </div>
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 font-mono">
                          Total Target Realisasi: {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(filteredDashboardStats.targetRealisasi || 0)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                        {[
                          {
                            label: "Triwulan I (Q1)",
                            target: filteredDashboardStats.targetQ1 ?? 250000000,
                            realisasi: filteredDashboardStats.realisasiQ1 ?? 220000000,
                            gradient: "from-sky-500 to-blue-500",
                            bgColor: "bg-sky-50/40 border-sky-100",
                          },
                          {
                            label: "Triwulan II (Q2)",
                            target: filteredDashboardStats.targetQ2 ?? 250000000,
                            realisasi: filteredDashboardStats.realisasiQ2 ?? 230000000,
                            gradient: "from-cyan-500 to-sky-500",
                            bgColor: "bg-cyan-50/40 border-cyan-100",
                          },
                          {
                            label: "Triwulan III (Q3)",
                            target: filteredDashboardStats.targetQ3 ?? 250000000,
                            realisasi: filteredDashboardStats.realisasiQ3 ?? 200000000,
                            gradient: "from-teal-500 to-emerald-500",
                            bgColor: "bg-teal-50/40 border-teal-100",
                          },
                          {
                            label: "Triwulan IV (Q4)",
                            target: filteredDashboardStats.targetQ4 ?? 250000000,
                            realisasi: filteredDashboardStats.realisasiQ4 ?? 175000000,
                            gradient: "from-indigo-500 to-violet-500",
                            bgColor: "bg-indigo-50/40 border-indigo-100",
                          },
                        ].map((q, idx) => {
                        const ratio = q.target > 0 ? Number(((q.realisasi / q.target) * 100).toFixed(1)) : 0;
                        const isWarning = ratio < 50;
                        
                        // Determine warning/color status based on absorption level
                        let statusText = "Kurang Aktif";
                        let statusColor = "bg-amber-50 text-amber-700 border-amber-100";
                        let cardBgStyle = q.bgColor;
                        let progressGradient = q.gradient;

                        if (isWarning) {
                          statusText = "⚠️ Peringatan: Rendah (<50%)";
                          statusColor = "bg-rose-100 text-rose-700 border-rose-200 font-black animate-pulse shadow-xs";
                          cardBgStyle = "bg-rose-50/40 border-rose-300 ring-2 ring-rose-500/10";
                          progressGradient = "from-rose-500 to-red-600";
                        } else if (ratio >= 90) {
                          statusText = "Sangat Baik (Optimal)";
                          statusColor = "bg-emerald-50 text-emerald-700 border-emerald-100";
                        } else if (ratio >= 75) {
                          statusText = "Baik (Target Tercapai)";
                          statusColor = "bg-sky-50 text-sky-700 border-sky-100";
                        } else if (ratio >= 50) {
                          statusText = "Cukup Aktif";
                          statusColor = "bg-blue-50 text-blue-700 border-blue-100";
                        }

                        return (
                          <div key={idx} className={`p-4 rounded-2xl border ${cardBgStyle} flex flex-col justify-between space-y-4 shadow-2xs transition-all duration-300`}>
                            <div className="flex justify-between items-start gap-2">
                              <div className="min-w-0">
                                <span className="text-xs font-extrabold text-slate-700 block truncate">{q.label}</span>
                                <span className={`text-[8px] font-black uppercase tracking-wider block mt-1 ${statusColor} px-2 py-0.5 rounded-full border inline-block truncate max-w-full`}>
                                  {statusText}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {isWarning && (
                                  <AlertTriangle className="w-4 h-4 text-rose-500 animate-bounce shrink-0" />
                                )}
                                <span className={`text-lg font-black font-mono ${isWarning ? 'text-rose-600 animate-pulse' : 'text-slate-800'}`}>
                                  {ratio}%
                                </span>
                              </div>
                            </div>

                            {/* Progress slider container */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] font-bold text-slate-400 font-mono">
                                <span>Realisasi</span>
                                <span className={isWarning ? 'text-rose-700 font-extrabold' : 'text-slate-600'}>
                                  {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(q.realisasi)}
                                </span>
                              </div>
                              <div className="w-full h-2 bg-slate-200/60 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.min(ratio, 100)}%` }}
                                  transition={{ duration: 1, ease: "easeOut", delay: idx * 0.1 }}
                                  className={`h-full rounded-full bg-gradient-to-r ${progressGradient}`}
                                />
                              </div>
                              <div className="flex justify-between text-[9px] text-slate-400 font-semibold font-sans pt-0.5">
                                <span>Target: {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(q.target)}</span>
                                <span className={`text-right truncate max-w-[50%] ${isWarning ? 'text-rose-500 font-bold' : ''}`}>
                                  Sisa: {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Math.max(0, q.target - q.realisasi))}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {dashboardStats && satwasList && (
                      <AnggaranSatwasStackedBarChart
                        dashboardStats={dashboardStats}
                        satwasList={satwasList}
                        selectedSatwas={selectedDashboardSatwas}
                        config={config}
                      />
                    )}
                  </div>
                </div>
              )
            )}
            </div>
          )}

          {/* TAB 3: TEMUAN MONITOR */}
          {activeTab === "temuan" && (
            <TemuanList
              temuan={temuan}
              pemeriksaanList={pemeriksaan}
              userRole={currentUser.role}
              onAddClick={() => {
                setEditingTemuan(null);
                setPreSelectedPemeriksaanId(undefined);
                setShowTemuanForm(true);
              }}
              onEditClick={(item) => {
                setEditingTemuan(item);
                setPreSelectedPemeriksaanId(undefined);
                setShowTemuanForm(true);
              }}
              onDeleteClick={handleTemuanDelete}
            />
          )}

          {/* TAB 4: REPOSITORY DOKUMEN DRIVE */}
          {activeTab === "dokumen" && (
            <DokumenList
              documents={documents}
              pemeriksaanList={pemeriksaan}
              userRole={currentUser.role}
              onCreateDoc={handleCreateDoc}
              onVerifyDoc={handleVerifyDoc}
              onDeleteDoc={handleDeleteDoc}
            />
          )}

          {/* TAB 5: LAPORAN & CERTIFICATE EXPORT */}
          {activeTab === "laporan" && (
            <LaporanFilter records={pemeriksaan} satwasList={satwasList} />
          )}

          {/* TAB 5.5: GOOGLE WORKSPACE REST API INTEGRATION */}
          {activeTab === "workspace" && currentUser && (
            <GoogleWorkspaceManager
              user={currentUser}
              pemeriksaanList={pemeriksaan}
              onAddPemeriksaan={handlePemeriksaanSubmit}
              googleAccessToken={googleAccessToken}
              onGoogleSignIn={handleGoogleSignInClick}
            />
          )}

          {/* TAB 6: USER REGISTRATION (ADMIN ONLY) */}
          {activeTab === "users" && currentUser.role === "Administrator" && (
            <UserManagement
              users={usersList}
              currentSessionUser={currentUser}
              onCreateUser={handleCreateUser}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
            />
          )}

          {/* TAB 7: SYSTEM CONFIG API SETTINGS (ADMIN ONLY) */}
          {activeTab === "config" && currentUser.role === "Administrator" && (
            <ConfigSettings config={config} satwasList={satwasList} onUpdateConfig={handleUpdateConfig} />
          )}

          {/* TAB 8: AUDIT LOGS (ADMIN ONLY) */}
          {activeTab === "logs" && currentUser.role === "Administrator" && (
            <ActivityLogList />
          )}

          {/* TAB 9: AI VOICE ASSISTANT */}
          {activeTab === "ai-assistant" && currentUser && (
            <AIVoiceAssistant
              user={currentUser}
              activeTab={activeTab}
              dashboardStats={dashboardStats || undefined}
            />
          )}

        </main>
      </div>

      {/* FORM MODAL 1: PEMERIKSAAN REGISTER FORM */}
      {showPemeriksaanForm && (
        <PemeriksaanForm
          initialRecord={editingPemeriksaan}
          satwasList={satwasList}
          userRole={currentUser.role}
          onSubmit={handlePemeriksaanSubmit}
          onClose={() => {
            setShowPemeriksaanForm(false);
            setEditingPemeriksaan(null);
          }}
        />
      )}

      {/* FORM MODAL 2: TEMUAN REGISTER FORM */}
      {showTemuanForm && (
        <TemuanForm
          initialForm={editingTemuan}
          pemeriksaanList={pemeriksaan}
          preSelectedPemeriksaanId={preSelectedPemeriksaanId}
          onSubmit={handleTemuanSubmit}
          onClose={() => {
            setShowTemuanForm(false);
            setEditingTemuan(null);
            setPreSelectedPemeriksaanId(undefined);
          }}
        />
      )}

      {/* FLOATING AI ASSISTANT OVERLAY */}
      {currentUser && activeTab !== "ai-assistant" && (
        <AIVoiceAssistant
          user={currentUser}
          activeTab={activeTab}
          dashboardStats={dashboardStats || undefined}
          isFloatingOnly={true}
        />
      )}

    </div>
  );

  // Helper trigger to activate add-form view on documents tab
  function setShowAddFormTriggerInDocumentList() {
    // We can simulate click or state inside DocumentList.
  }
}
