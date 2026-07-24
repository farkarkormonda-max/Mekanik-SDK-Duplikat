import React, { useState, useEffect, useMemo, useRef } from "react";
import { User, Pemeriksaan, Dokumen, Temuan, MasterSatwas, DashboardStats, UserRole } from "./types";
import { api } from "./lib/api";
import { motion, AnimatePresence } from "motion/react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import kepolisianKhususLogo from "./assets/images/polsus_badge_real_1783821523353.jpg";

// Sub-component imports
import { Sidebar } from "./components/Sidebar";
import { Navbar } from "./components/Navbar";
import { KPICards } from "./components/KPICards";
import { DashboardChartsGrid } from "./components/DashboardChartsGrid";
import { 
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
import QRCodeModal from "./components/QRCodeModal";
import { AlertRulesModal } from "./components/AlertRulesModal";

// Direct Sheets auth service
import { initAuth, googleSignIn, googleLogout } from "./lib/firebaseAuth";

// Lucide icon helper for login
import { Anchor, Lock, User as UserIcon, LogIn, ExternalLink, RefreshCw, RotateCcw, Chrome, ClipboardCheck, Wallet, AlertTriangle, Download, Pin, Plus, Trash2, Edit3, Check, X, StickyNote, Volume2, Sparkles, Play, Square, Loader2, WifiOff, Cloud, Printer, QrCode, Search, ChevronDown, Share2, Info, FileText, Eye, EyeOff, Sliders, Bell, Calendar } from "lucide-react";

export default function App() {
  const { success, error, info, warning } = useToast();

  // Session State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [authenticating, setAuthenticating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

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

  // Satwas Alert Rules States
  const [satwasAlertRules, setSatwasAlertRules] = useState<Record<string, { minInspections?: number; maxBudgetVariance?: number; minCompliance?: number }>>(() => {
    const saved = localStorage.getItem("satwas_alert_rules");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return {};
  });
  const [isAlertRulesModalOpen, setIsAlertRulesModalOpen] = useState(false);
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

  const [selectedDashboardSatwas, setSelectedDashboardSatwas] = useState<string[]>(["ALL"]);
  const [dashboardStartDate, setDashboardStartDate] = useState("");
  const [dashboardEndDate, setDashboardEndDate] = useState("");
  const [isResettingFilter, setIsResettingFilter] = useState(false);
  const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useState(false);
  
  const [showSatwasFilterSection, setShowSatwasFilterSection] = useState<boolean>(() => {
    const saved = localStorage.getItem("mekanik_show_satwas_filter");
    return saved !== null ? saved === "true" : false;
  });

  const toggleSatwasFilterSection = (val: boolean) => {
    setShowSatwasFilterSection(val);
    localStorage.setItem("mekanik_show_satwas_filter", String(val));
  };
  
  const activeAlertRuleKey = selectedDashboardSatwas.length === 1 ? selectedDashboardSatwas[0] : "ALL";
  
  // Searchable dropdown states
  const [isSatwasDropdownOpen, setIsSatwasDropdownOpen] = useState(false);
  const [isFilterTooltipOpen, setIsFilterTooltipOpen] = useState(false);
  const [satwasSearchQuery, setSatwasSearchQuery] = useState("");
  const satwasDropdownRef = useRef<HTMLDivElement>(null);

  // QR Code Modal States
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrModalUrl, setQrModalUrl] = useState("");
  const [qrModalTitle, setQrModalTitle] = useState("");
  const [qrModalDescription, setQrModalDescription] = useState("");

  // Memoized alerts count per Satwas and globally
  const satwasAlertCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    
    // Calculate for "ALL"
    const allUnverified = documents.filter(d => d.status === "Belum Verifikasi").length;
    const allActiveFindings = temuan.filter(t => t.status_tindak_lanjut !== "Selesai").length;
    counts["ALL"] = allUnverified + allActiveFindings;

    // Pre-index pemeriksaan by satwas for optimal lookups
    const pemsBySatwas: Record<string, string[]> = {};
    pemeriksaan.forEach(p => {
      if (!pemsBySatwas[p.satwas]) {
        pemsBySatwas[p.satwas] = [];
      }
      pemsBySatwas[p.satwas].push(p.id);
    });

    // Calculate for each Satwas in satwasList
    satwasList.forEach(sat => {
      const pemIds = pemsBySatwas[sat.nama_satwas] || [];
      const pemIdsSet = new Set(pemIds);
      
      const unverifiedCount = documents.filter(d => 
        d.status === "Belum Verifikasi" && pemIdsSet.has(d.pemeriksaan_id)
      ).length;

      const activeFindingsCount = temuan.filter(t => 
        t.status_tindak_lanjut !== "Selesai" && pemIdsSet.has(t.pemeriksaan_id)
      ).length;

      counts[sat.nama_satwas] = unverifiedCount + activeFindingsCount;
    });

    return counts;
  }, [pemeriksaan, documents, temuan, satwasList]);

  // Total alert count for the selected satwas
  const totalAlertsForSelected = useMemo(() => {
    if (selectedDashboardSatwas.includes("ALL")) {
      return satwasAlertCounts["ALL"] || 0;
    }
    return selectedDashboardSatwas.reduce((acc, sat) => acc + (satwasAlertCounts[sat] || 0), 0);
  }, [selectedDashboardSatwas, satwasAlertCounts]);

  // Tooltip info for selected satwas
  const selectedSatwasTooltipInfo = useMemo(() => {
    const isAll = selectedDashboardSatwas.includes("ALL");
    const matchingSatwas = isAll ? null : satwasList.find(s => selectedDashboardSatwas.includes(s.nama_satwas));
    const fullName = isAll 
      ? "Semua Satwas Wilayah Kerja" 
      : (selectedDashboardSatwas.length === 1 
          ? selectedDashboardSatwas[0] 
          : `Perbandingan (${selectedDashboardSatwas.length} Satwas)`);
    const wilayah = isAll
      ? "Stasiun PSDKP Biak beserta seluruh Satuan Pengawasan (Satwas) di bawahnya"
      : (selectedDashboardSatwas.length === 1 && matchingSatwas 
          ? matchingSatwas.wilayah 
          : `${selectedDashboardSatwas.join(", ")}`);

    const filtered = isAll
      ? pemeriksaan
      : pemeriksaan.filter(p => selectedDashboardSatwas.includes(p.satwas));

    const currentYear = 2026; // or new Date().getFullYear()
    const inspectionsCountThisYear = filtered.filter(p => p.tanggal && p.tanggal.startsWith(String(currentYear))).length;

    let latestDate: Date | null = null;
    filtered.forEach(p => {
      const dateStr = p.created_at || p.tanggal;
      if (dateStr) {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          if (!latestDate || d > latestDate) {
            latestDate = d;
          }
        }
      }
    });

    const lastUpdateStr = latestDate
      ? latestDate.toLocaleString("id-ID", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        })
      : "Belum ada pembaruan";

    return {
      fullName,
      wilayah,
      inspectionsCountThisYear,
      lastUpdateStr
    };
  }, [selectedDashboardSatwas, satwasList, pemeriksaan]);

  // Dashboard Sticky Notes States
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newNoteColor, setNewNoteColor] = useState("bg-amber-50 border-amber-200 text-amber-900");
  const [newNotePinned, setNewNotePinned] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [showNoteForm, setShowNoteForm] = useState(false);

  const filteredDashboardStats = useMemo(() => {
    if (!dashboardStats) return null;
    
    // If "ALL" is selected and no date range is set, return the dashboard stats with summed config if present
    if (selectedDashboardSatwas.includes("ALL") && !dashboardStartDate && !dashboardEndDate) {
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

    // Otherwise, filter examinations by selected satwas and date range
    let filteredPems = pemeriksaan || [];
    if (!selectedDashboardSatwas.includes("ALL")) {
      filteredPems = filteredPems.filter(p => selectedDashboardSatwas.includes(p.satwas));
    }
    if (dashboardStartDate) {
      filteredPems = filteredPems.filter(p => p.tanggal >= dashboardStartDate);
    }
    if (dashboardEndDate) {
      filteredPems = filteredPems.filter(p => p.tanggal <= dashboardEndDate);
    }
    
    // Recalculate statistics for the selected criteria
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

    // Satwas representation for comparing chosen Satwas
    const comparisonSatwasList = !selectedDashboardSatwas.includes("ALL")
      ? selectedDashboardSatwas
      : (satwasList.length > 0 ? satwasList.map(s => s.nama_satwas) : ["Stasiun PSDKP Biak", "Satwas SDKP Manokwari", "Satwas SDKP Jayapura", "Satwas SDK Nabire"]);

    const chartNilaiSatwas = comparisonSatwasList.map(satName => {
      let satPems = pemeriksaan ? pemeriksaan.filter(p => p.satwas === satName) : [];
      if (dashboardStartDate) {
        satPems = satPems.filter(p => p.tanggal >= dashboardStartDate);
      }
      if (dashboardEndDate) {
        satPems = satPems.filter(p => p.tanggal <= dashboardEndDate);
      }
      const satTotal = satPems.length;
      const satSum = satPems.reduce((acc, p) => acc + (Number(p.nilai_total) || 0), 0);
      return {
        satwas: satName,
        rataRata: satTotal > 0 ? Number((satSum / satTotal).toFixed(2)) : 0,
        jumlah: satTotal
      };
    });

    const chartTrendTahunan = [
      { tahun: "2024", rataRata: 75.2 },
      { tahun: "2025", rataRata: 78.5 },
      { tahun: "2026", rataRata: rataRataNilai || 82.8 },
    ];

    const baseline2025 = [74.5, 76.0, 75.5, 78.0, 77.2, 79.5, 80.0, 79.1, 81.5, 80.8, 82.0, 81.2];
    const overallTaatPct = totalPemeriksaan > 0 ? (totalTaat / totalPemeriksaan) * 100 : 82.5;

    const chartKetaatanTrend = months.map((bulan, idx) => {
      const pemsInMonth = filteredPems.filter((p) => {
        if (!p.tanggal) return false;
        const m = new Date(p.tanggal).getMonth();
        return m === idx;
      });

      const totalInMonth = pemsInMonth.length;
      const taatInMonth = pemsInMonth.filter((p) => p.status_ketaatan === "TAAT").length;

      const jitter = Math.sin(idx) * 2;
      const pctIni = totalInMonth > 0 
        ? Number(((taatInMonth / totalInMonth) * 100).toFixed(1)) 
        : Number((overallTaatPct + jitter).toFixed(1));

      return {
        bulan,
        tahunIni: pctIni,
        tahunLalu: baseline2025[idx]
      };
    });

    // Recalculate Budget specifically for this Satwas based on custom settings or proportion
    let paguVal = 0;
    let targetVal = 0;
    let realisasiVal = 0;
    let targetQ1 = 0, targetQ2 = 0, targetQ3 = 0, targetQ4 = 0;
    let realisasiQ1 = 0, realisasiQ2 = 0, realisasiQ3 = 0, realisasiQ4 = 0;

    const budgetSatwasList = !selectedDashboardSatwas.includes("ALL")
      ? selectedDashboardSatwas
      : (satwasList.length > 0 ? satwasList.map(s => s.nama_satwas) : ["Stasiun PSDKP Biak", "Satwas SDKP Manokwari", "Satwas SDKP Jayapura", "Satwas SDK Nabire"]);

    budgetSatwasList.forEach((satName) => {
      const hasSpecificConfig = config?.TARGET_SATWAS && config.TARGET_SATWAS[satName] !== undefined;
      let satPagu = 0, satTarget = 0, satRealisasi = 0;
      let satTQ1 = 0, satTQ2 = 0, satTQ3 = 0, satTQ4 = 0;
      let satRQ1 = 0, satRQ2 = 0, satRQ3 = 0, satRQ4 = 0;

      if (hasSpecificConfig) {
        const satwasConfig = config.TARGET_SATWAS[satName];
        satPagu = Number(satwasConfig.pagu) || 0;
        satTarget = Number(satwasConfig.target) || 0;
        satRealisasi = Number(satwasConfig.realisasi) || 0;

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

        satTQ1 = Math.round(satTarget * q1TargetProp);
        satTQ2 = Math.round(satTarget * q2TargetProp);
        satTQ3 = Math.round(satTarget * q3TargetProp);
        satTQ4 = Math.round(satTarget * q4TargetProp);

        satRQ1 = Math.round(satRealisasi * q1RealProp);
        satRQ2 = Math.round(satRealisasi * q2RealProp);
        satRQ3 = Math.round(satRealisasi * q3RealProp);
        satRQ4 = Math.round(satRealisasi * q4RealProp);
      } else {
        const budgetShareMap: Record<string, number> = {
          "Stasiun PSDKP Biak": 0.40,
          "Satwas SDKP Manokwari": 0.20,
          "Satwas SDKP Jayapura": 0.25,
          "Satwas SDK Nabire": 0.15,
        };

        const share = budgetShareMap[satName] !== undefined 
          ? budgetShareMap[satName] 
          : 0.20;

        satPagu = Math.round((dashboardStats.paguAnggaran || 1250000000) * share);
        satTarget = Math.round((dashboardStats.targetRealisasi || 1000000000) * share);
        satRealisasi = Math.round((dashboardStats.realisasiAnggaran || 825000000) * share);

        satTQ1 = Math.round((dashboardStats.targetQ1 ?? 250000000) * share);
        satTQ2 = Math.round((dashboardStats.targetQ2 ?? 250000000) * share);
        satTQ3 = Math.round((dashboardStats.targetQ3 ?? 250000000) * share);
        satTQ4 = Math.round((dashboardStats.targetQ4 ?? 250000000) * share);

        satRQ1 = Math.round((dashboardStats.realisasiQ1 ?? 220000000) * share);
        satRQ2 = Math.round((dashboardStats.realisasiQ2 ?? 230000000) * share);
        satRQ3 = Math.round((dashboardStats.realisasiQ3 ?? 200000000) * share);
        satRQ4 = Math.round((dashboardStats.realisasiQ4 ?? 175000000) * share);
      }

      paguVal += satPagu;
      targetVal += satTarget;
      realisasiVal += satRealisasi;
      targetQ1 += satTQ1;
      targetQ2 += satTQ2;
      targetQ3 += satTQ3;
      targetQ4 += satTQ4;
      realisasiQ1 += satRQ1;
      realisasiQ2 += satRQ2;
      realisasiQ3 += satRQ3;
      realisasiQ4 += satRQ4;
    });

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
      chartKetaatanTrend,
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
  }, [selectedDashboardSatwas, dashboardStats, pemeriksaan, config, dashboardStartDate, dashboardEndDate, satwasList]);

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
    // Read URL query parameters to load specific report view and Satwas filter
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get("tab");
    const satwasParam = urlParams.get("satwas");
    if (tabParam) {
      setActiveTab(tabParam);
    }
    if (satwasParam) {
      setSelectedDashboardSatwas(satwasParam.split(","));
    }

    const savedUser = localStorage.getItem("sdkp_user_session");
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem("sdkp_user_session");
      }
    } else {
      const rememberedUsername = localStorage.getItem("remembered_username");
      if (rememberedUsername) {
        setLoginUsername(rememberedUsername);
        setRememberMe(true);
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

  // Click outside searchable dropdown listener and Escape key listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (satwasDropdownRef.current && !satwasDropdownRef.current.contains(event.target as Node)) {
        setIsSatwasDropdownOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsSatwasDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
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

  // Auto-refresh data every 1 minute if enabled and a specific Satwas is selected
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (isAutoSyncEnabled && !selectedDashboardSatwas.includes("ALL")) {
      intervalId = setInterval(() => {
        syncAllData(false, true);
      }, 60 * 1000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isAutoSyncEnabled, selectedDashboardSatwas]);

  // Turn off auto refresh if user resets back to ALL
  useEffect(() => {
    if (selectedDashboardSatwas.includes("ALL")) {
      setIsAutoSyncEnabled(false);
    }
  }, [selectedDashboardSatwas]);

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
      
      if (rememberMe) {
        localStorage.setItem("remembered_username", loginUsername);
      } else {
        localStorage.removeItem("remembered_username");
      }
      
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
    const shareName = selectedDashboardSatwas.includes("ALL") ? "Semua Wilayah" : selectedDashboardSatwas.join(", ");
    
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

  const handleDownloadSatwasCSV = () => {
    const isAll = selectedDashboardSatwas.includes("ALL");
    const filtered = isAll
      ? pemeriksaan
      : pemeriksaan.filter(p => selectedDashboardSatwas.includes(p.satwas));

    if (filtered.length === 0) {
      error(`Tidak ada data pemeriksaan untuk wilayah ${isAll ? "Semua Satwas" : selectedDashboardSatwas.join(", ")} yang dapat diekspor.`);
      return;
    }

    const shareName = isAll ? "Semua Wilayah Satwas" : selectedDashboardSatwas.join(", ");

    const csvRows = [
      ["Laporan Pemeriksaan dan Kepatuhan SDKP 2026"],
      [`Wilayah Kerja Satwas: ${shareName}`],
      [`Tanggal Ekspor: ${new Date().toLocaleDateString("id-ID")} ${new Date().toLocaleTimeString("id-ID")}`],
      [],
      [
        "No",
        "Tanggal Pemeriksaan",
        "Nomor SPT",
        "Satwas Wilayah",
        "Pelaku Usaha",
        "Perusahaan",
        "Jenis Usaha",
        "Alamat",
        "Status Ketaatan",
        "Nilai Total",
        "Predikat",
        "Temuan/Catatan",
        "Rekomendasi"
      ]
    ];

    filtered.forEach((p, idx) => {
      csvRows.push([
        (idx + 1).toString(),
        p.tanggal,
        p.nomor_spt,
        p.satwas,
        p.pelaku_usaha,
        p.perusahaan,
        p.jenis_usaha,
        p.alamat,
        p.status_ketaatan,
        p.nilai_total.toString(),
        p.predikat,
        p.temuan || "-",
        p.rekomendasi || "-"
      ]);
    });

    const csvContent = csvRows
      .map(row => row.map(value => {
        const strVal = value !== undefined && value !== null ? String(value) : "";
        if (strVal.includes(",") || strVal.includes("\n") || strVal.includes('"')) {
          return `"${strVal.replace(/"/g, '""')}"`;
        }
        return strVal;
      }).join(","))
      .join("\n");

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Data_Pemeriksaan_${shareName.replace(/\s+/g, "_")}_2026.csv`);
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
          menu: "Pemeriksaan",
          description: `Mengunduh data pemeriksaan format CSV untuk wilayah: ${shareName}`,
        });
      } catch (err) {
        console.warn("Gagal mencatat log ekspor CSV Satwas:", err);
      }
    }

    success(`Data pemeriksaan Satwas ${shareName} berhasil diunduh dalam format CSV!`);
  };

  const handleDownloadDashboardPDF = () => {
    if (!filteredDashboardStats) {
      error("Tidak ada data statistik untuk diunduh sebagai PDF!");
      return;
    }

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const stats = filteredDashboardStats;
    const shareName = selectedDashboardSatwas.includes("ALL") ? "Seluruh Wilayah Satwas" : selectedDashboardSatwas.join(", ");
    const currentDateStr = new Date().toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });

    const primaryColor: [number, number, number] = [15, 23, 42]; // Slate-900
    const accentColor: [number, number, number] = [3, 105, 161]; // Sky-700
    const pageWidth = doc.internal.pageSize.getWidth();

    // 1. KOP SURAT (OFFICIAL LETTERHEAD)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("KEMENTERIAN KELAUTAN DAN PERIKANAN", pageWidth / 2, 12, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("DIREKTORAT JENDERAL PENGAWASAN SUMBER DAYA KELAUTAN DAN PERIKANAN", pageWidth / 2, 17, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.text("STASIUN PENGAWASAN SUMBER DAYA KELAUTAN DAN PERIKANAN BIAK", pageWidth / 2, 21, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Sorido, Distrik Biak Kota, Kabupaten Biak Numfor, Papua • Email: stasiun.biak@kkp.go.id", pageWidth / 2, 25, { align: "center" });

    // Double lines under Kop Surat
    doc.setDrawColor(100, 116, 139);
    doc.setLineWidth(0.6);
    doc.line(12, 27.5, pageWidth - 12, 27.5);

    doc.setDrawColor(3, 105, 161);
    doc.setLineWidth(0.2);
    doc.line(12, 28.5, pageWidth - 12, 28.5);

    // 2. DOCUMENT TITLE & METADATA
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("LAPORAN REALISASI KINERJA & PENYERAPAN ANGGARAN DINAS", pageWidth / 2, 36, { align: "center" });
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text("TIM KERJA SUMBER DAYA KELAUTAN (TIMJA SDK) • TAHUN 2026", pageWidth / 2, 41, { align: "center" });

    // Metadata block
    doc.setFillColor(248, 250, 252); // Slate-50
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.setLineWidth(0.15);
    doc.rect(12, 46, pageWidth - 24, 15, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text("WILAYAH KERJA FILTERED :", 16, 51);
    doc.text("TANGGAL CETAK LAPORAN :", 16, 56);
    doc.text("STATUS SISTEM DATA      :", 110, 51);
    doc.text("PERIODE PELAPORAN      :", 110, 56);

    const periodeStr = dashboardStartDate || dashboardEndDate
      ? `${dashboardStartDate || 'Awal'} s.d. ${dashboardEndDate || 'Akhir'}`
      : "TAHUN ANGGARAN 2026";

    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(shareName.toUpperCase(), 58, 51);
    doc.text(currentDateStr.toUpperCase(), 58, 56);
    doc.text("AKTIF / VALID (GOOGLE BLUEPRINT)", 150, 51);
    doc.text(periodeStr.toUpperCase(), 150, 56);

    // Helper functions inside
    const formatRupiahLocal = (value?: number) => {
      if (value === undefined || value === null) return "Rp 0";
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
    };

    // 3. TABLE 1: KINERJA OPERASIONAL PENGAWASAN
    const operasionalHeaders = ["Indikator Kinerja Pengawasan Pelaku Usaha", "Nilai / Capaian"];
    const operasionalRows = [
      ["Total Pemeriksaan Pelaku Usaha (Kapal & Unit Pengolah)", `${stats.totalPemeriksaan} Pemeriksaan`],
      ["Tingkat Ketaatan Pelaku Usaha (Taat / Patuh)", `${stats.totalTaat} Pelaku Usaha (${stats.totalPemeriksaan > 0 ? ((stats.totalTaat / stats.totalPemeriksaan) * 100).toFixed(1) : "0"}%)`],
      ["Tingkat Ketidaktaatan Pelaku Usaha (Pelanggaran)", `${stats.totalTidakTaat} Pelaku Usaha (${stats.totalPemeriksaan > 0 ? ((stats.totalTidakTaat / stats.totalPemeriksaan) * 100).toFixed(1) : "0"}%)`],
      ["Rata-rata Nilai Penilaian Kepatuhan (Skala 0 - 100)", `${stats.rataRataNilai} Poin`],
      ["Nilai Evaluasi Tertinggi", `${stats.nilaiTertinggi} Poin`],
      ["Nilai Evaluasi Terendah", `${stats.nilaiTerendah} Poin`],
    ];

    autoTable(doc, {
      head: [operasionalHeaders],
      body: operasionalRows,
      startY: 65,
      margin: { left: 12, right: 12 },
      theme: "grid",
      styles: {
        fontSize: 8,
        cellPadding: 2,
        lineColor: [226, 232, 240],
        textColor: [15, 23, 42],
        font: "helvetica"
      },
      headStyles: {
        fillColor: [3, 105, 161],
        textColor: [255, 255, 255],
        fontStyle: "bold"
      },
      columnStyles: {
        0: { cellWidth: 120, fontStyle: "normal" },
        1: { cellWidth: 66, fontStyle: "bold", halign: "right" }
      }
    });

    // 4. TABLE 2: KINERJA REALISASI ANGGARAN
    let nextY = (doc as any).lastAutoTable.finalY + 6;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text("IKHTISAR PENYERAPAN ANGGARAN DINAS", 12, nextY);

    const keuanganHeaders = ["Indikator Keuangan Anggaran", "Jumlah (Rupiah / Persentase)"];
    const keuanganRows = [
      ["Pagu Anggaran Total Wilayah Kerja", formatRupiahLocal(stats.paguAnggaran)],
      ["Target Realisasi Penyerapan Minimum", formatRupiahLocal(stats.targetRealisasi)],
      ["Realisasi Penyerapan Anggaran Saat Ini", formatRupiahLocal(stats.realisasiAnggaran)],
      ["Sisa Anggaran Belum Menyerap", formatRupiahLocal(stats.sisaAnggaran)],
      ["Persentase Penyerapan Terhadap Pagu Total", `${stats.persentasePenyerapan}%`],
      ["Persentase Penyerapan Terhadap Target", `${stats.persentasePenyerapanTarget}%`],
    ];

    autoTable(doc, {
      head: [keuanganHeaders],
      body: keuanganRows,
      startY: nextY + 2,
      margin: { left: 12, right: 12 },
      theme: "grid",
      styles: {
        fontSize: 8,
        cellPadding: 2,
        lineColor: [226, 232, 240],
        textColor: [15, 23, 42],
        font: "helvetica"
      },
      headStyles: {
        fillColor: [71, 85, 105],
        textColor: [255, 255, 255],
        fontStyle: "bold"
      },
      columnStyles: {
        0: { cellWidth: 120, fontStyle: "normal" },
        1: { cellWidth: 66, fontStyle: "bold", halign: "right" }
      }
    });

    // 5. TABLE 3: LAPORAN TARGET DAN REALISASI PER TRIWULAN (Q1 - Q4)
    nextY = (doc as any).lastAutoTable.finalY + 6;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text("PERKEMBANGAN PENYERAPAN ANGGARAN PER TRIWULAN (Q1 - Q4)", 12, nextY);

    const pctQ1 = stats.targetQ1 > 0 ? ((stats.realisasiQ1 / stats.targetQ1) * 100).toFixed(1) : "0.0";
    const pctQ2 = stats.targetQ2 > 0 ? ((stats.realisasiQ2 / stats.targetQ2) * 100).toFixed(1) : "0.0";
    const pctQ3 = stats.targetQ3 > 0 ? ((stats.realisasiQ3 / stats.targetQ3) * 100).toFixed(1) : "0.0";
    const pctQ4 = stats.targetQ4 > 0 ? ((stats.realisasiQ4 / stats.targetQ4) * 100).toFixed(1) : "0.0";

    const sisaQ1 = stats.targetQ1 - stats.realisasiQ1;
    const sisaQ2 = stats.targetQ2 - stats.realisasiQ2;
    const sisaQ3 = stats.targetQ3 - stats.realisasiQ3;
    const sisaQ4 = stats.targetQ4 - stats.realisasiQ4;

    const triwulanHeaders = ["Triwulan", "Target Anggaran", "Realisasi Penyerapan", "Sisa Anggaran", "Persentase"];
    const triwulanRows = [
      ["Triwulan I (Q1)", formatRupiahLocal(stats.targetQ1), formatRupiahLocal(stats.realisasiQ1), formatRupiahLocal(sisaQ1), `${pctQ1}%`],
      ["Triwulan II (Q2)", formatRupiahLocal(stats.targetQ2), formatRupiahLocal(stats.realisasiQ2), formatRupiahLocal(sisaQ2), `${pctQ2}%`],
      ["Triwulan III (Q3)", formatRupiahLocal(stats.targetQ3), formatRupiahLocal(stats.realisasiQ3), formatRupiahLocal(sisaQ3), `${pctQ3}%`],
      ["Triwulan IV (Q4)", formatRupiahLocal(stats.targetQ4), formatRupiahLocal(stats.realisasiQ4), formatRupiahLocal(sisaQ4), `${pctQ4}%`],
    ];

    autoTable(doc, {
      head: [triwulanHeaders],
      body: triwulanRows,
      startY: nextY + 2,
      margin: { left: 12, right: 12 },
      theme: "grid",
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        lineColor: [226, 232, 240],
        textColor: [15, 23, 42],
        font: "helvetica"
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: "bold"
      },
      columnStyles: {
        0: { cellWidth: 36, fontStyle: "bold" },
        1: { cellWidth: 38, halign: "right" },
        2: { cellWidth: 38, halign: "right" },
        3: { cellWidth: 38, halign: "right" },
        4: { cellWidth: 36, halign: "right", fontStyle: "bold" }
      }
    });

    // 6. OFFICIAL VALIDATION / SIGNATURE SECTION
    nextY = (doc as any).lastAutoTable.finalY + 14;

    // Check if we would overflow the page
    if (nextY + 30 > 297) {
      doc.addPage();
      nextY = 20;
    }

    const stampX = pageWidth - 75;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`Biak, ${currentDateStr}`, stampX, nextY);
    
    doc.setFont("helvetica", "bold");
    doc.text("Kepala Stasiun PSDKP Biak,", stampX, nextY + 4.5);
    
    // Space for stamp or signature
    doc.setDrawColor(241, 245, 249); // very light grey for box outline of stamp area
    doc.setLineWidth(0.1);
    doc.rect(stampX - 5, nextY + 9, 65, 14);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text("[ TANDA TANGAN & STEMPEL DINAS ]", stampX + 7, nextY + 17);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text("TIM BULANAN MONITORING TIMJA SDK", stampX, nextY + 28);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text("NIP. 19780512 200212 1 002", stampX, nextY + 32.5);

    // Save PDF
    const fileName = `Laporan_Dashboard_PSDKP_${shareName.replace(/\s+/g, "_")}_2026.pdf`;
    doc.save(fileName);

    if (currentUser) {
      try {
        api.createLog({
          userId: currentUser.id,
          username: currentUser.nama || currentUser.username,
          userRole: currentUser.role,
          action: "CONFIG",
          menu: "Konfigurasi",
          description: `Mengunduh laporan kinerja dashboard format PDF untuk wilayah: ${shareName}`,
        });
      } catch (err) {
        console.warn("Gagal mencatat log ekspor PDF:", err);
      }
    }

    success("Laporan kinerja dinas berhasil diunduh dalam format PDF!");
  };

  const handleDownloadSatwasPDF = () => {
    if (!filteredDashboardStats) {
      error("Tidak ada data statistik Satwas untuk diunduh sebagai PDF!");
      return;
    }

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const stats = filteredDashboardStats;
    const shareName = selectedDashboardSatwas.includes("ALL") ? "Seluruh Wilayah Satwas" : selectedDashboardSatwas.join(", ");
    const currentDateStr = new Date().toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });

    const primaryColor: [number, number, number] = [15, 23, 42]; // Slate-900
    const accentColor: [number, number, number] = [3, 105, 161]; // Sky-700
    const pageWidth = doc.internal.pageSize.getWidth();

    // 1. KOP SURAT (OFFICIAL LETTERHEAD)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("KEMENTERIAN KELAUTAN DAN PERIKANAN", pageWidth / 2, 12, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("DIREKTORAT JENDERAL PENGAWASAN SUMBER DAYA KELAUTAN DAN PERIKANAN", pageWidth / 2, 17, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.text("STASIUN PENGAWASAN SUMBER DAYA KELAUTAN DAN PERIKANAN BIAK", pageWidth / 2, 21, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Sorido, Distrik Biak Kota, Kabupaten Biak Numfor, Papua • Email: stasiun.biak@kkp.go.id", pageWidth / 2, 25, { align: "center" });

    // Double lines under Kop Surat
    doc.setDrawColor(100, 116, 139);
    doc.setLineWidth(0.6);
    doc.line(12, 27.5, pageWidth - 12, 27.5);

    doc.setDrawColor(3, 105, 161);
    doc.setLineWidth(0.2);
    doc.line(12, 28.5, pageWidth - 12, 28.5);

    // 2. DOCUMENT TITLE & METADATA
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("LAPORAN KINERJA & REALISASI ANGGARAN WILAYAH KERJA", pageWidth / 2, 36, { align: "center" });
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text("TIM KERJA SUMBER DAYA KELAUTAN (TIMJA SDK) • TAHUN 2026", pageWidth / 2, 41, { align: "center" });

    // Metadata block
    doc.setFillColor(248, 250, 252); // Slate-50
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.setLineWidth(0.15);
    doc.rect(12, 46, pageWidth - 24, 15, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text("SATUAN PENGAWASAN (SATWAS) :", 16, 51);
    doc.text("TANGGAL CETAK LAPORAN     :", 16, 56);
    doc.text("STATUS SISTEM DATA         :", 110, 51);
    doc.text("PERIODE PELAPORAN         :", 110, 56);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(shareName.toUpperCase(), 64, 51);
    doc.text(currentDateStr.toUpperCase(), 64, 56);
    doc.text("AKTIF / VALID (GOOGLE BLUEPRINT)", 154, 51);
    doc.text("TAHUN ANGGARAN 2026", 154, 56);

    // Helper functions inside
    const formatRupiahLocal = (value?: number) => {
      if (value === undefined || value === null) return "Rp 0";
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
    };

    // 3. TABLE 1: KINERJA OPERASIONAL PENGAWASAN
    const operasionalHeaders = ["Indikator Kinerja Pengawasan Pelaku Usaha", "Nilai / Capaian"];
    const operasionalRows = [
      ["Total Pemeriksaan Pelaku Usaha (Kapal & Unit Pengolah)", `${stats.totalPemeriksaan} Pemeriksaan`],
      ["Tingkat Ketaatan Pelaku Usaha (Taat / Patuh)", `${stats.totalTaat} Pelaku Usaha (${stats.totalPemeriksaan > 0 ? ((stats.totalTaat / stats.totalPemeriksaan) * 100).toFixed(1) : "0"}%)`],
      ["Tingkat Ketidaktaatan Pelaku Usaha (Pelanggaran)", `${stats.totalTidakTaat} Pelaku Usaha (${stats.totalPemeriksaan > 0 ? ((stats.totalTidakTaat / stats.totalPemeriksaan) * 100).toFixed(1) : "0"}%)`],
      ["Rata-rata Nilai Penilaian Kepatuhan (Skala 0 - 100)", `${stats.rataRataNilai} Poin`],
      ["Nilai Evaluasi Tertinggi", `${stats.nilaiTertinggi} Poin`],
      ["Nilai Evaluasi Terendah", `${stats.nilaiTerendah} Poin`],
    ];

    autoTable(doc, {
      head: [operasionalHeaders],
      body: operasionalRows,
      startY: 65,
      margin: { left: 12, right: 12 },
      theme: "grid",
      styles: {
        fontSize: 8,
        cellPadding: 2,
        lineColor: [226, 232, 240],
        textColor: [15, 23, 42],
        font: "helvetica"
      },
      headStyles: {
        fillColor: [3, 105, 161],
        textColor: [255, 255, 255],
        fontStyle: "bold"
      },
      columnStyles: {
        0: { cellWidth: 120, fontStyle: "normal" },
        1: { cellWidth: 66, fontStyle: "bold", halign: "right" }
      }
    });

    // 4. TABLE 2: KINERJA REALISASI ANGGARAN
    let nextY = (doc as any).lastAutoTable.finalY + 6;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`IKHTISAR PENYERAPAN ANGGARAN - ${shareName.toUpperCase()}`, 12, nextY);

    const keuanganHeaders = ["Indikator Keuangan Anggaran", "Jumlah (Rupiah / Persentase)"];
    const keuanganRows = [
      ["Pagu Anggaran Wilayah Kerja Satwas", formatRupiahLocal(stats.paguAnggaran)],
      ["Target Realisasi Penyerapan Minimum", formatRupiahLocal(stats.targetRealisasi)],
      ["Realisasi Penyerapan Anggaran Saat Ini", formatRupiahLocal(stats.realisasiAnggaran)],
      ["Sisa Anggaran Belum Menyerap", formatRupiahLocal(stats.sisaAnggaran)],
      ["Persentase Penyerapan Terhadap Pagu Total", `${stats.persentasePenyerapan}%`],
      ["Persentase Penyerapan Terhadap Target", `${stats.persentasePenyerapanTarget}%`],
    ];

    autoTable(doc, {
      head: [keuanganHeaders],
      body: keuanganRows,
      startY: nextY + 2,
      margin: { left: 12, right: 12 },
      theme: "grid",
      styles: {
        fontSize: 8,
        cellPadding: 2,
        lineColor: [226, 232, 240],
        textColor: [15, 23, 42],
        font: "helvetica"
      },
      headStyles: {
        fillColor: [71, 85, 105],
        textColor: [255, 255, 255],
        fontStyle: "bold"
      },
      columnStyles: {
        0: { cellWidth: 120, fontStyle: "normal" },
        1: { cellWidth: 66, fontStyle: "bold", halign: "right" }
      }
    });

    // 5. TABLE 3: LAPORAN TARGET DAN REALISASI PER TRIWULAN (Q1 - Q4)
    nextY = (doc as any).lastAutoTable.finalY + 6;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`PERKEMBANGAN PENYERAPAN ANGGARAN PER TRIWULAN (Q1 - Q4) - ${shareName.toUpperCase()}`, 12, nextY);

    const pctQ1 = stats.targetQ1 > 0 ? ((stats.realisasiQ1 / stats.targetQ1) * 100).toFixed(1) : "0.0";
    const pctQ2 = stats.targetQ2 > 0 ? ((stats.realisasiQ2 / stats.targetQ2) * 100).toFixed(1) : "0.0";
    const pctQ3 = stats.targetQ3 > 0 ? ((stats.realisasiQ3 / stats.targetQ3) * 100).toFixed(1) : "0.0";
    const pctQ4 = stats.targetQ4 > 0 ? ((stats.realisasiQ4 / stats.targetQ4) * 100).toFixed(1) : "0.0";

    const sisaQ1 = stats.targetQ1 - stats.realisasiQ1;
    const sisaQ2 = stats.targetQ2 - stats.realisasiQ2;
    const sisaQ3 = stats.targetQ3 - stats.realisasiQ3;
    const sisaQ4 = stats.targetQ4 - stats.realisasiQ4;

    const triwulanHeaders = ["Triwulan", "Target Anggaran", "Realisasi Penyerapan", "Sisa Anggaran", "Persentase"];
    const triwulanRows = [
      ["Triwulan I (Q1)", formatRupiahLocal(stats.targetQ1), formatRupiahLocal(stats.realisasiQ1), formatRupiahLocal(sisaQ1), `${pctQ1}%`],
      ["Triwulan II (Q2)", formatRupiahLocal(stats.targetQ2), formatRupiahLocal(stats.realisasiQ2), formatRupiahLocal(sisaQ2), `${pctQ2}%`],
      ["Triwulan III (Q3)", formatRupiahLocal(stats.targetQ3), formatRupiahLocal(stats.realisasiQ3), formatRupiahLocal(sisaQ3), `${pctQ3}%`],
      ["Triwulan IV (Q4)", formatRupiahLocal(stats.targetQ4), formatRupiahLocal(stats.realisasiQ4), formatRupiahLocal(sisaQ4), `${pctQ4}%`],
    ];

    autoTable(doc, {
      head: [triwulanHeaders],
      body: triwulanRows,
      startY: nextY + 2,
      margin: { left: 12, right: 12 },
      theme: "grid",
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        lineColor: [226, 232, 240],
        textColor: [15, 23, 42],
        font: "helvetica"
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: "bold"
      },
      columnStyles: {
        0: { cellWidth: 36, fontStyle: "bold" },
        1: { cellWidth: 38, halign: "right" },
        2: { cellWidth: 38, halign: "right" },
        3: { cellWidth: 38, halign: "right" },
        4: { cellWidth: 36, halign: "right", fontStyle: "bold" }
      }
    });

    // 6. OFFICIAL VALIDATION / SIGNATURE SECTION
    nextY = (doc as any).lastAutoTable.finalY + 14;

    // Check if we would overflow the page
    if (nextY + 30 > 297) {
      doc.addPage();
      nextY = 20;
    }

    const stampX = pageWidth - 75;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`Biak, ${currentDateStr}`, stampX, nextY);
    
    doc.setFont("helvetica", "bold");
    doc.text(
      selectedDashboardSatwas.includes("ALL") 
        ? "Kepala Stasiun PSDKP Biak," 
        : `Koordinator ${shareName},`, 
      stampX, 
      nextY + 4.5
    );
    
    // Space for stamp or signature
    doc.setDrawColor(241, 245, 249); // very light grey for box outline of stamp area
    doc.setLineWidth(0.1);
    doc.rect(stampX - 5, nextY + 9, 65, 14);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text("[ TANDA TANGAN & STEMPEL DINAS ]", stampX + 7, nextY + 17);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text("TIM BULANAN MONITORING TIMJA SDK", stampX, nextY + 28);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text("NIP. 19780512 200212 1 002", stampX, nextY + 32.5);

    // Save PDF
    const fileName = `Laporan_Ringkasan_Satwas_${shareName.replace(/\s+/g, "_")}_2026.pdf`;
    doc.save(fileName);

    if (currentUser) {
      try {
        api.createLog({
          userId: currentUser.id,
          username: currentUser.nama || currentUser.username,
          userRole: currentUser.role,
          action: "CONFIG",
          menu: "Konfigurasi",
          description: `Mengunduh laporan ringkasan Satwas format PDF untuk wilayah: ${shareName}`,
        });
      } catch (err) {
        console.warn("Gagal mencatat log ekspor PDF Satwas:", err);
      }
    }

    success(`Laporan ringkasan kinerja ${shareName} berhasil diunduh dalam format PDF!`);
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

  const handleBulkVerifyDocs = async (ids: string[]) => {
    try {
      for (const id of ids) {
        await api.updateDokumen(id, { status: "Verifikasi" });
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
              description: `Mengubah verifikasi dokumen ${docName} secara massal menjadi status: Verifikasi`,
            });
          } catch (err) {
            console.warn("Gagal mencatat log dokumen:", err);
          }
        }
      }
      success(`${ids.length} berkas dokumen berhasil diverifikasi secara massal!`);
    } catch (err: any) {
      error(`Gagal melakukan verifikasi massal: ${err.message}`);
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
          <div className="bg-slate-950/90 border border-slate-800/60 p-6 rounded-3xl shadow-2xl relative space-y-5">
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
                    type={showPassword ? "text" : "password"}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 text-xs font-mono font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 focus:outline-none cursor-pointer p-1"
                    title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between py-1">
                <label className="flex items-center gap-2 text-slate-400 font-semibold cursor-pointer text-xs select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-800 text-cyan-600 focus:ring-cyan-500 focus:ring-opacity-25"
                  />
                  <span>Ingat Saya</span>
                </label>
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

            {/* Quick Role Selection Panel */}
            <div className="pt-2 border-t border-slate-800/60 space-y-2.5">
              <h3 className="text-center text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">
                Pilihan Masuk Sesuai Role (Isi Otomatis)
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    role: "Administrator",
                    user: "admin",
                    pass: "admin123",
                    desc: "Akses penuh sistem"
                  },
                  {
                    role: "Kepala Stasiun",
                    user: "kepala",
                    pass: "kepala123",
                    desc: "Monitoring & persetujuan"
                  },
                  {
                    role: "Verifikator",
                    user: "verifikator",
                    pass: "veri123",
                    desc: "Verifikasi lapangan"
                  },
                  {
                    role: "Satwas Biak",
                    user: "manokwari",
                    pass: "satwas123",
                    desc: "Input data Satwas"
                  }
                ].map((item) => (
                  <button
                    key={item.role}
                    type="button"
                    onClick={() => {
                      setLoginUsername(item.user);
                      setLoginPassword(item.pass);
                      success(`Form terisi untuk: ${item.role}`);
                    }}
                    className="p-2 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-left transition-all cursor-pointer"
                  >
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-[10px] font-black text-cyan-400 uppercase tracking-tight">
                        {item.role}
                      </span>
                    </div>
                    <p className="text-[8px] text-slate-500 font-medium leading-none mb-1">
                      {item.desc}
                    </p>
                    <div className="flex flex-col gap-0.5 text-[8px] font-mono text-slate-400 border-t border-slate-800/40 pt-1">
                      <div><span className="text-slate-600">Login:</span> <span className="text-slate-300 font-bold">{item.user}</span></div>
                      <div><span className="text-slate-600 font-sans">Pass:</span> <span className="text-slate-300 font-bold">{item.pass}</span></div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

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
          <AnimatePresence mode="wait">
            {/* TAB 1: DASHBOARD MAIN PAGE */}
            {activeTab === "dashboard" && filteredDashboardStats && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
                className="space-y-6"
              >
              
              {/* Kop Surat Dinas untuk Cetak Dashboard Kinerja */}
              <div className="hidden print-only block p-6 border-b-4 border-slate-900 bg-white text-slate-900 mb-6 rounded-xs">
                <div className="flex items-center gap-4 text-left justify-between pb-3">
                  <div className="flex items-center gap-4">
                    <img 
                      src="https://upload.wikimedia.org/wikipedia/commons/f/f0/Lambang_Kementerian_Kelautan_dan_Perikanan.png" 
                      alt="Logo KKP" 
                      className="w-14 h-14 object-contain"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 leading-none">Kementerian Kelautan dan Perikanan</h2>
                      <h1 className="text-base font-black uppercase tracking-tight text-slate-900 mt-1 leading-tight">Direktorat Jenderal Pengawasan Sumber Daya Kelautan dan Perikanan</h1>
                      <h2 className="text-xs font-extrabold text-sky-800 mt-0.5">Stasiun PSDKP Biak • Tahun Anggaran 2026</h2>
                    </div>
                  </div>
                  <div className="text-right font-mono text-[9px] text-slate-500 font-bold space-y-0.5">
                    <p>KLASIFIKASI: LAPORAN KINERJA DINAS</p>
                    <p>TANGGAL CETAK: {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                </div>
                <div className="w-full border-t border-slate-900 h-0.5 mt-1" />
                <h3 className="text-center font-extrabold text-sm mt-4 uppercase tracking-wide">
                  LAPORAN PENGAWASAN, KETAATAN PELAKU USAHA & KINERJA ANGGARAN TIMJA SDK
                </h3>
                <p className="text-center text-[10px] text-slate-500 font-bold mt-0.5 font-mono">
                  Wilayah Kerja Terfilter: {selectedDashboardSatwas.includes("ALL") ? "Seluruh Wilayah Satwas" : selectedDashboardSatwas.join(", ")}
                </p>
              </div>

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

              {/* Stats Counters Grid */}
              <KPICards stats={filteredDashboardStats} alertRules={satwasAlertRules[selectedDashboardSatwas]} />

              {/* Grid of Custom SVG Charts */}
              <DashboardChartsGrid stats={filteredDashboardStats} />

              {/* Filter Satwas Wilayah */}
              {!showSatwasFilterSection && (
                <div className="flex justify-end no-print">
                  <button
                    onClick={() => toggleSatwasFilterSection(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-extrabold text-slate-500 hover:text-sky-600 bg-white hover:bg-sky-50 border border-slate-200 hover:border-sky-200 rounded-xl transition-all cursor-pointer shadow-xs"
                    title="Tampilkan Kembali Filter Penyaringan Wilayah"
                  >
                    <Sliders className="w-3.5 h-3.5 text-sky-500" />
                    Tampilkan Penyaringan Wilayah (Satwas)
                  </button>
                </div>
              )}

              {showSatwasFilterSection && (
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-200 p-5 rounded-3xl shadow-xs relative">
                  <button
                    onClick={() => toggleSatwasFilterSection(false)}
                    className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer no-print"
                    title="Hapus / Sembunyikan Penyaringan Satwas"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="space-y-1 pr-8">
                    <h3 className="text-sm font-black text-slate-850 flex items-center gap-2">
                      <span className="w-1.5 h-4 bg-sky-500 rounded-xs inline-block" />
                      Penyaringan Wilayah Kerja (Satwas)
                    </h3>
                    <p className="text-[10px] text-slate-400 font-semibold font-sans">
                      Lihat statistik performa ketaatan dan alokasi anggaran spesifik per wilayah kerja satwas
                    </p>
                  </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                  <div className="w-full sm:w-auto flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <div ref={satwasDropdownRef} className="relative flex-1 min-w-[200px]">
                      {/* Trigger Button with id="dashboard-satwas-filter" */}
                      <motion.button
                        id="dashboard-satwas-filter"
                        onClick={() => {
                          setIsSatwasDropdownOpen(!isSatwasDropdownOpen);
                          setSatwasSearchQuery(""); // clear query on open/toggle
                        }}
                        animate={isResettingFilter ? {
                          scale: [1, 1.04, 0.96, 1.01, 1],
                          rotate: [0, -1.5, 1.5, -0.8, 0],
                          borderColor: ["#e2e8f0", "#06b6d4", "#06b6d4", "#e2e8f0"],
                          boxShadow: [
                            "0 0 0 0 rgba(6, 182, 212, 0)",
                            "0 0 0 8px rgba(6, 182, 212, 0.25)",
                            "0 0 0 4px rgba(6, 182, 212, 0.15)",
                            "0 0 0 0 rgba(6, 182, 212, 0)"
                          ]
                        } : {}}
                        transition={{ duration: 0.6, ease: "easeInOut" }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-extrabold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all cursor-pointer flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="truncate">
                            {selectedDashboardSatwas.includes("ALL") 
                              ? "Semua Satwas Wilayah" 
                              : selectedDashboardSatwas.join(", ")}
                          </span>
                          {!selectedDashboardSatwas.includes("ALL") && selectedDashboardSatwas.length > 1 && (
                            <span className="bg-sky-600 text-white font-black px-1.5 py-0.5 text-[9px] rounded-full shrink-0 whitespace-nowrap min-w-[18px] text-center">
                              {selectedDashboardSatwas.length}
                            </span>
                          )}
                          {totalAlertsForSelected > 0 && (
                            <span className="bg-rose-550 bg-rose-500 text-white font-black px-2 py-0.5 text-[9px] rounded-lg animate-pulse shrink-0 whitespace-nowrap">
                              {totalAlertsForSelected} Aktif
                            </span>
                          )}
                          <div 
                            className="relative inline-block"
                            onMouseEnter={() => setIsFilterTooltipOpen(true)}
                            onMouseLeave={() => setIsFilterTooltipOpen(false)}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 transition-colors cursor-help shrink-0" />
                            <AnimatePresence>
                              {isFilterTooltipOpen && (
                                <motion.div
                                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                  className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 bg-slate-900 text-slate-100 p-3 rounded-xl shadow-xl border border-slate-800 z-50 text-[10px] space-y-1.5 pointer-events-none text-left"
                                >
                                  <div className="font-extrabold text-white border-b border-slate-800 pb-1 flex items-center gap-1.5 uppercase tracking-wider">
                                    <span className="w-1.5 h-1.5 bg-sky-400 rounded-full inline-block animate-pulse" />
                                    Info Wilayah Kerja
                                  </div>
                                  <div className="space-y-1 font-sans text-xs">
                                    <div>
                                      <span className="text-slate-400 text-[10px] font-bold block uppercase tracking-wide">Nama Lengkap:</span>
                                      <span className="font-extrabold text-slate-200 block text-xs leading-tight">{selectedSatwasTooltipInfo.fullName}</span>
                                    </div>
                                    <div>
                                      <span className="text-slate-400 text-[10px] font-bold block uppercase tracking-wide">Cakupan Wilayah:</span>
                                      <span className="font-semibold text-slate-300 block text-[11px] leading-tight">{selectedSatwasTooltipInfo.wilayah}</span>
                                    </div>
                                    <div className="flex justify-between items-center border-t border-slate-800/60 pt-1.5 mt-1.5">
                                      <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wide">Pemeriksaan 2026:</span>
                                      <span className="font-black text-sky-400 text-xs">{selectedSatwasTooltipInfo.inspectionsCountThisYear} Kegiatan</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wide">Pembaruan:</span>
                                      <span className="font-mono text-emerald-400 text-[11px]">{selectedSatwasTooltipInfo.lastUpdateStr}</span>
                                    </div>
                                  </div>
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-slate-900" />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                          <span
                            role="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadSatwasCSV();
                            }}
                            className="bg-sky-50 hover:bg-sky-100 active:bg-sky-200 text-sky-700 p-1 rounded-lg transition-colors flex items-center justify-center shrink-0 ml-1 cursor-pointer border border-sky-100/60 shadow-sm no-print"
                            title="Ekspor Data Pemeriksaan ke CSV"
                          >
                            <Download className="w-3.5 h-3.5 text-sky-600" />
                          </span>
                          <span
                            role="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadSatwasPDF();
                            }}
                            className="bg-teal-50 hover:bg-teal-100 active:bg-teal-200 text-teal-750 p-1 rounded-lg transition-colors flex items-center justify-center shrink-0 ml-1 cursor-pointer border border-teal-100/60 shadow-sm no-print"
                            title="Unduh Ringkasan Kinerja Satwas (PDF)"
                          >
                            <FileText className="w-3.5 h-3.5 text-teal-600" />
                          </span>
                        </div>
                        <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${isSatwasDropdownOpen ? "rotate-180" : ""}`} />
                      </motion.button>

                      {/* Dropdown Popover */}
                      <AnimatePresence>
                        {isSatwasDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -8, scale: 0.95 }}
                            animate={{ opacity: 1, y: 4, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.95 }}
                            transition={{ duration: 0.15, ease: "easeOut" }}
                            className="absolute z-50 left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-xl p-2.5 space-y-2 mt-1 max-h-72 flex flex-col overflow-hidden"
                          >
                            {/* Search Box */}
                            <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-sky-500/20 focus-within:border-sky-500 transition-all">
                              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-1.5" />
                              <input
                                type="text"
                                placeholder="Cari wilayah satwas..."
                                value={satwasSearchQuery}
                                onChange={(e) => setSatwasSearchQuery(e.target.value)}
                                className="w-full bg-transparent border-none text-xs text-slate-700 placeholder-slate-400 focus:outline-none py-0.5 font-extrabold"
                                autoFocus
                              />
                              {satwasSearchQuery && (
                                <button 
                                  onClick={() => setSatwasSearchQuery("")}
                                  className="text-slate-400 hover:text-slate-600 transition-colors p-0.5"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>

                            {/* Options List */}
                            <div className="overflow-y-auto flex-1 space-y-0.5 pr-1 max-h-48 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                              {/* Option: "Select All" */}
                              <button
                                onClick={() => {
                                  const isAllSelected = selectedDashboardSatwas.includes("ALL");
                                  if (isAllSelected) {
                                    // Toggle off Select All -> select just the first Satwas as fallback
                                    const fallback = satwasList.length > 0 ? [satwasList[0].nama_satwas] : ["ALL"];
                                    setSelectedDashboardSatwas(fallback);
                                    info(`Memilih Satwas ${satwasList[0]?.nama_satwas || ""} (Minimal satu Satwas harus terpilih)`);
                                  } else {
                                    setSelectedDashboardSatwas(["ALL"]);
                                  }
                                }}
                                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                                  selectedDashboardSatwas.includes("ALL")
                                    ? "bg-sky-50 text-sky-700"
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <motion.div
                                    initial={false}
                                    animate={selectedDashboardSatwas.includes("ALL") ? "checked" : "unchecked"}
                                    variants={{
                                      unchecked: { scale: 1, backgroundColor: "#ffffff", borderColor: "#cbd5e1" },
                                      checked: { scale: [1, 0.85, 1.1, 1], backgroundColor: "#0ea5e9", borderColor: "#0ea5e9" }
                                    }}
                                    transition={{ duration: 0.25, ease: "easeInOut" }}
                                    className="w-4 h-4 rounded-md border flex items-center justify-center shrink-0 shadow-xs"
                                  >
                                    <svg
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="4"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      className="w-3 h-3 text-white"
                                    >
                                      <motion.path
                                        d="M20 6L9 17l-5-5"
                                        variants={{
                                          unchecked: { pathLength: 0, opacity: 0 },
                                          checked: { pathLength: 1, opacity: 1 }
                                        }}
                                        transition={{ duration: 0.2, ease: "easeOut" }}
                                      />
                                    </svg>
                                  </motion.div>
                                  <span>Semua Satwas Wilayah (Select All)</span>
                                  {satwasAlertCounts["ALL"] > 0 && (
                                    <span className="bg-rose-550/10 text-rose-600 text-[9px] px-1.5 py-0.5 rounded-full font-black">
                                      {satwasAlertCounts["ALL"]} Aktif
                                    </span>
                                  )}
                                </div>
                                {selectedDashboardSatwas.includes("ALL") && (
                                  <Check className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                                )}
                              </button>

                              {/* Map Satwas List */}
                              {satwasList
                                .filter((sat) => 
                                  sat.nama_satwas.toLowerCase().includes(satwasSearchQuery.toLowerCase())
                                )
                                .map((sat) => {
                                  const isAllSelected = selectedDashboardSatwas.includes("ALL");
                                  const isSelected = isAllSelected || selectedDashboardSatwas.includes(sat.nama_satwas);
                                  return (
                                    <button
                                      key={sat.id}
                                      onClick={() => {
                                        let newSelection;
                                        if (isSelected) {
                                          if (isAllSelected) {
                                            // Since it was "ALL" and now we deselect one, we select all EXCEPT this one
                                            newSelection = satwasList
                                              .map(s => s.nama_satwas)
                                              .filter(name => name !== sat.nama_satwas);
                                          } else {
                                            newSelection = selectedDashboardSatwas.filter(item => item !== sat.nama_satwas);
                                          }
                                        } else {
                                          newSelection = [...selectedDashboardSatwas.filter(item => item !== "ALL"), sat.nama_satwas];
                                        }
                                        
                                        // If empty or all are selected, fallback to ["ALL"]
                                        const finalSelection = (newSelection.length === 0 || newSelection.length === satwasList.length)
                                          ? ["ALL"]
                                          : newSelection;
                                          
                                        setSelectedDashboardSatwas(finalSelection);
                                      }}
                                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                                        isSelected
                                          ? "bg-sky-50 text-sky-700"
                                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 truncate">
                                        <motion.div
                                          initial={false}
                                          animate={isSelected ? "checked" : "unchecked"}
                                          variants={{
                                            unchecked: { scale: 1, backgroundColor: "#ffffff", borderColor: "#cbd5e1" },
                                            checked: { scale: [1, 0.85, 1.1, 1], backgroundColor: "#0ea5e9", borderColor: "#0ea5e9" }
                                          }}
                                          transition={{ duration: 0.25, ease: "easeInOut" }}
                                          className="w-4 h-4 rounded-md border flex items-center justify-center shrink-0 shadow-xs"
                                        >
                                          <svg
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            className="w-3 h-3 text-white"
                                          >
                                            <motion.path
                                              d="M20 6L9 17l-5-5"
                                              variants={{
                                                unchecked: { pathLength: 0, opacity: 0 },
                                                checked: { pathLength: 1, opacity: 1 }
                                              }}
                                              transition={{ duration: 0.2, ease: "easeOut" }}
                                            />
                                          </svg>
                                        </motion.div>
                                        <span className="truncate">{sat.nama_satwas}</span>
                                        {satwasAlertCounts[sat.nama_satwas] > 0 && (
                                          <span className="bg-rose-500/10 text-rose-600 text-[9px] px-1.5 py-0.5 rounded-full font-black">
                                            {satwasAlertCounts[sat.nama_satwas]} Aktif
                                          </span>
                                        )}
                                      </div>
                                      {isSelected && (
                                        <Check className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                                      )}
                                    </button>
                                  );
                                })}

                              {satwasList.filter((sat) => 
                                sat.nama_satwas.toLowerCase().includes(satwasSearchQuery.toLowerCase())
                              ).length === 0 && (
                                <div className="text-center py-4 text-[10px] font-bold text-slate-400 font-sans">
                                  Tidak ada satwas ditemukan
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Date Range Controls */}
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-1 shadow-sm h-[38px] min-w-[280px] w-full sm:w-auto">
                      <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                      <div className="flex items-center gap-1.5 flex-1">
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider leading-none">Mulai</span>
                          <input
                            type="date"
                            value={dashboardStartDate}
                            onChange={(e) => setDashboardStartDate(e.target.value)}
                            className="bg-transparent border-none text-[10px] font-extrabold text-slate-700 focus:outline-none p-0 cursor-pointer w-[95px] max-w-[100px]"
                            title="Tanggal Mulai"
                          />
                        </div>
                        <div className="h-4 w-[1px] bg-slate-200 self-center shrink-0" />
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider leading-none">Selesai</span>
                          <input
                            type="date"
                            value={dashboardEndDate}
                            onChange={(e) => setDashboardEndDate(e.target.value)}
                            className="bg-transparent border-none text-[10px] font-extrabold text-slate-700 focus:outline-none p-0 cursor-pointer w-[95px] max-w-[100px]"
                            title="Tanggal Selesai"
                          />
                        </div>
                      </div>
                      {(dashboardStartDate || dashboardEndDate) && (
                        <button
                          type="button"
                          onClick={() => {
                            setDashboardStartDate("");
                            setDashboardEndDate("");
                          }}
                          className="p-1 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-lg transition-all ml-auto cursor-pointer flex items-center justify-center shrink-0"
                          title="Reset Filter Tanggal"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Alert Rules Setting Button */}
                    <button
                      onClick={() => setIsAlertRulesModalOpen(true)}
                      className={`px-3 py-2.5 rounded-2xl border text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap no-print shadow-sm h-[38px] ${
                        satwasAlertRules[activeAlertRuleKey] && 
                        (satwasAlertRules[activeAlertRuleKey].minInspections || 
                         satwasAlertRules[activeAlertRuleKey].maxBudgetVariance || 
                         satwasAlertRules[activeAlertRuleKey].minCompliance)
                          ? "bg-rose-50 border-rose-300 text-rose-700 hover:bg-rose-100"
                          : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                      }`}
                      title={`Klik untuk mengatur ambang batas peringatan Satwas (${selectedDashboardSatwas.includes("ALL") ? "Global" : selectedDashboardSatwas.join(", ")})`}
                    >
                      <Sliders className="w-4 h-4 text-slate-500" />
                      <span>Alert Rules</span>
                      {satwasAlertRules[activeAlertRuleKey] && 
                       (satwasAlertRules[activeAlertRuleKey].minInspections || 
                        satwasAlertRules[activeAlertRuleKey].maxBudgetVariance || 
                        satwasAlertRules[activeAlertRuleKey].minCompliance) ? (
                        <span className="w-2 h-2 rounded-full bg-rose-500 block animate-pulse" />
                      ) : null}
                    </button>

                    {/* Sync every minute Toggle Button */}
                    <button
                      onClick={() => {
                        if (selectedDashboardSatwas.includes("ALL")) {
                          warning("Silakan pilih salah satu wilayah Satwas spesifik terlebih dahulu untuk mengaktifkan sinkronisasi otomatis per menit!");
                          return;
                        }
                        setIsAutoSyncEnabled(!isAutoSyncEnabled);
                        if (!isAutoSyncEnabled) {
                          success("Sinkronisasi otomatis per menit diaktifkan!");
                        } else {
                          info("Sinkronisasi otomatis dinonaktifkan.");
                        }
                      }}
                      className={`px-3 py-2.5 rounded-2xl border text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap no-print shadow-sm h-[38px] ${
                        isAutoSyncEnabled && !selectedDashboardSatwas.includes("ALL")
                          ? "bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                          : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                      }`}
                      title={
                        selectedDashboardSatwas.includes("ALL")
                          ? "Pilih Satwas spesifik untuk mengaktifkan real-time data refresh per menit"
                          : `Klik untuk ${isAutoSyncEnabled ? 'menonaktifkan' : 'mengaktifkan'} real-time refresh per menit`
                      }
                    >
                      <span className="relative flex h-2 w-2">
                        {isAutoSyncEnabled && !selectedDashboardSatwas.includes("ALL") && (
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        )}
                        <span className={`relative inline-flex rounded-full h-2 w-2 ${
                          isAutoSyncEnabled && !selectedDashboardSatwas.includes("ALL") ? "bg-emerald-500" : "bg-slate-400"
                        }`}></span>
                      </span>
                      <span>Sync 1m</span>
                    </button>

                    <motion.button
                      id="dashboard-satwas-reset"
                      onClick={() => {
                        setSelectedDashboardSatwas(["ALL"]);
                        syncAllData(true);
                        setIsResettingFilter(true);
                        setTimeout(() => setIsResettingFilter(false), 800);
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      animate={isResettingFilter ? {
                        scale: [1, 0.9, 1.15, 1],
                        rotate: [0, -12, 12, 0]
                      } : {}}
                      className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-extrabold text-xs rounded-2xl transition-all duration-200 shadow-sm flex items-center justify-center gap-1.5 border border-slate-200 cursor-pointer whitespace-nowrap no-print"
                      title="Reset filter ke 'Semua Satwas Wilayah' dan Muat Ulang Data"
                    >
                      <motion.div
                        animate={isResettingFilter ? { rotate: -360 } : { rotate: 0 }}
                        transition={{ duration: 0.6, ease: "easeInOut" }}
                        className="flex items-center justify-center"
                      >
                        <RotateCcw className="w-4 h-4 text-slate-500" />
                      </motion.div>
                      <span>Reset</span>
                    </motion.button>
                  </div>

                  <button
                    onClick={handleDownloadCSV}
                    className="w-full sm:w-auto px-4 py-2.5 bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white font-extrabold text-xs rounded-2xl transition-all duration-200 shadow-sm flex items-center justify-center gap-2 border border-sky-400/20 whitespace-nowrap cursor-pointer no-print"
                  >
                    <Download className="w-4 h-4 text-sky-100" />
                    Unduh Data
                  </button>

                  <button
                    onClick={() => window.print()}
                    className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-900 active:bg-slate-950 text-white font-extrabold text-xs rounded-2xl transition-all duration-200 shadow-sm flex items-center justify-center gap-2 border border-slate-700 whitespace-nowrap cursor-pointer no-print"
                    title="Cetak Laporan Dashboard Kinerja Utama"
                  >
                    <Printer className="w-4 h-4 text-cyan-400" />
                    Cetak Dashboard
                  </button>

                  <button
                    onClick={handleDownloadDashboardPDF}
                    className="w-full sm:w-auto px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-extrabold text-xs rounded-2xl transition-all duration-200 shadow-sm flex items-center justify-center gap-2 border border-rose-500/20 whitespace-nowrap cursor-pointer no-print"
                    title="Ekspor Laporan Dashboard Kinerja Utama sebagai PDF Resmi"
                  >
                    <Download className="w-4 h-4 text-rose-100" />
                    Ekspor PDF
                  </button>

                  <button
                    onClick={() => {
                      const shareUrl = `${window.location.origin}${window.location.pathname}?tab=dashboard&satwas=${encodeURIComponent(selectedDashboardSatwas.join(","))}`;
                      setQrModalUrl(shareUrl);
                      setQrModalTitle(`Dashboard Kinerja - ${selectedDashboardSatwas.includes("ALL") ? "Semua Satwas" : selectedDashboardSatwas.join(", ")}`);
                      setQrModalDescription(`Laporan kinerja pemantauan, ketaatan pelaku usaha, dan indeks kinerja utama Timja SDK untuk wilayah kerja ${selectedDashboardSatwas.includes("ALL") ? "Semua Satwas Wilayah" : selectedDashboardSatwas.join(", ")}.`);
                      setQrModalOpen(true);
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 active:bg-cyan-800 text-white font-extrabold text-xs rounded-2xl transition-all duration-200 shadow-sm flex items-center justify-center gap-2 border border-cyan-500/20 whitespace-nowrap cursor-pointer no-print"
                    title="Buat Kode QR untuk Tampilan Ini"
                  >
                    <QrCode className="w-4 h-4 text-cyan-100" />
                    QR Akses
                  </button>
                </div>
              </div>
              )}

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
            </motion.div>
          )}



          {/* TAB 2: MATRIK PEMERIKSAAN LEDGER */}
          {activeTab === "pemeriksaan" && (
            <motion.div
              key="pemeriksaan"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
              className="space-y-6"
            >
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
                  onDeleteDoc={handleDeleteDoc}
                />
              ) : (
                filteredDashboardStats && (
                  <div className="space-y-6">
                    
                    {/* Kop Surat Dinas untuk Cetak Laporan Anggaran */}
                    <div className="hidden print-only block p-6 border-b-4 border-slate-900 bg-white text-slate-900 mb-6 rounded-xs">
                      <div className="flex items-center gap-4 text-left justify-between pb-3">
                        <div className="flex items-center gap-4">
                          <img 
                            src="https://upload.wikimedia.org/wikipedia/commons/f/f0/Lambang_Kementerian_Kelautan_dan_Perikanan.png" 
                            alt="Logo KKP" 
                            className="w-14 h-14 object-contain"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 leading-none">Kementerian Kelautan dan Perikanan</h2>
                            <h1 className="text-base font-black uppercase tracking-tight text-slate-900 mt-1 leading-tight">Direktorat Jenderal Pengawasan Sumber Daya Kelautan dan Perikanan</h1>
                            <h2 className="text-xs font-extrabold text-sky-800 mt-0.5">Stasiun PSDKP Biak • Bidang Anggaran & Keuangan</h2>
                          </div>
                        </div>
                        <div className="text-right font-mono text-[9px] text-slate-500 font-bold space-y-0.5">
                          <p>KLASIFIKASI: LAPORAN PENYERAPAN ANGGARAN</p>
                          <p>TANGGAL CETAK: {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>
                      </div>
                      <div className="w-full border-t border-slate-900 h-0.5 mt-1" />
                      <h3 className="text-center font-extrabold text-sm mt-4 uppercase tracking-wide">
                        LAPORAN REALISASI & PENYERAPAN ANGGARAN DINAS - TIMJA SDK
                      </h3>
                      <p className="text-center text-[10px] text-slate-500 font-bold mt-0.5 font-mono">
                        Wilayah Kerja Terfilter: {selectedDashboardSatwas.includes("ALL") ? "Seluruh Wilayah Satwas" : selectedDashboardSatwas.join(", ")}
                      </p>
                    </div>

                    {/* Filter Satwas Wilayah untuk Anggaran */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-200 p-5 rounded-3xl shadow-xs">
                      <div className="space-y-1">
                        <h3 className="text-sm font-black text-slate-850 flex items-center gap-2">
                          <span className="w-1.5 h-4 bg-emerald-50 rounded-xs inline-block" />
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
                            value={selectedDashboardSatwas.includes("ALL") ? "ALL" : selectedDashboardSatwas[0]}
                            onChange={(e) => setSelectedDashboardSatwas([e.target.value])}
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
                          className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-xs rounded-2xl transition-all duration-200 shadow-sm flex items-center justify-center gap-2 border border-emerald-500/20 whitespace-nowrap cursor-pointer no-print"
                        >
                          <Download className="w-4 h-4 text-emerald-100" />
                          Unduh Data
                        </button>

                        <button
                          onClick={() => window.print()}
                          className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-900 active:bg-slate-950 text-white font-extrabold text-xs rounded-2xl transition-all duration-200 shadow-sm flex items-center justify-center gap-2 border border-slate-700 whitespace-nowrap cursor-pointer no-print"
                          title="Cetak Laporan Penyerapan Anggaran"
                        >
                          <Printer className="w-4 h-4 text-cyan-400" />
                          Cetak Laporan
                        </button>

                        <button
                          onClick={() => {
                            const shareUrl = `${window.location.origin}${window.location.pathname}?tab=anggaran&satwas=${encodeURIComponent(selectedDashboardSatwas.join(","))}`;
                            setQrModalUrl(shareUrl);
                            setQrModalTitle(`Laporan Anggaran - ${selectedDashboardSatwas.includes("ALL") ? "Semua Satwas" : selectedDashboardSatwas.join(", ")}`);
                            setQrModalDescription(`Laporan realisasi penyerapan anggaran, monitoring target per triwulan (Q1 - Q4) Timja SDK untuk wilayah kerja ${selectedDashboardSatwas.includes("ALL") ? "Semua Satwas Wilayah" : selectedDashboardSatwas.join(", ")}.`);
                            setQrModalOpen(true);
                          }}
                          className="w-full sm:w-auto px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 active:bg-cyan-800 text-white font-extrabold text-xs rounded-2xl transition-all duration-200 shadow-sm flex items-center justify-center gap-2 border border-cyan-500/20 whitespace-nowrap cursor-pointer no-print"
                          title="Buat Kode QR untuk Tampilan Ini"
                        >
                          <QrCode className="w-4 h-4 text-cyan-100" />
                          QR Akses
                        </button>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-4">
                        <div>
                          <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                            <span className="w-1.5 h-4 bg-emerald-500 rounded-xs inline-block" />
                            Pemantauan Penyerapan Anggaran per Triwulan (Q1 - Q4) - {selectedDashboardSatwas.includes("ALL") ? "Semua Wilayah" : selectedDashboardSatwas.join(", ")}
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
            </motion.div>
          )}

          {/* TAB 3: TEMUAN MONITOR */}
          {activeTab === "temuan" && (
            <motion.div
              key="temuan"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
            >
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
            </motion.div>
          )}

          {/* TAB 4: REPOSITORY DOKUMEN DRIVE */}
          {activeTab === "dokumen" && (
            <motion.div
              key="dokumen"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
            >
              <DokumenList
                documents={documents}
                pemeriksaanList={pemeriksaan}
                userRole={currentUser.role}
                onCreateDoc={handleCreateDoc}
                onVerifyDoc={handleVerifyDoc}
                onDeleteDoc={handleDeleteDoc}
                onBulkVerifyDocs={handleBulkVerifyDocs}
              />
            </motion.div>
          )}

          {/* TAB 5: LAPORAN & CERTIFICATE EXPORT */}
          {activeTab === "laporan" && (
            <motion.div
              key="laporan"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
            >
              <LaporanFilter records={pemeriksaan} satwasList={satwasList} />
            </motion.div>
          )}

          {/* TAB 5.5: GOOGLE WORKSPACE REST API INTEGRATION */}
          {activeTab === "workspace" && currentUser && (
            <motion.div
              key="workspace"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
            >
              <GoogleWorkspaceManager
                user={currentUser}
                pemeriksaanList={pemeriksaan}
                onAddPemeriksaan={handlePemeriksaanSubmit}
                googleAccessToken={googleAccessToken}
                onGoogleSignIn={handleGoogleSignInClick}
              />
            </motion.div>
          )}

          {/* TAB 6: USER REGISTRATION */}
          {activeTab === "users" && (
            <motion.div
              key="users"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
            >
              <UserManagement
                users={usersList}
                currentSessionUser={currentUser}
                onCreateUser={handleCreateUser}
                onUpdateUser={handleUpdateUser}
                onDeleteUser={handleDeleteUser}
              />
            </motion.div>
          )}

          {/* TAB 7: SYSTEM CONFIG API SETTINGS (ADMIN ONLY) */}
          {activeTab === "config" && currentUser.role === "Administrator" && (
            <motion.div
              key="config"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
            >
              <ConfigSettings config={config} satwasList={satwasList} onUpdateConfig={handleUpdateConfig} />
            </motion.div>
          )}

          {/* TAB 8: AUDIT LOGS (ADMIN ONLY) */}
          {activeTab === "logs" && currentUser.role === "Administrator" && (
            <motion.div
              key="logs"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
            >
              <ActivityLogList />
            </motion.div>
          )}

          {/* TAB 9: AI VOICE ASSISTANT */}
          {activeTab === "ai-assistant" && currentUser && (
            <motion.div
              key="ai-assistant"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
            >
              <AIVoiceAssistant
                user={currentUser}
                activeTab={activeTab}
                dashboardStats={dashboardStats || undefined}
              />
            </motion.div>
          )}

          </AnimatePresence>
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

      {/* QR CODE GENERATOR MODAL */}
      <QRCodeModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        url={qrModalUrl}
        title={qrModalTitle}
        description={qrModalDescription}
      />

      {/* ALERT RULES CONFIGURATION MODAL */}
      <AlertRulesModal
        isOpen={isAlertRulesModalOpen}
        onClose={() => setIsAlertRulesModalOpen(false)}
        selectedSatwas={activeAlertRuleKey}
        currentRules={satwasAlertRules[activeAlertRuleKey]}
        onSave={(rules) => {
          const updated = { ...satwasAlertRules };
          if (rules === null) {
            delete updated[activeAlertRuleKey];
            info(`Aturan peringatan untuk Satwas ${activeAlertRuleKey === "ALL" ? "Global" : activeAlertRuleKey} telah dihapus.`);
          } else {
            updated[activeAlertRuleKey] = rules;
            success(`Aturan peringatan untuk Satwas ${activeAlertRuleKey === "ALL" ? "Global" : activeAlertRuleKey} berhasil disimpan!`);
          }
          setSatwasAlertRules(updated);
          localStorage.setItem("satwas_alert_rules", JSON.stringify(updated));
        }}
      />

    </div>
  );

  // Helper trigger to activate add-form view on documents tab
  function setShowAddFormTriggerInDocumentList() {
    // We can simulate click or state inside DocumentList.
  }
}
