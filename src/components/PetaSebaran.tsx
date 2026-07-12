import React, { useState, useMemo, useEffect, useRef } from "react";
import { Pemeriksaan, MasterSatwas } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { MapPin, Search, Calendar, ShieldCheck, ShieldAlert, Navigation, Layers, Compass, ZoomIn, ZoomOut, ListFilter, Info, Check, Eye, RefreshCw, Radio, Anchor, Globe } from "lucide-react";

interface PetaSebaranProps {
  records: Pemeriksaan[];
  satwasList: MasterSatwas[];
}

// Coordinates translation config
// Papua Longitude: 133.0E to 141.0E (8 degrees) -> maps to x: 0% to 100%
// Papua Latitude: 0.0S to -4.0S (4 degrees) -> maps to y: 0% to 100%
const SATWAS_COORDINATES: Record<string, { lat: number; lng: number; x: number; y: number; name: string; desc: string }> = {
  "Stasiun PSDKP Biak": { 
    lat: -1.185, 
    lng: 136.06, 
    x: 38.25, 
    y: 29.6, 
    name: "Stasiun PSDKP Biak", 
    desc: "Kantor Pusat / Wilayah Administratif Utama Biak Numfor" 
  },
  "Satwas SDKP Manokwari": { 
    lat: -0.86, 
    lng: 134.06, 
    x: 13.25, 
    y: 21.5, 
    name: "Satwas SDKP Manokwari", 
    desc: "Wilayah Pengawasan Papua Barat & Pantai Utara Kepala Burung" 
  },
  "Satwas SDKP Jayapura": { 
    lat: -2.54, 
    lng: 140.70, 
    x: 96.25, 
    y: 63.5, 
    name: "Satwas SDKP Jayapura", 
    desc: "Wilayah Pengawasan Perbatasan RI-PNG & Pantai Timur" 
  },
  "Satwas SDK Nabire": { 
    lat: -3.37, 
    lng: 135.50, 
    x: 31.25, 
    y: 84.25, 
    name: "Satwas SDK Nabire", 
    desc: "Wilayah Pengawasan Cenderawasih Bay & Leher Kepala Burung" 
  },
  "Satwas SDKP Nabire": { 
    lat: -3.37, 
    lng: 135.50, 
    x: 31.25, 
    y: 84.25, 
    name: "Satwas SDK Nabire", 
    desc: "Wilayah Pengawasan Cenderawasih Bay & Leher Kepala Burung" 
  },
};

const getSatwasCoords = (name: string) => {
  const norm = name.toLowerCase();
  if (norm.includes("biak")) return SATWAS_COORDINATES["Stasiun PSDKP Biak"];
  if (norm.includes("manokwari")) return SATWAS_COORDINATES["Satwas SDKP Manokwari"];
  if (norm.includes("jayapura")) return SATWAS_COORDINATES["Satwas SDKP Jayapura"];
  if (norm.includes("nabire")) return SATWAS_COORDINATES["Satwas SDK Nabire"];
  return SATWAS_COORDINATES["Stasiun PSDKP Biak"];
};

