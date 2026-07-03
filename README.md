# Matrik Perhitungan Nilai Pemeriksaan Pelaku Usaha Bidang Kelautan Biak 2026

Aplikasi Web Full-Stack profesional untuk **Stasiun PSDKP Biak Tahun Anggaran 2026**. Aplikasi ini digunakan untuk melakukan digitalisasi proses pengawasan, perhitungan skor ketaatan pelaku usaha secara otomatis berbasis kriteria matrik formal, manajemen tindak lanjut temuan, repository link Google Drive berkas perizinan, dan ekspor laporan kerja.

Sistem mendukung **Dual-Channel Persistence mode**: dapat dijalankan secara instan menggunakan penyimpanan lokal JSON pada server (Local Persistence mode) atau dihubungkan secara penuh ke **Google Sheets** menggunakan Google Apps Script REST API sebagai database awan Anda.

---

## 1. Struktur Folder Lengkap Project

### **Struktur Aplikasi**
```text
├── /data
│   └── db.json                 # Core database lokal (Seeded)
├── /src
│   ├── /components
│   │   ├── ConfigSettings.tsx  # Pengaturan API & Google Sheets
│   │   ├── DashboardCharts.tsx # Visualisasi Chart SVG kustom (Responsive)
│   │   ├── DokumenList.tsx     # Pengesahan link berkas Google Drive
│   │   ├── KPICards.tsx        # Widget metrik/KPI ringkasan
│   │   ├── LaporanFilter.tsx   # Filter ekspor CSV/Excel & printable view
│   │   ├── Navbar.tsx          # Panel navigasi atas & sinkronisasi status
│   │   ├── PemeriksaanForm.tsx # Formulir checklist & scoring otomatis
│   │   ├── PemeriksaanList.tsx # Tabel ledger audit pemeriksaan
│   │   ├── Sidebar.tsx         # Menu samping dengan otorisasi berbasis Role
│   │   ├── TemuanForm.tsx      # Pendaftaran uraian temuan baru
│   │   ├── TemuanList.tsx      # Ledger monitor status tindak lanjut temuan
│   │   └── UserManagement.tsx  # Manajemen hak akses kru (Admin)
│   ├── /lib
│   │   └── api.ts              # API client penghubung ke REST API Express/Vite
│   ├── App.tsx                 # Core layout, state, & login gateway
│   ├── index.css               # Desain Tailwind & Google Fonts
│   ├── main.tsx                # Entry point React
│   └── types.ts                # Model TypeScript (Users, Pemeriksaan, dsb.)
├── .env.example                # Blueprint variabel lingkungan
├── AppsScript_Code.gs          # Kode lengkap Google Apps Script Web App
├── package.json                # Dependensi NPM & skrip build
├── tsconfig.json               # Konfigurasi TypeScript compiler
├── vercel.json                 # Konfigurasi Vercel Web Deployment
└── vite.config.ts              # Konfigurasi bundler Vite
```

---

## 2. Kriteria Perhitungan Nilai Otomatis & Predikat

Checklist kriteria scoring berjalan secara otomatis ketika operator mengisi formulir pemeriksaan di sistem:

### **A. Persiapan (Bobot Maks: 40)**
1. **Surat Pemberitahuan** (Rutin) / Laporan Aduan / Nota Dinas = **20 Poin**
2. **Surat Tugas Pengawasan** resmi = **20 Poin**

### **B. Pelaksanaan (Bobot Maks: 40)**
1. **Dokumen Hasil Pengawasan** (DHP/BAP) = **20 Poin**
2. **Bebas Catatan Perbaikan** dari Verifikator Direktorat = **20 Poin**

### **C. Pelaporan (Bobot Maks: 20)**
1. **Laporan Lengkap** terlampir dokumentasi & salinan perizinan = **20 Poin**

### **D. Rumus Total Skor & Predikat**
$$\text{Skor Akhir} = \text{Persiapan} + \text{Pelaksanaan} + \text{Pelaporan}$$

* **90 - 100**: 🟢 **Sangat Baik**
* **80 - 89**: 🔵 **Baik**
* **70 - 79**: 🟡 **Cukup**
* **< 70**: 🔴 **Perlu Perbaikan**

---

## 3. Cara Membuat Database Google Sheets

Buat satu spreadsheet Google Sheets baru, dan buat **5 (Lima) buah Tab Sheet** dengan nama tab dan nama kolom (baris pertama) persis seperti di bawah ini:

### **Tab 1: `Users`**
Kolom (Header baris pertama):
`id` | `nama` | `username` | `password` | `role` | `status`

### **Tab 2: `Pemeriksaan`**
Kolom (Header baris pertama):
`id` | `tanggal` | `nomor_spt` | `satwas` | `pelaku_usaha` | `perusahaan` | `jenis_usaha` | `alamat` | `status_ketaatan` | `persiapan_spt` | `persiapan_st` | `pelaksanaan_dhp` | `pelaksanaan_no_revisi` | `pelaporan_lengkap` | `nilai_persiapan` | `nilai_pelaksanaan` | `nilai_pelaporan` | `nilai_total` | `predikat` | `temuan` | `rekomendasi` | `created_at`

### **Tab 3: `Dokumen`**
Kolom (Header baris pertama):
`id` | `pemeriksaan_id` | `jenis_dokumen` | `link_file` | `status`

### **Tab 4: `Temuan`**
Kolom (Header baris pertama):
`id` | `pemeriksaan_id` | `uraian_temuan` | `status_tindak_lanjut` | `tanggal_update`

