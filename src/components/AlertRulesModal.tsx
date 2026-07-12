import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, AlertTriangle, FileCheck, Coins, Percent, Save, Trash2 } from "lucide-react";

interface AlertRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSatwas: string;
  currentRules?: { minInspections?: number; maxBudgetVariance?: number; minCompliance?: number };
  onSave: (rules: { minInspections?: number; maxBudgetVariance?: number; minCompliance?: number } | null) => void;
}

export const AlertRulesModal: React.FC<AlertRulesModalProps> = ({
  isOpen,
  onClose,
  selectedSatwas,
  currentRules,
  onSave,
}) => {
  const [minInspections, setMinInspections] = useState<string>("");
  const [maxBudgetVariance, setMaxBudgetVariance] = useState<string>("");
  const [minCompliance, setMinCompliance] = useState<string>("");

  // Populate form with current values
  useEffect(() => {
    if (isOpen) {
      setMinInspections(currentRules?.minInspections !== undefined ? String(currentRules.minInspections) : "");
      setMaxBudgetVariance(currentRules?.maxBudgetVariance !== undefined ? String(currentRules.maxBudgetVariance) : "");
      setMinCompliance(currentRules?.minCompliance !== undefined ? String(currentRules.minCompliance) : "");
    }
  }, [isOpen, currentRules]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const rules = {
      minInspections: minInspections ? Math.max(0, parseInt(minInspections, 10)) : undefined,
      maxBudgetVariance: maxBudgetVariance ? Math.max(0, parseInt(maxBudgetVariance, 10)) : undefined,
      minCompliance: minCompliance ? Math.max(0, Math.min(100, parseInt(minCompliance, 10))) : undefined,
    };
    onSave(rules);
    onClose();
  };

  const handleClear = () => {
    onSave(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 overflow-y-auto bg-slate-900/60 backdrop-blur-xs">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-transparent cursor-pointer"
        />

        {/* Modal Panel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-md bg-white border border-slate-200 shadow-2xl rounded-3xl p-6 overflow-hidden z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-rose-50 border border-rose-100 rounded-xl text-rose-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-850 leading-tight">
                  Aturan Ambang Peringatan
                </h3>
                <p className="text-[10px] text-slate-400 font-bold font-sans uppercase tracking-wider mt-0.5">
                  {selectedSatwas === "ALL" ? "Global / Semua Satwas" : `Satwas ${selectedSatwas}`}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-50 border border-transparent hover:border-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="space-y-4 pt-4">
            <p className="text-[11px] text-slate-500 font-medium leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
              Tetapkan batas nilai minimum atau maksimum. Statistik yang melanggar ketentuan akan disorot merah berkedip di dashboard untuk memudahkan pemantauan pimpinan.
            </p>

            {/* Field 1: Min Inspections */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-sky-500" />
                Jumlah Giat Pemeriksaan Minimum
              </label>
              <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-sky-500/20 focus-within:border-sky-500 transition-all">
                <input
                  type="number"
                  placeholder="Contoh: 15 (Biarkan kosong jika tidak dibatasi)"
                  value={minInspections}
                  onChange={(e) => setMinInspections(e.target.value)}
                  className="w-full bg-transparent border-none text-xs text-slate-700 placeholder-slate-400 focus:outline-none py-0.5 font-extrabold"
                  min="0"
                />
              </div>
              <p className="text-[9px] text-slate-400 font-medium">
                Peringatan dipicu jika total giat pemeriksaan aktual kurang dari angka ini.
              </p>
            </div>

            {/* Field 2: Max Budget Variance */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-amber-500" />
                Deviasi Anggaran Maksimum (%)
              </label>
              <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-sky-500/20 focus-within:border-sky-500 transition-all">
                <input
                  type="number"
                  placeholder="Contoh: 10 (Biarkan kosong jika tidak dibatasi)"
                  value={maxBudgetVariance}
                  onChange={(e) => setMaxBudgetVariance(e.target.value)}
                  className="w-full bg-transparent border-none text-xs text-slate-700 placeholder-slate-400 focus:outline-none py-0.5 font-extrabold"
                  min="0"
                />
                <span className="text-xs font-black text-slate-400 ml-1">%</span>
              </div>
              <p className="text-[9px] text-slate-400 font-medium">
                Peringatan dipicu jika deviasi persentase antara Realisasi vs Target melampaui batas ini.
              </p>
            </div>

            {/* Field 3: Min Compliance */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-emerald-500" />
                Rata-rata Nilai Kepatuhan Minimum
              </label>
              <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-sky-500/20 focus-within:border-sky-500 transition-all">
                <input
                  type="number"
                  placeholder="Contoh: 80 (Biarkan kosong jika tidak dibatasi)"
                  value={minCompliance}
                  onChange={(e) => setMinCompliance(e.target.value)}
                  className="w-full bg-transparent border-none text-xs text-slate-700 placeholder-slate-400 focus:outline-none py-0.5 font-extrabold"
                  min="0"
                  max="100"
                />
                <span className="text-xs font-black text-slate-400 ml-1">%</span>
              </div>
              <p className="text-[9px] text-slate-400 font-medium">
                Peringatan dipicu jika rata-rata skor kepatuhan regional di bawah standar minimal ini.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleClear}
                className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-600 font-extrabold text-xs rounded-2xl transition-all duration-200 flex items-center justify-center gap-1.5 border border-rose-150 cursor-pointer whitespace-nowrap shadow-xs mr-auto"
                title="Hapus seluruh aturan peringatan untuk Satwas ini"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Aturan</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-extrabold text-xs rounded-2xl transition-all duration-200 flex items-center justify-center gap-1 cursor-pointer"
              >
                Batal
              </button>

              <button
                type="submit"
                className="px-4 py-2.5 bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white font-extrabold text-xs rounded-2xl transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-sky-100 border border-sky-450"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
