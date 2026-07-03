import React, { useState, useMemo } from "react";
import { Pemeriksaan, MasterSatwas } from "../types";
import { FileText, Printer, FileDown, Search, Filter, RefreshCw, Anchor, Eye, X, Info, Presentation, ExternalLink, Check, AlertCircle } from "lucide-react";
import { googleWorkspaceApi } from "../lib/googleWorkspace";
import { getAccessToken } from "../lib/firebaseAuth";

interface LaporanFilterProps {
  records: Pemeriksaan[];
  satwasList: MasterSatwas[];
}

export const LaporanFilter: React.FC<LaporanFilterProps> = ({ records, satwasList }) => {
  // Filter States
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedSatwas, setSelectedSatwas] = useState("");
  const [jenisUsahaInput, setJenisUsahaInput] = useState("");
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  // Google Slides States
  const [generatingSlides, setGeneratingSlides] = useState(false);
  const [slidesUrl, setSlidesUrl] = useState("");
  const [slidesError, setSlidesError] = useState("");

  const handleGenerateSlides = async () => {
    setGeneratingSlides(true);
    setSlidesUrl("");
    setSlidesError("");
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error("Sesi akun Google belum terhubung. Silakan hubungkan di menu Pengaturan database.");
      }
      
      const title = `Matriks Evaluasi Kepatuhan SDKP Biak - ${new Date().toLocaleDateString("id-ID")}`;
      const presentationId = await googleWorkspaceApi.createSlidesPresentation(
        token,
        title,
        {
          total: subsetStats.total,
          taat: subsetStats.taat,
          tidakTaat: subsetStats.tidakTaat,
          rataRata: subsetStats.rataRata,
        },
        filterRecordsProcessed
      );

      const url = `https://docs.google.com/presentation/d/${presentationId}/edit`;
      setSlidesUrl(url);
    } catch (err: any) {
      setSlidesError(err.message || "Gagal membuat presentasi Google Slides.");
    } finally {
      setGeneratingSlides(false);
    }
  };

  const handleResetFilters = () => {
    setStartDate("");
    setEndDate("");
    setSelectedSatwas("");
    setJenisUsahaInput("");
  };

  // Compile unique jenis usaha for dropdown / assistance
  const filterRecordsProcessed = useMemo(() => {
    return records.filter((r) => {
      // Date filter
      if (startDate && r.tanggal < startDate) return false;
      if (endDate && r.tanggal > endDate) return false;

      // Satwas filter
      if (selectedSatwas && r.satwas !== selectedSatwas) return false;

      // Jenis usaha search
      if (jenisUsahaInput && !r.jenis_usaha.toLowerCase().includes(jenisUsahaInput.toLowerCase())) return false;

      return true;
    });
  }, [records, startDate, endDate, selectedSatwas, jenisUsahaInput]);

  // Compute stats of filtered records
  const subsetStats = useMemo(() => {
    const list = filterRecordsProcessed;
    const total = list.length;
    const taat = list.filter((r) => r.status_ketaatan === "TAAT").length;
    const tidakTaat = list.filter((r) => r.status_ketaatan === "TIDAK TAAT").length;

    let sum = 0;
    list.forEach((r) => {
      sum += Number(r.nilai_total) || 0;
    });
    const rataRata = total > 0 ? (sum / total).toFixed(2) : "0.00";

    return { total, taat, tidakTaat, rataRata };
  }, [filterRecordsProcessed]);

  // Handle CSV Spreadsheet Download
  const handleDownloadExcel = () => {
    if (filterRecordsProcessed.length === 0) {
      alert("Tidak ada data untuk diekspor!");
      return;
    }

    // Build CSV Content
    const headers = [
      "No",
      "Tanggal Pelaksanaan",
      "Nomor SPT",
      "UPT Satwas",
      "Nama Pelaku Usaha",
      "Nama Perusahaan",
      "Jenis Kegiatan",
      "Alamat",
      "Ketaatan",
      "Nilai Persiapan",
      "Nilai Pelaksanaan",
      "Nilai Pelaporan",
      "Nilai Total",
      "Predikat Kepatuhan",
      "Uraian Temuan",
      "Rekomendasi UPT"
    ];

    const rows = filterRecordsProcessed.map((r, index) => [
      index + 1,
      r.tanggal,
      `"${r.nomor_spt}"`,
      `"${r.satwas}"`,
      `"${r.pelaku_usaha}"`,
      `"${r.perusahaan}"`,
      `"${r.jenis_usaha}"`,
      `"${r.alamat.replace(/\r?\n|\r/g, " ")}"`,
      r.status_ketaatan,
      r.nilai_persiapan,
      r.nilai_pelaksanaan,
      r.nilai_pelaporan,
      r.nilai_total,
      r.predikat,
      `"${r.temuan.replace(/\r?\n|\r/g, " ")}"`,
      `"${r.rekomendasi.replace(/\r?\n|\r/g, " ")}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Matrik_Laporan_SDKP_Biak_Tahun_2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Launch Window Print containing clean layout for report
  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* 
        This is the print-only header which becomes visible in browsers when printing. 
        It provides a highly professional SDKP Biak report header.
      */}
      <div className="hidden print-only block p-8 border-b-4 border-slate-900 bg-white text-slate-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img 
              src="https://drive.google.com/uc?export=view&id=1vJ02JITYkTTmshDEflrNcRI7FrynDjy1" 
              alt="Logo" 
              className="w-12 h-12 object-contain"
              referrerPolicy="no-referrer"
            />
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight font-sans">Kementerian Kelautan dan Perikanan</h2>
              <h3 className="text-base font-bold text-slate-700">Direktorat Penyelenggaraan PSDKP • Stasiun SDKP Biak</h3>
              <p className="text-xs text-slate-500 font-medium">Jl. Sorido Baru No. 24, Sorido, Biak Kota, Provinsi Papua</p>
            </div>
          </div>
          <div className="text-right">
            <span className="block text-[10px] font-black uppercase font-mono tracking-widest text-slate-400">Arsip Laporan Utama</span>
            <span className="text-xs font-bold font-mono">Tahun Registrasi: 2026</span>
          </div>
        </div>
        <h4 className="text-center font-extrabold text-base mt-8 uppercase tracking-wide border-t border-slate-200 pt-4">
          MATRIK PERHITUNGAN NILAI PEMERIKSAAN PELAKU USAHA BIDANG KELAUTAN
        </h4>
        <div className="grid grid-cols-4 gap-4 text-center text-xs mt-6 bg-slate-50 p-4 rounded-xl border border-slate-100 font-semibold text-slate-700">
          <div>
            <span className="block text-[10px] text-slate-400 font-bold uppercase">Total Giat</span>
            <span className="text-lg font-extrabold font-mono text-slate-900">{subsetStats.total}</span>
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 font-bold uppercase">Pelaku Usaha Taat</span>
            <span className="text-lg font-extrabold font-mono text-emerald-700">{subsetStats.taat}</span>
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 font-bold uppercase">Pelaku Usaha Tidak Taat</span>
            <span className="text-lg font-extrabold font-mono text-rose-700">{subsetStats.tidakTaat}</span>
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 font-bold uppercase">Rataan Nilai</span>
            <span className="text-lg font-extrabold font-mono text-sky-850">{subsetStats.rataRata}%</span>
          </div>
        </div>
      </div>

      {/* Filter panel card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm no-print space-y-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b pb-3.5">
          <Filter className="w-4 h-4 text-sky-700" />
          Filter & Seleksi Laporan
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-semibold">
          <div>
            <label className="block text-slate-500 uppercase tracking-wider text-[10px] mb-1.5">Tanggal Awal</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white outline-none font-medium"
            />
          </div>

          <div>
            <label className="block text-slate-500 uppercase tracking-wider text-[10px] mb-1.5">Tanggal Akhir</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white outline-none font-medium"
            />
          </div>

          <div>
            <label className="block text-slate-500 uppercase tracking-wider text-[10px] mb-1.5">Sektor Satwas</label>
            <select
              value={selectedSatwas}
              onChange={(e) => setSelectedSatwas(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white outline-none font-bold text-slate-700"
            >
              <option value="">Semua Satwas</option>
              {satwasList.map((s) => (
                <option key={s.id} value={s.nama_satwas}>
                  {s.nama_satwas}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-500 uppercase tracking-wider text-[10px] mb-1.5">Jenis Usaha / Kegiatan</label>
            <input
              type="text"
              placeholder="e.g. Reklamasi / Dermaga"
              value={jenisUsahaInput}
              onChange={(e) => setJenisUsahaInput(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white outline-none font-medium"
            />
          </div>
        </div>

        {/* Action triggers */}
        <div className="flex flex-col gap-4 pt-4 border-t">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="text-[11px] font-bold text-slate-450 uppercase font-mono">
              Seleksi Aktif: {filterRecordsProcessed.length} Rekaman
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleResetFilters}
                className="px-3.5 py-2 hover:bg-slate-100 text-slate-500 text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reset Filter
              </button>
              <button
                onClick={handleDownloadExcel}
                className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="Download format Spreadsheet CSV"
              >
                <FileDown className="w-4 h-4" />
                Ekspor Excel (CSV)
              </button>
              <button
                type="button"
                onClick={handleGenerateSlides}
                disabled={generatingSlides || filterRecordsProcessed.length === 0}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm disabled:bg-slate-350"
                title="Buat slide presentasi otomatis dengan Google Slides"
              >
                <Presentation className="w-4 h-4" />
                {generatingSlides ? "Membuat Slides..." : "Buat Slides Presentasi"}
              </button>
              <button
                type="button"
                onClick={() => setShowPrintPreview(true)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 border border-slate-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                title="Tampilkan lembar visual simulasi cetak di layar"
              >
                <Eye className="w-4 h-4 text-cyan-400" />
                Tinjauan Cetak (Print View)
              </button>
              <button
                onClick={handlePrintReport}
                className="px-4 py-2.5 bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Printer className="w-4 h-4" />
                PDF / Cetak Laporan
              </button>
            </div>
          </div>

          {/* Slides Generation Notice Block */}
          {(generatingSlides || slidesUrl || slidesError) && (
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-bold animate-in fade-in duration-200">
              {generatingSlides && (
                <div className="flex items-center gap-2 text-amber-800 w-full font-bold">
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-600 shrink-0" />
                  <span>Menghubungi Google Slides API & Membuat Presentasi Baru di Google Drive Anda...</span>
                </div>
              )}
              {slidesUrl && (
                <div className="flex items-center justify-between gap-3 text-emerald-800 w-full">
                  <div className="flex items-center gap-2 font-bold">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 animate-bounce" />
                    <span>Presentasi Google Slides "Matriks Evaluasi Kepatuhan" Berhasil Dibuat di Drive!</span>
                  </div>
                  <a
                    href={slidesUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm text-[10.5px] font-black uppercase tracking-wider shrink-0 transition-all active:scale-95"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Buka Presentasi
                  </a>
                </div>
              )}
              {slidesError && (
                <div className="flex items-center gap-2 text-rose-800 w-full font-bold">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Gagal membuat Slides: {slidesError}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Subset Overview Widget */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 no-print sm:hidden lg:grid">
        <div className="bg-white border rounded-xl p-4 shadow-sm text-center">
          <span className="block text-[10px] text-slate-400 font-extrabold uppercase">Total Seleksi</span>
          <span className="text-2xl font-black font-mono text-slate-800">{subsetStats.total} Giat</span>
        </div>
        <div className="bg-white border rounded-xl p-4 shadow-sm text-center">
          <span className="block text-[10px] text-slate-400 font-extrabold uppercase">Pelaku Usaha Taat</span>
          <span className="text-2xl font-black font-mono text-emerald-700">{subsetStats.taat} Unit</span>
        </div>
        <div className="bg-white border rounded-xl p-4 shadow-sm text-center">
          <span className="block text-[10px] text-slate-400 font-extrabold uppercase">Ketaatan Kurang</span>
          <span className="text-2xl font-black font-mono text-rose-700">{subsetStats.tidakTaat} Unit</span>
        </div>
        <div className="bg-white border rounded-xl p-4 shadow-sm text-center">
          <span className="block text-[10px] text-slate-400 font-extrabold uppercase font-mono">Rata-rata Nilai</span>
          <span className="text-2xl font-black font-mono text-sky-850">{subsetStats.rataRata}%</span>
        </div>
      </div>

      {/* Printable Report Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm overflow-hidden">
        <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4 no-print">
          <FileText className="w-4 h-4 text-sky-650" />
          Preview Dokumen Matrik Nilai Pemeriksaan
        </h4>

        {filterRecordsProcessed.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs font-semibold">Tidak ada data peninjauan fitting filter saat ini.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-extrabold uppercase tracking-widest border-b border-slate-200">
                  <th className="px-3 py-3 border">No</th>
                  <th className="px-3 py-3 border">Tanggal</th>
                  <th className="px-3 py-3 border">Sektor Satwas</th>
                  <th className="px-3 py-3 border">Pelaku Usaha</th>
                  <th className="px-3 py-3 border">Barang / Giat</th>
                  <th className="px-3 py-3 border">Ketaatan</th>
                  <th className="px-3.5 py-3 border text-center">Persiapan (40)</th>
                  <th className="px-3.5 py-3 border text-center">Pelaksanaan (40)</th>
                  <th className="px-3.5 py-3 border text-center">Pelaporan (20)</th>
                  <th className="px-3.5 py-3 border text-center">Skor Total</th>
                  <th className="px-3.5 py-3 border">Predikat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 text-slate-700 font-semibold font-sans">
                {filterRecordsProcessed.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-slate-50/20 transition-colors">
                    <td className="px-3 py-3 border text-center font-mono">{idx + 1}</td>
                    <td className="px-3 py-3 border font-mono truncate max-w-[90px]">{r.tanggal}</td>
                    <td className="px-3 py-3 border truncate max-w-[120px]">{r.satwas}</td>
                    <td className="px-3 py-3 border font-extrabold text-slate-900 truncate max-w-[140px]">{r.pelaku_usaha}</td>
                    <td className="px-3 py-3 border truncate max-w-[140px]">{r.jenis_usaha}</td>
                    <td className="px-3 py-3 border">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black ${
                        r.status_ketaatan === "TAAT" ? "text-emerald-700 bg-emerald-50" : "text-rose-700 bg-rose-50"
                      }`}>
                        {r.status_ketaatan}
                      </span>
                    </td>
                    <td className="px-3 py-3 border text-center font-mono text-slate-500">{r.nilai_persiapan}</td>
                    <td className="px-3 py-3 border text-center font-mono text-slate-500">{r.nilai_pelaksanaan}</td>
                    <td className="px-3 py-3 border text-center font-mono text-slate-500">{r.nilai_pelaporan}</td>
                    <td className="px-3.5 py-3 border text-center font-extrabold font-mono text-slate-900 bg-slate-50/50">{r.nilai_total}</td>
                    <td className="px-3.5 py-3 border font-bold">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                        r.predikat === "Sangat Baik"
                          ? "text-emerald-800 bg-emerald-50"
                          : r.predikat === "Baik"
                          ? "text-cyan-800 bg-cyan-50"
                          : r.predikat === "Cukup"
                          ? "text-amber-850 bg-amber-50"
                          : "text-rose-800 bg-rose-50"
                      }`}>
                        {r.predikat}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Printable Report Footer signatures */}
      <div className="hidden print-only block mt-16 px-8 flex justify-between text-xs text-slate-800 font-bold">
        <div className="text-center w-48">
          <p>Mengetahui,</p>
          <p className="mt-1">Kepala Stasiun SDKP Biak</p>
          <div className="h-20 mt-4 border-b border-slate-300"></div>
          <p className="mt-1 pt-1">Ariyanto Basuki, A.Pi, M.Si</p>
          <p className="text-[10px] text-slate-400 font-mono mt-0.5">NIP. 19741021 199903 1 002</p>
        </div>
        <div className="text-center w-48">
          <p>Petugas Polsus PWP3K /</p>
          <p className="mt-1">Pengawas Kelautan UPT</p>
          <div className="h-20 mt-4 border-b border-slate-300"></div>
          <p className="mt-1 pt-1">Hendra Wijaya, S.Pi</p>
          <p className="text-[10px] text-slate-400 font-mono mt-0.5">NIP. 19821105 200812 1 003</p>
        </div>
      </div>

      {/* DEDICATED FULL-SCREEN INTERACTIVE PRINT VIEW OVERLAY */}
      {showPrintPreview && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-[9999] overflow-y-auto p-4 md:p-8 no-print flex flex-col items-center gap-6">
          
          {/* Action Header Panel */}
          <div className="w-full max-w-[850px] bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-white leading-relaxed">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-sky-950/80 border border-sky-850 rounded-xl">
                <Printer className="w-5 h-5 text-cyan-400 animate-pulse" />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-sm text-white">Tinjauan Lembar Cetak Dinas Resmi</h3>
                <p className="text-[10.5px] text-slate-400 font-medium">Format Matrik Pengawasan Kepatuhan Usaha SDKP Biak 2026</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-cyan-500/10 active:scale-95 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4 font-bold" />
                Cetak Sekarang
              </button>
              <button
                type="button"
                onClick={() => setShowPrintPreview(false)}
                className="px-3.5 py-2 bg-slate-805 hover:bg-slate-800 text-slate-200 hover:text-white font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer border border-slate-700/60"
              >
                <X className="w-4 h-4" />
                Tutup
              </button>
            </div>
          </div>

          {/* Tips / Instructions bar */}
          <div className="w-full max-w-[850px] bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl flex gap-3 text-cyan-200">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5 animate-bounce" />
            <div className="text-[11px] font-medium text-left leading-relaxed text-slate-350">
              <strong>Tips Cetak Profesional:</strong> Pastikan Anda memilih orientasi <strong className="text-white">Landscape</strong> jika kolom tabel terpotong, atau aktifkan opsi <strong className="text-white">"Sembunyikan Header dan Footer" (Hide Headers & Footers)</strong> di jendela konfigurasi cetak browser Anda agar Kop Letterhead resmi di bawah tercetak bersih tanpa metadata URL halaman web.
            </div>
          </div>

          {/* Simulated A4 Paper Sheet Content container */}
          <div className="bg-white text-slate-900 p-10 md:p-12 w-full max-w-[850px] min-h-[1100px] shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-slate-300 font-sans relative flex flex-col justify-between rounded-sm select-all">
            
            <div className="text-left">
              {/* Kop Surat Resonansi Resmi */}
              <div className="border-b-4 border-slate-900 pb-1 text-center relative select-none">
                <div className="flex items-center gap-4 text-left justify-center mb-2.5">
                  <img 
                    src="https://drive.google.com/uc?export=view&id=1vJ02JITYkTTmshDEflrNcRI7FrynDjy1" 
                    alt="Logo" 
                    className="w-14 h-14 object-contain shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h2 className="text-[13px] font-black uppercase tracking-wider text-slate-900 font-sans leading-none">Kementerian Kelautan dan Perikanan</h2>
                    <h1 className="text-[14px] font-black uppercase tracking-tight text-slate-900 font-sans mt-1 leading-tight">Direktorat Jenderal Pengawasan Sumber Daya Kelautan dan Perikanan</h1>
                    <h2 className="text-[13px] font-extrabold uppercase tracking-wide text-sky-850 font-sans mt-0.5 leading-none">Stasiun PSDKP Biak - Ditjen PSDKP</h2>
                    <p className="text-[9.5px] font-semibold text-slate-500 font-sans mt-1">Jl. Sorido Baru No. 24, Kelurahan Sorido, Distrik Biak Kota, Provinsi Papua • Telp/Fax: (0981) 21115</p>
                  </div>
                </div>
                {/* Visual Official Line Double style */}
                <div className="w-full border-t border-slate-900 h-0.5 mt-1.5" />
              </div>

              {/* Document Registry Meta */}
              <div className="flex justify-between items-start text-[10px] text-slate-600 font-mono mt-4 font-bold border-b border-slate-100 pb-2.5">
                <div className="space-y-0.5 text-left">
                  <p>RAHASIA / DOKUMEN DINAS RESMI</p>
                  <p>REGISTRY ID: <span className="text-slate-800 font-black">SDKP-BIAK-MATRIK-2026-{subsetStats.total}</span></p>
                </div>
                <div className="text-right space-y-0.5">
                  <p>TANGGAL PRINTING: <span className="font-sans text-slate-800">{new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</span></p>
                  <p>STATUS: <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 rounded font-sans uppercase text-[8px] font-black">TERVERIFIKASI UPT</span></p>
                </div>
              </div>

              {/* Title Section */}
              <div className="text-center mt-7">
                <h3 className="text-sm font-black uppercase tracking-wide text-slate-900">
                  MATRIKS EVALUASI & TINGKAT KEPATUHAN PELAKU USAHA KELAUTAN
                </h3>
                <p className="text-[9.5px] tracking-widest text-slate-500 uppercase font-mono font-extrabold mt-1">
                  UNIT PELAKSANA TEKNIS (UPT) Sektor Pengawasan PSDKP Biak Papua
                </p>
              </div>

              {/* Selection Parameter Badges */}
              <div className="grid grid-cols-3 gap-2 text-[10px] mt-6 bg-slate-50 p-3 rounded-lg border border-slate-150 font-semibold text-slate-700">
                <div className="text-left">
                  <span className="block text-[8px] text-slate-404 font-bold uppercase tracking-wider mb-0.5">Filter Rentang Tanggal</span>
                  <p className="text-slate-900 font-bold truncate">
                    {startDate ? startDate : "Awal Semesta"} s.d. {endDate ? endDate : "Akhir Buku"}
                  </p>
                </div>
                <div className="text-left">
                  <span className="block text-[8px] text-slate-404 font-bold uppercase tracking-wider mb-0.5">Satuan Kerja Pengawasan</span>
                  <p className="text-slate-900 font-bold truncate">
                    {selectedSatwas ? selectedSatwas : "Seluruh Satuan Pengawasan (Satwas)"}
                  </p>
                </div>
                <div className="text-left">
                  <span className="block text-[8px] text-slate-404 font-bold uppercase tracking-wider mb-0.5">Spesifikasi Kegiatan</span>
                  <p className="text-slate-900 font-bold truncate">
                    {jenisUsahaInput ? jenisUsahaInput : "Semua Jenis Industri/Kegiatan"}
                  </p>
                </div>
              </div>

              {/* Summary Dashboard Block */}
              <h4 className="text-[11px] font-extrabold uppercase text-slate-800 tracking-wider mt-7 mb-2 border-l-2 border-sky-800 pl-2 text-left">
                I. RINGKASAN CAPAIAN EVALUASI (EXECUTIVE SUMMARY)
              </h4>
              <div className="grid grid-cols-4 gap-4 text-center mt-2.5 bg-slate-50 border p-3.5 rounded-xl font-bold text-slate-700">
                <div>
                  <span className="block text-[8.5px] text-slate-400 uppercase">Jumlah Giat Gawas</span>
                  <span className="text-base font-black font-mono text-slate-900">{subsetStats.total} Kali</span>
                </div>
                <div>
                  <span className="block text-[8.5px] text-slate-400 uppercase">Pelaku Usaha Taat</span>
                  <span className="text-base font-black font-mono text-emerald-700">{subsetStats.taat} Unit</span>
                </div>
                <div>
                  <span className="block text-[8.5px] text-slate-400 uppercase">Ketaatan Kurang</span>
                  <span className="text-base font-black font-mono text-rose-700">{subsetStats.tidakTaat} Unit</span>
                </div>
                <div>
                  <span className="block text-[8.5px] text-slate-400 uppercase font-mono">Index Kepatuhan</span>
                  <span className="text-base font-black font-mono text-sky-800">
                    {subsetStats.total > 0 ? ((subsetStats.taat / subsetStats.total) * 100).toFixed(1) : "0.0"}%
                  </span>
                </div>
              </div>

              {/* Main Matrix Records Table */}
              <h4 className="text-[11px] font-extrabold uppercase text-slate-800 tracking-wider mt-7 mb-2.5 border-l-2 border-sky-800 pl-2 text-left">
                II. MATRIKS DETAIL PENILAIAN & NILAI TOTAL PEMERIKSAAN
              </h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse text-[10px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 font-black uppercase tracking-wider border-b border-slate-200">
                      <th className="px-2 py-2 border text-center">No</th>
                      <th className="px-2 py-2 border">Tanggal</th>
                      <th className="px-2 py-2 border">Satwas Wilayah Kerja</th>
                      <th className="px-2 py-2 border">Pelaku Usaha / Kapal</th>
                      <th className="px-2 py-2 border">Jenis Usaha / Kegiatan</th>
                      <th className="px-2 py-2 border text-center">Ketaatan</th>
                      <th className="px-2 py-2 border text-center">Skor Akhir</th>
                      <th className="px-3 py-2 border text-center">Predikat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 font-semibold text-slate-800 font-sans">
                    {filterRecordsProcessed.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-3 py-8 text-center text-slate-450 font-bold uppercase tracking-wider">
                          Tidak Ada Data Ditemukan Untuk Kriteria Seleksi Ini
                        </td>
                      </tr>
                    ) : (
                      filterRecordsProcessed.map((r, idx) => (
                        <tr key={r.id} className="hover:bg-slate-50/20">
                          <td className="px-2 py-2 border text-center font-mono text-slate-500">{idx + 1}</td>
                          <td className="px-2 py-2 border font-mono whitespace-nowrap text-slate-600">{r.tanggal}</td>
                          <td className="px-2 py-2 border truncate max-w-[110px]" title={r.satwas}>{r.satwas}</td>
                          <td className="px-2 py-2 border font-bold text-slate-950 truncate max-w-[140px]">{r.pelaku_usaha}</td>
                          <td className="px-2 py-2 border truncate max-w-[130px]">{r.jenis_usaha}</td>
                          <td className="px-2 py-2 border text-center">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[8.5px] font-black ${
                              r.status_ketaatan === "TAAT"
                                ? "text-emerald-800 bg-emerald-50 border border-emerald-100"
                                : "text-rose-800 bg-rose-50 border border-rose-100"
                            }`}>
                              {r.status_ketaatan}
                            </span>
                          </td>
                          <td className="px-2 py-2 border text-center font-bold font-mono text-slate-900 bg-slate-50/50">{r.nilai_total}</td>
                          <td className="px-3 py-2 border text-center">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase text-nowrap`}>
                              {r.predikat}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>

            {/* Official Report signatures page block */}
            <div className="mt-14 pt-6 border-t border-slate-150 flex justify-between text-[11px] text-slate-800 font-bold select-none">
              <div className="text-center w-52">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-0.5">Mengesyahkan,</p>
                <p className="text-slate-900">Kepala Stasiun SDKP Biak</p>
                <div className="h-16 mt-3 flex items-center justify-center border-b border-dashed border-slate-300">
                  <span className="text-[10px] text-slate-300 font-mono tracking-widest uppercase">UPT RESMI BIAK</span>
                </div>
                <p className="mt-1.5 pt-0.5 font-bold text-slate-900">Ariyanto Basuki, A.Pi, M.Si</p>
                <p className="text-[9px] text-slate-450 font-mono mt-0.5">NIP. 19741021 199903 1 002</p>
              </div>
              
              <div className="text-center w-52">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-0.5">Disusun Oleh,</p>
                <p className="text-slate-900">Pengawas Kelautan UPT</p>
                <div className="h-16 mt-3 flex items-center justify-center border-b border-dashed border-slate-300">
                  <span className="text-[10px] text-slate-300 font-mono tracking-widest">POLSUS PWP3K</span>
                </div>
                <p className="mt-1.5 pt-0.5 font-bold text-slate-900">Hendra Wijaya, S.Pi</p>
                <p className="text-[9px] text-slate-450 font-mono mt-0.5">NIP. 19821105 200812 1 003</p>
              </div>
            </div>

          </div>
          
          {/* Footer warning close indicator */}
          <p className="text-center text-slate-500 font-mono text-[10px] font-bold mb-4">
            - AKHIR SIMULASI PRINTING PREVIEW RESMI SDKP BIAK PAPUA -
          </p>

        </div>
      )}
    </div>
  );
};