### **Tab 5: `MasterSatwas`**
Kolom (Header baris pertama):
`id` | `nama_satwas` | `wilayah`

*Catatan: Pastikan nama tab persis (case-sensitive) agar Google Apps Script tidak melempar error.*

---

## 4. Cara Deploy Google Apps Script Web App

1. Buka spreadsheet Google Sheet yang baru saja Anda buat.
2. Klik menu di atas: **Extensions** > **Apps Script**.
3. Hapus seluruh kode bawaan di file `Code.gs`.
4. Buka file `/AppsScript_Code.gs` yang ada di dalam berkas project aplikasi ini, salin seluruh kodenya, lalu tempelkan ke editor Google Apps Script tersebut.
5. Klik ikon **Save** (disket).
6. Di sudut kanan atas editor Google Script, klik **Deploy** > **New Deployment**.
7. Klik ikon gir (Configuration), pilih **Web App**.
8. Isi konfigurasi deployment:
   * **Description**: *Matrik SDKP Biak REST API v1*
   * **Execute as**: *Me (alamat email Google Sheets Anda)*
   * **Who has access**: *Anyone* (Penting agar web aplikasi luar dapat memanggil API proxy).
9. Klik **Deploy**. Anda akan dimintai otorisasi untuk mendelegasikan izin baca/tulis Google Sheets ke script Anda, klik *Allow*.
10. Salin **Web App URL** yang dihasilkan. Linknya akan berbentuk seperti ini:
    `https://script.google.com/macros/s/AKfycbwtUoEQpSKXPduIeJO0lusxb_N5Gexq5u5EsORlDy2KMHOWkhGrNfUuW5YaQQuvzmNndg/exec`

---

## 5. Konfigurasi Environment Variable (`.env`)

Konfigurasikan variabel lingkungan berikut jika Anda men-deploy sistem secara manual. Jika mendeploy di platform interaktif luar, sediakan kunci rahasia ini:

```env
# URL target hosted dari deployment apps script Web App
GAS_WEB_APP_URL="https://script.google.com/macros/s/AKfycbwtUoEQpSKXPduIeJO0lusxb_N5Gexq5u5EsORlDy2KMHOWkhGrNfUuW5YaQQuvzmNndg/exec"

# Pilihan: 'local' (menggunakan data/db.json) atau 'sheet' (sync otomatis ke Google Sheet)
DATA_PERSISTENCE_MODE="local"
```

*Keistimewaan Aplikasi: Administrator dapat mengubah URL Google Script dan mengalihkan mode penyimpanan dari "Local" ke "Sheet" secara visual langsung dari dalam halaman **"Pengaturan API"** aplikasi tanpa perlu menyentuh kode program atau merestart server.*

---

## 6. Cara Deploy Frontend & Backend ke Vercel

Aplikasi ini dapat dideploy secara aman dan gratis di Vercel dalam hitungan menit:

1. Buat akun di [Vercel](https://vercel.com).
2. Hubungkan akun GitHub Anda yang menampung file project ini.
3. Klik **Add New** > **Project** di dashboard Vercel, lalu pilih repository project ini.
4. Pada bagian **Framework Preset**, pilih **Vite** (atau diabaikan karena auto-detected).
5. Pada bagian **Environment Variables**, masukkan:
   * `GAS_WEB_APP_URL` = https://script.google.com/macros/s/AKfycbwtUoEQpSKXPduIeJO0lusxb_N5Gexq5u5EsORlDy2KMHOWkhGrNfUuW5YaQQuvzmNndg/exec.
   * `DATA_PERSISTENCE_MODE` = `sheet`
6. Klik **Deploy**.
7. Selesai! Web App profesional Stasiun SDK Biak 2026 Anda sudah online dan siap pakai.

---

## 7. Sistem Keamanan & Otorisasi Hak Akses (Authentication & Security)

Aplikasi dilengkapi dengan otentikasi sesi login yang membagi peranan kru SDK menjadi 4 tingkat fungsional:

### **1. Administrator (Akses Penuh / Full Access)**
* Memiliki akses tak terbatas ke seluruh fitur.
* Mampu menambahkan, mengubah, menonaktifkan akun personil (**User Management**).
* Mengubah koneksi database integrasi Google Sheet secara visual (**Pengaturan API**).
* Melakukan prapembacaan laporan dan menghapus data yang rusak.

### **2. Kepala Stasiun (Pantau & Evaluasi)**
* Hak cipta murni baca-saja (**Read-Only**).
* Diperkenankan melihat **Dashboard Utama** untuk memantau grafik ketaatan.
* Memiliki akses penuh ke **Pusat Laporan** untuk mencetak kompilasi matrik atau mendownload dokumen ekspor Excel.

### **3. Verifikator (Validasi Nilai & Dokumen)**
* Diperkenankan memantau dan meninjau checklist matrik pemeriksaan pelaku usaha.
* Melakukan review berkas legalitas dan melakukan otorisasi status dokumen: **Setuju (Verifikasi)** atau **Tolak (Ditolak)** terhadap link drive yang diunggah.
* Dapat memberikan komentar catatan perbaikan pada matriks audit.

### **4. Satwas (Petugas Lapangan / Input Data)**
* Berwenang melakukan penginputan matriks pengawasan pemeriksaan baru (**Create Pemeriksaan**).
* Berwenang mengunggah link tautan Google Drive BAP/Hasil Pengawasan pelaku usaha.
* Berwenang merilis uraian temuan baru (**Pencatatan Temuan Lapangan**) dan meng-update jalannya status tindak lanjut.
