import React, { useState } from "react";
import { motion } from "motion/react";

interface BarChartProps {
  data: { bulan: string; jumlah: number }[];
}

export const PemeriksaanBulananChart: React.FC<BarChartProps> = ({ data }) => {
  const maxVal = Math.max(...data.map((d) => d.jumlah), 1);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  return (
    <div className="w-full flex flex-col h-72 justify-between">
      <div className="flex-1 flex items-end gap-3 px-2 pt-4 border-b border-slate-200">
        {data.map((item, idx) => {
          const heightPercent = (item.jumlah / maxVal) * 85; // cap at 85%
          return (
            <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end relative">
              {hoveredIdx === idx && (
                <div className="absolute -top-1 bg-slate-900 text-white text-xs px-2 py-1 rounded shadow-lg z-10 transition-all pointer-events-none -translate-y-full">
                  Jumlah: {item.jumlah}
                </div>
              )}
              <motion.div
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                initial={{ height: 0 }}
                animate={{ height: `${heightPercent}%` }}
                transition={{ duration: 0.6, delay: idx * 0.03, ease: "easeOut" }}
                className={`w-full rounded-t-md cursor-pointer transition-colors ${
                  hoveredIdx === idx ? "bg-cyan-500" : "bg-gradient-to-t from-sky-700 to-sky-400"
                }`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between px-2 pt-2 text-[10px] text-slate-500 font-mono">
        {data.map((item, idx) => (
          <span key={idx} className="flex-1 text-center truncate">
            {item.bulan}
          </span>
        ))}
      </div>
    </div>
  );
};

interface PieChartProps {
  data: { name: string; value: number }[];
}

export const KetaatanPieChart: React.FC<PieChartProps> = ({ data }) => {
  const total = data.reduce((acc, d) => acc + d.value, 0) || 1;
  const taat = data.find((d) => d.name === "Taat")?.value || 0;
  const tidakTaat = data.find((d) => d.name === "Tidak Taat")?.value || 0;

  const taatPercent = Math.round((taat / total) * 100);
  const tidakTaatPercent = Math.round((tidakTaat / total) * 100);

  return (
    <div className="w-full flex flex-col md:flex-row items-center justify-around h-64 gap-4">
      {/* Circle Representation */}
      <div className="relative w-36 h-36 flex items-center justify-center">
        <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
          {/* Base Background Circle */}
          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="3" />
          
          {/* Taat Stroke */}
          {taat > 0 && (
            <motion.circle
              cx="18"
              cy="18"
              r="15.915"
              fill="none"
              stroke="#0ea5e9"
              strokeWidth="3.2"
              strokeDasharray={`${taatPercent} ${100 - taatPercent}`}
              strokeDashoffset="0"
              initial={{ strokeDasharray: "0 100" }}
              animate={{ strokeDasharray: `${taatPercent} ${100 - taatPercent}` }}
              transition={{ duration: 0.8 }}
            />
          )}

          {/* Tidak Taat Stroke */}
          {tidakTaat > 0 && (
            <motion.circle
              cx="18"
              cy="18"
              r="15.915"
              fill="none"
              stroke="#f43f5e"
              strokeWidth="3.2"
              strokeDasharray={`${tidakTaatPercent} ${100 - tidakTaatPercent}`}
              strokeDashoffset={taat > 0 ? -taatPercent : 0}
              initial={{ strokeDasharray: "0 100" }}
              animate={{ strokeDasharray: `${tidakTaatPercent} ${100 - tidakTaatPercent}` }}
              transition={{ duration: 0.8, delay: 0.2 }}
            />
          )}
        </svg>
        <div className="absolute text-center">
          <span className="block text-2xl font-bold font-mono text-slate-800">
            {total === 1 && taat === 0 && tidakTaat === 0 ? 0 : total}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Total</span>
        </div>
      </div>

      {/* Legend and stats */}
      <div className="flex flex-col gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-cyan-500" />
          <div>
            <div className="text-xs text-slate-500 font-medium">Taat Aturan</div>
            <div className="text-sm font-bold text-slate-800 font-mono">
              {taat} Unit <span className="text-xs font-normal text-slate-400">({taatPercent}%)</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-rose-500" />
          <div>
            <div className="text-xs text-slate-500 font-medium font-sans">Tidak Taat Aturan</div>
            <div className="text-sm font-bold text-slate-800 font-mono">
              {tidakTaat} Unit <span className="text-xs font-normal text-slate-400">({tidakTaatPercent}%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface SatwasChartProps {
  data: { satwas: string; rataRata: number; jumlah: number }[];
}

export const NilaiSatwasChart: React.FC<SatwasChartProps> = ({ data }) => {
  const maxVal = 100;

  return (
    <div className="w-full flex flex-col gap-4 py-2">
      {data.length === 0 ? (
        <div className="text-center text-slate-400 py-12 text-sm font-sans">Tidak ada data Satwas</div>
      ) : (
        data.map((item, idx) => {
          const percent = (item.rataRata / maxVal) * 100;
          return (
            <div key={idx} className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700 truncate max-w-[200px]" title={item.satwas}>
                  {item.satwas}
                </span>
                <span className="text-slate-500 font-mono">
                  Rata-rata: <strong className="text-slate-900">{item.rataRata}</strong> ({item.jumlah} Giat)
                </span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percent}%` }}
                  transition={{ duration: 0.8, delay: idx * 0.1 }}
                  className={`h-full rounded-full bg-gradient-to-r ${
                    item.rataRata >= 90
                      ? "from-emerald-500 to-teal-400"
                      : item.rataRata >= 80
                      ? "from-sky-600 to-cyan-400"
                      : item.rataRata >= 70
                      ? "from-amber-500 to-yellow-400"
                      : "from-rose-500 to-orange-400"
                  }`}
                />
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

interface LineChartProps {
  data: { tahun: string; rataRata: number }[];
}

export const TrendTahunanChart: React.FC<LineChartProps> = ({ data }) => {
  const maxVal = 100;
  const padding = 30;
  const height = 180;
  const width = 360;

  // Calculate coordinates for SVG paths
  const points = data.map((item, idx) => {
    const x = padding + (idx * (width - padding * 2)) / (data.length - 1 || 1);
    const y = height - padding - (item.rataRata / maxVal) * (height - padding * 2);
    return { x, y, val: item.rataRata, label: item.tahun };
  });

  const pathD = points.length > 0 
    ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(" ")
    : "";

  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length-1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
    : "";

  return (
    <div className="w-full flex flex-col justify-center h-64">
      <div className="relative flex-1">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          {/* Y Axis Gridlines */}
          {[0, 25, 50, 75, 100].map((grid, idx) => {
            const y = height - padding - (grid / maxVal) * (height - padding * 2);
            return (
              <g key={idx}>
                <line
                  x1={padding}
                  y1={y}
                  x2={width - padding}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeWidth="0.5"
                  strokeDasharray="4 4"
                />
                <text x={padding - 5} y={y + 3} textAnchor="end" className="text-[9px] fill-slate-400 font-mono">
                  {grid}
                </text>
              </g>
            );
          })}

          {/* Area under the line */}
          {points.length > 0 && (
            <path
              d={areaD}
              fill="url(#trendAreaGrad)"
              opacity="0.3"
            />
          )}

          {/* Connected Trend Line */}
          {points.length > 0 && (
            <motion.path
              d={pathD}
              fill="none"
              stroke="#0284c7"
              strokeWidth="2.5"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, ease: "easeInOut" }}
            />
          )}

          {/* Points circles and labels */}
          {points.map((p, idx) => (
            <g key={idx} className="cursor-pointer group">
              <motion.circle
                cx={p.x}
                cy={p.y}
                r="4.5"
                fill="#0284c7"
                stroke="#fff"
                strokeWidth="2"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.4, delay: 0.5 + idx * 0.1 }}
              />
              <text x={p.x} y={p.y - 10} textAnchor="middle" className="text-[10px] font-bold fill-slate-800 font-mono">
                {p.val}
              </text>
              <text x={p.x} y={height - 10} textAnchor="middle" className="text-[9px] fill-slate-400 font-sans">
                {p.label}
              </text>
            </g>
          ))}

          {/* Grad Definition */}
          <defs>
            <linearGradient id="trendAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0ea5e9" />
              <stop offset="100%" stopColor="#ffff" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
};

interface AnggaranSatwasStackedBarChartProps {
  dashboardStats: any;
  satwasList: { id: string; nama_satwas: string; wilayah: string }[];
  selectedSatwas: string;
  config?: any;
}

export const AnggaranSatwasStackedBarChart: React.FC<AnggaranSatwasStackedBarChartProps> = ({
  dashboardStats,
  satwasList,
  selectedSatwas,
  config,
}) => {
  const budgetShareMap: Record<string, number> = {
    "Stasiun PSDKP Biak": 0.40,
    "Satwas SDKP Manokwari": 0.20,
    "Satwas SDKP Jayapura": 0.25,
    "Satwas SDK Nabire": 0.15,
  };

  // Prepare data for each satwas in satwasList
  const satwasData = satwasList.map((sat) => {
    const hasSpecificConfig = config?.TARGET_SATWAS && config.TARGET_SATWAS[sat.nama_satwas] !== undefined;

    let t1 = 0, t2 = 0, t3 = 0, t4 = 0;
    let r1 = 0, r2 = 0, r3 = 0, r4 = 0;
    let totalTarget = 0;
    let totalRealisasi = 0;
    let share = 0.20;

    if (hasSpecificConfig) {
      const satwasConfig = config.TARGET_SATWAS[sat.nama_satwas];
      totalTarget = Number(satwasConfig.target) || 0;
      totalRealisasi = Number(satwasConfig.realisasi) || 0;

      // Quarterly proportions
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

      t1 = Math.round(totalTarget * q1TargetProp);
      t2 = Math.round(totalTarget * q2TargetProp);
      t3 = Math.round(totalTarget * q3TargetProp);
      t4 = Math.round(totalTarget * q4TargetProp);

      r1 = Math.round(totalRealisasi * q1RealProp);
      r2 = Math.round(totalRealisasi * q2RealProp);
      r3 = Math.round(totalRealisasi * q3RealProp);
      r4 = Math.round(totalRealisasi * q4RealProp);
    } else {
      share = budgetShareMap[sat.nama_satwas] !== undefined ? budgetShareMap[sat.nama_satwas] : 0.20;

      t1 = Math.round((dashboardStats?.targetQ1 ?? 250000000) * share);
      t2 = Math.round((dashboardStats?.targetQ2 ?? 250000000) * share);
      t3 = Math.round((dashboardStats?.targetQ3 ?? 250000000) * share);
      t4 = Math.round((dashboardStats?.targetQ4 ?? 250000000) * share);

      r1 = Math.round((dashboardStats?.realisasiQ1 ?? 220000000) * share);
      r2 = Math.round((dashboardStats?.realisasiQ2 ?? 230000000) * share);
      r3 = Math.round((dashboardStats?.realisasiQ3 ?? 200000000) * share);
      r4 = Math.round((dashboardStats?.realisasiQ4 ?? 175000000) * share);

      totalTarget = t1 + t2 + t3 + t4;
      totalRealisasi = r1 + r2 + r3 + r4;
    }

    return {
      id: sat.id,
      nama_satwas: sat.nama_satwas,
      wilayah: sat.wilayah,
      share,
      quarters: [
        { label: "Q1", target: t1, realisasi: r1 },
        { label: "Q2", target: t2, realisasi: r2 },
        { label: "Q3", target: t3, realisasi: r3 },
        { label: "Q4", target: t4, realisasi: r4 },
      ],
      totalTarget,
      totalRealisasi,
    };
  });

  // Find max total value to scale heights
  const maxTotalVal = Math.max(...satwasData.map(d => Math.max(d.totalTarget, d.totalRealisasi)), 1);

  // Hover state
  const [hoverInfo, setHoverInfo] = useState<{
    satwasId: string;
    type: "target" | "realisasi";
    qIdx: number;
    targetVal: number;
    realisasiVal: number;
    qLabel: string;
    satwasName: string;
  } | null>(null);

  // Styling helper for quarter colors
  const quarterColors = {
    target: [
      "from-sky-300 to-sky-400 border-sky-400/30 text-sky-950",
      "from-cyan-300 to-cyan-400 border-cyan-400/30 text-cyan-950",
      "from-teal-300 to-teal-400 border-teal-400/30 text-teal-950",
      "from-indigo-300 to-indigo-400 border-indigo-400/30 text-indigo-950",
    ],
    realisasi: [
      "from-sky-600 to-blue-500 border-sky-700/30 text-white",
      "from-cyan-600 to-sky-500 border-cyan-700/30 text-white",
      "from-teal-600 to-emerald-500 border-teal-700/30 text-white",
      "from-indigo-600 to-violet-500 border-indigo-700/30 text-white",
    ],
  };

  const quarterLabels = ["Triwulan I (Q1)", "Triwulan II (Q2)", "Triwulan III (Q3)", "Triwulan IV (Q4)"];

  // Helper to format currency to millions
  const formatJuta = (val: number) => {
    return `Rp ${(val / 1000000).toFixed(1)} Jt`;
  };

  const formatRupiahFull = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);
  };

  // Generate grid values
  const gridTicks = [1, 0.75, 0.5, 0.25, 0];

  return (
    <div id="satwas-stacked-bar-chart" className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-emerald-500 rounded-xs inline-block" />
            Grafik Stacked Bar: Perbandingan Anggaran Target vs Realisasi per Satwas
          </h3>
          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
            Menganalisis porsi penyerapan (realisasi) dibanding pagu (target) secara triwulanan berdampingan untuk setiap Satwas wilayah kerja
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] font-bold text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-sky-500 inline-block" />
            <span>Q1</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-cyan-500 inline-block" />
            <span>Q2</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-teal-500 inline-block" />
            <span>Q3</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-indigo-500 inline-block" />
            <span>Q4</span>
          </div>
          <div className="border-l border-slate-200 pl-3 flex gap-3">
            <span className="font-semibold text-slate-400">Bar Kiri: <strong className="text-slate-600 font-extrabold">Target</strong></span>
            <span className="font-semibold text-slate-400">Bar Kanan: <strong className="text-slate-600 font-extrabold">Realisasi</strong></span>
          </div>
        </div>
      </div>

      {/* Main chart area */}
      <div className="relative h-96 w-full pt-4 flex">
        {/* Y-Axis scale labels */}
        <div className="w-16 flex flex-col justify-between text-[9px] font-bold text-slate-400 font-mono h-[80%] pr-2 border-r border-slate-100 select-none">
          {gridTicks.map((tick, i) => (
            <span key={i} className="text-right whitespace-nowrap">
              {formatJuta(maxTotalVal * tick)}
            </span>
          ))}
        </div>

        {/* Bars Container */}
        <div className="flex-1 h-[80%] relative flex justify-around items-end px-2 sm:px-6">
          {/* Background Grid Lines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pr-2">
            {gridTicks.map((_, i) => (
              <div key={i} className="w-full border-b border-slate-100 border-dashed" style={{ height: "0.5px" }} />
            ))}
          </div>

          {/* Grouped Bars per Satwas */}
          {satwasData.map((sat) => {
            const isTargetSelected = selectedSatwas === "ALL" || selectedSatwas === sat.nama_satwas;
            const targetHeightPercent = (sat.totalTarget / maxTotalVal) * 100;
            const realisasiHeightPercent = (sat.totalRealisasi / maxTotalVal) * 100;

            return (
              <div
                key={sat.id}
                className={`flex flex-col items-center h-full justify-end relative transition-all duration-300 ${
                  isTargetSelected ? "opacity-100 scale-100" : "opacity-35 scale-95"
                }`}
                style={{ width: "22%" }}
              >
                {/* Side-by-side Bars Container */}
                <div className="flex items-end gap-1.5 sm:gap-3 w-full h-full justify-center">
                  
                  {/* TARGET STACKED BAR (Left Bar) */}
                  <div
                    className="w-7 sm:w-12 rounded-t-md overflow-hidden flex flex-col-reverse justify-end shadow-2xs hover:shadow-md border border-slate-200 bg-slate-50 transition-all duration-200"
                    style={{ height: `${targetHeightPercent}%` }}
                  >
                    {sat.quarters.map((q, qIdx) => {
                      const segmentHeightPercent = sat.totalTarget > 0 ? (q.target / sat.totalTarget) * 105 : 0;
                      if (q.target === 0) return null;

                      return (
                        <motion.div
                          key={`target-${qIdx}`}
                          className={`w-full bg-gradient-to-t ${quarterColors.target[qIdx]} cursor-pointer relative group border-t border-b`}
                          style={{ height: `${segmentHeightPercent}%` }}
                          onMouseEnter={() => setHoverInfo({
                            satwasId: sat.id,
                            type: "target",
                            qIdx,
                            targetVal: q.target,
                            realisasiVal: q.realisasi,
                            qLabel: quarterLabels[qIdx],
                            satwasName: sat.nama_satwas
                          })}
                          onMouseLeave={() => setHoverInfo(null)}
                          whileHover={{ scaleX: 1.05 }}
                          transition={{ duration: 0.1 }}
                        />
                      );
                    })}
                  </div>

                  {/* REALISASI STACKED BAR (Right Bar) */}
                  <div
                    className="w-7 sm:w-12 rounded-t-md overflow-hidden flex flex-col-reverse justify-end shadow-2xs hover:shadow-md border border-slate-200 bg-slate-50 transition-all duration-200"
                    style={{ height: `${realisasiHeightPercent}%` }}
                  >
                    {sat.quarters.map((q, qIdx) => {
                      const segmentHeightPercent = sat.totalRealisasi > 0 ? (q.realisasi / sat.totalRealisasi) * 105 : 0;
                      if (q.realisasi === 0) return null;

                      return (
                        <motion.div
                          key={`realisasi-${qIdx}`}
                          className={`w-full bg-gradient-to-t ${quarterColors.realisasi[qIdx]} cursor-pointer relative group border-t border-b`}
                          style={{ height: `${segmentHeightPercent}%` }}
                          onMouseEnter={() => setHoverInfo({
                            satwasId: sat.id,
                            type: "realisasi",
                            qIdx,
                            targetVal: q.target,
                            realisasiVal: q.realisasi,
                            qLabel: quarterLabels[qIdx],
                            satwasName: sat.nama_satwas
                          })}
                          onMouseLeave={() => setHoverInfo(null)}
                          whileHover={{ scaleX: 1.05 }}
                          transition={{ duration: 0.1 }}
                        />
                      );
                    })}
                  </div>

                </div>

                {/* Percentage Labels above the bars */}
                <div className="absolute -top-6 flex gap-4 text-[9px] font-black font-mono text-slate-500 select-none">
                  <span title="Total Target" className="text-slate-450 font-bold">Pagu</span>
                  <span title="Persentase Penyerapan" className="text-emerald-600">
                    {sat.totalTarget > 0 ? Math.round((sat.totalRealisasi / sat.totalTarget) * 100) : 0}%
                  </span>
                </div>

              </div>
            );
          })}
        </div>

        {/* Float / Embedded Hover Tooltip */}
        {hoverInfo && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/95 text-white p-4 rounded-2xl shadow-xl border border-slate-850 z-30 max-w-sm w-[90%] backdrop-blur-xs flex flex-col gap-2"
          >
            <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{hoverInfo.satwasName}</span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">{hoverInfo.qLabel}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-1">
              <div>
                <span className="text-[9px] text-slate-450 font-semibold block">Target Anggaran:</span>
                <span className="text-xs font-black font-mono text-sky-300">{formatRupiahFull(hoverInfo.targetVal)}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-450 font-semibold block">Realisasi Penyerapan:</span>
                <span className="text-xs font-black font-mono text-emerald-400">{formatRupiahFull(hoverInfo.realisasiVal)}</span>
              </div>
            </div>

            <div className="flex justify-between items-center bg-slate-950/60 p-2 rounded-xl border border-slate-800 mt-1">
              <span className="text-[9px] text-slate-400 font-bold">Capaian Realisasi Triwulan:</span>
              <span className={`text-xs font-black font-mono ${
                (hoverInfo.realisasiVal / hoverInfo.targetVal) * 100 >= 90
                  ? "text-emerald-400"
                  : (hoverInfo.realisasiVal / hoverInfo.targetVal) * 100 >= 75
                  ? "text-sky-400"
                  : (hoverInfo.realisasiVal / hoverInfo.targetVal) * 100 >= 50
                  ? "text-blue-400"
                  : "text-rose-450 animate-pulse"
              }`}>
                {hoverInfo.targetVal > 0 ? ((hoverInfo.realisasiVal / hoverInfo.targetVal) * 100).toFixed(1) : "0.0"}%
              </span>
            </div>
          </motion.div>
        )}
      </div>

      {/* X-Axis labels below the chart */}
      <div className="flex justify-around pl-16 pt-2 border-t border-slate-100">
        {satwasData.map((sat) => {
          const isTargetSelected = selectedSatwas === "ALL" || selectedSatwas === sat.nama_satwas;
          return (
            <div
              key={sat.id}
              className={`text-center flex flex-col items-center select-none transition-all duration-300 ${
                isTargetSelected ? "opacity-100 scale-100" : "opacity-35 scale-95"
              }`}
              style={{ width: "22%" }}
            >
              <span className="text-[10px] font-black text-slate-700 truncate max-w-full" title={sat.nama_satwas}>
                {sat.nama_satwas}
              </span>
              <span className="text-[9px] font-bold text-slate-400 mt-0.5 font-mono">
                Pagu: {formatJuta(sat.totalTarget)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
