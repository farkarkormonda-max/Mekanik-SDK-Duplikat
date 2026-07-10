import React, { useState, useMemo } from "react";
import { Pemeriksaan, MasterSatwas } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { MapPin, Search, Calendar, ShieldCheck, ShieldAlert, Navigation, Layers, Compass, ZoomIn, ZoomOut, ListFilter, Info, Check, Eye } from "lucide-react";

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
            <div className="flex justify-between items-center bg-slate-50 border border-slate-150 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600">
              <span className="flex items-center gap-1.5 font-mono text-[10px]">
                <Navigation className="w-3.5 h-3.5 text-cyan-500 animate-pulse" />
                CENTER: BIAK ISLAND (136.06°E, 1.185°S)
              </span>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowGrid(!showGrid)} 
                  className={`px-2.5 py-1 rounded text-[10px] font-black transition-all border flex items-center gap-1 cursor-pointer ${
                    showGrid ? "bg-cyan-50 border-cyan-200 text-cyan-700" : "bg-white border-slate-200 text-slate-500"
                  }`}
                >
                  <Layers className="w-3 h-3" />
                  Grid Koordinat
                </button>
              </div>
            </div>

            {/* Tactical Map Container */}
            <div className="relative aspect-[16/10] w-full bg-sky-950 rounded-3xl border border-sky-900 shadow-xl overflow-hidden group select-none">
              
              {/* Oceanic Ambient Lighting Effects */}
              <div className="absolute inset-0 bg-radial-gradient from-sky-900/30 via-transparent to-black/40 pointer-events-none" />
              <div className="absolute bottom-4 left-4 z-10 bg-black/50 border border-sky-800/40 p-3 rounded-2xl text-[9px] font-mono text-cyan-400 space-y-1 backdrop-blur-md">
                <div className="font-bold border-b border-sky-800/30 pb-1 mb-1 uppercase tracking-widest text-slate-200 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-yellow-400 rotate-12" />
                  LEGENDA PETA TAKTIKAL
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
                  Tingkat Ketaatan Tinggi (90%+)
                </div>
                <div className="flex items-center gap-1.5 text-slate-300 font-sans font-semibold">
                  <span className="w-2.5 h-2.5 bg-rose-500 rounded-full block" />
                  Wilayah Butuh Pembinaan (Rasio Rendah)
                </div>
              </div>

              {/* Responsive SVG Map */}
              <svg 
                viewBox="0 0 1000 625" 
                className="w-full h-full"
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
                {/* Custom drawn mathematical SVG coordinates representing coastline & islands */}
                <g fill="#0f172a" stroke="#1e293b" strokeWidth="2" opacity="0.65">
                  {/* Outer ocean boundary */}
                  {/* Land block 1: Bird's Head (Kepala Burung) on far left */}
                  <path d="M 0,250 C 30,220 50,210 80,210 C 110,210 120,200 130,220 C 140,240 120,260 110,280 C 100,300 120,330 130,350 C 140,370 170,360 180,380 C 190,400 180,450 160,490 C 150,510 130,550 120,625 L 0,625 Z" fill="#0c4a6e/30" stroke="#0284c7" strokeWidth="1.5" />
                  
                  {/* Land block 2: Cenderawasih Bay & Nabire (middle coast) */}
                  <path d="M 180,380 C 200,320 220,310 230,340 C 240,370 230,420 240,460 C 250,500 260,520 280,540 C 300,560 320,580 312.5,526 C 310,480 340,440 370,430 C 400,420 420,440 450,450 C 490,460 520,440 560,430 C 600,420 650,420 700,410 C 750,400 800,410 850,400 C 900,395 950,405 1000,396 L 1000,625 L 312.5,625 Z" fill="#083344/40" stroke="#0284c7" strokeWidth="1.5" />

                  {/* Islands Group */}
                  {/* Biak & Supiori Islands (Centered at x=380, y=185) */}
                  {/* Supiori Island (Top Left of Biak) */}
                  <path d="M 330,130 C 340,110 360,110 370,120 C 380,130 370,150 350,150 C 330,150 320,140 330,130 Z" fill="#1e1b4b/70" stroke="#06b6d4" strokeWidth="1.5" />
                  {/* Biak Island (Main) */}
                  <path d="M 365,160 C 390,140 430,160 420,195 C 410,210 380,215 365,200 C 350,190 355,170 365,160 Z" fill="#1e1b4b/90" stroke="#06b6d4" strokeWidth="2" />
                  
                  {/* Numfor Island */}
                  <path d="M 285,210 C 295,200 310,205 310,215 C 310,225 295,235 285,225 C 275,225 275,215 285,210 Z" fill="#1e1b4b/40" stroke="#0284c7" strokeWidth="1" />
                  
                  {/* Yapen Island */}
                  <path d="M 380,260 C 410,250 480,255 500,265 C 470,275 420,270 380,260 Z" fill="#1e1b4b/50" stroke="#0284c7" strokeWidth="1.2" />
                </g>

                {/* 3. Island / Region Text Annotations */}
                <g fill="#94a3b8" fontSize="10" fontWeight="bold" fontFamily="sans-serif" opacity="0.6">
                  <text x="375" y="220" fill="#22d3ee" fontSize="11" fontWeight="900" letterSpacing="1">P. BIAK</text>
                  <text x="315" y="110" fontSize="9">P. Supiori</text>
                  <text x="260" y="240" fontSize="9">P. Numfor</text>
                  <text x="420" y="285" fontSize="10">P. YAPEN</text>
                  <text x="210" y="470" fontSize="11" rotate="310" letterSpacing="2">TELUK CENDERAWASIH</text>
                  <text x="15" y="330" rotate="270">SAMUDERA PASIFIK</text>
                </g>

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
                      onClick={() => setSelectedSatwas(key)}
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
              </svg>
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
