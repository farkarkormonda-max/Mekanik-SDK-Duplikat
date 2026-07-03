export type UserRole = 'Administrator' | 'Kepala Stasiun' | 'Verifikator' | 'Satwas';

export interface User {
  id: string;
  nama: string;
  username: string;
  password?: string;
  role: UserRole;
  status: 'Aktif' | 'Nonaktif';
}

export interface Pemeriksaan {
  id: string;
  tanggal: string; // YYYY-MM-DD
  nomor_spt: string;
  satwas: string;
  pelaku_usaha: string;
  perusahaan: string;
  jenis_usaha: string;
  alamat: string;
  status_ketaatan: 'TAAT' | 'TIDAK TAAT';
  
  // Checklist boolean states
  persiapan_spt: boolean; // Surat Pemberitahuan / aduan / nota dinas (20 pts)
  persiapan_st: boolean;  // Surat Tugas (20 pts)
  pelaksanaan_dhp: boolean; // Dokumen Hasil Pengawasan (20 pts)
  pelaksanaan_no_revisi: boolean; // Tidak Ada Catatan Perbaikan (20 pts)
  pelaporan_lengkap: boolean; // Laporan Lengkap (20 pts)
  
  // Scoring
  nilai_persiapan: number; // calculated (0, 20, 40)
  nilai_pelaksanaan: number; // calculated (0, 20, 40)
  nilai_pelaporan: number; // calculated (0, 20)
  nilai_total: number; // calculated sum (0-100)
  predikat: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Perlu Perbaikan';
  
  temuan: string; // Deskripsi temuan / catatan
  rekomendasi: string;
  created_at: string;
}

export interface Dokumen {
  id: string;
  pemeriksaan_id: string;
  pemeriksaan_perusahaan?: string; // friendly lookup
  jenis_dokumen: 'Persiapan' | 'Pelaksanaan' | 'Pelaporan';
  link_file: string; // Google Drive Link
  status: 'Verifikasi' | 'Belum Verifikasi' | 'Ditolak';
}

export interface Temuan {
  id: string;
  pemeriksaan_id: string;
  pemeriksaan_perusahaan?: string; // friendly lookup
  rekomendasi?: string; // lookup from pemeriksaan
  uraian_temuan: string;
  status_tindak_lanjut: 'Open' | 'Dalam Proses' | 'Selesai';
  tanggal_update: string;
}

export interface MasterSatwas {
  id: string;
  nama_satwas: string;
  wilayah: string;
}

export interface DashboardStats {
  totalPemeriksaan: number;
  totalTaat: number;
  totalTidakTaat: number;
  rataRataNilai: number;
  nilaiTertinggi: number;
  nilaiTerendah: number;
  chartPemeriksaanBulanan: { bulan: string; jumlah: number }[];
  chartKetaatan: { name: string; value: number }[];
  chartNilaiSatwas: { satwas: string; rataRata: number; jumlah: number }[];
  chartTrendTahunan: { tahun: string; rataRata: number }[];
  paguAnggaran?: number;
  realisasiAnggaran?: number;
  sisaAnggaran?: number;
  persentasePenyerapan?: number;
  targetRealisasi?: number;
  persentasePenyerapanTarget?: number;
  targetQ1?: number;
  targetQ2?: number;
  targetQ3?: number;
  targetQ4?: number;
  realisasiQ1?: number;
  realisasiQ2?: number;
  realisasiQ3?: number;
  realisasiQ4?: number;
}

export interface APIResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface ActivityLog {
  id: string;
  timestamp: string; // ISO date string
  userId: string;
  username: string;
  userRole: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'VERIFY' | 'LOGIN' | 'CONFIG';
  menu: 'Pemeriksaan' | 'Dokumen' | 'Temuan' | 'Users' | 'Konfigurasi' | 'Sistem';
  description: string;
}
