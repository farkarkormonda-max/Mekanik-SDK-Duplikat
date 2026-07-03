import React, { useState, useEffect } from "react";
import { Pemeriksaan, MasterSatwas } from "../types";
import { Check, ClipboardList, Info, Sparkles } from "lucide-react";

interface PemeriksaanFormProps {
  initialRecord: Pemeriksaan | null;
  satwasList: MasterSatwas[];
  onSubmit: (data: Partial<Pemeriksaan>) => Promise<void>;
  onClose: () => void;
  userRole: string;
}

export const PemeriksaanForm: React.FC<PemeriksaanFormProps> = ({
  initialRecord,
  satwasList,
  onSubmit,
  onClose,
  userRole,
}) => {
  // General Info
  const [tanggal, setTanggal] = useState("");
  const [nomorSpt, setNomorSpt] = useState("");
  const [satwas, setSatwas] = useState("");
  const [pelakuUsaha, setPelakuUsaha] = useState("");
  const [perusahaan, setPerusahaan] = useState("");
  const [jenisUsaha, setJenisUsaha] = useState("");
  const [alamat, setAlamat] = useState("");
  const [statusKetaatan, setStatusKetaatan] = useState<"TAAT" | "TIDAK TAAT">("TAAT");
  const [temuan, setTemuan] = useState("");
  const [rekomendasi, setRekomendasi] = useState("");

  // Penilaian Checklist States
  const [sptChecked, setSptChecked] = useState(true);
  const [stChecked, setStChecked] = useState(true);
  const [dhpChecked, setDhpChecked] = useState(true);
  const [noRevisiChecked, setNoRevisiChecked] = useState(true);
  const [laporanChecked, setLaporanChecked] = useState(true);

  // Computed state
  const [nilaiPersiapan, setNilaiPersiapan] = useState(40);
  const [nilaiPelaksanaan, setNilaiPelaksanaan] = useState(40);
  const [nilaiPelaporan, setNilaiPelaporan] = useState(20);
  const [nilaiTotal, setNilaiTotal] = useState(100);
  const [predikat, setPredikat] = useState<Pemeriksaan["predikat"]>("Sangat Baik");

  const [submitting, setSubmitting] = useState(false);

  // Hook-up initial attributes on EDIT mode
  useEffect(() => {
    if (initialRecord) {
      setTanggal(initialRecord.tanggal || "");
      setNomorSpt(initialRecord.nomor_spt || "");
      setSatwas(initialRecord.satwas || "");
      setPelakuUsaha(initialRecord.pelaku_usaha || "");
      setPerusahaan(initialRecord.perusahaan || "");
      setJenisUsaha(initialRecord.jenis_usaha || "");
      setAlamat(initialRecord.alamat || "");
      setStatusKetaatan(initialRecord.status_ketaatan || "TAAT");
      setTemuan(initialRecord.temuan || "");
      setRekomendasi(initialRecord.rekomendasi || "");

      // Checklist values (or fallback computations)
      setSptChecked(initialRecord.persiapan_spt !== undefined ? initialRecord.persiapan_spt : true);
      setStChecked(initialRecord.persiapan_st !== undefined ? initialRecord.persiapan_st : true);
      setDhpChecked(initialRecord.pelaksanaan_dhp !== undefined ? initialRecord.pelaksanaan_dhp : true);
      setNoRevisiChecked(initialRecord.pelaksanaan_no_revisi !== undefined ? initialRecord.pelaksanaan_no_revisi : true);
      setLaporanChecked(initialRecord.pelaporan_lengkap !== undefined ? initialRecord.pelaporan_lengkap : true);
    } else {
      // Set default satwas if list loaded
      if (satwasList.length > 0) {
        setSatwas(satwasList[0].nama_satwas);
      }
    }
  }, [initialRecord, satwasList]);

  // Recalculate scores and predikat in real-time when checklists change
  useEffect(() => {
    const persiapan = (sptChecked ? 20 : 0) + (stChecked ? 20 : 0);
    const pelaksanaan = (dhpChecked ? 20 : 0) + (noRevisiChecked ? 20 : 0);
    const pelaporan = laporanChecked ? 20 : 0;

    const total = persiapan + pelaksanaan + pelaporan;

    setNilaiPersiapan(persiapan);
    setNilaiPelaksanaan(pelaksanaan);
    setNilaiPelaporan(pelaporan);
    setNilaiTotal(total);

    // Set Predikat
    if (total >= 90) {
      setPredikat("Sangat Baik");
    } else if (total >= 80) {
      setPredikat("Baik");
    } else if (total >= 70) {
      setPredikat("Cukup");
    } else {
      setPredikat("Perlu Perbaikan");
    }
  }, [sptChecked, stChecked, dhpChecked, noRevisiChecked, laporanChecked]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!satwas) {
      alert("Pilih Satwas penanggung jawab.");
      return;
    }
    setSubmitting(true);
    try {
      const payload: Partial<Pemeriksaan> = {
        tanggal,
        nomor_spt: nomorSpt.trim(),
        satwas,
        pelaku_usaha: pelakuUsaha.trim(),
        perusahaan: perusahaan.trim(),
        jenis_usaha: jenisUsaha.trim(),
        alamat: alamat.trim(),
        status_ketaatan: statusKetaatan,
        persiapan_spt: sptChecked,
        persiapan_st: stChecked,
        pelaksanaan_dhp: dhpChecked,
        pelaksanaan_no_revisi: noRevisiChecked,
        pelaporan_lengkap: laporanChecked,
        nilai_persiapan: nilaiPersiapan,
        nilai_pelaksanaan: nilaiPelaksanaan,
        nilai_pelaporan: nilaiPelaporan,
        nilai_total: nilaiTotal,
        predikat,
        temuan: temuan.trim() || "-",
        rekomendasi: rekomendasi.trim() || "-",
      };

      await onSubmit(payload);
    } catch (err: any) {
      alert("Gagal memproses data pemeriksaan: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const isVerifikator = userRole === "Verifikator" && !initialRecord;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full p-6 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4 mb-6">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-sky-100 text-sky-700 rounded-lg">
              <ClipboardList className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              {initialRecord ? "Ubah Formulir Pemeriksaan Pelaku Usaha" : "Input Formulir Pemeriksaan Baru"}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer">
            Tutup
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Column 1: General Info */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-sky-900 border-b pb-1">1. Informasi Umum Pengawasan</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tanggal Kegiatan</label>
                <input
                  type="date"
                  required
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Satwas Kerja</label>
                <select
                  required
                  value={satwas}
                  onChange={(e) => setSatwas(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-sm font-medium bg-white"
                >
                  <option value="" disabled>Pilih Satwas</option>
                  {satwasList.map((s) => (
                    <option key={s.id} value={s.nama_satwas}>
                      {s.nama_satwas}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nomor SPT (Surat Perintah Tugas)</label>
              <input
                type="text"
                required
                value={nomorSpt}
                onChange={(e) => setNomorSpt(e.target.value)}
                placeholder="e.g. B.1183/PSDKPSta.8/KP.440/V/2026"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-sm font-medium font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nama Pelaku Usaha</label>
                <input
                  type="text"
                  required
                  value={pelakuUsaha}
                  onChange={(e) => setPelakuUsaha(e.target.value)}
                  placeholder="e.g. CV Regina Rachel / PT Telekom"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nama Perusahaan / Unit</label>
                <input
                  type="text"
                  required
                  value={perusahaan}
                  onChange={(e) => setPerusahaan(e.target.value)}
                  placeholder="e.g. PT Telekomunikasi Indonesia"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-sm font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Jenis Usaha / Kegiatan</label>
                <input
                  type="text"
                  required
                  value={jenisUsaha}
                  onChange={(e) => setJenisUsaha(e.target.value)}
                  placeholder="e.g. Aktivitas Pelabuhan Perikanan"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status Ketaatan Awal</label>
                <select
                  value={statusKetaatan}
                  onChange={(e) => setStatusKetaatan(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-xs font-bold text-slate-800 bg-white"
                >
                  <option value="TAAT" className="text-emerald-700 font-bold">TAAT</option>
                  <option value="TIDAK TAAT" className="text-rose-700 font-bold">TIDAK TAAT</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Alamat Pelaku Usaha / Lokasi Giat</label>
              <textarea
                required
                value={alamat}
                onChange={(e) => setAlamat(e.target.value)}
                placeholder="Alamat lengkap, Kelurahan, Kecamatan, Kabupaten..."
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-sm font-medium"
              />
            </div>
          </div>

          {/* Column 2: Score Checklist and Auto Calculations */}
          <div className="space-y-4 flex flex-col justify-between">
            <div>
              <h4 className="text-sm font-bold text-sky-900 border-b pb-1">2. Penilaian Matrik Nilai Pemeriksaan</h4>

              {/* Checkbox criteria list */}
              <div className="mt-3 space-y-2.5 p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Kriteria Persiapan (Maks 40 Poin)</div>
                <label className="flex items-center gap-3 cursor-pointer group text-xs text-slate-700 font-semibold p-1 hover:bg-slate-100 rounded">
                  <input
                    type="checkbox"
                    checked={sptChecked}
                    onChange={(e) => setSptChecked(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300 cursor-pointer"
                  />
                  <span>Adanya Surat Pemberitahuan / Laporan Aduan / Nota Dinas (20 Poin)</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group text-xs text-slate-700 font-semibold p-1 hover:bg-slate-100 rounded">
                  <input
                    type="checkbox"
                    checked={stChecked}
                    onChange={(e) => setStChecked(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300 cursor-pointer"
                  />
                  <span>Adanya Surat Tugas Pengawasan Resmi (20 Poin)</span>
                </label>

                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-3 mb-1">Kriteria Pelaksanaan (Maks 40 Poin)</div>
                <label className="flex items-center gap-3 cursor-pointer group text-xs text-slate-700 font-semibold p-1 hover:bg-slate-100 rounded">
                  <input
                    type="checkbox"
                    checked={dhpChecked}
                    onChange={(e) => setDhpChecked(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300 cursor-pointer"
                  />
                  <span>Tersedia Dokumen Hasil Pengawasan (BA/DHP) (20 Poin)</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group text-xs text-slate-700 font-semibold p-1 hover:bg-slate-100 rounded">
                  <input
                    type="checkbox"
                    checked={noRevisiChecked}
                    onChange={(e) => setNoRevisiChecked(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300 cursor-pointer"
                  />
                  <span>Tidak Menerima Catatan Perbaikan Verifikator (20 Poin)</span>
                </label>

                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-3 mb-1">Kriteria Pelaporan (Maks 20 Poin)</div>
                <label className="flex items-center gap-3 cursor-pointer group text-xs text-slate-700 font-semibold p-1 hover:bg-slate-100 rounded">
                  <input
                    type="checkbox"
                    checked={laporanChecked}
                    onChange={(e) => setLaporanChecked(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300 cursor-pointer"
                  />
                  <span>Laporan Lengkap + Dokumentasi & Salinan Perizinan (20 Poin)</span>
                </label>
              </div>

              {/* Real-time score readout */}
              <div className="grid grid-cols-3 gap-2 mt-4">
                <div className="px-3 py-1.5 bg-slate-100 rounded-lg text-center">
                  <span className="block text-[9px] text-slate-400 uppercase font-bold">Persiapan</span>
                  <span className="text-sm font-extrabold font-mono text-slate-800">{nilaiPersiapan}/40</span>
                </div>
                <div className="px-3 py-1.5 bg-slate-100 rounded-lg text-center">
                  <span className="block text-[9px] text-slate-400 uppercase font-bold">Pelaksanaan</span>
                  <span className="text-sm font-extrabold font-mono text-slate-800">{nilaiPelaksanaan}/40</span>
                </div>
                <div className="px-3 py-1.5 bg-slate-100 rounded-lg text-center">
                  <span className="block text-[9px] text-slate-400 uppercase font-bold">Pelaporan</span>
                  <span className="text-sm font-extrabold font-mono text-slate-800">{nilaiPelaporan}/20</span>
                </div>
              </div>

              {/* Total score panel */}
              <div className="flex items-center justify-between p-4 bg-sky-950 text-white rounded-xl mt-4 relative overflow-hidden">
                <Sparkles className="absolute right-2 top-2 w-16 h-16 text-cyan-500/20 rotate-12" />
                <div>
                  <span className="text-[10px] text-slate-300 uppercase tracking-widest font-black block">Nilai Pemeriksaan Akhir</span>
                  <span className="text-4xl font-extrabold font-mono leading-none tracking-tight block mt-1">
                    {nilaiTotal} <span className="text-sm font-normal text-slate-350 font-sans">/ 100</span>
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-300 uppercase tracking-widest font-black block">Predikat Kepatuhan</span>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold mt-1.5 ${
                    predikat === "Sangat Baik"
                      ? "bg-emerald-500 text-white shadow-sm"
                      : predikat === "Baik"
                      ? "bg-cyan-500 text-white"
                      : predikat === "Cukup"
                      ? "bg-amber-500 text-white"
                      : "bg-rose-500 text-white"
                  }`}>
                    {predikat}
                  </span>
                </div>
              </div>
            </div>

            {/* Temuan & Rekomendasi textareas */}
            <div className="space-y-3 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Uraian Temuan BA / Kendala Kegiatan</label>
                <input
                  id="pemeriksaanTemuan"
                  type="text"
                  value={temuan}
                  onChange={(e) => setTemuan(e.target.value)}
                  placeholder="Deskripsikan temuan lapangan (perizinan belum lengkap, dsb.)"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-sm font-medium text-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hasil Pengawasan / Tindakan Rekomendasi</label>
                <input
                  id="pemeriksaanRekomendasi"
                  type="text"
                  value={rekomendasi}
                  onChange={(e) => setRekomendasi(e.target.value)}
                  placeholder="Direkomendasikan pengurusan izin PKKPRL dsb."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-sm font-medium text-slate-700"
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-6 border-t mt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg text-sm font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-lg text-sm font-bold flex items-center gap-1 cursor-pointer disabled:bg-slate-400"
              >
                <Check className="w-4 h-4" />
                {submitting ? "Memproses..." : "Simpan Form"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
