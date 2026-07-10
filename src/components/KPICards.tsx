import React from "react";
import { motion } from "motion/react";
import { 
  FileCheck, 
  ThumbsUp, 
  ThumbsDown, 
  Percent, 
  TrendingUp, 
  TrendingDown,
  Wallet,
  Coins,
  PiggyBank,
  Target,
  GripVertical,
  RotateCcw
} from "lucide-react";
import { DashboardStats } from "../types";

interface KPICardsProps {
  stats: DashboardStats;
}

const formatRupiah = (value?: number) => {
  if (value === undefined || value === null) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

export const KPICards: React.FC<KPICardsProps> = ({ stats }) => {
  const isCloseToPagu = (stats.persentasePenyerapan ?? 0) >= 90;
  const isOverPagu = (stats.persentasePenyerapan ?? 0) >= 100;

  // Track order in state, persisting to localStorage
  const [perfOrder, setPerfOrder] = React.useState<string[]>(() => {
    const saved = localStorage.getItem("mekanik_perf_cards_order");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 6) return parsed;
      } catch (e) {}
    }
    return ["total", "taat", "tidak-taat", "avg", "max", "min"];
  });

  const [budgetOrder, setBudgetOrder] = React.useState<string[]>(() => {
    const saved = localStorage.getItem("mekanik_budget_cards_order");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 6) return parsed;
      } catch (e) {}
    }
    return ["pagu", "target_realisasi", "realisasi", "sisa", "penyerapan_pagu", "penyerapan_target"];
  });

  // Drag and Drop state variables
  const [draggedCardId, setDraggedCardId] = React.useState<string | null>(null);
  const [draggedCategory, setDraggedCategory] = React.useState<"perf" | "budget" | null>(null);

  const handleDragStart = (id: string, category: "perf" | "budget") => {
    setDraggedCardId(id);
    setDraggedCategory(category);
  };

  const handleDragEnter = (targetId: string, category: "perf" | "budget") => {
    if (draggedCardId === null || draggedCategory !== category || draggedCardId === targetId) return;

    if (category === "perf") {
      const newOrder = [...perfOrder];
      const dragIdx = newOrder.indexOf(draggedCardId);
      const targetIdx = newOrder.indexOf(targetId);
      if (dragIdx > -1 && targetIdx > -1) {
        newOrder.splice(dragIdx, 1);
        newOrder.splice(targetIdx, 0, draggedCardId);
        setPerfOrder(newOrder);
        localStorage.setItem("mekanik_perf_cards_order", JSON.stringify(newOrder));
      }
    } else {
      const newOrder = [...budgetOrder];
      const dragIdx = newOrder.indexOf(draggedCardId);
      const targetIdx = newOrder.indexOf(targetId);
      if (dragIdx > -1 && targetIdx > -1) {
        newOrder.splice(dragIdx, 1);
        newOrder.splice(targetIdx, 0, draggedCardId);
        setBudgetOrder(newOrder);
        localStorage.setItem("mekanik_budget_cards_order", JSON.stringify(newOrder));
      }
    }
  };

  const handleDragEnd = () => {
    setDraggedCardId(null);
    setDraggedCategory(null);
  };

  const resetPerfOrder = () => {
    const defaultOrder = ["total", "taat", "tidak-taat", "avg", "max", "min"];
    setPerfOrder(defaultOrder);
    localStorage.removeItem("mekanik_perf_cards_order");
  };

  const resetBudgetOrder = () => {
    const defaultOrder = ["pagu", "target_realisasi", "realisasi", "sisa", "penyerapan_pagu", "penyerapan_target"];
    setBudgetOrder(defaultOrder);
    localStorage.removeItem("mekanik_budget_cards_order");
  };

  const budgetCards = [
    {
      id: "pagu",
      title: "Pagu Anggaran Timja",
      value: formatRupiah(stats.paguAnggaran),
      desc: "Alokasi Anggaran Kerja Setahunan",
      color: "from-slate-50 to-slate-100 border-slate-200 text-slate-800",
      iconColor: "bg-slate-500/10 text-slate-700",
      icon: Wallet,
    },
    {
      id: "target_realisasi",
      title: "Target Realisasi Kerja",
      value: formatRupiah(stats.targetRealisasi),
      desc: "Dana Target Penyerapan Rencana",
      color: "from-cyan-50 to-cyan-100 border-cyan-200 text-cyan-800",
      iconColor: "bg-cyan-500/10 text-cyan-700",
      icon: Target,
    },
    {
      id: "realisasi",
      title: "Realisasi Anggaran",
      value: formatRupiah(stats.realisasiAnggaran),
      desc: isOverPagu
        ? "Realisasi melebihi pagu anggaran!"
        : isCloseToPagu
        ? "Pengeluaran mendekati batas pagu"
        : "Dana Kerja yang Telah Diserap",
      color: isOverPagu 
        ? "from-rose-50 to-rose-100/60 border-rose-300 text-rose-900 shadow-rose-100/50" 
        : isCloseToPagu 
        ? "from-amber-50 to-amber-100/60 border-amber-300 text-amber-900 shadow-amber-100/50" 
        : "from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-800",
      iconColor: isOverPagu 
        ? "bg-rose-500/20 text-rose-700" 
        : isCloseToPagu 
        ? "bg-amber-500/20 text-amber-700" 
        : "bg-emerald-500/10 text-emerald-700",
      icon: Coins,
    },
    {
      id: "sisa",
      title: "Sisa Anggaran Kerja",
      value: formatRupiah(stats.sisaAnggaran),
      desc: isOverPagu
        ? "Defisit Anggaran (Overspending)"
        : "Sisa Dana Alokasi Tersedia",
      color: isOverPagu 
        ? "from-rose-50 to-rose-100/60 border-rose-300 text-rose-950" 
        : stats.sisaAnggaran !== undefined && stats.sisaAnggaran <= 0 
        ? "from-rose-50 to-rose-100/50 border-rose-200 text-rose-850" 
        : "from-blue-50 to-blue-100 border-blue-200 text-blue-800",
      iconColor: isOverPagu || (stats.sisaAnggaran !== undefined && stats.sisaAnggaran <= 0) 
        ? "bg-rose-500/10 text-rose-700" 
        : "bg-blue-500/10 text-blue-700",
      icon: PiggyBank,
    },
    {
      id: "penyerapan_pagu",
      title: "Penyerapan s.d. Pagu",
      value: `${stats.persentasePenyerapan ?? 0}%`,
      desc: isOverPagu 
        ? "⚠️ MELEBIHI PAGU (Batas Maksimal!)" 
        : isCloseToPagu 
        ? "⚠️ Hampir Mencapai Batas Maksimal" 
        : "Rasio Penyerapan Terhadap Total Pagu",
      color: isOverPagu 
        ? "from-rose-100 to-rose-200 border-rose-400 text-rose-950 shadow-rose-200/30" 
        : isCloseToPagu 
        ? "from-amber-100 to-amber-200 border-amber-400 text-amber-950 shadow-amber-200/30" 
        : "from-amber-50 to-amber-100 border-amber-200 text-amber-850",
      iconColor: isOverPagu 
        ? "bg-rose-500/25 text-rose-900" 
        : isCloseToPagu 
        ? "bg-amber-500/25 text-amber-900" 
        : "bg-amber-500/10 text-amber-700",
      icon: Percent,
    },
    {
      id: "penyerapan_target",
      title: "Penyerapan s.d. Target",
      value: `${stats.persentasePenyerapanTarget ?? 0}%`,
      desc: "Rasio Penyerapan Terhadap Target Realisasi",
      color: "from-purple-50 to-purple-100 border-purple-200 text-purple-800",
      iconColor: "bg-purple-500/10 text-purple-700",
      icon: Percent,
    },
  ];

  const perfCards = [
    {
      id: "total",
      title: "Total Pemeriksaan",
      value: stats.totalPemeriksaan,
      desc: "Keseluruhan Giat Pengawasan",
      color: "from-sky-50 to-sky-100 border-sky-200 text-sky-800",
      iconColor: "bg-sky-500/10 text-sky-700",
      icon: FileCheck,
    },
    {
      id: "taat",
      title: "Pelaku Usaha Taat",
      value: stats.totalTaat,
      desc: "Memenuhi Seluruh Ketentuan",
      color: "from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-800",
      iconColor: "bg-emerald-500/10 text-emerald-700",
      icon: ThumbsUp,
    },
    {
      id: "tidak-taat",
      title: "Ketaatan Kurang (Tidak Taat)",
      value: stats.totalTidakTaat,
      desc: "Butuh Tindak Lanjut / Catatan",
      color: "from-rose-50 to-rose-100 border-rose-200 text-rose-800",
      iconColor: "bg-rose-500/10 text-rose-700",
      icon: ThumbsDown,
    },
    {
      id: "avg",
      title: "Rata-rata Nilai",
      value: `${stats.rataRataNilai}%`,
      desc: "Tingkat Kepatuhan Regional",
      color: "from-violet-50 to-violet-100 border-violet-200 text-violet-800",
      iconColor: "bg-violet-500/10 text-violet-700",
      icon: Percent,
    },
    {
      id: "max",
      title: "Nilai Tertinggi",
      value: stats.nilaiTertinggi,
      desc: "Kepatuhan Sempurna (Sangat Baik)",
      color: "from-amber-50 to-amber-100 border-amber-200 text-amber-850",
      iconColor: "bg-amber-500/10 text-amber-700",
      icon: TrendingUp,
    },
    {
      id: "min",
      title: "Nilai Terendah",
      value: stats.nilaiTerendah,
      desc: "Atensi Khusus Perbaikan",
      color: "from-indigo-50 to-indigo-100 border-indigo-200 text-indigo-800",
      iconColor: "bg-indigo-500/10 text-indigo-700",
      icon: TrendingDown,
    },
  ];

  // Map and sort cards based on stored order state
  const sortedPerfCards = perfOrder
    .map(id => perfCards.find(c => c.id === id))
    .filter((c): c is typeof perfCards[number] => !!c);

  const sortedBudgetCards = budgetOrder
    .map(id => budgetCards.find(c => c.id === id))
    .filter((c): c is typeof budgetCards[number] => !!c);

  const hasCustomPerfOrder = localStorage.getItem("mekanik_perf_cards_order") !== null;
  const hasCustomBudgetOrder = localStorage.getItem("mekanik_budget_cards_order") !== null;

  return (
    <div className="space-y-8">
      {/* Kinerja & Pengawasan Section */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 select-none">
            <span className="w-1.5 h-3 bg-sky-500 rounded-xs" />
            Indikator Kinerja Utama & Pengawasan
          </h3>
          {hasCustomPerfOrder && (
            <button
              onClick={resetPerfOrder}
              className="flex items-center gap-1 px-2.5 py-1 text-[9px] font-bold text-slate-500 hover:text-sky-600 bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-sky-200 rounded-lg transition-all cursor-pointer select-none"
              title="Kembalikan urutan kartu statistik ke setelan pabrik"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              Reset Tata Letak
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedPerfCards.map((card) => {
            const IconComponent = card.icon;
            const isDragging = draggedCardId === card.id;

            return (
              <motion.div
                layout
                id={`card-${card.id}`}
                key={`card-${card.id}`}
                draggable
                onDragStart={() => handleDragStart(card.id, "perf")}
                onDragEnter={() => handleDragEnter(card.id, "perf")}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: isDragging ? 0.3 : 1, y: 0 }}
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
                className={`rounded-2xl border bg-gradient-to-br ${card.color} p-5 shadow-xs transition-all flex items-center justify-between gap-4 group/card relative overflow-hidden select-none ${
                  isDragging 
                    ? "border-dashed border-sky-400 bg-sky-50/20 scale-[0.98] shadow-inner" 
                    : "hover:scale-[1.01] hover:shadow-sm cursor-grab active:cursor-grabbing"
                }`}
              >
                {/* Visual drag handle on left */}
                <div className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400 opacity-20 group-hover/card:opacity-75 transition-opacity pointer-events-none">
                  <GripVertical className="w-3.5 h-3.5" />
                </div>

                <div className="flex-1 min-w-0 pl-2">
                  <span className="text-[10px] uppercase tracking-wider font-bold opacity-75 block truncate">{card.title}</span>
                  <h3 className="text-2xl font-extrabold font-mono mt-0.5 tracking-tight">{card.value}</h3>
                  <p className="text-[10px] mt-0.5 font-semibold opacity-75 block truncate">{card.desc}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${card.iconColor}`}>
                  <IconComponent className="w-5 h-5" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Keuangan & Anggaran Section */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
          <div className="flex justify-between items-center w-full">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 select-none">
              <span className="w-1.5 h-3 bg-emerald-500 rounded-xs" />
              Alokasi & Penyerapan Anggaran Kerja Timja
            </h3>
            {hasCustomBudgetOrder && (
              <button
                onClick={resetBudgetOrder}
                className="flex items-center gap-1 px-2.5 py-1 text-[9px] font-bold text-slate-500 hover:text-emerald-600 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 rounded-lg transition-all cursor-pointer select-none"
                title="Kembalikan urutan anggaran ke setelan pabrik"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                Reset Tata Letak
              </button>
            )}
          </div>
          {isCloseToPagu && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold border shrink-0 ${
                isOverPagu
                  ? "bg-rose-50 border-rose-200 text-rose-700 animate-pulse"
                  : "bg-amber-50 border-amber-200 text-amber-700"
              }`}
            >
              <span className="flex h-1.5 w-1.5 relative">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOverPagu ? "bg-rose-450" : "bg-amber-450"}`}></span>
                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${isOverPagu ? "bg-rose-600" : "bg-amber-600"}`}></span>
              </span>
              <span>
                {isOverPagu
                  ? "Peringatan: Realisasi Anggaran Telah Melampaui Pagu!"
                  : "Atensi: Realisasi Anggaran Mendekati Batas Maksimal (90%+)"}
              </span>
            </motion.div>
          )}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedBudgetCards.map((card) => {
            const IconComponent = card.icon;
            const isLimitCard = card.id === "penyerapan_pagu" || card.id === "realisasi";
            const isDragging = draggedCardId === card.id;

            return (
              <motion.div
                layout
                id={`card-${card.id}`}
                key={`card-${card.id}`}
                draggable
                onDragStart={() => handleDragStart(card.id, "budget")}
                onDragEnter={() => handleDragEnter(card.id, "budget")}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: isDragging ? 0.3 : 1, y: 0 }}
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
                className={`rounded-2xl border bg-gradient-to-br ${card.color} p-5 shadow-xs transition-all flex items-center justify-between gap-4 group/card relative overflow-hidden select-none ${
                  isDragging 
                    ? "border-dashed border-sky-400 bg-sky-50/20 scale-[0.98] shadow-inner" 
                    : "hover:scale-[1.01] hover:shadow-sm cursor-grab active:cursor-grabbing"
                }`}
              >
                {/* Visual drag handle on left */}
                <div className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400 opacity-20 group-hover/card:opacity-75 transition-opacity pointer-events-none">
                  <GripVertical className="w-3.5 h-3.5" />
                </div>

                {/* Warning Pulse Effect Background for visual prominence */}
                {isLimitCard && isCloseToPagu && (
                  <div className={`absolute inset-0 opacity-[0.03] pointer-events-none animate-pulse ${isOverPagu ? "bg-rose-500" : "bg-amber-500"}`} />
                )}

                <div className="flex-1 min-w-0 pl-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] uppercase tracking-wider font-bold opacity-75">{card.title}</span>
                    {isLimitCard && isCloseToPagu && (
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wide shrink-0 ${
                        isOverPagu ? "bg-rose-600 text-white" : "bg-amber-600 text-white"
                      }`}>
                        {isOverPagu ? "Overspending" : "Batas Limit"}
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-extrabold font-mono mt-1 tracking-tight truncate">{card.value}</h3>
                  <p className="text-[10px] mt-0.5 font-semibold opacity-75 block truncate">{card.desc}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${card.iconColor}`}>
                  <IconComponent className="w-5 h-5" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
