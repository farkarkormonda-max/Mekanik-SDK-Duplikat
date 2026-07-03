import React, { useState, useEffect } from "react";
import { Temuan, Pemeriksaan } from "../types";
import { AlertCircle, Save, Check } from "lucide-react";

interface TemuanFormProps {
  initialForm: Temuan | null;
  pemeriksaanList: Pemeriksaan[];
  preSelectedPemeriksaanId?: string; // in case we load directly from Pemeriksaan list action
  onSubmit: (data: Partial<Temuan>) => Promise<void>;
  onClose: () => void;
}

export const TemuanForm: React.FC<TemuanFormProps> = ({
  initialForm,
  pemeriksaanList,
  preSelectedPemeriksaanId,
  onSubmit,
  onClose,
}) => {
  const [pemeriksaanId, setPemeriksaanId] = useState("");
  const [uraianTemuan, setUraianTemuan] = useState("");
  const [status, setStatus] = useState<"Open" | "Dalam Proses" | "Selesai">("Open");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialForm) {
      setPemeriksaanId(initialForm.pemeriksaan_id);
      setUraianTemuan(initialForm.uraian_temuan);
      setStatus(initialForm.status_tindak_lanjut);
    } else if (preSelectedPemeriksaanId) {
      setPemeriksaanId(preSelectedPemeriksaanId);
    } else if (pemeriksaanList.length > 0) {
      setPemeriksaanId(pemeriksaanList[0].id);
    }
  }, [initialForm, preSelectedPemeriksaanId, pemeriksaanList]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pemeriksaanId) {
      alert("Pilih laporan pemeriksaan terkait.");
      return;
    }
    setSubmitting(true);
    try {
      const payload: Partial<Temuan> = {
        pemeriksaan_id: pemeriksaanId,
        uraian_temuan: uraianTemuan.trim(),
        status_tindak_lanjut: status,
        tanggal_update: new Date().toISOString().split("T")[0],
      };
      onSubmit(payload);
    } catch (err: any) {
      alert("Gagal memproses temuan: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
        <h3 className="text-lg font-bold text-slate-900 border-b pb-3 mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-amber-500" />
          {initialForm ? "Ubah Temuan Pengawasan" : "Registrasi Temuan Baru"}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pilih Pelaku Usaha / Giat Terkait</label>
            <select
              required
              disabled={!!initialForm || !!preSelectedPemeriksaanId}
              value={pemeriksaanId}
              onChange={(e) => setPemeriksaanId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-xs font-bold text-slate-700 bg-white disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="" disabled>--- Pilih Giat Pemeriksaan ---</option>
              {pemeriksaanList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.pelaku_usaha} ({p.nomor_spt.slice(0, 15)}...)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Deskripsi Uraian Temuan Lapangan</label>
            <textarea
              id="uraianTemuan"
              required
              rows={4}
              value={uraianTemuan}
              onChange={(e) => setUraianTemuan(e.target.value)}
              placeholder="Jelaskan secara rinci uraian temuan ketaatan yang butuh perbaikan dsb."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-xs font-semibold leading-relaxed text-slate-705"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status Tindak Lanjut</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-xs font-bold text-slate-700 bg-white"
            >
              <option value="Open">🔴 Open (Tindakan Diperlukan)</option>
              <option value="Dalam Proses">🟡 Dalam Proses Perbaikan</option>
              <option value="Selesai">🟢 Selesai (Sudah Tindak Lanjut)</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t mt-6">
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
              {submitting ? "Memproses..." : "Simpan Data"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
