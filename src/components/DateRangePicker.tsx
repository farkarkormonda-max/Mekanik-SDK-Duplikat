import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Calendar, ChevronDown, X, Clock, Check, ArrowRight } from "lucide-react";

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onRangeChange: (start: string, end: string) => void;
}

const formatDate = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getPresetDates = (preset: string): { start: string; end: string } => {
  const today = new Date();
  switch (preset) {
    case "TODAY": {
      const dateStr = formatDate(today);
      return { start: dateStr, end: dateStr };
    }
    case "LAST_7": {
      const past = new Date();
      past.setDate(today.getDate() - 6);
      return { start: formatDate(past), end: formatDate(today) };
    }
    case "LAST_30": {
      const past = new Date();
      past.setDate(today.getDate() - 29);
      return { start: formatDate(past), end: formatDate(today) };
    }
    case "THIS_MONTH": {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { start: formatDate(start), end: formatDate(end) };
    }
    case "THIS_YEAR": {
      const start = new Date(today.getFullYear(), 0, 1);
      const end = new Date(today.getFullYear(), 11, 31);
      return { start: formatDate(start), end: formatDate(end) };
    }
    default:
      return { start: "", end: "" };
  }
};

const formatDisplayDate = (dateStr: string): string => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  
  const months = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
  ];
  
  return `${day} ${months[monthIdx]} ${year}`;
};

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onRangeChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempStart, setTempStart] = useState(startDate);
  const [tempEnd, setTempEnd] = useState(endDate);
  const [activePreset, setActivePreset] = useState<string>("ALL");
  const containerRef = useRef<HTMLDivElement>(null);

  const presets = [
    { id: "ALL", label: "Semua Waktu" },
    { id: "TODAY", label: "Hari Ini" },
    { id: "LAST_7", label: "7 Hari Terakhir" },
    { id: "LAST_30", label: "30 Hari Terakhir" },
    { id: "THIS_MONTH", label: "Bulan Ini" },
    { id: "THIS_YEAR", label: "Tahun Ini" },
    { id: "CUSTOM", label: "Pilihan Kustom" },
  ];

  // Sync internal temp states when props change
  useEffect(() => {
    setTempStart(startDate);
    setTempEnd(endDate);

    // Determine current preset matching these dates
    if (!startDate && !endDate) {
      setActivePreset("ALL");
    } else {
      let found = "CUSTOM";
      for (const p of ["TODAY", "LAST_7", "LAST_30", "THIS_MONTH", "THIS_YEAR"]) {
        const { start, end } = getPresetDates(p);
        if (start === startDate && end === endDate) {
          found = p;
          break;
        }
      }
      setActivePreset(found);
    }
  }, [startDate, endDate]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const selectPreset = (id: string) => {
    setActivePreset(id);
    if (id === "ALL") {
      setTempStart("");
      setTempEnd("");
    } else if (id !== "CUSTOM") {
      const { start, end } = getPresetDates(id);
      setTempStart(start);
      setTempEnd(end);
    }
  };

  const handleApply = () => {
    onRangeChange(tempStart, tempEnd);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRangeChange("", "");
    setIsOpen(false);
  };

  // Label to render on the main button
  const getButtonLabel = () => {
    if (!startDate && !endDate) return "Semua Waktu";
    const matchedPreset = presets.find(p => p.id === activePreset && p.id !== "CUSTOM");
    if (matchedPreset) return matchedPreset.label;

    if (startDate && endDate) {
      return `${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}`;
    } else if (startDate) {
      return `Mulai ${formatDisplayDate(startDate)}`;
    } else {
      return `Sampai ${formatDisplayDate(endDate)}`;
    }
  };

  return (
    <div ref={containerRef} className="relative z-40 select-none">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`px-3.5 py-2.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-2.5 bg-white cursor-pointer hover:border-slate-400 focus:outline-none ${
          isOpen 
            ? "border-sky-500 ring-2 ring-sky-500/15" 
            : startDate || endDate 
            ? "border-sky-500 text-sky-700 bg-sky-50/20" 
            : "border-slate-300 text-slate-700"
        }`}
      >
        <Calendar className={`w-3.5 h-3.5 ${startDate || endDate ? "text-sky-600" : "text-slate-400"}`} />
        <span className="truncate max-w-[180px] sm:max-w-none">{getButtonLabel()}</span>
        
        {(startDate || endDate) && (
          <span 
            onClick={handleClear}
            className="p-0.5 rounded-full hover:bg-sky-100 text-sky-600 hover:text-rose-600 transition-colors"
            title="Hapus filter tanggal"
          >
            <X className="w-3 h-3" />
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-250 shrink-0 ${isOpen ? "rotate-180 text-sky-600" : ""}`} />
      </button>

      {/* Popover Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 5, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 xl:right-0 xl:left-auto mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl w-[290px] sm:w-[480px] p-4 flex flex-col sm:flex-row gap-4"
          >
            {/* Left Sidebar: Presets */}
            <div className="flex flex-col gap-1 sm:w-44 border-b sm:border-b-0 sm:border-r border-slate-100 pb-3 sm:pb-0 sm:pr-3 shrink-0">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1.5 px-2 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Saran Rentang Waktu
              </span>
              {presets.map((preset) => {
                const isSelected = activePreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => selectPreset(preset.id)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-between ${
                      isSelected
                        ? "bg-sky-50 text-sky-700"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                    }`}
                  >
                    <span>{preset.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-sky-600 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Right Side: Interactive Inputs / Dynamic View */}
            <div className="flex-1 flex flex-col justify-between gap-4">
              <div className="space-y-3">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">
                  Tentukan Rentang Tanggal
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Start Date */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                      Mulai Tanggal
                    </label>
                    <input
                      type="date"
                      value={tempStart}
                      onChange={(e) => {
                        setTempStart(e.target.value);
                        setActivePreset("CUSTOM");
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 cursor-pointer"
                    />
                  </div>

                  {/* End Date */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                      Selesai Tanggal
                    </label>
                    <input
                      type="date"
                      value={tempEnd}
                      onChange={(e) => {
                        setTempEnd(e.target.value);
                        setActivePreset("CUSTOM");
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Range summary helper */}
                {tempStart && tempEnd && tempStart > tempEnd && (
                  <p className="text-[10px] text-rose-600 font-bold bg-rose-50 border border-rose-100 p-2 rounded-lg leading-relaxed">
                    Peringatan: Tanggal mulai tidak boleh melebihi tanggal selesai.
                  </p>
                )}
                
                {tempStart && tempEnd && tempStart <= tempEnd && (
                  <div className="bg-slate-55 bg-slate-50 border border-slate-150 p-2 rounded-lg text-[10px] font-semibold text-slate-500 flex items-center justify-center gap-1.5">
                    <span>{formatDisplayDate(tempStart)}</span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                    <span>{formatDisplayDate(tempEnd)}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={tempStart && tempEnd && tempStart > tempEnd}
                  className="px-3.5 py-1.5 text-xs font-bold bg-sky-700 text-white hover:bg-sky-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
                >
                  Terapkan
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
