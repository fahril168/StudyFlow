# StudyFlow - Sistem Informasi Manajemen Tugas & Jadwal Mahasiswa

StudyFlow adalah aplikasi perencana tugas dan jadwal akademik mahasiswa yang menggabungkan elemen terbaik dari **Google Classroom**, **Trello** (Kanban Board), **Google Calendar** (Kalender Akademik), dan **Todoist** (Task List).

Aplikasi ini didesain menggunakan **Vanilla HTML, CSS, dan JavaScript (ESM)** dengan tampilan antarmuka yang sangat premium, interaktif, responsif, serta dilengkapi dengan fitur *Dark & Light Mode*.

---

## 🚀 Cara Menjalankan Project

Project ini berjalan menggunakan server lokal berbasis Node.js yang sangat ringan tanpa memerlukan dependensi eksternal apa pun (zero dependencies).

1. Pastikan Anda memiliki **Node.js** terinstal di komputer Anda.
2. Buka terminal (Command Prompt atau PowerShell) pada direktori project ini:
   ```bash
   C:\Users\User\.gemini\antigravity\scratch\studyflow
   ```
3. Jalankan perintah berikut untuk mengaktifkan server:
   ```bash
   npm run dev
   ```
4. Buka browser Anda dan akses alamat:
   ```
   http://localhost:3000
   ```

---

## 🔑 Akun Demo untuk Uji Coba

Gunakan kredensial berikut untuk menguji coba dua peran yang berbeda:

*   **Role Mahasiswa (Student):**
    *   Email: `student@studyflow.id`
    *   Password: `student123`
*   **Role Administrator (Admin):**
    *   Email: `admin@studyflow.id`
    *   Password: `admin123`

---

## 🌟 Fitur Utama (12 Fitur)

1.  **Login & Register:** Sistem autentikasi untuk Mahasiswa dan Admin.
2.  **Dashboard Mahasiswa:** Widget ringkasan tugas aktif, terlambat, deadline hari ini, pengumuman dari Admin, serta diagram progres tugas mingguan (SVG circular progress).
3.  **Manajemen Tugas (CRUD):** Tambah, edit, detail, dan hapus tugas kuliah secara dinamis.
4.  **Kategori Mata Kuliah:** Pengelompokan tugas berdasarkan mata kuliah (AI, Basis Data, RPL, dll.) lengkap dengan pembuat kategori baru dan kustomisasi warna tag kategori.
5.  **Kalender Akademik:** Penampil tenggat waktu tugas dalam bentuk kalender bulanan interaktif. Klik tanggal untuk melihat daftar deadline di tanggal tersebut.
6.  **Reminder Deadline:** Notifikasi sistem (badge merah & lonceng) yang melacak dan mengingatkan tugas yang mendekati tenggat waktu (< 24/48 jam) atau tugas yang sudah terlambat.
7.  **Progress Tugas (Kanban Board):** Manajemen progres tugas dengan papan Kanban (Belum dikerjakan, Proses, Selesai) yang mendukung *Drag-and-Drop* langsung menggunakan mouse.
8.  **Simulasi Upload Berkas:** Pelampir berkas tugas (PDF/DOCX/PPTX) lengkap dengan validasi duplikasi berkas dan progress bar.
9.  **Skala Prioritas:** Klasifikasi urgensi tugas (Rendah - Hijau, Sedang - Kuning, Tinggi - Merah) untuk membantu manajemen waktu belajar.
10. **Dark & Light Mode:** Transisi mode gelap/terang yang halus, menyesuaikan preferensi sistem secara otomatis dan tersimpan di `localStorage`.
11. **Statistik Produktivitas:** Visualisasi visual data menggunakan **Chart.js** (diagram donat status tugas, diagram batang jumlah tugas per mata kuliah, dan pemberian kelas produktivitas).
12. **Profil Pengguna:** Edit informasi diri (NIM/NIP, Prodi, Nama, Email) serta editor avatar profil yang dilengkapi grid koleksi avatar unik (presets).

---

## 📂 Struktur Folder Project

```
studyflow/
├── index.html            # Entrypoint utama SPA & Router Shell
├── package.json          # Script penjalan Node.js server
├── server.js             # File server lokal zero-dependency
├── README.md             # Petunjuk pengoperasian project
└── src/
    ├── css/              # Kumpulan stylesheet
    │   ├── variables.css # Token desain warna & tema
    │   ├── main.css      # Layout dasar, header, sidebar, modal, & toast
    │   ├── auth.css      # Halaman login & daftar
    │   ├── dashboard.css # Desain widgets & progress bar
    │   ├── tasks.css     # Desain papan Kanban, search, & file upload
    │   ├── calendar.css  # Desain kalender & popover detail
    │   ├── stats.css     # Desain widget statistik
    │   └── profile.css   # Desain halaman profil & koleksi avatar
    └── js/               # Logic aplikasi
        ├── app.js        # Bootstrapper utama, router, modal & toast helper
        ├── state.js      # Central State, CRUD, & LocalStorage sync
        ├── components/
        │   └── auth.js   # Kontrol form login/register & validasi peran
        └── views/
            ├── dashboard.js # Kontrol render ringkasan widget (student/admin)
            ├── tasks.js     # Kontrol board Kanban drag-and-drop & form CRUD
            ├── calendar.js  # Kontrol komputasi kalender akademik bulanan
            ├── stats.js     # Kontrol inisialisasi visual diagram Chart.js
            └── profile.js   # Kontrol perubahan data profil & pilihan avatar
```
