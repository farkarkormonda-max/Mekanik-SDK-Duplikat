import React, { useState, useEffect } from "react";
import { Dokumen, Pemeriksaan } from "../types";
import { 
  Link, 
  FolderLock, 
  CheckCircle, 
  XCircle, 
  Search, 
  ExternalLink, 
  Trash2, 
  Plus, 
  Calendar, 
  X,
  Chrome,
  FileText,
  RefreshCw,
  AlertTriangle
} from "lucide-react";
import { getAccessToken } from "../lib/firebaseAuth";
import { googleSheetsApi } from "../lib/googleSheets";
import { useToast } from "./Toast";

interface DokumenListProps {
  documents: Dokumen[];
  pemeriksaanList: Pemeriksaan[];
  userRole: string;
  onCreateDoc: (doc: Partial<Dokumen>) => Promise<void>;
  onVerifyDoc: (id: string, status: "Verifikasi" | "Ditolak") => Promise<void>;
  onDeleteDoc: (id: string) => Promise<void>;
}

export const DokumenList: React.FC<DokumenListProps> = ({
  documents,
  pemeriksaanList,
  userRole,
  onCreateDoc,
  onVerifyDoc,
  onDeleteDoc,
}) => {
  const { warning } = useToast();
  const [search, setSearch] = useState("");
  const [docFilter, setDocFilter] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const docLength = documents.length;
  const pemeriksaanLength = pemeriksaanList.length;

  useEffect(() => {
    let overdueCount = 0;
    let approachingCount = 0;

    documents.forEach((doc) => {
      const parent = pemeriksaanList.find((p) => p.id === doc.pemeriksaan_id);
      if (parent && parent.tanggal && doc.status === "Belum Verifikasi") {
        const inspectDate = new Date(parent.tanggal);
        const currentDate = new Date();
        inspectDate.setHours(0, 0, 0, 0);
        currentDate.setHours(0, 0, 0, 0);
        const diffTime = currentDate.getTime() - inspectDate.getTime();
        const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        if (days >= 14) {
          overdueCount++;
        } else if (days >= 11) {
          approachingCount++;
        }
      }
    });

    if (overdueCount > 0 || approachingCount > 0) {
      let msg = "";
      if (overdueCount > 0 && approachingCount > 0) {
        msg = `Perhatian: Terdapat ${overdueCount} berkas LEWAT TENGGAT (Overdue) dan ${approachingCount} berkas MENDEKATI JATUH TEMPO (< 3 hari) yang belum diverifikasi!`;
      } else if (overdueCount > 0) {
        msg = `Perhatian: Terdapat ${overdueCount} berkas yang telah MELEBIHI batas waktu verifikasi 14 hari!`;
      } else {
        msg = `Peringatan: Terdapat ${approachingCount} berkas yang mendekati batas waktu verifikasi (tersisa <= 3 hari)!`;
      }
      warning(msg, 6000);
    }
  }, [docLength, pemeriksaanLength]);

  // Form block triggers
  const [showAddForm, setShowAddForm] = useState(false);
  const [pemeriksaanId, setPemeriksaanId] = useState("");
  const [jenisDokumen, setJenisDokumen] = useState<"Persiapan" | "Pelaksanaan" | "Pelaporan">("Persiapan");
  const [linkFile, setLinkFile] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Direct Google Drive Picker State
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [loadingDriveFiles, setLoadingDriveFiles] = useState(false);
  const [driveSearch, setDriveSearch] = useState("");
  const [driveError, setDriveError] = useState("");
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [showDrivePicker, setShowDrivePicker] = useState(false);

  // Helper lookups
  const getPemeriksaanInfo = (pemeriksaanId: string) => {
    return pemeriksaanList.find((p) => p.id === pemeriksaanId);
  };

  const fetchDriveFiles = async (keyword: string = "") => {
    setLoadingDriveFiles(true);
    setDriveError("");
    try {
      const token = await getAccessToken();
      if (!token) {
        setIsGoogleConnected(false);
        setDriveError("Google Session belum terhubung. Silakan hubungkan akun Google di menu Pengaturan database.");
        return;
      }
      setIsGoogleConnected(true);
      const files = await googleSheetsApi.listDriveFiles(token, keyword);
      setDriveFiles(files);
    } catch (err: any) {
      setDriveError("Gagal memuat berkas Google Drive: " + err.message);
    } finally {
      setLoadingDriveFiles(false);
    }
  };

  const handleOpenDrivePicker = async () => {
    setShowDrivePicker(true);
    await fetchDriveFiles("");
  };

  const filteredDocs = documents.filter((doc) => {
    const parent = getPemeriksaanInfo(doc.pemeriksaan_id);
    const textSearch = parent
      ? `${parent.pelaku_usaha} ${parent.perusahaan} ${doc.jenis_dokumen}`.toLowerCase()
      : doc.jenis_dokumen.toLowerCase();

    const matchesSearch = textSearch.includes(search.toLowerCase());
    const matchesFilter = docFilter === "All" ? true : doc.status === docFilter;

    const itemDate = parent?.tanggal || "";
    const matchStartDate = startDate ? (itemDate ? itemDate >= startDate : true) : true;
    const matchEndDate = endDate ? (itemDate ? itemDate <= endDate : true) : true;

    return matchesSearch && matchesFilter && matchStartDate && matchEndDate;
  });

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pemeriksaanId) {
      alert("Pilih Pelaku Usaha / Giat terkait.");
      return;
    }
    if (!linkFile.startsWith("http")) {
      alert("Masukkan alamat link Google Drive yang valid.");
      return;
    }
    setSubmitting(true);
    try {
      await onCreateDoc({
        pemeriksaan_id: pemeriksaanId,
        jenis_dokumen: jenisDokumen,
        link_file: linkFile.trim(),
        status: "Belum Verifikasi",
      });
      setLinkFile("");
      setShowAddForm(false);
    } catch (err: any) {
      alert("Gagal menambahkan berkas dokumen: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const isVerifikator = userRole === "Verifikator" || userRole === "Administrator";
  const canUpload = userRole === "Administrator" || userRole === "Satwas";

  const handleStatusChange = async (id: string, newStatus: "Verifikasi" | "Ditolak") => {
    try {
      await onVerifyDoc(id, newStatus);
    } catch (err: any) {
      alert("Gagal memperbarui status verifikasi: " + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus link file dokumen ini?")) {
      try {
        await onDeleteDoc(id);
      } catch (err: any) {
        alert("Gagal menghapus dokumen: " + err.message);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* List controls */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari pelaku usaha, jenis dokumen berkas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-xs font-semibold"
            />
          </div>

          {/* Quick status tabs filter */}
          <div className="inline-flex bg-slate-100 p-1 rounded-lg">
            {["All", "Belum Verifikasi", "Verifikasi", "Ditolak"].map((st) => (
              <button
                key={st}
                onClick={() => setDocFilter(st)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  docFilter === st
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-400 hover:text-slate-650"
                }`}
              >
                {st === "All" ? "Semua Berkas" : st}
              </button>
            ))}
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

        {/* Add document link toggle */}
        {canUpload && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2.5 bg-sky-700 hover:bg-sky-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm self-start whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Upload Link Drive
          </button>
        )}
      </div>

      {/* Add Drive Link Form Panel */}
      {showAddForm && (
        <div className="bg-slate-50 border rounded-2xl p-5 space-y-4 animate-in slide-in-from-top-3 duration-150 max-w-xl">
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <Link className="w-4 h-4 text-sky-650" />
            Lampirkan Berkas Google Drive Pelaku Usaha
          </h4>

          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hubungkan ke Pelaku Usaha</label>
                <select
                  required
                  value={pemeriksaanId}
                  onChange={(e) => setPemeriksaanId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-xs font-bold text-slate-705 bg-white"
                >
                  <option value="" disabled>-- Pilih Pelaku Usaha Giat --</option>
                  {pemeriksaanList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.pelaku_usaha}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kategori Dokumen Berkas</label>
                <select
                  value={jenisDokumen}
                  onChange={(e) => setJenisDokumen(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-xs font-bold text-slate-705 bg-white"
                >
                  <option value="Persiapan">Persiapan (SPT/SP/BAP)</option>
                  <option value="Pelaksanaan">Pelaksanaan (Hasil BA/DHP)</option>
                  <option value="Pelaporan">Pelaporan (Berkas Izin/Lengkap)</option>
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase">Google Drive Share Link URL</label>
                <button
                  type="button"
                  onClick={handleOpenDrivePicker}
                  className="px-2.5 py-1 bg-emerald-55 text-white hover:bg-emerald-65 rounded-lg text-[10.5px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-sm"
                >
                  <Chrome className="w-3.5 h-3.5" />
                  Pilih dari Google Drive
                </button>
              </div>
              <input
                type="url"
                required
                value={linkFile}
                onChange={(e) => setLinkFile(e.target.value)}
                placeholder="https://drive.google.com/file/d/xxxxx/view atau pilih menggunakan tombol di atas"
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-mono font-medium text-slate-700 bg-white placeholder:text-slate-400"
              />

              {showDrivePicker && (
                <div className="mt-3 p-3.5 bg-slate-100 rounded-xl border border-slate-200 space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase text-slate-600 tracking-wider flex items-center gap-1">
                      <Chrome className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                      Penjelajah Google Drive Anda
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowDrivePicker(false)}
                      className="p-1 hover:bg-slate-200 rounded text-slate-400 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Cari berkas di Drive Anda..."
                      value={driveSearch}
                      onChange={(e) => setDriveSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          fetchDriveFiles(driveSearch);
                        }
                      }}
                      className="flex-1 px-2.5 py-1.5 border border-slate-300 rounded text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-55/20 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => fetchDriveFiles(driveSearch)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-all shadow-sm"
                    >
                      Cari
                    </button>
                  </div>

                  {driveError && (
                    <p className="text-[10px] text-rose-600 font-bold bg-rose-50 p-2.5 rounded border border-rose-100">{driveError}</p>
                  )}

                  {loadingDriveFiles ? (
                    <div className="text-[11px] text-slate-500 italic py-3 flex items-center gap-1.5 justify-center font-semibold">
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                      Menghubungi Google Drive...
                    </div>
                  ) : driveFiles.length === 0 ? (
                    <p className="text-[10.5px] text-slate-450 italic py-2 text-center bg-white rounded-lg border border-slate-150">
                      Tidak ada berkas yang ditemukan.
                    </p>
                  ) : (
                    <div className="max-h-44 overflow-y-auto border border-slate-200 bg-white rounded-lg divide-y divide-slate-100 shadow-sm">
                      {driveFiles.map((file) => (
                        <button
                          type="button"
                          key={file.id}
                          onClick={() => {
                            if (file.webViewLink) {
                              setLinkFile(file.webViewLink);
                              setShowDrivePicker(false);
                            } else {
                              // If webViewLink is missing, try constructing a generic view link
                              const fallbackLink = `https://drive.google.com/file/d/${file.id}/view?usp=drivesdk`;
                              setLinkFile(fallbackLink);
                              setShowDrivePicker(false);
                            }
                          }}
                          className="w-full text-left px-3 py-2.5 text-[11px] flex items-center justify-between hover:bg-emerald-50/40 transition-colors"
                        >
                          <span className="flex items-center gap-2 truncate text-slate-700 font-bold">
                            <FileText className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                            <span className="truncate">{file.name}</span>
                          </span>
                          <span className="text-[8px] text-slate-450 font-extrabold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-150 uppercase tracking-tight shrink-0">
                            {file.mimeType.split(".").pop() || "Berkas"}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3.5 py-2 text-xs font-bold text-slate-550 hover:bg-slate-100 rounded-lg"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-lg text-xs font-bold cursor-pointer disabled:bg-slate-400"
              >
                {submitting ? "Mengunggah..." : "Lampirkan Dokumen"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Grid of Documents */}
      {filteredDocs.length === 0 ? (
        <div className="bg-white border rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-3">
          <FolderLock className="w-10 h-10 text-slate-350" />
          <h4 className="font-bold text-slate-700 text-sm">Tidak Ada Dokumen Terlampir</h4>
          <p className="text-xs text-slate-400 max-w-sm">No linked folders or documents match current searches.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocs.map((doc) => {
            const parent = getPemeriksaanInfo(doc.pemeriksaan_id);
            
            // Calculate overdue/approaching status: status is "Belum Verifikasi" and elapsed days since inspection >= 14 days
            let isOverdue = false;
            let isApproaching = false;
            let daysElapsed = 0;
            let daysRemaining = 0;
            if (parent && parent.tanggal && doc.status === "Belum Verifikasi") {
              const inspectDate = new Date(parent.tanggal);
              const currentDate = new Date();
              inspectDate.setHours(0, 0, 0, 0);
              currentDate.setHours(0, 0, 0, 0);
              const diffTime = currentDate.getTime() - inspectDate.getTime();
              daysElapsed = Math.floor(diffTime / (1000 * 60 * 60 * 24));
              if (daysElapsed >= 14) {
                isOverdue = true;
              } else if (daysElapsed >= 11) {
                isApproaching = true;
                daysRemaining = 14 - daysElapsed;
              }
            }

            return (
              <div
                key={doc.id}
                className={`rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-4 ${
                  isOverdue 
                    ? "bg-rose-50/15 border-rose-300 ring-1 ring-rose-200" 
                    : isApproaching
                    ? "bg-amber-50/20 border-amber-300 ring-1 ring-amber-300/30"
                    : "bg-white border-slate-200"
                }`}
              >
                <div>
                  {/* Status header & delete */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-455 font-mono">ID: {doc.id}</span>
                    <div className="flex items-center gap-1.5">
                      {isOverdue && (
                        <span className="bg-rose-600 text-white px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider flex items-center gap-1 animate-pulse shadow-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-white inline-block animate-ping" />
                          OVERDUE
                        </span>
                      )}
                      {isApproaching && (
                        <span className="bg-amber-500 text-white px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider flex items-center gap-1 animate-pulse shadow-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-white inline-block animate-ping" />
                          DEADLINE {daysRemaining}H
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                          doc.status === "Verifikasi"
                            ? "bg-emerald-100 text-emerald-800"
                            : doc.status === "Ditolak"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {doc.status}
                      </span>
                    </div>
                  </div>

                  {/* Document & Company info */}
                  <div className="mt-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block font-sans">{doc.jenis_dokumen}</span>
                    <h5 className="font-bold text-slate-900 text-sm mt-1 leading-tight">{parent ? parent.pelaku_usaha : "Audited Unit"}</h5>
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate font-semibold" title={parent?.perusahaan}>
                      {parent?.perusahaan || ""}
                    </p>

                    {isOverdue && (
                      <div className="mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-150 flex items-start gap-2 text-rose-700">
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-rose-600" />
                        <div className="text-[10px] font-bold leading-normal">
                          Lewat Tenggat Verifikasi ({daysElapsed} Hari)
                          <span className="block text-[9px] text-rose-500 font-semibold font-sans mt-0.5">Batas waktu penyerapan & validasi berkas adalah 14 hari sejak giat dilaksanakan.</span>
                        </div>
                      </div>
                    )}

                    {isApproaching && (
                      <div className="mt-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2 text-amber-800">
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-600 animate-bounce" />
                        <div className="text-[10px] font-bold leading-normal">
                          Mendekati Tenggat Verifikasi (Sisa {daysRemaining} Hari)
                          <span className="block text-[9px] text-amber-600 font-semibold font-sans mt-0.5">Batas waktu verifikasi tinggal {daysRemaining} hari lagi sebelum melampaui batas 14 hari.</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* File Action & Verify controls */}
                <div className="space-y-3.5 border-t pt-3.5 mt-2">
                  <a
                    href={doc.link_file}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-50 hover:bg-sky-50 text-sky-850 hover:text-sky-900 rounded-lg text-xs font-extrabold transition-colors border border-dashed border-slate-200"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-sky-700 font-bold" />
                    Buka Berkas Google Drive
                  </a>

                  {/* Administrator/Verifikator Approve or Reject status bar */}
                  <div className="flex items-center justify-between gap-1.5">
                    {isVerifikator ? (
                      <div className="flex items-center gap-1.5 flex-1">
                        <button
                          onClick={() => handleStatusChange(doc.id, "Verifikasi")}
                          className="flex-1 flex items-center justify-center gap-1 py-1 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded cursor-pointer border border-emerald-100"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Setuju
                        </button>
                        <button
                          onClick={() => handleStatusChange(doc.id, "Ditolak")}
                          className="flex-1 flex items-center justify-center gap-1 py-1 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded cursor-pointer border border-rose-100"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Tolak
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-medium">Approval restricted to Verifikator/Admin</span>
                    )}

                    {/* Trash delete link for creator/admin only */}
                    {(userRole === "Administrator" || userRole === "Satwas") && (
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="p-1 px-2 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded"
                        title="Hapus Link Berkas"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
