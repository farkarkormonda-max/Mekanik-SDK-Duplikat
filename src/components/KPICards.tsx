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
  Target
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
      desc: "Dana Kerja yang Telah Diserap",
      color: "from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-800",
      iconColor: "bg-emerald-500/10 text-emerald-700",
      icon: Coins,
    },
    {
      id: "sisa",
      title: "Sisa Anggaran Kerja",
      value: formatRupiah(stats.sisaAnggaran),
      desc: "Sisa Dana Alokasi Tersedia",
      color: "from-blue-50 to-blue-100 border-blue-200 text-blue-800",
      iconColor: "bg-blue-500/10 text-blue-700",
      icon: PiggyBank,
    },
    {
      id: "penyerapan_pagu",
      title: "Penyerapan s.d. Pagu",
      value: `${stats.persentasePenyerapan ?? 0}%`,
      desc: "Rasio Penyerapan Terhadap Total Pagu",
      color: "from-amber-50 to-amber-100 border-amber-200 text-amber-850",
      iconColor: "bg-amber-500/10 text-amber-700",
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

  return (
    <div className="space-y-8">
      {/* Kinerja & Pengawasan Section */}
      <div>
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
          <span className="w-1.5 h-3 bg-sky-500 rounded-xs" />
          Indikator Kinerja Utama & Pengawasan
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {perfCards.map((card, index) => {
            const IconComponent = card.icon;
            return (
              <motion.div
                id={card.id}
                key={`${card.id}-${stats.totalPemeriksaan}-${stats.totalTaat}-${stats.rataRataNilai}`}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05, ease: "easeOut" }}
                className={`rounded-2xl border bg-gradient-to-br ${card.color} p-5 shadow-xs transition-all hover:scale-[1.01] hover:shadow-sm flex items-center justify-between gap-4`}
              >
                <div className="flex-1 min-w-0">
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
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
          <span className="w-1.5 h-3 bg-emerald-500 rounded-xs" />
          Alokasi & Penyerapan Anggaran Kerja Timja
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {budgetCards.map((card, index) => {
            const IconComponent = card.icon;
            return (
              <motion.div
                id={card.id}
                key={`${card.id}-${stats.paguAnggaran}-${stats.realisasiAnggaran}-${stats.persentasePenyerapan}`}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05, ease: "easeOut" }}
                className={`rounded-2xl border bg-gradient-to-br ${card.color} p-5 shadow-xs transition-all hover:scale-[1.01] hover:shadow-sm flex items-center justify-between gap-4`}
              >
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] uppercase tracking-wider font-bold opacity-75 block truncate">{card.title}</span>
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
