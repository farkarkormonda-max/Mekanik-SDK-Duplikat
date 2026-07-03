import React, { useState } from "react";
import { Pemeriksaan, MasterSatwas, Temuan, Dokumen } from "../types";
import { 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  Edit, 
  Trash2, 
  Search, 
  Filter, 
  FileSpreadsheet, 
  Download,
  AlertCircle,
  Calendar,
  X,
  Clock,
  Bell,
  AlertTriangle,
  FileText,
  Eye,
  ExternalLink
} from "lucide-react";

interface PemeriksaanListProps {
  records: Pemeriksaan[];
  satwasList: MasterSatwas[];
  userRole: string;
  temuanList?: Temuan[];
  documentList?: Dokumen[];
  onAddClick: () => void;
  onEditClick: (record: Pemeriksaan) => void;
  onDeleteClick: (id: string, name: string) => void;
  onUploadDocClick: (record: Pemeriksaan) => void;
  onCreateTemuanClick: (record: Pemeriksaan) => void;
}

export const PemeriksaanList: React.FC<PemeriksaanListProps> = ({
  records,
  satwasList,
  userRole,
  temuanList = [],
  documentList = [],
  onAddClick,
  onEditClick,
  onDeleteClick,
  onUploadDocClick,
  onCreateTemuanClick,
}) => {
  const [search, setSearch] = useState("");
  const [filterSatwas, setFilterSatwas] = useState("");
  const [filterKetaatan, setFilterKetaatan] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterUrgentOnly, setFilterUrgentOnly] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedRecordForModal, setSelectedRecordForModal] = useState<Pemeriksaan | null>(null);

  // Helper to calculate document and finding follow-up deadlines and urgency status
  const getUrgencyStatus = (r: Pemeriksaan) => {
    const inspectDate = new Date(r.tanggal);
    const currentDate = new Date();
    
    inspectDate.setHours(0, 0, 0, 0);
    currentDate.setHours(0, 0, 0, 0);
    
    const diffTime = currentDate.getTime() - inspectDate.getTime();
    const daysElapsed = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    const isDocIncomplete = r.nilai_total < 100;
    
    // Check associated findings
    const findingsForRecord = temuanList.filter((t) => t.pemeriksaan_id === r.id);
    const hasActiveFindings = findingsForRecord.some((t) => t.status_tindak_lanjut !== "Selesai");
    
    // Check checklist documents not verified for over 7 days
    const unverifiedDocs = documentList.filter(d => d.pemeriksaan_id === r.id && d.status === "Belum Verifikasi");
    const hasUnverifiedDocsOver7Days = unverifiedDocs.length > 0 && daysElapsed > 7;
    
    let docUrgency: "none" | "warning" | "danger" = "none";
    let findUrgency: "none" | "warning" | "danger" = "none";
    let docMessage = "";
    let findMessage = "";
    
    // 1. Doc Completion Deadline: 14 days
    if (isDocIncomplete) {
      if (daysElapsed >= 14) {
        docUrgency = "danger";
        docMessage = `Melewati Batas Waktu Dokumen: Giat ${daysElapsed} hari lalu dan dokumen checklist belum lengkap (100%).`;
      } else if (daysElapsed >= 10) {
        const remaining = 14 - daysElapsed;
        docUrgency = "warning";
        docMessage = `Mendekati Batas Waktu Dokumen: Tersisa ${remaining} hari lagi untuk melengkapi berkas checklist.`;
      }
    }
    
    // 2. Finding Follow-up Deadline: 30 days
    if (hasActiveFindings) {
      if (daysElapsed >= 30) {
        findUrgency = "danger";
        findMessage = `Melewati Batas Tindak Lanjut Temuan: Sudah ${daysElapsed} hari sejak giat dan masih ada temuan yang belum diselesaikan.`;
      } else if (daysElapsed >= 25) {
        const remaining = 30 - daysElapsed;
        findUrgency = "warning";
        findMessage = `Mendekati Batas Tindak Lanjut Temuan: Tersisa ${remaining} hari lagi untuk menindaklanjuti temuan.`;
      }
    }

    if (hasUnverifiedDocsOver7Days) {
      docMessage = docMessage || `Terdapat ${unverifiedDocs.length} dokumen checklist belum terverifikasi selama lebih dari 7 hari (Giat: ${daysElapsed} hari lalu).`;
    }
    
    return {
      daysElapsed,
      isDocIncomplete,
      hasActiveFindings,
      docUrgency,
      findUrgency,
      docMessage,
      findMessage,
      hasUnverifiedDocsOver7Days,
      unverifiedDocsCount: unverifiedDocs.length,
      hasOverdueTindakLanjut: hasActiveFindings && daysElapsed >= 30,
      isUrgent: docUrgency !== "none" || findUrgency !== "none" || hasUnverifiedDocsOver7Days,
    };
  };

  // Toggle expanded card row
  const toggleRow = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Filter records
  const filteredRecords = records.filter((r) => {
    const pelakuUsaha = r.pelaku_usaha || "";
    const perusahaan = r.perusahaan || "";
    const nomorSpt = r.nomor_spt || "";
    const jenisUsaha = r.jenis_usaha || "";

    const matchSearch =
      pelakuUsaha.toLowerCase().includes(search.toLowerCase()) ||
      perusahaan.toLowerCase().includes(search.toLowerCase()) ||
      nomorSpt.toLowerCase().includes(search.toLowerCase()) ||
      jenisUsaha.toLowerCase().includes(search.toLowerCase());

    const matchSatwas = filterSatwas ? r.satwas === filterSatwas : true;
    const matchKetaatan = filterKetaatan ? r.status_ketaatan === filterKetaatan : true;
    const matchStartDate = startDate ? r.tanggal >= startDate : true;
    const matchEndDate = endDate ? r.tanggal <= endDate : true;

    const urgency = getUrgencyStatus(r);
    const matchUrgent = filterUrgentOnly ? urgency.isUrgent : true;

    return matchSearch && matchSatwas && matchKetaatan && matchStartDate && matchEndDate && matchUrgent;
  });

  // Role permissions checks
  const canCreate = userRole === "Administrator" || userRole === "Satwas";
  const canEdit = userRole === "Administrator" || userRole === "Satwas" || userRole === "Verifikator";
  const canDelete = userRole === "Administrator";

  return (
    <div className="space-y-6">
      {/* Header with Search and filters */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
        {/* Filters and search in one bar */}
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari kapal (vessel), pelaku usaha atau perusahaan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-xs font-semibold placeholder-slate-400"
            />
          </div>

          {/* Satwas Filter dropdown */}
          <div className="relative">
            <select
              value={filterSatwas}
              onChange={(e) => setFilterSatwas(e.target.value)}
              className="px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-sky-500/20"
            >
              <option value="">Semua Satwas</option>
              {satwasList.map((s) => (
                <option key={s.id} value={s.nama_satwas}>
                  {s.nama_satwas}
                </option>
              ))}
            </select>
          </div>

          {/* Compliance Filter dropdown */}
          <div className="relative">
            <select
              value={filterKetaatan}
              onChange={(e) => setFilterKetaatan(e.target.value)}
              className="px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-sky-500/20"
            >
              <option value="">Status Ketaatan</option>
              <option value="TAAT">TAAT</option>
              <option value="TIDAK TAAT">TIDAK TAAT</option>
            </select>
          </div>

          {/* Date range filters */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mulai:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2 py-1 rounded border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 bg-white text-xs font-bold text-slate-700 cursor-pointer"
              />
            </div>
            
            <div className="h-4 w-px bg-slate-200 hidden sm:block mx-1" />

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Selesai:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2 py-1 rounded border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 bg-white text-xs font-bold text-slate-700 cursor-pointer"
              />
            </div>

            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                }}
                className="p-1 text-slate-400 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 rounded transition cursor-pointer"
                title="Reset Tanggal"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Create checklist button */}
        {canCreate && (
          <button
            onClick={onAddClick}
            className="px-4 py-2.5 bg-sky-700 hover:bg-sky-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-sm cursor-pointer whitespace-nowrap self-start"
          >
            <Plus className="w-4 h-4" />
            Buat Pemeriksaan Baru
          </button>
        )}
      </div>

      {/* Urgent Deadline Notification Banner */}
      {(() => {
        const urgentCount = records.filter(r => getUrgencyStatus(r).isUrgent).length;
        if (urgentCount === 0) return null;
        return (
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg text-amber-700 mt-0.5 sm:mt-0">
                <Bell className="w-4 h-4 animate-bounce" />
              </div>
              <div>
                <h4 className="text-xs font-black text-amber-950">Notifikasi Batas Waktu & Tindak Lanjut</h4>
                <p className="text-[11px] text-amber-800 font-semibold mt-0.5">
                  Terdapat <strong className="text-amber-950">{urgentCount} giat pemeriksaan</strong> yang mendekati atau telah melewati batas waktu penyelesaian berkas (14 hari) atau tindak lanjut temuan (30 hari).
                </p>
              </div>
            </div>
            <button
              onClick={() => setFilterUrgentOnly(!filterUrgentOnly)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wide cursor-pointer border transition-all shrink-0 ${
                filterUrgentOnly 
                  ? "bg-amber-600 text-white border-amber-600 hover:bg-amber-700" 
                  : "bg-amber-50 text-amber-900 border-amber-250 hover:bg-amber-100"
              }`}
            >
              {filterUrgentOnly ? "Tampilkan Semua" : "Filter Sisa Tenggat"}
            </button>
          </div>
        );
      })()}

      {/* Primary Data List */}
      {filteredRecords.length === 0 ? (
        <div className="bg-white border rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-3">
          <AlertCircle className="w-10 h-10 text-slate-350" />
          <h4 className="font-bold text-slate-700 text-sm">Tidak Ada Giat Pemeriksaan</h4>
          <p className="text-xs text-slate-400 max-w-sm">No matches found. Clear filters or add some new records.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 text-[10px] font-extrabold uppercase tracking-widest border-b border-slate-100">
                  <th className="w-10 px-4"></th>
                  <th className="px-5 py-4">Tanggal / Giat</th>
                  <th className="px-5 py-4">Nama Pelaku Usaha</th>
                  <th className="px-5 py-4 hidden md:table-cell">Satwas SDKP</th>
                  <th className="px-5 py-4 hidden sm:table-cell">Ketaatan</th>
                  <th className="px-5 py-4 text-center hidden sm:table-cell">Skor Total</th>
                  <th className="px-5 py-4 hidden md:table-cell">Predikat</th>
                  <th className="px-5 py-4 text-right pr-6">Peralatan</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-slate-100 font-medium text-slate-700">
                {filteredRecords.map((r) => {
                  const isExpanded = expandedId === r.id;
                  const dateFormatted = new Date(r.tanggal).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric"
                  });

                  const urgency = getUrgencyStatus(r);
                  let rowBgClass = "hover:bg-slate-50/40";
                  if (isExpanded) {
                    rowBgClass = "bg-slate-50/50";
                  } else if (urgency.isUrgent) {
                    if (urgency.docUrgency === "danger" || urgency.findUrgency === "danger" || urgency.hasOverdueTindakLanjut) {
                      rowBgClass = "bg-rose-50/15 hover:bg-rose-50/25";
                    } else {
                      rowBgClass = "bg-amber-50/15 hover:bg-amber-50/25";
                    }
                  }

                  const borderClass = urgency.isUrgent
                    ? (urgency.docUrgency === "danger" || urgency.findUrgency === "danger" || urgency.hasOverdueTindakLanjut
                      ? "border-l-4 border-rose-500" 
                      : "border-l-4 border-amber-500")
                    : "";

                  return (
                    <React.Fragment key={r.id}>
                      <tr className={`${rowBgClass} transition-colors cursor-pointer`} onClick={() => toggleRow(r.id)}>
                        <td className={`px-4 text-center ${borderClass}`} onClick={(e) => { e.stopPropagation(); toggleRow(r.id); }}>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        </td>
                        <td className="px-5 py-4">
                          <span className="block font-bold text-slate-900">{dateFormatted}</span>
                          <span className="block text-[10px] text-slate-400 font-mono mt-0.5 max-w-[200px] truncate" title={r.nomor_spt}>
                            {r.nomor_spt}
                          </span>
                          
                          {/* Urgency Badges */}
                          {urgency.isUrgent && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {urgency.hasOverdueTindakLanjut && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-[9px] font-black tracking-wide uppercase">
                                  <AlertTriangle className="w-2.5 h-2.5 shrink-0 text-rose-600 animate-bounce" /> Overdue Tindak Lanjut
                                </span>
                              )}
                              {urgency.hasUnverifiedDocsOver7Days && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 text-[9px] font-black tracking-wide uppercase">
                                  <FileText className="w-2.5 h-2.5 shrink-0 text-amber-600" /> Belum Verifikasi &gt;7 Hari
                                </span>
                              )}
                              {urgency.docUrgency === "danger" && !urgency.hasUnverifiedDocsOver7Days && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-[9px] font-black tracking-wide uppercase">
                                  <Clock className="w-2.5 h-2.5 shrink-0" /> Overdue Dokumen
                                </span>
                              )}
                              {urgency.docUrgency === "warning" && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 text-[9px] font-black tracking-wide uppercase animate-pulse">
                                  <Clock className="w-2.5 h-2.5 shrink-0" /> Limit Dokumen
                                </span>
                              )}
                              {urgency.findUrgency === "danger" && !urgency.hasOverdueTindakLanjut && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-[9px] font-black tracking-wide uppercase">
                                  <AlertCircle className="w-2.5 h-2.5 shrink-0" /> Overdue Temuan
                                </span>
                              )}
                              {urgency.findUrgency === "warning" && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 text-[9px] font-black tracking-wide uppercase animate-pulse">
                                  <AlertCircle className="w-2.5 h-2.5 shrink-0" /> Limit Temuan
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className="block font-bold text-slate-950 truncate max-w-[180px]" title={r.pelaku_usaha}>{r.pelaku_usaha}</span>
                          <span className="block text-[10px] text-slate-400 mt-0.5 truncate max-w-[140px]" title={r.jenis_usaha}>{r.jenis_usaha}</span>
                        </td>
                        <td className="px-5 py-4 text-slate-500 font-semibold hidden md:table-cell">{r.satwas}</td>
                        <td className="px-5 py-4 hidden sm:table-cell">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide ${
                            r.status_ketaatan === "TAAT"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-rose-50 text-rose-700 animate-pulse"
                          }`}>
                            {r.status_ketaatan}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center font-extrabold font-mono text-sm text-slate-800 hidden sm:table-cell">
                          {r.nilai_total} <span className="text-[10px] text-slate-350 font-normal">/100</span>
                        </td>
                        <td className="px-5 py-4 hidden md:table-cell">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            r.predikat === "Sangat Baik"
                              ? "bg-emerald-500 text-white"
                              : r.predikat === "Baik"
                              ? "bg-cyan-500 text-white"
                              : r.predikat === "Cukup"
                              ? "bg-amber-500 text-white"
                              : "bg-rose-500 text-white"
                          }`}>
                            {r.predikat}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right pr-6" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            <button
                              onClick={() => setSelectedRecordForModal(r)}
                              title="Detail Pemeriksaan"
                              className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-extrabold rounded cursor-pointer flex items-center gap-1 transition-all"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Detail</span>
                            </button>
                            {/* Upload Drive Link button */}
                            {canCreate && (
                              <button
                                onClick={() => onUploadDocClick(r)}
                                title="Attach Drive Link"
                                className="px-2 py-1 bg-sky-50 text-sky-700 hover:bg-sky-100 text-[10px] font-extrabold rounded cursor-pointer border border-sky-100"
                              >
                                Berkas
                              </button>
                            )}

                            {/* Attach issue (Temuan) button */}
                            {userRole !== "Kepala Stasiun" && (
                              <button
                                onClick={() => onCreateTemuanClick(r)}
                                title="Tambah Temuan Baru"
                                className="px-2 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 text-[10px] font-extrabold rounded cursor-pointer border border-amber-100"
                              >
                                Temuan
                              </button>
                            )}

                            {canEdit && (
                              <button
                                onClick={() => onEditClick(r)}
                                title="Ubah Pemeriksaan"
                                className="p-1 px-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded cursor-pointer"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {canDelete && (
                              <button
                                onClick={() => onDeleteClick(r.id, r.pelaku_usaha)}
                                title="Hapus Berkas"
                                className="p-1 px-1.5 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expandable sub-view detail card */}
                      {isExpanded && (
                        <tr className="bg-slate-50/50">
                          <td colSpan={8} className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-slate-700 border-l-2 border-sky-600 pl-4">
                              
                              {/* Urgency Alert inside Expanded Row */}
                              {urgency.isUrgent && (
                                <div className="col-span-full bg-amber-50/60 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3">
                                  <AlertTriangle className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                                  <div className="text-xs">
                                    <h5 className="font-extrabold text-amber-950">Atensi Tindak Lanjut & Kelengkapan Giat</h5>
                                    <div className="mt-1.5 space-y-1.5 text-amber-900 font-semibold leading-relaxed">
                                      {urgency.docMessage && <p className="flex items-center gap-1.5">• {urgency.docMessage}</p>}
                                      {urgency.findMessage && <p className="flex items-center gap-1.5">• {urgency.findMessage}</p>}
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {/* Audit Checklist Status */}
                              <div className="bg-white rounded-xl p-4 border border-slate-150">
                                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-3 block">Matrik Checklists</h4>
                                <ul className="space-y-2 text-xs font-semibold">
                                  <li className="flex items-center justify-between">
                                    <span className="text-slate-500">Surat Pemberitahuan</span>
                                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10.5px] font-extrabold ${r.persiapan_spt ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                                      {r.persiapan_spt ? "+ 20 Pts" : "0 Pts"}
                                    </span>
                                  </li>
                                  <li className="flex items-center justify-between">
                                    <span className="text-slate-500">Surat Tugas Kegiatan</span>
                                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10.5px] font-extrabold ${r.persiapan_st ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                                      {r.persiapan_st ? "+ 20 Pts" : "0 Pts"}
                                    </span>
                                  </li>
                                  <li className="flex items-center justify-between">
                                    <span className="text-slate-500">Berkas Lap. Hasil Pengawasan</span>
                                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10.5px] font-extrabold ${r.pelaksanaan_dhp ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                                      {r.pelaksanaan_dhp ? "+ 20 Pts" : "0 Pts"}
                                    </span>
                                  </li>
                                  <li className="flex items-center justify-between">
                                    <span className="text-slate-500 font-sans">Tanpa revisi Verifikator</span>
                                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10.5px] font-extrabold ${r.pelaksanaan_no_revisi ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                                      {r.pelaksanaan_no_revisi ? "+ 20 Pts" : "0 Pts"}
                                    </span>
                                  </li>
                                  <li className="flex items-center justify-between">
                                    <span className="text-slate-500">Kelengkapan Dokumentasi</span>
                                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10.5px] font-extrabold ${r.pelaporan_lengkap ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                                      {r.pelaporan_lengkap ? "+ 20 Pts" : "0 Pts"}
                                    </span>
                                  </li>
                                </ul>
                              </div>

                              {/* Details Content */}
                              <div className="bg-white rounded-xl p-4 border border-slate-150">
                                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2 block">Daftar Temuan Kegiatan</h4>
                                <p className="text-xs text-slate-800 leading-relaxed font-semibold bg-slate-50 p-2.5 rounded-lg border border-slate-100 h-28 overflow-y-auto">
                                  {r.temuan || "Tidak ada temuan lapangan khusus."}
                                </p>
                              </div>

                              {/* Action Log / Recommendations */}
                              <div className="bg-white rounded-xl p-4 border border-slate-150">
                                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2 block">Hasil Rekomendasi Pengawasan</h4>
                                <p className="text-xs text-slate-800 leading-relaxed font-semibold bg-slate-50 p-2.5 rounded-lg border border-slate-100 h-28 overflow-y-auto">
                                  {r.rekomendasi || "Tidak ada rilis tindakan rekomendasi."}
                                </p>
                              </div>

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedRecordForModal && (() => {
        const r = selectedRecordForModal;
        const urgency = getUrgencyStatus(r);
        const dateFormatted = new Date(r.tanggal).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric"
        });
        
        // Find related documents
        const relatedDocs = documentList.filter(d => d.pemeriksaan_id === r.id);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col my-8">
              
              {/* Modal Header */}
              <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-sky-700">Detail Pemeriksaan</span>
                  <h3 className="text-sm font-extrabold text-slate-900 mt-0.5">{r.pelaku_usaha}</h3>
                </div>
                <button 
                  onClick={() => setSelectedRecordForModal(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body (Scrollable) */}
              <div className="p-6 overflow-y-auto space-y-6 text-slate-700">
                
                {/* Status and Summary Header Card */}
                <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 rounded-xl p-4 border border-slate-200/60 flex flex-wrap gap-4 items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">TANGGAL GIAT</span>
                    <span className="text-xs font-extrabold text-slate-800">{dateFormatted}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">STATUS KETAATAN</span>
                    <span className={`inline-block px-2 py-0.5 mt-0.5 rounded-full text-[9px] font-black tracking-wide ${
                      r.status_ketaatan === "TAAT"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200 animate-pulse"
                    }`}>
                      {r.status_ketaatan}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">SKOR & PREDIKAT</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-black font-mono text-slate-800">{r.nilai_total}/100</span>
                      <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-extrabold ${
                        r.predikat === "Sangat Baik"
                          ? "bg-emerald-500 text-white"
                          : r.predikat === "Baik"
                          ? "bg-cyan-500 text-white"
                          : r.predikat === "Cukup"
                          ? "bg-amber-500 text-white"
                          : "bg-rose-500 text-white"
                      }`}>
                        {r.predikat}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Urgency status if any */}
                {urgency.isUrgent && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                    <div className="text-xs">
                      <h5 className="font-extrabold text-amber-950">Peringatan / Atensi Jatuh Tempo</h5>
                      <div className="mt-1 space-y-1 text-amber-900 font-semibold">
                        {urgency.docMessage && <p>• {urgency.docMessage}</p>}
                        {urgency.findMessage && <p>• {urgency.findMessage}</p>}
                      </div>
                    </div>
                  </div>
                )}

                {/* Core Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Nomor SPT</span>
                    <span className="font-bold text-slate-800 block mt-0.5 font-mono">{r.nomor_spt || "-"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Satwas SDKP</span>
                    <span className="font-bold text-slate-800 block mt-0.5">{r.satwas || "-"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Jenis Usaha</span>
                    <span className="font-bold text-slate-800 block mt-0.5">{r.jenis_usaha || "-"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Lokasi / Wilayah</span>
                    <span className="font-bold text-slate-800 block mt-0.5">{r.lokasi_wilayah || "-"}</span>
                  </div>
                </div>

                <div className="border-t border-slate-100 my-4" />

                {/* Checklist Matriks and Temuan */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Checklist Matriks */}
                  <div className="bg-slate-50 border border-slate-150 rounded-xl p-4">
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                      <span className="w-1.5 h-3 bg-sky-500 rounded-xs" />
                      Matrik Kelengkapan Berkas
                    </h4>
                    <ul className="space-y-2 text-xs font-semibold">
                      <li className="flex items-center justify-between">
                        <span className="text-slate-500">Surat Pemberitahuan (SPT)</span>
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-extrabold ${r.persiapan_spt ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                          {r.persiapan_spt ? "+ 20 Pts" : "0 Pts"}
                        </span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span className="text-slate-500">Surat Tugas Kegiatan (ST)</span>
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-extrabold ${r.persiapan_st ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                          {r.persiapan_st ? "+ 20 Pts" : "0 Pts"}
                        </span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span className="text-slate-500">Daftar Hasil Pengawasan (DHP)</span>
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-extrabold ${r.pelaksanaan_dhp ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                          {r.pelaksanaan_dhp ? "+ 20 Pts" : "0 Pts"}
                        </span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span className="text-slate-500">Tanpa Revisi Verifikator</span>
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-extrabold ${r.pelaksanaan_no_revisi ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                          {r.pelaksanaan_no_revisi ? "+ 20 Pts" : "0 Pts"}
                        </span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span className="text-slate-500">Laporan Dokumentasi Lengkap</span>
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-extrabold ${r.pelaporan_lengkap ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                          {r.pelaporan_lengkap ? "+ 20 Pts" : "0 Pts"}
                        </span>
                      </li>
                    </ul>
                  </div>

                  {/* Temuan & Rekomendasi */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                        <span className="w-1.5 h-3 bg-amber-500 rounded-xs" />
                        Daftar Temuan Lapangan
                      </h4>
                      <div className="text-xs text-slate-800 leading-relaxed font-semibold bg-slate-50 border border-slate-100 p-3 rounded-xl max-h-24 overflow-y-auto">
                        {r.temuan || "Tidak ada temuan khusus."}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                        <span className="w-1.5 h-3 bg-purple-500 rounded-xs" />
                        Rekomendasi Tindakan
                      </h4>
                      <div className="text-xs text-slate-800 leading-relaxed font-semibold bg-slate-50 border border-slate-100 p-3 rounded-xl max-h-24 overflow-y-auto">
                        {r.rekomendasi || "Tidak ada rekomendasi tindakan khusus."}
                      </div>
                    </div>
                  </div>

                </div>

                {/* Uploaded Documents List */}
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                    <span className="w-1.5 h-3 bg-emerald-500 rounded-xs" />
                    Tautan Berkas & Dokumen Checklist ({relatedDocs.length})
                  </h4>
                  {relatedDocs.length === 0 ? (
                    <p className="text-xs text-slate-400 italic font-semibold">Belum ada tautan berkas drive yang diunggah.</p>
                  ) : (
                    <div className="space-y-2 max-h-36 overflow-y-auto">
                      {relatedDocs.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-150 bg-white shadow-3xs text-xs">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-sky-600 shrink-0" />
                            <div>
                              <span className="font-extrabold text-slate-800 block">{doc.jenis_dokumen}</span>
                              <span className={`inline-block px-1.5 py-0.2 rounded text-[8.5px] font-bold mt-0.5 ${
                                doc.status === "Terverifikasi" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                              }`}>
                                {doc.status}
                              </span>
                            </div>
                          </div>
                          {doc.link_file && (
                            <a 
                              href={doc.link_file}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 text-[10px] font-black text-sky-700 hover:text-sky-800 hover:underline px-2.5 py-1 bg-sky-50 rounded"
                            >
                              <span>Buka Link</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Modal Footer */}
              <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex items-center justify-between shrink-0">
                <div className="flex gap-2">
                  {canEdit && (
                    <button
                      onClick={() => {
                        setSelectedRecordForModal(null);
                        onEditClick(r);
                      }}
                      className="px-3.5 py-2 bg-sky-50 text-sky-700 hover:bg-sky-100 text-xs font-extrabold rounded-lg border border-sky-100 cursor-pointer transition flex items-center gap-1.5"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      Ubah
                    </button>
                  )}
                  
                  {userRole !== "Kepala Stasiun" && (
                    <button
                      onClick={() => {
                        setSelectedRecordForModal(null);
                        onCreateTemuanClick(r);
                      }}
                      className="px-3.5 py-2 bg-amber-50 text-amber-700 hover:bg-amber-100 text-xs font-extrabold rounded-lg border border-amber-100 cursor-pointer transition flex items-center gap-1.5"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Temuan
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setSelectedRecordForModal(null)}
                  className="px-4 py-2 bg-slate-250 hover:bg-slate-300 text-slate-800 text-xs font-extrabold rounded-lg cursor-pointer transition"
                >
                  Tutup
                </button>
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
};