export const PetaSebaran: React.FC<PetaSebaranProps> = ({ records, satwasList }) => {
  const [selectedSatwas, setSelectedSatwas] = useState<string>("ALL");
  const [hoveredSatwas, setHoveredSatwas] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [complianceFilter, setComplianceFilter] = useState<"ALL" | "TAAT" | "TIDAK TAAT">("ALL");
  const [monthFilter, setMonthFilter] = useState<string>("");
  const [showGrid, setShowGrid] = useState(true);
  const [activeTab, setActiveTab] = useState<"map" | "list">("map");
  const [mapStyle, setMapStyle] = useState<"satellite" | "hybrid" | "tactical" | "classic">("satellite");
  const [satelliteOpacity, setSatelliteOpacity] = useState<number>(100);
  const [legendTab, setLegendTab] = useState<"symbols" | "stats">("symbols");
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState<boolean>(false);

  // Zoom & Pan responsive map states
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Live simulated patrol vessels state
  const [vessels, setVessels] = useState([
    { id: "v1", name: "KP. ORCA 04", x: 42, y: 35, speed: "14.5 Knot", heading: 120, status: "Operasi Patroli Rutin" },
    { id: "v2", name: "KP. HIU MACAN 05", x: 80, y: 50, speed: "16.2 Knot", heading: 45, status: "Pemeriksaan Kapal" },
    { id: "v3", name: "KP. HIU 11", x: 22, y: 28, speed: "12.0 Knot", heading: 290, status: "Siaga Pengawasan" }
  ]);

  // Live telemetry events queue state
  const [liveEvents, setLiveEvents] = useState<string[]>([
    "Sistem satelit AIS terhubung ke Pusat Pemantauan PSDKP Biak",
    "KP. ORCA 04 mendeteksi target kapal perikanan aktif di Selat Yapen",
    "KP. HIU MACAN 05 memulai patroli rutin di sektor pantai utara Jayapura",
    "Satelit radar mengunduh 3 laporan citra awan baru wilayah Numfor"
  ]);

  // Live simulations timer
  useEffect(() => {
    // Vessel motion simulation
    const movementInterval = setInterval(() => {
      setVessels(prev => prev.map(v => {
        let dx = (Math.random() - 0.5) * 1.5;
        let dy = (Math.random() - 0.5) * 1.5;
        
        let newX = v.x + dx;
        let newY = v.y + dy;
        if (newX < 10) newX = 15;
        if (newX > 90) newX = 85;
        if (newY < 15) newY = 20;
        if (newY > 85) newY = 80;

        let headingChange = Math.round((Math.random() - 0.5) * 20);
        let newHeading = (v.heading + headingChange + 360) % 360;
        let speedVal = parseFloat(v.speed) + (Math.random() - 0.5) * 1.0;
        if (speedVal < 8) speedVal = 8;
        if (speedVal > 22) speedVal = 22;

        return {
          ...v,
          x: parseFloat(newX.toFixed(2)),
          y: parseFloat(newY.toFixed(2)),
          heading: newHeading,
          speed: `${speedVal.toFixed(1)} Knot`
        };
      }));
    }, 4000);

    // Live events feed ticker rotating simulation
    const tickerInterval = setInterval(() => {
      const places = ["Biak", "Manokwari", "Jayapura", "Nabire", "Yapen", "Numfor", "Supiori"];
      const vesselsNames = ["KP. ORCA 04", "KP. HIU MACAN 05", "KP. HIU 11"];
      const acts = [
        "melakukan pemantauan radar AIS real-time",
        "menghubungi pangkalan induk koordinat S-4",
        "melaporkan kondisi cuaca laut cerah berawan",
        "mengonfirmasi status ketaatan kapal nelayan setempat",
        "memulai patroli taktis perairan teritorial",
        "mendeteksi anomali sinyal kapal asing (nihil pelanggaran)"
      ];

      const randomPlace = places[Math.floor(Math.random() * places.length)];
      const randomVessel = vesselsNames[Math.floor(Math.random() * vesselsNames.length)];
      const randomAct = acts[Math.floor(Math.random() * acts.length)];
      const timeStr = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      
      const newEvent = `[${timeStr}] ${randomVessel} di wilayah ${randomPlace} sedang ${randomAct}.`;
      
      setLiveEvents(prev => [newEvent, ...prev.slice(0, 5)]);
    }, 6000);

    return () => {
      clearInterval(movementInterval);
      clearInterval(tickerInterval);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (zoom === 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Format utility
  const formatRupiah = (value?: number) => {
    if (value === undefined) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Get active Satwas keys present in data
  const uniqueSatwasNames = useMemo(() => {
    const names = new Set<string>();
    satwasList.forEach(s => names.add(s.nama_satwas));
    records.forEach(r => names.add(r.satwas));
    return Array.from(names).filter(n => n && n !== "Stasiun PSDKP Biak"); // keep distinct Satwas
  }, [records, satwasList]);

  // Comprehensive analytics per Satwas
  const satwasAnalytics = useMemo(() => {
    const stats: Record<string, {
      total: number;
      taat: number;
      tidakTaat: number;
      rataNilai: number;
      companies: string[];
      totalNilai: number;
    }> = {};

    // Initialize list
    const allNames = ["Stasiun PSDKP Biak", "Satwas SDKP Manokwari", "Satwas SDKP Jayapura", "Satwas SDK Nabire", "Satwas SDKP Nabire"];
    allNames.forEach(name => {
      stats[name] = { total: 0, taat: 0, tidakTaat: 0, rataNilai: 0, companies: [], totalNilai: 0 };
    });

    records.forEach(r => {
      let key = r.satwas;
      if (!stats[key]) {
        // match by keywords if name variant is slightly different
        const norm = key.toLowerCase();
        if (norm.includes("biak")) key = "Stasiun PSDKP Biak";
        else if (norm.includes("manokwari")) key = "Satwas SDKP Manokwari";
        else if (norm.includes("jayapura")) key = "Satwas SDKP Jayapura";
        else if (norm.includes("nabire")) key = "Satwas SDK Nabire";
        else {
          stats[key] = { total: 0, taat: 0, tidakTaat: 0, rataNilai: 0, companies: [], totalNilai: 0 };
        }
      }

      const satStat = stats[key];
      if (satStat) {
        satStat.total++;
        if (r.status_ketaatan === "TAAT") {
          satStat.taat++;
        } else {
          satStat.tidakTaat++;
        }
        satStat.totalNilai += r.nilai_total || 0;
        if (r.perusahaan && !satStat.companies.includes(r.perusahaan)) {
          satStat.companies.push(r.perusahaan);
        }
      }
    });

    // Calculate averages
    Object.keys(stats).forEach(key => {
      const s = stats[key];
      s.rataNilai = s.total > 0 ? Number((s.totalNilai / s.total).toFixed(1)) : 0;
    });

    return stats;
  }, [records]);

  // Filtered examinations list based on map selection & search queries
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      // 1. Satwas Map Filter
      let matchSatwas = true;
      if (selectedSatwas !== "ALL") {
        const normSel = selectedSatwas.toLowerCase();
        const normRec = r.satwas.toLowerCase();
        matchSatwas = normRec.includes(normSel) || normSel.includes(normRec);
      }

      // 2. Search Query (business actor, company, address, SPT number)
      let matchSearch = true;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        matchSearch = 
          (r.pelaku_usaha?.toLowerCase() || "").includes(q) ||
          (r.perusahaan?.toLowerCase() || "").includes(q) ||
          (r.alamat?.toLowerCase() || "").includes(q) ||
          (r.nomor_spt?.toLowerCase() || "").includes(q) ||
          (r.jenis_usaha?.toLowerCase() || "").includes(q);
      }

      // 3. Compliance Status Filter
      let matchCompliance = true;
      if (complianceFilter !== "ALL") {
        matchCompliance = r.status_ketaatan === complianceFilter;
      }

      // 4. Month Filter
      let matchMonth = true;
      if (monthFilter) {
        const recordDate = new Date(r.tanggal);
        const recordMonth = recordDate.getMonth() + 1; // 1-12
        matchMonth = recordMonth === parseInt(monthFilter, 10);
      }

      return matchSatwas && matchSearch && matchCompliance && matchMonth;
    });
  }, [records, selectedSatwas, searchQuery, complianceFilter, monthFilter]);

  // Compute total stats for current filter state
  const summaryStats = useMemo(() => {
    let total = filteredRecords.length;
    let taat = 0;
    let tidakTaat = 0;
    let sumNilai = 0;

    filteredRecords.forEach(r => {
      if (r.status_ketaatan === "TAAT") taat++;
      else tidakTaat++;
      sumNilai += r.nilai_total || 0;
    });

    return {
      total,
      taat,
      tidakTaat,
      rataRataNilai: total > 0 ? Number((sumNilai / total).toFixed(1)) : 0,
      persentaseKetaatan: total > 0 ? Math.round((taat / total) * 100) : 0
    };
  }, [filteredRecords]);

  // Focus region stats calculation for dynamic legend panel
  const focusSatwasName = hoveredSatwas || selectedSatwas;
  const focusRecords = useMemo(() => {
    if (!focusSatwasName || focusSatwasName === "ALL") return records;
    const normSel = focusSatwasName.toLowerCase();
    return records.filter(r => {
      const normRec = (r.satwas || "").toLowerCase();
      return normRec.includes(normSel) || normSel.includes(normRec);
    });
  }, [records, focusSatwasName]);

  const focusStats = useMemo(() => {
    const total = focusRecords.length;
    let taat = 0;
    let tidakTaat = 0;
    let sumNilai = 0;

    focusRecords.forEach(r => {
      if (r.status_ketaatan === "TAAT") taat++;
      else tidakTaat++;
      sumNilai += r.nilai_total || 0;
    });

    return {
      total,
      taat,
      tidakTaat,
      persentaseKetaatan: total > 0 ? Math.round((taat / total) * 100) : 0,
      rataRataNilai: total > 0 ? Number((sumNilai / total).toFixed(1)) : 0
    };
  }, [focusRecords]);

  // Dynamic color calculations for blending tactical map with satellite imagery
  const alpha = satelliteOpacity / 100;
  const isTactical = mapStyle === "tactical";
  const isHybrid = mapStyle === "hybrid";
  
  // Land Block 1 (Kepala Burung) fill & stroke
  const land1Fill = isTactical 
    ? "rgba(15, 23, 42, 0.85)" 
    : isHybrid 
    ? "rgba(34, 197, 94, 0.05)"
    : `rgba(${Math.round(12 + (251 - 12) * alpha)}, ${Math.round(74 + (191 - 74) * alpha)}, ${Math.round(110 + (36 - 110) * alpha)}, ${(0.3 + (0.08 - 0.3) * alpha).toFixed(2)})`;
  const land1Stroke = isTactical
    ? "rgba(6, 182, 212, 0.8)"
    : isHybrid
    ? "rgba(255, 255, 255, 0.4)"
    : `rgb(${Math.round(2 + (251 - 2) * alpha)}, ${Math.round(132 + (191 - 132) * alpha)}, ${Math.round(199 + (36 - 199) * alpha)})`;

  // Land Block 2 (Cenderawasih Bay) fill & stroke
  const land2Fill = isTactical 
    ? "rgba(10, 16, 29, 0.85)" 
    : isHybrid
    ? "rgba(34, 197, 94, 0.05)"
    : `rgba(${Math.round(8 + (251 - 8) * alpha)}, ${Math.round(51 + (191 - 51) * alpha)}, ${Math.round(68 + (36 - 68) * alpha)}, ${(0.4 + (0.08 - 0.4) * alpha).toFixed(2)})`;
  const land2Stroke = isTactical
    ? "rgba(6, 182, 212, 0.8)"
    : isHybrid
    ? "rgba(255, 255, 255, 0.4)"
    : `rgb(${Math.round(2 + (251 - 2) * alpha)}, ${Math.round(132 + (191 - 132) * alpha)}, ${Math.round(199 + (36 - 199) * alpha)})`;

  // Supiori Island (HQ / Pusat) fill & stroke
  const supioriFill = isTactical 
    ? "rgba(30, 41, 59, 0.9)" 
    : isHybrid
    ? "rgba(34, 197, 94, 0.1)"
    : `rgba(${Math.round(30 + (34 - 30) * alpha)}, ${Math.round(27 + (211 - 27) * alpha)}, ${Math.round(75 + (238 - 75) * alpha)}, ${(0.7 + (0.15 - 0.7) * alpha).toFixed(2)})`;
  const supioriStroke = isTactical
    ? "rgba(34, 211, 238, 0.9)"
    : isHybrid
    ? "rgba(255, 255, 255, 0.6)"
    : `rgb(${Math.round(6 + (34 - 6) * alpha)}, ${Math.round(182 + (211 - 182) * alpha)}, ${Math.round(212 + (238 - 212) * alpha)})`;

  // Biak Island (HQ / Pusat) fill & stroke
  const biakFill = isTactical 
    ? "rgba(30, 41, 59, 0.95)" 
    : isHybrid
    ? "rgba(34, 197, 94, 0.15)"
    : `rgba(${Math.round(30 + (34 - 30) * alpha)}, ${Math.round(27 + (211 - 27) * alpha)}, ${Math.round(75 + (238 - 75) * alpha)}, ${(0.9 + (0.2 - 0.9) * alpha).toFixed(2)})`;
  const biakStroke = isTactical
    ? "rgba(34, 211, 238, 0.9)"
    : isHybrid
    ? "rgba(255, 255, 255, 0.6)"
    : `rgb(${Math.round(6 + (34 - 6) * alpha)}, ${Math.round(182 + (211 - 182) * alpha)}, ${Math.round(212 + (238 - 212) * alpha)})`;

  // Numfor Island (Satwas) fill & stroke
  const numforFill = isTactical 
    ? "rgba(15, 23, 42, 0.85)" 
    : isHybrid
    ? "rgba(34, 197, 94, 0.1)"
    : `rgba(${Math.round(30 + (251 - 30) * alpha)}, ${Math.round(27 + (191 - 27) * alpha)}, ${Math.round(75 + (36 - 75) * alpha)}, ${(0.4 + (0.1 - 0.4) * alpha).toFixed(2)})`;
  const numforStroke = isTactical
    ? "rgba(6, 182, 212, 0.7)"
    : isHybrid
    ? "rgba(255, 255, 255, 0.4)"
    : `rgb(${Math.round(2 + (251 - 2) * alpha)}, ${Math.round(132 + (191 - 132) * alpha)}, ${Math.round(199 + (36 - 199) * alpha)})`;

  // Yapen Island (Satwas) fill & stroke
  const yapenFill = isTactical 
    ? "rgba(15, 23, 42, 0.85)" 
    : isHybrid
    ? "rgba(34, 197, 94, 0.1)"
    : `rgba(${Math.round(30 + (251 - 30) * alpha)}, ${Math.round(27 + (191 - 27) * alpha)}, ${Math.round(75 + (36 - 75) * alpha)}, ${(0.5 + (0.12 - 0.5) * alpha).toFixed(2)})`;
  const yapenStroke = isTactical
    ? "rgba(6, 182, 212, 0.7)"
    : isHybrid
    ? "rgba(255, 255, 255, 0.4)"
    : `rgb(${Math.round(2 + (251 - 2) * alpha)}, ${Math.round(132 + (191 - 132) * alpha)}, ${Math.round(199 + (36 - 199) * alpha)})`;

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
      
      {/* Top Header Panel with visual radar ping */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
            </span>
            <h2 className="text-sm font-black text-slate-850 uppercase tracking-wide">
              Peta Sebaran Pengawasan Pelaku Usaha
            </h2>
          </div>
          <p className="text-[10px] text-slate-400 font-semibold font-sans">
            Visualisasi spasial titik sebaran inspeksi terhadap pelaku usaha di wilayah hukum Stasiun PSDKP Biak Papua
          </p>
        </div>

        {/* View Mode Switchers */}
        <div className="bg-slate-100 p-1 rounded-xl flex gap-1 self-start md:self-center">
          <button
            onClick={() => setActiveTab("map")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "map" ? "bg-white text-slate-800 shadow-xs border border-slate-200/50" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-cyan-500" />
            Visual Peta
          </button>
          <button
            onClick={() => setActiveTab("list")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "list" ? "bg-white text-slate-800 shadow-xs border border-slate-200/50" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <ListFilter className="w-3.5 h-3.5 text-emerald-500" />
            Tabel Sebaran ({filteredRecords.length})
          </button>
        </div>
      </div>

      {/* Interactive Map Filter & Search Panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 border border-slate-200 p-4 rounded-2xl">
        
        {/* 1. Live Search Bar */}
        <div className="relative">
          <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Cari Pelaku Usaha / Perusahaan</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama, alamat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-slate-700 font-bold"
            />
          </div>
        </div>

        {/* 2. Dropdown Filter Satwas */}
        <div>
          <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Pilih Wilayah Satwas</label>
          <select
            value={selectedSatwas}
            onChange={(e) => setSelectedSatwas(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20 cursor-pointer"
          >
            <option value="ALL">Semua Satwas Wilayah</option>
            <option value="Stasiun PSDKP Biak">Stasiun PSDKP Biak (Pusat)</option>
            <option value="Satwas SDKP Manokwari">Satwas SDKP Manokwari</option>
            <option value="Satwas SDKP Jayapura">Satwas SDKP Jayapura</option>
            <option value="Satwas SDK Nabire">Satwas SDK Nabire</option>
          </select>
        </div>

        {/* 3. Dropdown Filter Ketaatan */}
        <div>
          <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Status Ketaatan</label>
          <select
            value={complianceFilter}
            onChange={(e) => setComplianceFilter(e.target.value as any)}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20 cursor-pointer"
          >
            <option value="ALL">Semua Tingkat Kepatuhan</option>
            <option value="TAAT">TAAT (Sesuai Aturan)</option>
            <option value="TIDAK TAAT">TIDAK TAAT (Ada Temuan)</option>
          </select>
        </div>

        {/* 4. Dropdown Filter Bulan */}
        <div>
          <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Penyaringan Bulan</label>
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20 cursor-pointer"
          >
            <option value="">Semua Bulan Giat</option>
            <option value="1">Januari</option>
            <option value="2">Februari</option>
            <option value="3">Maret</option>
            <option value="4">April</option>
            <option value="5">Mei</option>
            <option value="6">Juni</option>
            <option value="7">Juli</option>
            <option value="8">Agustus</option>
            <option value="9">September</option>
            <option value="10">Oktober</option>
            <option value="11">November</option>
            <option value="12">Desember</option>
          </select>
        </div>

      </div>

      {/* CORE MAP RENDER OR TABULAR LIST */}
      {activeTab === "map" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main SVG Map Canvas Column */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Map control widgets */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between sm:items-center bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-600">
              <span className="flex items-center gap-1.5 font-mono text-[10px]">
                <Navigation className="w-3.5 h-3.5 text-cyan-500 animate-pulse" />
                CENTER: BIAK ISLAND (136.06°E, 1.185°S)
              </span>
              <div className="flex flex-wrap items-center gap-3">
                {/* Format Peta Dropdown Selector */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Format Peta:</span>
                  <select
                    value={mapStyle}
                    onChange={(e) => setMapStyle(e.target.value as any)}
                    className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-[10px] font-extrabold text-slate-700 focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
                  >
                    <option value="satellite">🌐 Google Earth (Satelit)</option>
                    <option value="hybrid">🗺️ Google Hybrid (Campuran)</option>
                    <option value="tactical">📡 Peta Taktis PSDKP (Vector)</option>
                    <option value="classic">📸 Citra Klasik Offline</option>
                  </select>
                </div>

                <button 
                  onClick={() => setShowGrid(!showGrid)} 
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all border flex items-center gap-1 cursor-pointer ${
                    showGrid ? "bg-cyan-50 border-cyan-200 text-cyan-700" : "bg-white border-slate-200 text-slate-500"
                  }`}
                >
                  <Layers className="w-3 h-3" />
                  Grid Koordinat
                </button>
              </div>
            </div>

            {/* Tactical Map Container */}
            <div 
              id="map-container"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className={`relative aspect-[16/10] w-full bg-sky-950 rounded-3xl border border-sky-900 shadow-xl overflow-hidden select-none ${
                zoom > 1 ? (isDragging ? "cursor-grabbing" : "cursor-grab") : ""
              }`}
            >
              
              {/* Live Telemetry Ticker Overlay */}
              <div className="absolute top-4 left-4 z-20 bg-slate-950/95 border border-emerald-500/30 px-3 py-2 rounded-2xl flex items-center gap-2 max-w-[200px] sm:max-w-xs md:max-w-md font-mono text-[9px] text-emerald-400 shadow-xl backdrop-blur-md">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse shrink-0" />
                <div className="overflow-hidden relative h-4 w-44 sm:w-56 md:w-80">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={liveEvents[0]}
                      initial={{ y: 12, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -12, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="absolute inset-0 truncate font-bold text-slate-300 flex items-center"
                    >
                      <span className="text-emerald-400 font-extrabold mr-1">LIVE:</span> {liveEvents[0]}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              {/* Help Banner Overlay for panning */}
              {zoom > 1 && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-cyan-950/90 border border-cyan-500/50 px-3 py-1 rounded-full text-[9px] text-cyan-300 font-bold font-mono shadow-md backdrop-blur-sm animate-pulse">
                  GESER PETA UNTUK NAVIGASI • DRAG TO PAN
                </div>
              )}

              {/* Zoom & Reset Controls */}
              <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoom(prev => Math.min(prev + 0.5, 4));
                  }}
                  className="p-2 bg-slate-900/95 hover:bg-slate-800 border border-slate-700 text-cyan-400 rounded-xl transition-all shadow-lg backdrop-blur-md cursor-pointer flex items-center justify-center"
                  title="Perbesar Peta (Zoom In)"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoom(prev => {
                      const nextZoom = Math.max(prev - 0.5, 1);
                      if (nextZoom === 1) setPan({ x: 0, y: 0 }); // reset pan when zoomed out to 1
                      return nextZoom;
                    });
                  }}
                  className="p-2 bg-slate-900/95 hover:bg-slate-800 border border-slate-700 text-cyan-400 rounded-xl transition-all shadow-lg backdrop-blur-md cursor-pointer flex items-center justify-center"
                  title="Perkecil Peta (Zoom Out)"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoom(1);
                    setPan({ x: 0, y: 0 });
                  }}
                  className="p-2 bg-slate-900/95 hover:bg-slate-800 border border-slate-700 text-cyan-400 rounded-xl transition-all shadow-lg backdrop-blur-md cursor-pointer flex items-center justify-center"
                  title="Reset Peta"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Floating Layer Control Panel */}
              <div className="absolute top-4 right-16 z-25 flex flex-col items-end gap-2 no-print">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsLayerMenuOpen(!isLayerMenuOpen);
                  }}
                  className={`p-2 rounded-xl transition-all shadow-lg backdrop-blur-md cursor-pointer flex items-center justify-center border ${
                    isLayerMenuOpen 
                      ? "bg-cyan-500 border-cyan-400 text-white" 
                      : "bg-slate-900/95 hover:bg-slate-800 border-slate-700 text-cyan-400"
                  }`}
                  title="Pilih Tampilan Peta (Layer Control)"
                >
                  <Layers className="w-4 h-4" />
                </button>

                <AnimatePresence>
                  {isLayerMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="bg-slate-950/95 border border-slate-800 rounded-2xl p-3 shadow-2xl backdrop-blur-md w-56 space-y-2 text-left"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider pb-1.5 border-b border-slate-800 flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Pilih Tampilan Peta</span>
                      </div>
                      
                      <div className="space-y-1">
                        {/* Option 1: Google Earth (Satellite) */}
                        <button
                          onClick={() => setMapStyle("satellite")}
                          className={`w-full px-2.5 py-1.5 rounded-xl text-left text-[11px] font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                            mapStyle === "satellite"
                              ? "bg-cyan-500/10 border border-cyan-500/30 text-cyan-300"
                              : "bg-transparent border border-transparent text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full bg-cyan-500 shadow-xs shadow-cyan-500/50 block" />
                          <div className="flex-1">
                            <div>🌐 Google Earth Satelit</div>
                            <div className="text-[8px] text-slate-500 font-medium">Citra Satelit Maxar / Airbus</div>
                          </div>
                          {mapStyle === "satellite" && <Check className="w-3 h-3 text-cyan-400 shrink-0" />}
                        </button>

                        {/* Option 2: Google Hybrid */}
                        <button
                          onClick={() => setMapStyle("hybrid")}
                          className={`w-full px-2.5 py-1.5 rounded-xl text-left text-[11px] font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                            mapStyle === "hybrid"
                              ? "bg-cyan-500/10 border border-cyan-500/30 text-cyan-300"
                              : "bg-transparent border border-transparent text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/50 block" />
                          <div className="flex-1">
                            <div>🗺️ Google Earth Hybrid</div>
                            <div className="text-[8px] text-slate-500 font-medium">Satelit dengan Batas Wilayah</div>
                          </div>
                          {mapStyle === "hybrid" && <Check className="w-3 h-3 text-cyan-400 shrink-0" />}
                        </button>

                        {/* Option 3: Tactical Vector PSDKP */}
                        <button
                          onClick={() => setMapStyle("tactical")}
                          className={`w-full px-2.5 py-1.5 rounded-xl text-left text-[11px] font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                            mapStyle === "tactical"
                              ? "bg-cyan-500/10 border border-cyan-500/30 text-cyan-300"
                              : "bg-transparent border border-transparent text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full bg-cyan-400 block" />
                          <div className="flex-1">
                            <div>📡 Peta Taktis PSDKP</div>
                            <div className="text-[8px] text-slate-500 font-medium">Model Vektor Gelap Taktis</div>
                          </div>
                          {mapStyle === "tactical" && <Check className="w-3 h-3 text-cyan-400 shrink-0" />}
                        </button>

                        {/* Option 4: Citra Klasik */}
                        <button
                          onClick={() => setMapStyle("classic")}
                          className={`w-full px-2.5 py-1.5 rounded-xl text-left text-[11px] font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                            mapStyle === "classic"
                              ? "bg-cyan-500/10 border border-cyan-500/30 text-cyan-300"
                              : "bg-transparent border border-transparent text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full bg-yellow-500 block" />
                          <div className="flex-1">
                            <div>📸 Citra Klasik Offline</div>
                            <div className="text-[8px] text-slate-500 font-medium">Skema Warna Peta Sederhana</div>
                          </div>
                          {mapStyle === "classic" && <Check className="w-3 h-3 text-cyan-400 shrink-0" />}
                        </button>
                      </div>

                      {/* Opacity slider for satellite layer */}
                      {(mapStyle === "satellite" || mapStyle === "hybrid" || mapStyle === "classic") && (
                        <div className="border-t border-slate-800 pt-2 mt-1.5 space-y-1 text-left">
                          <div className="flex justify-between text-[8px] font-extrabold text-slate-500 uppercase tracking-wider">
                            <span>Opasitas Satelit</span>
                            <span>{satelliteOpacity}%</span>
                          </div>
                          <input
                            type="range"
                            min="10"
                            max="100"
                            value={satelliteOpacity}
                            onChange={(e) => setSatelliteOpacity(Number(e.target.value))}
                            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                          />
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Google Earth Style Status Bar HUD */}
              {(mapStyle === "satellite" || mapStyle === "hybrid") && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl font-mono text-[8px] text-slate-400 flex items-center gap-4 shadow-xl backdrop-blur-md no-print select-none">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 block animate-pulse" />
                    <span>Elevasi: <b className="text-slate-200">0 m</b></span>
                  </div>
                  <div className="flex items-center gap-1 border-l border-slate-800 pl-3">
                    <span>Mata Kamera: <b className="text-slate-200">{Math.round(450 / zoom)} km</b></span>
                  </div>
                  <div className="flex items-center gap-1 border-l border-slate-800 pl-3">
                    <span>Citra: <b className="text-cyan-400 font-extrabold uppercase">Google Earth 3D</b></span>
                  </div>
                  <div className="hidden sm:flex items-center gap-1 border-l border-slate-800 pl-3">
                    <span>Sumber: <b className="text-slate-300">Maxar / Airbus</b></span>
                  </div>
                </div>
              )}

              {/* Google Earth Navigation Ring Widget */}
              {(mapStyle === "satellite" || mapStyle === "hybrid") && (
                <div className="absolute top-4 right-16 z-20 flex flex-col items-center gap-1 bg-slate-950/90 border border-slate-800 p-2 rounded-xl backdrop-blur-md shadow-lg select-none no-print">
                  <div className="relative w-8 h-8 flex items-center justify-center border border-slate-700/50 rounded-full">
                    <span className="absolute top-0 text-[6.5px] font-black text-rose-500">N</span>
                    <span className="absolute bottom-0 text-[6.5px] font-bold text-slate-400">S</span>
                    <span className="absolute left-0 text-[6.5px] font-bold text-slate-400">W</span>
                    <span className="absolute right-0 text-[6.5px] font-bold text-slate-400">E</span>
                    <Compass className="w-4 h-4 text-cyan-400 rotate-12" />
                  </div>
                </div>
              )}

              {/* Oceanic Ambient Lighting & Legend overlay (Fixed at base layer, outside pan/zoom wrapper to prevent occlusion) */}
              <div className="absolute bottom-4 left-4 z-20 bg-black/75 border border-sky-800/40 p-3 rounded-2xl text-[9px] font-mono text-cyan-400 space-y-1.5 backdrop-blur-md max-w-xs">
                <div className="font-bold border-b border-sky-800/30 pb-1 mb-1 uppercase tracking-widest text-slate-200 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-yellow-400 rotate-12" />
                  LEGENDA & STATUS MONITORING
                </div>
                <div className="flex items-center gap-1.5 text-slate-300 font-sans font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50 block animate-pulse" />
                  Stasiun PSDKP Biak (Pusat)
                </div>
                <div className="flex items-center gap-1.5 text-slate-300 font-sans font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm block" />
                  Satuan Pengawasan (Satwas)
                </div>
                <div className="flex items-center gap-1.5 text-slate-300 font-sans font-semibold">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full block" />
                  Ketaatan Tinggi (90%+)
                </div>
                <div className="flex items-center gap-1.5 text-slate-300 font-sans font-semibold">
                  <span className="w-2.5 h-2.5 bg-rose-500 rounded-full block" />
                  Butuh Pembinaan / Rendah
                </div>
                <div className="border-t border-sky-800/30 pt-1.5 mt-1 flex items-center gap-1.5 text-sky-300 font-sans font-bold">
                  <span className="w-2.5 h-1.5 bg-sky-500 rounded-full block" />
                  Kapal Patroli Aktif (Live AIS)
                </div>
              </div>

              {/* Dynamic Compliance Legend (Bottom-Right corner of map) */}
              <div className="absolute bottom-4 right-4 z-20 bg-slate-950/95 border border-cyan-500/35 p-3 rounded-2xl text-[9px] font-mono text-cyan-400 space-y-2 backdrop-blur-md w-[260px] sm:w-[280px] shadow-2xl transition-all duration-300">
                <div className="flex items-center justify-between border-b border-sky-850/40 pb-1.5 mb-1.5">
                  <div className="font-bold uppercase tracking-wider text-slate-100 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    KETAATAN PELAKU USAHA
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setLegendTab("symbols");
                      }}
                      className={`px-1.5 py-0.5 rounded text-[8px] font-bold tracking-tight transition-all uppercase cursor-pointer ${
                        legendTab === "symbols" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      SIMBOL
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setLegendTab("stats");
                      }}
                      className={`px-1.5 py-0.5 rounded text-[8px] font-bold tracking-tight transition-all uppercase cursor-pointer ${
                        legendTab === "stats" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      DATA
                    </button>
                  </div>
                </div>

                {legendTab === "symbols" ? (
                  <div className="space-y-1.5">
                    <p className="text-[8px] text-slate-400 leading-normal font-sans">
                      Warna ring indikator menggambarkan rasio kepatuhan operasional pelaku usaha di wilayah kerja:
                    </p>
                    <div className="space-y-1 pt-1 font-sans">
                      <div className="flex items-start gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 shrink-0 mt-0.5 animate-pulse" />
                        <div>
                          <span className="font-bold text-slate-200 text-[9px] block leading-none">TAAT TINGGI (Green)</span>
                          <span className="text-[8px] text-slate-400 block mt-0.5">Ketaatan tinggi ≥ 85% ({focusStats.taat} usaha)</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-4 ring-amber-500/20 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-slate-200 text-[9px] block leading-none">CUKUP PATUH (Amber)</span>
                          <span className="text-[8px] text-slate-400 block mt-0.5">Rasio Kepatuhan 60% - 84%</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-4 ring-rose-500/20 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-slate-200 text-[9px] block leading-none">BUTUH PEMBINAAN (Red)</span>
                          <span className="text-[8px] text-slate-400 block mt-0.5">Ketaatan rendah &lt; 60% ({focusStats.tidakTaat} usaha)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 font-sans text-slate-300">
                    <div className="flex items-center justify-between border-b border-slate-800/40 pb-1">
                      <span className="text-[8px] uppercase font-bold text-slate-400">Wilayah Fokus</span>
                      <span className="font-black text-cyan-300 truncate max-w-[130px]" title={focusSatwasName === "ALL" ? "Seluruh Wilayah" : focusSatwasName}>
                        {focusSatwasName === "ALL" ? "Seluruh Wilayah" : focusSatwasName.replace("Satwas SDKP ", "").replace("Stasiun PSDKP ", "")}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="bg-slate-900/50 p-1.5 rounded-lg border border-slate-800/40">
                        <span className="text-[7.5px] uppercase font-bold text-slate-400 block">Total Giat</span>
                        <span className="text-xs font-black font-mono text-slate-100">{focusStats.total}</span>
                      </div>
                      <div className="bg-slate-900/50 p-1.5 rounded-lg border border-slate-800/40">
                        <span className="text-[7.5px] uppercase font-bold text-slate-400 block">Kepatuhan</span>
                        <span className="text-xs font-black font-mono text-emerald-400">{focusStats.persentaseKetaatan}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[8px] border-t border-slate-800/40 pt-1">
                      <span className="text-slate-400">Rata-rata Nilai</span>
                      <span className="font-bold text-yellow-400 font-mono">{focusStats.rataRataNilai} Pts</span>
                    </div>
                    <p className="text-[7px] text-center text-slate-500 italic mt-1 leading-tight">
                      *Arahkan kursor atau klik wilayah peta untuk memperbarui statistik.
                    </p>
                  </div>
                )}
              </div>

              {/* Panning & Zooming Inner Content Wrapper */}
              <div
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: "center center",
                }}
                className={`w-full h-full relative origin-center ${
                  isDragging ? "" : "transition-transform duration-150 ease-out"
                }`}
              >
                {/* Satellite Background Layer */}
                <motion.img 
                  animate={{ 
                    opacity: mapStyle === "tactical" ? 0.05 : 0.92,
                    filter: mapStyle === "satellite" || mapStyle === "hybrid" ? "contrast(1.15) saturate(1.1)" : "none"
                  }}
                  transition={{ duration: 0.3 }}
                  src="/src/assets/images/satellite_map_bg_1783810773805.jpg" 
                  alt="Citra Satelit Papua" 
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
                />

                {/* Google Earth atmospheric sphere edge curvature / glow */}
                {(mapStyle === "satellite" || mapStyle === "hybrid") && (
                  <>
                    {/* Rounded planet horizon edge glow */}
                    <div className="absolute inset-0 bg-radial-gradient from-transparent via-cyan-500/5 to-cyan-400/20 pointer-events-none z-5" />
                    <div className="absolute inset-0 border-[8px] border-black/25 pointer-events-none z-5" />
                  </>
                )}

                <div className="absolute inset-0 bg-radial-gradient from-sky-900/10 via-transparent to-black/35 pointer-events-none" />

                {/* Responsive SVG Map */}
                <svg 
                  viewBox="0 0 1000 625" 
                  className="w-full h-full relative z-10"
                  id="tactical-psdkp-map"
                >
                  {/* 1. Latitude/Longitude Grid Lines */}
                  {showGrid && (
                    <g stroke="#0ea5e9" strokeWidth="0.5" strokeDasharray="3,6" opacity="0.15">
                      {/* Vertical Longitude lines (every 1 degree) */}
                      {/* 133, 134, 135, 136, 137, 138, 139, 140, 141 */}
                      <line x1="0" y1="0" x2="0" y2="625" />
                      <text x="10" y="20" fill="#38bdf8" fontSize="10" fontFamily="monospace" opacity="0.5">133°00'E</text>
                      
                      <line x1="125" y1="0" x2="125" y2="625" />
                      <text x="130" y="20" fill="#38bdf8" fontSize="10" fontFamily="monospace" opacity="0.5">134°00'E</text>
                      
                      <line x1="250" y1="0" x2="250" y2="625" />
                      <text x="255" y="20" fill="#38bdf8" fontSize="10" fontFamily="monospace" opacity="0.5">135°00'E</text>
                      
                      <line x1="375" y1="0" x2="375" y2="625" />
                      <text x="380" y="20" fill="#38bdf8" fontSize="10" fontFamily="monospace" opacity="0.5">136°00'E</text>
                      
                      <line x1="500" y1="0" x2="500" y2="625" />
                      <text x="505" y="20" fill="#38bdf8" fontSize="10" fontFamily="monospace" opacity="0.5">137°00'E</text>
                      
                      <line x1="625" y1="0" x2="625" y2="625" />
                      <text x="630" y="20" fill="#38bdf8" fontSize="10" fontFamily="monospace" opacity="0.5">138°00'E</text>
                      
                      <line x1="750" y1="0" x2="750" y2="625" />
                      <text x="755" y="20" fill="#38bdf8" fontSize="10" fontFamily="monospace" opacity="0.5">139°00'E</text>
                      
                      <line x1="875" y1="0" x2="875" y2="625" />
                      <text x="880" y="20" fill="#38bdf8" fontSize="10" fontFamily="monospace" opacity="0.5">140°00'E</text>
                      
                      <line x1="1000" y1="0" x2="1000" y2="625" />
                      <text x="960" y="20" fill="#38bdf8" fontSize="10" fontFamily="monospace" opacity="0.5">141°00'E</text>

                      {/* Horizontal Latitude lines */}
                      {/* -1, -2, -3, -4 */}
                      <line x1="0" y1="156.25" x2="1000" y2="156.25" />
                      <text x="940" y="150" fill="#38bdf8" fontSize="10" fontFamily="monospace" opacity="0.5">1°00'S</text>

                      <line x1="0" y1="312.5" x2="1000" y2="312.5" />
                      <text x="940" y="306" fill="#38bdf8" fontSize="10" fontFamily="monospace" opacity="0.5">2°00'S</text>

                      <line x1="0" y1="468.75" x2="1000" y2="468.75" />
                      <text x="940" y="462" fill="#38bdf8" fontSize="10" fontFamily="monospace" opacity="0.5">3°00'S</text>
                    </g>
                  )}

                  {/* 2. Stylized Landmass Paths of North Papua */}
                  <g 
                    fill="none" 
                    strokeWidth="1.5" 
                    opacity="0.9"
                  >
                    {/* Outer ocean boundary */}
                    {/* Land block 1: Bird's Head (Kepala Burung) on far left */}
                    <path d="M 0,250 C 30,220 50,210 80,210 C 110,210 120,200 130,220 C 140,240 120,260 110,280 C 100,300 120,330 130,350 C 140,370 170,360 180,380 C 190,400 180,450 160,490 C 150,510 130,550 120,625 L 0,625 Z" 
                      fill={land1Fill} 
                      stroke={land1Stroke} 
                      strokeWidth="1.5" 
                    />
                    
                    {/* Land block 2: Cenderawasih Bay & Nabire (middle coast) */}
                    <path d="M 180,380 C 200,320 220,310 230,340 C 240,370 230,420 240,460 C 250,500 260,520 280,540 C 300,560 320,580 312.5,526 C 310,480 340,440 370,430 C 400,420 420,440 450,450 C 490,460 520,440 560,430 C 600,420 650,420 700,410 C 750,400 800,410 850,400 C 900,395 950,405 1000,396 L 1000,625 L 312.5,625 Z" 
                      fill={land2Fill} 
                      stroke={land2Stroke} 
                      strokeWidth="1.5" 
                    />

                    {/* Islands Group */}
                    {/* Biak & Supiori Islands (Centered at x=380, y=185) */}
                    {/* Supiori Island (Top Left of Biak) */}
                    <path d="M 330,130 C 340,110 360,110 370,120 C 380,130 370,150 350,150 C 330,150 320,140 330,130 Z" 
                      fill={supioriFill} 
                      stroke={supioriStroke} 
                      strokeWidth="1.5" 
                    />
                    {/* Biak Island (Main) */}
                    <path d="M 365,160 C 390,140 430,160 420,195 C 410,210 380,215 365,200 C 350,190 355,170 365,160 Z" 
                      fill={biakFill} 
                      stroke={biakStroke} 
                      strokeWidth="2" 
                    />
                    
                    {/* Numfor Island */}
                    <path d="M 285,210 C 295,200 310,205 310,215 C 310,225 295,235 285,225 C 275,225 275,215 285,210 Z" 
                      fill={numforFill} 
                      stroke={numforStroke} 
                      strokeWidth="1.2" 
                    />
                    
                    {/* Yapen Island */}
                    <path d="M 380,260 C 410,250 480,255 500,265 C 470,275 420,270 380,260 Z" 
                      fill={yapenFill} 
                      stroke={yapenStroke} 
                      strokeWidth="1.2" 
                    />
                  </g>

                   {/* 3. Island / Region Text Annotations */}
                  {mapStyle === "hybrid" ? (
                    <g fontFamily="sans-serif">
                      {/* Maritime Boundaries / EEZ limits */}
                      <path d="M 0,100 L 1000,80" stroke="#3b82f6" strokeWidth="1" strokeDasharray="5,5" opacity="0.6" />
                      <text x="500" y="70" fill="#60a5fa" fontSize="8" fontWeight="bold" letterSpacing="2" textAnchor="middle" opacity="0.8">BATAS UNDANG-UNDANG EEZ INDONESIA</text>

                      {/* Google Hybrid Style Labels (White text with black outline) */}
                      <g filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.9))">
                        {/* Major Ocean / Bay labels */}
                        <text x="150" y="200" fill="#93c5fd" fontSize="12" fontWeight="900" letterSpacing="3" opacity="0.95">SAMUDERA PASIFIK</text>
                        <text x="350" y="440" fill="#93c5fd" fontSize="11" fontWeight="900" letterSpacing="4" textAnchor="middle" opacity="0.95">TELUK CENDERAWASIH</text>

                        {/* Province / Major Regencies */}
                        <text x="650" y="480" fill="#fef08a" fontSize="13" fontWeight="900" letterSpacing="2" opacity="0.9">PAPUA (PROVINSI)</text>
                        <text x="150" y="520" fill="#fef08a" fontSize="11" fontWeight="900" letterSpacing="2" opacity="0.85">PAPUA BARAT</text>

                        {/* Regency labels */}
                        <text x="390" y="235" fill="#ffffff" fontSize="9.5" fontWeight="900" letterSpacing="1">KABUPATEN BIAK NUMFOR</text>
                        <circle cx="385" cy="232" r="2.5" fill="#ffeb3b" />
                        
                        <text x="325" y="105" fill="#ffffff" fontSize="8.5" fontWeight="bold">Kab. Supiori</text>
                        <circle cx="320" cy="102" r="2" fill="#ffffff" />

                        <text x="450" y="300" fill="#ffffff" fontSize="9" fontWeight="bold">KABUPATEN KEP. YAPEN</text>
                        <circle cx="445" cy="297" r="2" fill="#ffeb3b" />

                        <text x="135" y="300" fill="#ffffff" fontSize="9" fontWeight="bold">KAB. MANOKWARI</text>
                        <circle cx="130" cy="297" r="2" fill="#ffffff" />

                        <text x="300" y="575" fill="#ffffff" fontSize="9" fontWeight="bold">KAB. NABIRE</text>
                        <circle cx="295" cy="572" r="2" fill="#ffffff" />

                        <text x="820" y="420" fill="#ffffff" fontSize="9" fontWeight="bold">KAB. JAYAPURA</text>
                        <circle cx="815" cy="417" r="2" fill="#ffffff" />
                      </g>

                      {/* Google Hybrid styled transport roads / shipping lanes */}
                      <path d="M 385,195 Q 280,215 130,297" stroke="#f59e0b" strokeWidth="1" strokeDasharray="2,3" opacity="0.5" />
                      <text x="210" y="240" fill="#fbbf24" fontSize="7" fontWeight="bold" opacity="0.7">ALKI III-A (Jalur Pelayaran Utama)</text>
                      
                      <path d="M 385,195 Q 600,300 815,417" stroke="#f59e0b" strokeWidth="1" strokeDasharray="2,3" opacity="0.5" />
                    </g>
                  ) : mapStyle === "tactical" ? (
                    <g fontFamily="monospace" opacity="0.85">
                      <g fill="#06b6d4" fontSize="9" fontWeight="bold">
                        <text x="375" y="220" letterSpacing="2">SYS_NODE: BIAK</text>
                        <text x="315" y="110">SYS_SUB_01: SUPIORI</text>
                        <text x="250" y="245">SYS_SUB_02: NUMFOR</text>
                        <text x="420" y="285" letterSpacing="1">SYS_SUB_03: YAPEN</text>
                        <text x="210" y="470" fill="#0891b2" fontSize="10" letterSpacing="3">ZONE_DELTA: CENDERAWASIH_BAY</text>
                        <text x="15" y="330" fill="#0891b2" letterSpacing="2">GRID_ALPHA: PACIFIC_OCEAN</text>
                      </g>
                    </g>
                  ) : (
                    /* Default classical / traditional background labels */
                    <g fill="#94a3b8" fontSize="10" fontWeight="bold" fontFamily="sans-serif" opacity="0.6">
                      <text x="375" y="220" fill="#22d3ee" fontSize="11" fontWeight="900" letterSpacing="1">P. BIAK</text>
                      <text x="315" y="110" fontSize="9">P. Supiori</text>
                      <text x="260" y="240" fontSize="9">P. Numfor</text>
                      <text x="420" y="285" fontSize="10">P. YAPEN</text>
                      <text x="210" y="470" fontSize="11" letterSpacing="2">TELUK CENDERAWASIH</text>
                      <text x="15" y="330">SAMUDERA PASIFIK</text>
                    </g>
                  )}

                  {/* 4. Interactive Satwas Markers with dynamic heat pulse */}
                  {Object.keys(SATWAS_COORDINATES).map((key) => {
                    if (key === "Satwas SDKP Nabire") return null; // skip duplicate key
                    const s = SATWAS_COORDINATES[key];
                    const analytics = satwasAnalytics[key] || { total: 0, taat: 0, tidakTaat: 0, rataNilai: 0 };
                    
                    // Translate 0-100 x/y ratio to SVG canvas size (width=1000, height=625)
                    const mapX = (s.x / 100) * 1000;
                    const mapY = (s.y / 100) * 625;

                    const isMainStasiun = key === "Stasiun PSDKP Biak";
                    const isSelected = selectedSatwas === key;
                    const isHovered = hoveredSatwas === key;
                    
                    // Color codes based on compliance ratio
                    const totalInspections = analytics.total;
                    const taatRatio = totalInspections > 0 ? analytics.taat / totalInspections : 1;
                    
                    let markerColor = "fill-emerald-500 stroke-emerald-300";
                    let pulseColor = "bg-emerald-500";
                    let ringStroke = "stroke-emerald-400";
                    if (totalInspections > 0) {
                      if (taatRatio < 0.6) {
                        markerColor = "fill-rose-500 stroke-rose-300";
                        pulseColor = "bg-rose-500";
                        ringStroke = "stroke-rose-400";
                      } else if (taatRatio < 0.85) {
                        markerColor = "fill-amber-500 stroke-amber-300";
                        pulseColor = "bg-amber-500";
                        ringStroke = "stroke-amber-400";
                      }
                    }
                    if (isMainStasiun) {
                      markerColor = "fill-cyan-400 stroke-cyan-200";
                      pulseColor = "bg-cyan-400";
                      ringStroke = "stroke-cyan-300";
                    }

                    return (
                      <g 
                        key={key}
                        className="cursor-pointer transition-all duration-300"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSatwas(key);
                        }}
                        onMouseEnter={() => setHoveredSatwas(key)}
                        onMouseLeave={() => setHoveredSatwas(null)}
                      >
                        {/* Interactive Pulse Rings */}
                        {(isHovered || isSelected) && (
                          <circle 
                            cx={mapX} 
                            cy={mapY} 
                            r={isSelected ? "45" : "30"} 
                            className="animate-ping" 
                            fill="none" 
                            stroke={isMainStasiun ? "#22d3ee" : taatRatio < 0.6 ? "#f43f5e" : taatRatio < 0.85 ? "#f59e0b" : "#10b981"} 
                            strokeWidth="1.5" 
                            opacity="0.3"
                          />
                        )}
                        
                        <circle 
                          cx={mapX} 
                          cy={mapY} 
                          r={isMainStasiun ? "16" : "12"} 
                          className={`${markerColor} transition-transform duration-300 ${isHovered ? "scale-125" : ""}`}
                          strokeWidth="2.5"
                          filter="drop-shadow(0px 2px 8px rgba(0,0,0,0.5))"
                        />

                        {/* Inner dot */}
                        <circle 
                          cx={mapX} 
                          cy={mapY} 
                          r="5" 
                          fill="#ffffff"
                        />

                        {/* Text Badge Card Overlay */}
                        <g transform={`translate(${mapX}, ${mapY - (isMainStasiun ? 28 : 22)})`}>
                          <rect
                            x="-70"
                            y="-16"
                            width="140"
                            height="24"
                            rx="6"
                            fill="#0f172a"
                            stroke={isHovered || isSelected ? "#06b6d4" : "#1e293b"}
                            strokeWidth="1.5"
                            opacity="0.9"
                          />
                          <text
                            x="0"
                            y="0"
                            textAnchor="middle"
                            fill="#ffffff"
                            fontSize="9"
                            fontWeight="bold"
                            fontFamily="sans-serif"
                          >
                            {isMainStasiun ? "HQ PSDKP Biak" : s.name.replace("Satwas SDKP ", "")}
                          </text>
                          {/* Number badge on marker */}
                          <circle cx="55" cy="-4" r="7" fill={isMainStasiun ? "#06b6d4" : "#f59e0b"} />
                          <text x="55" y="-1.5" textAnchor="middle" fill="#ffffff" fontSize="7" fontWeight="bold">
                            {analytics.total}
                          </text>
                        </g>
                      </g>
                    );
                  })}

                  {/* 5. Live Simulated Patrol Vessels Layer with Dynamic Pulse & AIS Tagging */}
                  {vessels.map((v) => (
                    <g 
                      key={v.id} 
                      transform={`translate(${(v.x / 100) * 1000}, ${(v.y / 100) * 625})`}
                      className="transition-all duration-[4000ms] ease-in-out"
                    >
                      {/* Radiating radar sweep */}
                      <circle
                        cx="0"
                        cy="0"
                        r="18"
                        className="animate-ping"
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="1"
                        opacity="0.6"
                      />
                      <circle
                        cx="0"
                        cy="0"
                        r="30"
                        className="animate-pulse"
                        fill="none"
                        stroke="#22d3ee"
                        strokeWidth="0.5"
                        opacity="0.25"
                      />
                      {/* Vessel direction compass arrow indicator */}
                      <g transform={`rotate(${v.heading})`}>
                        <polygon 
                          points="0,-8 -5,5 5,5" 
                          fill="#0ea5e9" 
                          stroke="#38bdf8" 
                          strokeWidth="1.2"
                          className="drop-shadow-md" 
                        />
                        <circle cx="0" cy="0" r="2.5" fill="#ffffff" />
                      </g>

                      {/* Info Badge */}
                      <g transform="translate(10, -12)">
                        <rect 
                          x="0" 
                          y="0" 
                          width="120" 
                          height="24" 
                          rx="5" 
                          fill="#070b13" 
                          stroke="#0ea5e9" 
                          strokeWidth="1" 
                          opacity="0.9" 
                        />
                        <text 
                          x="6" 
                          y="10" 
                          fill="#38bdf8" 
                          fontSize="7.5" 
                          fontWeight="bold" 
                          fontFamily="monospace"
                        >
                          {v.name} • {v.speed}
                        </text>
                        <text 
                          x="6" 
                          y="18" 
                          fill="#a1a1aa" 
                          fontSize="6.5" 
                          fontFamily="sans-serif" 
                          fontWeight="semibold"
                        >
                          {v.status}
                        </text>
                      </g>
                    </g>
                  ))}
                </svg>
              </div>
            </div>
          </div>

          {/* Sidebar Analytics Details Column */}
          <div className="space-y-6">
            
            {/* 1. Selection & Quick Stats Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Wilayah Terpilih</span>
                  <h3 className="text-sm font-black text-slate-800">
                    {selectedSatwas === "ALL" ? "Seluruh Wilayah Kerja" : selectedSatwas}
                  </h3>
                </div>
                {selectedSatwas !== "ALL" && (
                  <button
                    onClick={() => setSelectedSatwas("ALL")}
                    className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[9px] font-bold text-slate-600 transition-all cursor-pointer"
                  >
                    Reset Filter
                  </button>
                )}
              </div>

              {/* Description */}
              <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                {selectedSatwas === "ALL" 
                  ? "Menampilkan akumulasi data sebaran pelaku usaha di seluruh Satuan Pengawasan wilayah utara Papua."
                  : getSatwasCoords(selectedSatwas).desc}
              </p>

              {/* Mini Stats Metrics Grid */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-white border border-slate-150 p-3 rounded-xl shadow-2xs">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Total Giat</span>
                  <span className="text-lg font-black font-mono text-slate-800">{summaryStats.total}</span>
                  <p className="text-[8px] text-slate-400 font-semibold mt-0.5">Pemeriksaan lapangan</p>
                </div>
                <div className="bg-white border border-slate-150 p-3 rounded-xl shadow-2xs">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Rasio Taat</span>
                  <span className="text-lg font-black font-mono text-cyan-600">{summaryStats.persentaseKetaatan}%</span>
                  <p className="text-[8px] text-slate-400 font-semibold mt-0.5">Rasio kepatuhan usaha</p>
                </div>
                <div className="bg-white border border-slate-150 p-3 rounded-xl shadow-2xs">
                  <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest block">Jumlah TAAT</span>
                  <span className="text-lg font-black font-mono text-emerald-600">{summaryStats.taat}</span>
                  <p className="text-[8px] text-slate-400 font-semibold mt-0.5">Memenuhi standar</p>
                </div>
                <div className="bg-white border border-slate-150 p-3 rounded-xl shadow-2xs">
                  <span className="text-[8px] font-black text-rose-600 uppercase tracking-widest block">TIDAK TAAT</span>
                  <span className="text-lg font-black font-mono text-rose-600">{summaryStats.tidakTaat}</span>
                  <p className="text-[8px] text-slate-400 font-semibold mt-0.5">Ditemukan pelanggaran</p>
                </div>
              </div>

              {/* Score Indicator Progress */}
              <div className="bg-white border border-slate-150 p-3 rounded-xl space-y-1.5 shadow-2xs">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="font-bold text-slate-500">Skor Kepatuhan Rata-Rata</span>
                  <span className="font-mono font-extrabold text-slate-800">{summaryStats.rataRataNilai} / 100</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${summaryStats.rataRataNilai}%` }}
                    transition={{ duration: 0.5 }}
                    className={`h-full rounded-full ${
                      summaryStats.rataRataNilai >= 85 
                        ? "bg-gradient-to-r from-cyan-500 to-emerald-500" 
                        : summaryStats.rataRataNilai >= 70 
                        ? "bg-gradient-to-r from-amber-400 to-yellow-500" 
                        : "bg-gradient-to-r from-rose-500 to-rose-600"
                    }`}
                  />
                </div>
              </div>

            </div>

            {/* 2. List of Business Actors under selected criteria */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Daftar Pelaku Usaha ({filteredRecords.length})
                </h4>
                <span className="text-[9px] font-bold text-slate-400">Terfilter</span>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2.5 pr-1" id="map-actors-list">
                {filteredRecords.length === 0 ? (
                  <div className="text-center py-8 text-[10px] text-slate-400 font-bold">
                    Tidak ditemukan pelaku usaha yang sesuai dengan kriteria filter.
                  </div>
                ) : (
                  filteredRecords.map((r) => (
                    <div 
                      key={r.id}
                      className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors space-y-1.5"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <h5 className="text-[11px] font-extrabold text-slate-800 truncate" title={r.pelaku_usaha}>
                            {r.pelaku_usaha}
                          </h5>
                          <span className="text-[9px] text-slate-400 font-mono block truncate">{r.jenis_usaha}</span>
                        </div>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase shrink-0 ${
                          r.status_ketaatan === "TAAT" ? "bg-cyan-55 hover:bg-cyan-100 text-cyan-700" : "bg-rose-50 text-rose-700"
                        }`}>
                          {r.status_ketaatan}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-[9px] text-slate-400 border-t border-slate-200/50 pt-1.5">
                        <span className="font-semibold truncate max-w-[120px]">{r.satwas.replace("Satwas SDKP ", "")}</span>
                        <span className="font-mono font-bold text-slate-600">{r.tanggal}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>
      ) : (
        /* TabULAR LIST OF DETAILED DISTRIBUTION */
        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" id="map-tabular-sebaran-table">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Tanggal Giat</th>
                  <th className="py-3 px-4">Satuan Pengawasan</th>
                  <th className="py-3 px-4">Pelaku Usaha</th>
                  <th className="py-3 px-4">Alamat / Lokasi</th>
                  <th className="py-3 px-4">Jenis Usaha</th>
                  <th className="py-3 px-4">Nilai Kepatuhan</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center font-bold text-slate-400 bg-white">
                      Tidak ada data sebaran yang cocok dengan penyaringan Anda.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors bg-white">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-600 whitespace-nowrap">{r.tanggal}</td>
                      <td className="py-3.5 px-4 font-extrabold text-slate-800">{r.satwas}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-900">{r.pelaku_usaha}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{r.nomor_spt}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate" title={r.alamat}>{r.alamat}</td>
                      <td className="py-3.5 px-4 text-slate-600">{r.jenis_usaha}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-extrabold text-slate-800">{r.nilai_total}</span>
                          <span className={`px-1 py-0.5 rounded text-[8px] font-black uppercase ${
                            r.predikat === "Sangat Baik" 
                              ? "bg-cyan-50 text-cyan-700" 
                              : r.predikat === "Baik" 
                              ? "bg-emerald-50 text-emerald-700" 
                              : r.predikat === "Cukup" 
                              ? "bg-amber-50 text-amber-700" 
                              : "bg-rose-50 text-rose-700"
                          }`}>
                            {r.predikat}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          r.status_ketaatan === "TAAT" 
                            ? "bg-cyan-50 text-cyan-700" 
                            : "bg-rose-50 text-rose-700"
                        }`}>
                          {r.status_ketaatan === "TAAT" ? (
                            <ShieldCheck className="w-3.5 h-3.5" />
                          ) : (
                            <ShieldAlert className="w-3.5 h-3.5" />
                          )}
                          {r.status_ketaatan}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Footer of list */}
          <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex justify-between items-center text-[10px] font-bold text-slate-500">
            <span>Menampilkan {filteredRecords.length} dari {records.length} total data pemeriksaan sebaran</span>
            <span className="font-mono">Stasiun PSDKP Biak Papua TA 2026</span>
          </div>
        </div>
      )}

    </div>
  );
};
