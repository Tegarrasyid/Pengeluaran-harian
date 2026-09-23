# Pengeluaran Harian — Netlify + Supabase

Website pengeluaran harian tanpa backend/server sendiri.

## 1. Buat project Supabase
Buat project baru di Supabase. Setelah project jadi, buka SQL Editor dan jalankan seluruh isi `schema.sql`.

## 2. Ambil URL dan Anon Key
Buka pengaturan API project Supabase. Ambil:
- Project URL
- Publishable/anon key

Masukkan ke bagian paling atas `app.js`:

```js
const SUPABASE_URL = "https://PROJECT.supabase.co";
const SUPABASE_ANON_KEY = "KEY_MILIK_PROJECT";
```

Jangan masukkan service_role key ke frontend.

## 3. Konfigurasi email
Untuk percobaan, gunakan email/password sesuai konfigurasi Authentication Supabase.
Jika verifikasi email aktif, setelah daftar pengguna harus melakukan verifikasi email.

## 4. Tes lokal
Bisa dibuka dengan Live Server di VS Code. Jangan pakai `file://` jika browser bermasalah dengan module/API.

## 5. Deploy ke Netlify
Upload folder ini ke Netlify atau hubungkan repository GitHub.
Karena ini website statis, tidak membutuhkan PHP/Laravel/XAMPP.

## Fitur
- Login/daftar
- Tambah pengeluaran
- Edit
- Hapus
- Rekap Senin–Minggu
- Navigasi minggu sebelumnya/berikutnya
- Total hari ini
- Total mingguan
- Jumlah transaksi
- Export CSV
- Export Excel
- Export PDF
- Data tersimpan di Supabase dan bisa diakses dari perangkat lain dengan akun yang sama
- RLS: setiap akun hanya bisa membaca/mengubah datanya sendiri
