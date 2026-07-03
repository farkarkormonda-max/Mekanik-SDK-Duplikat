import React from "react";
import { 
  LayoutDashboard, 
  ClipboardCheck, 
  MapPinOff, 
  FileText, 
  Users, 
  Settings, 
  FolderLock,
  Anchor,
  LogOut,
  Menu,
  X,
  History,
  Chrome,
  Volume2
} from "lucide-react";
import { User, UserRole } from "../types";
import kepolisianKhususLogo from "../assets/images/polsus_badge_real_1782639227590.jpg";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: User;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, user, onLogout }) => {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Define navigation items with role restrictions
  const allNavItems = [
    {
      id: "dashboard",
      label: "Dashboard Utama",
      icon: LayoutDashboard,
      roles: ["Administrator", "Kepala Stasiun", "Verifikator", "Satwas"],
    },
    {
      id: "pemeriksaan",
      label: "Matrik Pemeriksaan",
      icon: ClipboardCheck,
      roles: ["Administrator", "Verifikator", "Satwas"],
    },
    {
      id: "temuan",
      label: "Uraian Temuan",
      icon: MapPinOff,
      roles: ["Administrator", "Satwas", "Verifikator"], // let verifikator review temuan
    },
    {
      id: "dokumen",
      label: "Repository Dokumen",
      icon: FolderLock,
      roles: ["Administrator", "Verifikator", "Satwas"],
    },
    {
      id: "laporan",
      label: "Export & Cetak Laporan",
      icon: FileText,
      roles: ["Administrator", "Kepala Stasiun", "Verifikator", "Satwas"],
    },
    {
      id: "users",
      label: "Manajemen User",
      icon: Users,
      roles: ["Administrator"],
    },
    {
      id: "logs",
      label: "Log Aktivitas Audit",
      icon: History,
      roles: ["Administrator"],
    },
    {
      id: "workspace",
      label: "Google Workspace API",
      icon: Chrome,
      roles: ["Administrator", "Kepala Stasiun", "Verifikator", "Satwas"],
    },
    {
      id: "ai-assistant",
      label: "Asisten Suara AI",
      icon: Volume2,
      roles: ["Administrator", "Kepala Stasiun", "Verifikator", "Satwas"],
    },
    {
      id: "config",
      label: "Pengaturan API / Sheet",
      icon: Settings,
      roles: ["Administrator"],
    },
  ];

  // Filter based on user's role
  const visibleNavItems = allNavItems.filter((item) => item.roles.includes(user.role));

  const toggleMobile = () => setMobileOpen(!mobileOpen);

  const handleNavClick = (id: string) => {
    setActiveTab(id);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Toggle Bar */}
      <div className="md:hidden bg-sky-950 text-white px-4 py-3 flex items-center justify-between shadow-md no-print">
        <div className="flex items-center gap-2">
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/f/f0/Lambang_Kementerian_Kelautan_dan_Perikanan.png" 
            alt="Logo KKP" 
            className="w-6 h-6 object-contain shrink-0"
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div className="w-px h-4 bg-sky-800/40 shrink-0" />
          <img 
            src={kepolisianKhususLogo} 
            alt="Logo Polsus" 
            className="w-6 h-6 object-contain shrink-0"
            referrerPolicy="no-referrer"
          />
          <span className="font-extrabold tracking-tight text-[11px] bg-gradient-to-r from-blue-300 via-sky-200 to-yellow-200 text-transparent bg-clip-text ml-1 select-none">MEKANIK TIMJA SDK</span>
        </div>
        <button id="mobile-toggle" onClick={toggleMobile} className="p-1 hover:bg-sky-900 rounded">
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Container */}
      <aside
        id="app-sidebar"
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-sky-950 text-slate-100 flex flex-col justify-between transform md:translate-x-0 md:static transition-transform duration-300 ease-in-out border-r border-sky-900 no-print ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Head Branding */}
        <div>
          <div className="px-4 py-5 border-b border-sky-900/50 flex items-center gap-2.5">
            <div className="p-1.5 bg-sky-900/40 rounded-xl border border-sky-800/30 shrink-0 flex items-center gap-1.5 justify-center">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/f/f0/Lambang_Kementerian_Kelautan_dan_Perikanan.png" 
                alt="Logo KKP" 
                className="w-7 h-7 object-contain shrink-0"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div className="w-px h-5 bg-sky-800/40 shrink-0" />
              <img 
                src={kepolisianKhususLogo} 
                alt="Logo Polsus" 
                className="w-7 h-7 object-contain shrink-0"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <span className="block font-black text-xs tracking-tight font-sans bg-gradient-to-r from-blue-300 via-sky-200 to-yellow-200 text-transparent bg-clip-text select-none leading-tight">
                MEKANIK TIMJA SDK
              </span>
              <span className="text-[8px] text-slate-400 tracking-wider font-mono font-bold uppercase block mt-0.5 select-none leading-none">TAHUN ANGGARAN 2026</span>
            </div>
          </div>

          {/* User Profile Mini Tab */}
          <div className="mx-4 mt-6 p-4 rounded-xl bg-sky-900/40 border border-sky-900/60">
            <div className="text-xs text-cyan-400 font-mono font-bold tracking-widest uppercase mb-1">
              Role: {user.role}
            </div>
            <div className="font-bold text-sm text-white truncate">{user.nama}</div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Sesi Aktif
            </div>
          </div>

          {/* Nav Items */}
          <nav className="mt-6 px-3 flex flex-col gap-1">
            {visibleNavItems.map((item) => {
              const IconComp = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  id={`nav-tab-${item.id}`}
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/20 font-semibold"
                      : "text-slate-300 hover:bg-sky-900/55 hover:text-white"
                  }`}
                >
                  <IconComp className={`w-4 h-4 ${isActive ? "text-white" : "text-cyan-400"}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Logout Button */}
        <div className="p-4 border-t border-sky-900/50">
          <button
            id="btn-logout"
            onClick={onLogout}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 text-slate-300 hover:text-red-300 hover:bg-red-500/10 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors border border-transparent hover:border-red-500/20"
          >
            <span className="flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              Keluar Sesi
            </span>
          </button>
        </div>
      </aside>

      {/* Overlay on mobile */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
        />
      )}
    </>
  );
};
