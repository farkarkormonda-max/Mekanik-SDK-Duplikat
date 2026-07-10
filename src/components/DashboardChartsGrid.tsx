import React, { useState } from "react";
import { motion } from "motion/react";
import { GripVertical, RotateCcw } from "lucide-react";
import { DashboardStats } from "../types";
import {
  PemeriksaanBulananChart,
  KetaatanPieChart,
  NilaiSatwasChart,
  TrendTahunanChart,
  TrendBulananChart
} from "./DashboardCharts";

interface DashboardChartsGridProps {
  stats: DashboardStats;
}

export const DashboardChartsGrid: React.FC<DashboardChartsGridProps> = ({ stats }) => {
  const [chartsOrder, setChartsOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem("mekanik_charts_order");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 5) return parsed;
      } catch (e) {}
    }
    return ["pemeriksaan_bulanan", "ketaatan_pie", "nilai_satwas", "trend_tahunan", "trend_bulanan"];
  });

  const [draggedChartId, setDraggedChartId] = useState<string | null>(null);

  const handleDragStart = (id: string) => {
    setDraggedChartId(id);
  };

  const handleDragEnter = (targetId: string) => {
    if (draggedChartId === null || draggedChartId === targetId) return;

    const newOrder = [...chartsOrder];
    const dragIdx = newOrder.indexOf(draggedChartId);
    const targetIdx = newOrder.indexOf(targetId);
    if (dragIdx > -1 && targetIdx > -1) {
      newOrder.splice(dragIdx, 1);
      newOrder.splice(targetIdx, 0, draggedChartId);
      setChartsOrder(newOrder);
      localStorage.setItem("mekanik_charts_order", JSON.stringify(newOrder));
    }
  };

  const handleDragEnd = () => {
    setDraggedChartId(null);
  };

  const resetChartsOrder = () => {
    setChartsOrder(["pemeriksaan_bulanan", "ketaatan_pie", "nilai_satwas", "trend_tahunan", "trend_bulanan"]);
    localStorage.removeItem("mekanik_charts_order");
  };

  const chartTemplates = [
    {
      id: "pemeriksaan_bulanan",
      title: "Distribusi Pemeriksaan per Bulan (Giat 2026)",
      desc: "Aktivitas kualitatif pengawasan bulanan",
      isWide: false,
      render: () => <PemeriksaanBulananChart data={stats.chartPemeriksaanBulanan} />
    },
    {
      id: "ketaatan_pie",
      title: "Persentase Tingkat Ketaatan Pelaku Usaha",
      desc: "Perbandingan status Taat vs. Tidak Taat",
      isWide: false,
      render: () => <KetaatanPieChart data={stats.chartKetaatan} />
    },
    {
      id: "nilai_satwas",
      title: "Skor Kepatuhan Rata-rata per Satwas Wilayah",
      desc: "Analisa performa ketaatan di masing-masing area kerja",
      isWide: false,
      render: () => <NilaiSatwasChart data={stats.chartNilaiSatwas} />
    },
    {
      id: "trend_tahunan",
      title: "Tren Tingkat Kepatuhan Nasional (2024 - 2026)",
      desc: "Perbandingan rata-rata evaluasi nilai tahunan",
      isWide: false,
      render: () => <TrendTahunanChart data={stats.chartTrendTahunan} />
    },
    {
      id: "trend_bulanan",
      title: "Trend Kumulatif Bulanan: Realisasi Anggaran vs Target",
      desc: "Perbandingan pertambahan realisasi penyerapan anggaran dengan target (pagu) kumulatif per bulan sepanjang tahun 2026",
      isWide: true,
      render: () => <TrendBulananChart dashboardStats={stats} />
    }
  ];

  const sortedCharts = chartsOrder
    .map(id => chartTemplates.find(c => c.id === id))
    .filter((c): c is typeof chartTemplates[number] => !!c);

  const hasCustomChartsOrder = localStorage.getItem("mekanik_charts_order") !== null;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center select-none pt-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
          <span className="w-1.5 h-3 bg-indigo-500 rounded-xs" />
          Visualisasi & Chart Kinerja Pengawasan
        </h3>
        {hasCustomChartsOrder && (
          <button
            onClick={resetChartsOrder}
            className="flex items-center gap-1 px-2.5 py-1 text-[9px] font-bold text-slate-500 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-lg transition-all cursor-pointer"
            title="Kembalikan tata letak diagram ke setelan pabrik"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            Reset Tata Letak Diagram
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {sortedCharts.map((chart) => {
          const isDragging = draggedChartId === chart.id;
          return (
            <motion.div
              layout
              id={`chart-container-${chart.id}`}
              key={`chart-${chart.id}`}
              draggable
              onDragStart={() => handleDragStart(chart.id)}
              onDragEnter={() => handleDragEnter(chart.id)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => e.preventDefault()}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: isDragging ? 0.3 : 1, y: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className={`bg-white border p-5 rounded-2xl shadow-sm group/chart relative select-none chart-card ${
                chart.isWide ? "lg:col-span-2" : ""
              } ${
                isDragging 
                  ? "border-dashed border-sky-400 bg-sky-50/10 scale-[0.99] shadow-inner" 
                  : "hover:shadow-md cursor-grab active:cursor-grabbing hover:border-slate-350"
              }`}
            >
              {/* Drag handle */}
              <div className="absolute right-4 top-4 text-slate-400 opacity-25 group-hover/chart:opacity-85 transition-opacity cursor-grab active:cursor-grabbing flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200/50">
                <GripVertical className="w-3.5 h-3.5" />
                <span className="text-[8px] font-black uppercase tracking-wider text-slate-450 hidden sm:inline select-none">Tahan & Geser</span>
              </div>

              <div className="pr-12">
                <h3 className="text-sm font-bold text-slate-850">{chart.title}</h3>
                <p className="text-[10px] text-slate-400 mb-4 font-semibold font-sans leading-relaxed">{chart.desc}</p>
              </div>

              <div className="pt-2">
                {chart.render()}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
