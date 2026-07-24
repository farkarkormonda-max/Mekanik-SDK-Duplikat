import React, { useState } from "react";
import { motion } from "motion/react";
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

  const [hiddenCharts, setHiddenCharts] = useState<string[]>(() => {
    const saved = localStorage.getItem("mekanik_hidden_charts");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    // Default trend_tahunan & trend_bulanan as hidden per user request to delete/hapus
    return ["trend_tahunan", "trend_bulanan"];
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

  const hideChart = (id: string) => {
    const updated = [...hiddenCharts, id];
    setHiddenCharts(updated);
    localStorage.setItem("mekanik_hidden_charts", JSON.stringify(updated));
  };

  const resetCharts = () => {
    setChartsOrder(["pemeriksaan_bulanan", "ketaatan_pie", "nilai_satwas", "trend_tahunan", "trend_bulanan"]);
    setHiddenCharts([]);
    localStorage.removeItem("mekanik_charts_order");
    localStorage.removeItem("mekanik_hidden_charts");
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
    .filter(id => !hiddenCharts.includes(id))
    .map(id => chartTemplates.find(c => c.id === id))
    .filter((c): c is typeof chartTemplates[number] => !!c);

  const isModified = localStorage.getItem("mekanik_charts_order") !== null || hiddenCharts.length > 0;

  return (
    <div className="space-y-4">
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
              <div className="mb-2">
                <h3 className="text-sm font-bold text-slate-850">{chart.title}</h3>
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
