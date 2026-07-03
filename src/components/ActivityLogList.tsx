import React, { useState, useEffect } from "react";
import { ActivityLog } from "../types";
import { api } from "../lib/api";
import { 
  Search, 
  Filter, 
  RefreshCw, 
  Calendar, 
  User as UserIcon, 
  Clock, 
  Trash2, 
  Plus, 
  Edit, 
  CheckCircle, 
  Settings, 
  FileText,
  AlertCircle
} from "lucide-react";

const maskUsername = (username: string, isSelf: boolean) => {
  if (isSelf) return username;
  if (!username) return "";
  if (username.length <= 3) return username[0] + "*".repeat(username.length - 1);
  return username.slice(0, 2) + "*".repeat(username.length - 4) + username.slice(-2);
};

export const ActivityLogList: React.FC = () => {
  const [currentUser] = useState<any>(() => {
    try {
      const saved = localStorage.getItem("sdkp_user_session");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMenu, setFilterMenu] = useState("");
  const [filterAction, setFilterAction] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getLogs();
      setLogs(data);
    } catch (err: any) {
      setError("Gagal memuat log aktivitas audit: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getActionBadge = (action: string) => {
    switch (action) {
      case "CREATE":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase tracking-wider">
            <Plus className="w-2.5 h-2.5" /> Tambah
          </span>
        );
      case "UPDATE":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-sky-50 border border-sky-200 text-sky-700 text-[10px] font-black uppercase tracking-wider">
            <Edit className="w-2.5 h-2.5" /> Ubah
          </span>
        );
      case "DELETE":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-black uppercase tracking-wider">
            <Trash2 className="w-2.5 h-2.5" /> Hapus
          </span>
        );
      case "VERIFY":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-purple-50 border border-purple-200 text-purple-700 text-[10px] font-black uppercase tracking-wider">
            <CheckCircle className="w-2.5 h-2.5" /> Verifikasi
          </span>
        );
      case "CONFIG":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-50 border border-amber-250 text-amber-700 text-[10px] font-black uppercase tracking-wider">
            <Settings className="w-2.5 h-2.5" /> Config
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-wider">
            {action}
          </span>
        );
    }
  };

  const getMenuColor = (menu: string) => {
    switch (menu) {
      case "Pemeriksaan":
        return "text-blue-700 bg-blue-50 border-blue-100";
      case "Temuan":
        return "text-orange-700 bg-orange-50 border-orange-100";
      case "Dokumen":
        return "text-indigo-700 bg-indigo-50 border-indigo-100";
      case "Users":
        return "text-teal-700 bg-teal-50 border-teal-100";
      case "Konfigurasi":
        return "text-amber-700 bg-amber-50 border-amber-100";
      default:
        return "text-slate-700 bg-slate-50 border-slate-100";
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchSearch = 
      log.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.userRole.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchMenu = filterMenu ? log.menu === filterMenu : true;
    const matchAction = filterAction ? log.action === filterAction : true;

    return matchSearch && matchMenu && matchAction;
  });

  return (
    <div className="space-y-6">
      {/* Head */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span className="w-2 h-5 bg-sky-600 rounded-xs" />
            Audit Log Aktivitas Sistem
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
            Daftar lengkap riwayat aksi CRUD dan perubahan konfigurasi sistem oleh pengguna untuk keperluan akuntabilitas audit.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-250 rounded-xl text-xs font-bold text-slate-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? "animate-spin" : ""}`} />
          Muat Ulang Log
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-800">
            <h4 className="font-extrabold">Terjadi Kesalahan</h4>
            <p className="mt-0.5 font-semibold">{error}</p>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan deskripsi, nama user, atau peran..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-250 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-700"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          {/* Menu Filter */}
          <div className="flex items-center gap-2 min-w-[150px]">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={filterMenu}
              onChange={(e) => setFilterMenu(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-250 text-xs font-bold text-slate-700 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            >
              <option value="">Semua Modul</option>
              <option value="Pemeriksaan">Matrik Pemeriksaan</option>
              <option value="Temuan">Uraian Temuan</option>
              <option value="Dokumen">Repository Dokumen</option>
              <option value="Users">Manajemen User</option>
              <option value="Konfigurasi">Konfigurasi Sistem</option>
            </select>
          </div>

          {/* Action Filter */}
          <div className="flex items-center gap-2 min-w-[150px]">
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-250 text-xs font-bold text-slate-700 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            >
              <option value="">Semua Aksi (CRUD)</option>
              <option value="CREATE">Tambah Data (CREATE)</option>
              <option value="UPDATE">Ubah Data (UPDATE)</option>
              <option value="DELETE">Hapus Data (DELETE)</option>
              <option value="VERIFY">Verifikasi Dokumen</option>
              <option value="CONFIG">Pengaturan Sistem</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table Card */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-4 w-[180px]">Waktu & Tanggal</th>
                <th className="px-6 py-4 w-[180px]">Pelaku (User)</th>
                <th className="px-6 py-4 w-[150px]">Modul / Menu</th>
                <th className="px-6 py-4 w-[130px]">Aksi CRUD</th>
                <th className="px-6 py-4">Deskripsi Aktivitas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs text-slate-400 font-semibold">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-sky-600" />
                      Sedang memuat data log audit...
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs text-slate-400 font-bold">
                    Tidak ditemukan kecocokan log aktivitas audit.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const logDate = new Date(log.timestamp);
                  const formattedTime = logDate.toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit"
                  });
                  const formattedDate = logDate.toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric"
                  });

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/40 transition-colors text-xs text-slate-700">
                      <td className="px-6 py-4.5 font-mono text-slate-500 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-600">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {formattedDate}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 font-medium text-slate-400 text-[10px]">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          {formattedTime} WIT
                        </div>
                      </td>
                      <td className="px-6 py-4.5">
                        {(() => {
                          const isSelf = currentUser && (log.username === currentUser.username || log.username === currentUser.nama);
                          const dispName = maskUsername(log.username, !!isSelf);
                          return (
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs uppercase shrink-0 border border-slate-200">
                                {dispName ? dispName.substring(0, 2) : "U"}
                              </div>
                              <div>
                                <span className="block font-bold text-slate-900 leading-tight flex items-center gap-1">
                                  {dispName}
                                  {!isSelf && (
                                    <span className="text-[8px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded font-medium">Terproteksi</span>
                                  )}
                                </span>
                                <span className="block text-[10px] text-slate-400 font-bold mt-0.5 leading-none">{log.userRole}</span>
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4.5 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 rounded-lg border text-[10px] font-black tracking-wide uppercase ${getMenuColor(log.menu)}`}>
                          {log.menu}
                        </span>
                      </td>
                      <td className="px-6 py-4.5 whitespace-nowrap">
                        {getActionBadge(log.action)}
                      </td>
                      <td className="px-6 py-4.5 font-semibold text-slate-800 leading-relaxed min-w-[300px]">
                        {log.description}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-wide">
          <span>Menampilkan {filteredLogs.length} Entri Log Audit</span>
          <span>Akuntabilitas Audit Mekanik Timja SDKP Biak</span>
        </div>
      </div>
    </div>
  );
};
