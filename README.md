# Absen QR

Absensi kelas dengan kode yang **berputar tiap 30 detik**. Kode yang difoto lalu
dikirim ke teman sudah kedaluwarsa sebelum sempat dipakai.

Demo: buka halaman, pilih tab **Dosen** untuk melihat kode, lalu tab
**Mahasiswa** untuk mengisinya.

## Cara kerja

1. Saat pertama dibuka, halaman membuat **kunci sesi acak 128-bit** dan
   menyimpannya di `localStorage`.
2. Kode 6 karakter diturunkan dari kunci itu dengan **HMAC-SHA256**, dengan
   nomor jendela waktu sebagai pesan:
   `kode = base32(HMAC(kunci, "w:" + floor(now / 30000)))`.
3. Kode berganti otomatis setiap 30 detik. Jendela **sebelumnya** masih
   diterima, supaya yang memindai di detik terakhir tidak langsung gagal.
4. Nama ganda di jendela yang sama ditolak.

Alfabet kode memakai Crockford base32 (`0-9`, `A-Z` tanpa `I`, `L`, `O`, `U`)
agar tidak salah baca saat diketik manual.

## Struktur berkas

| Berkas | Isi |
|---|---|
| `index.html` | dua panel: dosen dan mahasiswa |
| `tokens.css` | token warna, ukuran huruf, jarak, easing |
| `styles.css` | tata letak dan komponen |
| `app.js` | pembuatan kode, validasi, daftar hadir |

Tanpa build step, tanpa dependensi kecuali satu pustaka QR dari CDN
(`qrcode-generator`). Kalau CDN gagal dimuat, kode teks tetap tampil dan
halaman memberi tahu bahwa QR tidak tersedia.

## Batasan

Ini demo **tanpa server**. Kunci sesi ada di perangkat yang sama, jadi secara
teknis kode bisa dihitung sendiri oleh siapa pun yang membuka DevTools.

Untuk dipakai sungguhan, kode harus diverifikasi di server:

- kunci sesi disimpan di server, bukan di browser;
- mahasiswa mengirim kode, server yang membandingkan;
- satu mahasiswa hanya boleh tercatat sekali per sesi;
- kode sebaiknya ditandatangani dengan waktu server, bukan waktu perangkat.

## Menjalankan lokal

```bash
python3 -m http.server 8000
# buka http://localhost:8000
```

## Lisensi

MIT.
