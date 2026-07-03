import React, { useState } from "react";
import { User, UserRole } from "../types";
import { Plus, Edit2, Trash2, Key, UserCheck, Shield, CheckCircle, Eye, EyeOff } from "lucide-react";

const maskName = (name: string, isSelf: boolean) => {
  if (isSelf) return name;
  if (!name) return "";
  const words = name.trim().split(" ");
  return words.map(w => {
    if (w.length <= 2) return w[0] + "*";
    return w[0] + "*".repeat(w.length - 2) + w[w.length - 1];
  }).join(" ");
};

const maskUsername = (username: string, isSelf: boolean) => {
  if (isSelf) return username;
  if (!username) return "";
  if (username.length <= 3) return username[0] + "*".repeat(username.length - 1);
  return username.slice(0, 2) + "*".repeat(username.length - 4) + username.slice(-2);
};

interface UserManagementProps {
  users: User[];
  currentSessionUser: User;
  onCreateUser: (user: Partial<User>) => Promise<void>;
  onUpdateUser: (id: string, user: Partial<User>) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
}

export const UserManagement: React.FC<UserManagementProps> = ({
  users,
  currentSessionUser,
  onCreateUser,
  onUpdateUser,
  onDeleteUser,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [nama, setNama] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("Satwas");
  const [status, setStatus] = useState<"Aktif" | "Nonaktif">("Aktif");
  const [submitting, setSubmitting] = useState(false);

  const openAddModal = () => {
    setEditingUser(null);
    setNama("");
    setUsername("");
    setPassword("");
    setRole("Satwas");
    setStatus("Aktif");
    setShowModal(true);
  };

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setNama(u.nama);
    setUsername(u.username);
    setPassword(""); // Leave empty if not modifying
    setRole(u.role);
    setStatus(u.status);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data: Partial<User> = {
        nama: nama.trim(),
        username: username.trim(),
        role,
        status,
      };
      if (password.trim()) {
        data.password = password.trim();
      }

      if (editingUser) {
        await onUpdateUser(editingUser.id, data);
      } else {
        if (!password.trim()) {
          alert("Sandi diperlukan untuk user baru!");
          setSubmitting(false);
          return;
        }
        await onCreateUser(data);
      }
      setShowModal(false);
    } catch (e: any) {
      alert("Kesalahan mendaftarkan user: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (userId: string, usrName: string) => {
    if (userId === currentSessionUser.id) {
      alert("Anda tidak bisa menghapus akun Anda sendiri saat sesi aktif!");
      return;
    }
    if (confirm(`Apakah Anda yakin ingin menghapus user: ${usrName}?`)) {
      try {
        await onDeleteUser(userId);
      } catch (err: any) {
        alert("Gagal menghapus user: " + err.message);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Add button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Manajemen Pengguna Aplikasi</h2>
          <p className="text-xs text-slate-500">
            Daftar personil dengan hak akses otentikasi di Stasiun SDKP Biak.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="px-4 py-2.5 bg-sky-700 text-white hover:bg-sky-800 rounded-lg text-sm font-bold flex items-center gap-2 self-start cursor-pointer shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Tambah Personil Baru
        </button>
      </div>

      {/* Users Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                <th className="px-6 py-4">Nama Lengkap</th>
                <th className="px-6 py-4">Username</th>
                <th className="px-6 py-4">Jabatan / Role</th>
                <th className="px-6 py-4">Status Sesi</th>
                <th className="px-6 py-4 text-center">Aksi Operasi</th>
              </tr>
            </thead>
            <tbody className="text-sm font-medium text-slate-700 divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      {maskName(u.nama, u.id === currentSessionUser.id)}
                      {u.id !== currentSessionUser.id && (
                        <span className="text-[9px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded font-medium leading-none">Terproteksi</span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {u.id}</div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">
                    {maskUsername(u.username, u.id === currentSessionUser.id)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        u.role === "Administrator"
                          ? "bg-red-50 text-red-700"
                          : u.role === "Kepala Stasiun"
                          ? "bg-purple-50 text-purple-700"
                          : u.role === "Verifikator"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-sky-50 text-sky-700"
                      }`}
                    >
                      <Shield className="w-3 h-3" />
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${
                        u.status === "Aktif"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${u.status === "Aktif" ? "bg-emerald-500" : "bg-slate-450"}`} />
                      {u.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        title="Edit User"
                        onClick={() => openEditModal(u)}
                        className="p-2 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        title="Delete User"
                        onClick={() => handleDelete(u.id, u.nama)}
                        disabled={u.id === currentSessionUser.id}
                        className="p-2 text-slate-500 hover:text-red-650 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:hover:bg-transparent"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Insert / Edit Dialog */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-slate-900 border-b pb-3 mb-4">
              {editingUser ? "Modifikasi Akun Personil" : "Pendaftaran Personil Baru"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="e.g. Hendra Wijaya, S.Pi"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/25 focus:border-sky-600 font-medium text-sm text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Username Otentikasi</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g., hendraw"
                  disabled={!!editingUser}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/25 focus:border-sky-600 font-mono text-sm text-slate-800 disabled:bg-slate-100 disabled:text-slate-450"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Sandi / Password {editingUser && "(Kosongkan jika tidak diubah)"}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={editingUser ? "••••••••" : "Masukkan password baru"}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/25 focus:border-sky-600 text-sm font-mono text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hak Akses (Role)</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/25 focus:border-sky-600 text-sm font-medium text-slate-800 bg-white"
                  >
                    <option value="Administrator">Administrator</option>
                    <option value="Kepala Stasiun">Kepala Stasiun</option>
                    <option value="Verifikator">Verifikator</option>
                    <option value="Satwas">Satwas</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status Sesi</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/25 focus:border-sky-600 text-sm font-medium text-slate-800 bg-white"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg text-sm font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-lg text-sm font-bold flex items-center gap-1 cursor-pointer disabled:bg-slate-400"
                >
                  <CheckCircle className="w-4 h-4" />
                  {submitting ? "Memproses..." : "Simpan Data"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
