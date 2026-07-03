import React from "react";
import { Database, CloudLightning, ShieldAlert, Anchor, RefreshCw, Wifi, WifiOff, Cloud, CloudOff } from "lucide-react";
import { api } from "../lib/api";

interface NavbarProps {
  activeTab: string;
  config: { DATA_PERSISTENCE_MODE: string; GAS_WEB_APP_URL: string };
  onSettingClick: () => void;
  onSyncClick?: () => void;
  isSyncing?: boolean;
  lastSyncedTime?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  activeTab, 
  config, 
  onSettingClick, 
  onSyncClick, 
  isSyncing = false,
  lastSyncedTime = "" 
}) => {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  const [queueLength, setQueueLength] = React.useState(0);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const updateQueue = () => {
      try {
        const queue = api.getOfflineQueue();
        setQueueLength(queue.length);
      } catch (e) {
        setQueueLength(0);
      }
    };

    updateQueue();
    window.addEventListener("offline_queue_changed", updateQueue);

    // Monitor local storage changes also in case multiple tabs exist
    window.addEventListener("storage", updateQueue);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("offline_queue_changed", updateQueue);
      window.removeEventListener("storage", updateQueue);
    };
  }, []);

  const getHeaderTitle = () => {
    switch (activeTab) {
      case "dashboard":
        return "Monitoring, Evaluasi Kegiatan & Anggaran serta Nilai Indeks Kinerja";
      case "pemeriksaan":
        return "Matrik Perhitungan Nilai Pelaku Usaha";
      case "temuan":
        return "Tindak Lanjut & Uraian Temuan Pengawasan";
      case "dokumen":
        return "Repository Berkas & Dokumen Perizinan";
      case "laporan":
        return "Pusat Laporan & Ekspor Data";
      case "users":
        return "Manajemen User & Hak Akses Kontrol";
      case "workspace":
        return "Google Workspace REST API Integrasi (Calendar, Forms, Keep)";
      case "ai-assistant":
        return "Asisten Suara AI (AI Voice Assistant) - Text-to-Speech";
      case "config":
        return "Integrasi Google Spreadsheet & REST API";
      default:
        return "Stasiun PSDKP Biak - Ditjen PSDKP";
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm relative no-print">
      {/* View Header */}
      <div>
        <h1 className="text-lg sm:text-xl font-extrabold text-slate-800 flex items-center gap-2.5">
          <div className="flex md:hidden items-center gap-1.5 shrink-0">
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/f/f0/Lambang_Kementerian_Kelautan_dan_Perikanan.png" 
              alt="Logo KKP" 
              className="w-6 h-6 sm:w-7 sm:h-7 object-contain shrink-0"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="w-px h-4 sm:h-5 bg-slate-300 shrink-0" />
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/2/23/Lambang_Kepolisian_Khusus_Indonesia.png" 
              alt="Logo Polsus" 
              className="w-6 h-6 sm:w-7 sm:h-7 object-contain shrink-0"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <span className="truncate">{getHeaderTitle()}</span>
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          Mekanik Tim Kerja Sumber Daya Kelautan (TIMJA SDK)
        </p>
      </div>

      {/* Persistence Status Chip & Manual Sync */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Connection Status Pill */}
        <div 
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors select-none ${
            isOnline 
              ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
              : "bg-rose-50 text-rose-800 border-rose-200 animate-pulse"
          }`}
          title={isOnline ? "Aplikasi Terhubung ke Jaringan" : "Koneksi Terputus - Berjalan dalam Mode Offline"}
          id="connection-status-pill"
        >
          {isOnline ? (
            <Wifi className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-rose-600" />
          )}
          <span className="font-semibold">{isOnline ? "Online" : "Offline"}</span>
        </div>

        {/* Offline Queue Pending Badge */}
        {queueLength > 0 && (
          <button
            onClick={async () => {
              if (!isOnline) {
                alert("Anda sedang Offline. Sambungkan ke internet untuk menyinkronkan data.");
                return;
              }
              if (onSyncClick) {
                onSyncClick();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-extrabold cursor-pointer hover:bg-amber-100 transition-all animate-bounce"
            title={`${queueLength} perubahan disimpan di lokal dan siap disinkronkan. Klik untuk Sinkronisasi.`}
            id="offline-queue-badge"
          >
            <Cloud className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
            <span>{queueLength} Tertunda</span>
          </button>
        )}

        {/* Auto Refresh Badge */}
        <div className="hidden xs:flex flex-col items-end text-right font-medium mr-1 select-none">
          <span className="text-[10px] text-emerald-600 font-extrabold flex items-center gap-1.5 uppercase tracking-wider">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Auto-Refresh (5m)
          </span>
          {lastSyncedTime ? (
            <span className="text-[9px] text-slate-400 font-mono mt-0.5">
              Updated: {lastSyncedTime}
            </span>
          ) : (
            <span className="text-[9px] text-slate-400 font-mono mt-0.5 animate-pulse">
              Menghubungkan...
            </span>
          )}
        </div>

        {onSyncClick && (
          <button
            onClick={onSyncClick}
            disabled={isSyncing}
            className={`flex items-center justify-center p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all ${isSyncing ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            title="Sinkronisasi Data Sekarang"
            id="sync-button-header"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin text-sky-500" : ""}`} />
          </button>
        )}

        {config.DATA_PERSISTENCE_MODE === "sheet" ? (
          <button
            onClick={onSettingClick}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold cursor-pointer hover:bg-emerald-100 transition-colors"
            title="Sinkronisasi Google Sheets Aktif"
            id="persistence-sheet-mode-badge"
          >
            <CloudLightning className="w-3.5 h-3.5 text-emerald-500 animate-bounce" />
            <span className="font-mono">Google Sheet Sync</span>
          </button>
        ) : (
          <button
            onClick={onSettingClick}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-orange-850 text-xs font-semibold cursor-pointer hover:bg-orange-100 transition-colors"
            title="Klik untuk menghubungkan ke Google Sheet Anda"
            id="persistence-local-mode-badge"
          >
            <Database className="w-3.5 h-3.5 text-orange-500" />
            <span className="font-mono">Local Persistence Mode</span>
          </button>
        )}
      </div>
    </header>
  );
};
