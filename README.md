<div align="center">

# Absen QR

**Absensi kelas dengan kode yang berputar tiap 30 detik — kode yang difoto sudah kedaluwarsa.**

[![Demo](https://img.shields.io/badge/demo-live-b45309?style=flat-square)](https://atmajadesna.github.io/absen-qr/)
![Tanpa build step](https://img.shields.io/badge/build-tanpa%20build%20step-2f6f4f?style=flat-square)
![Lisensi MIT](https://img.shields.io/badge/lisensi-MIT-1f4e79?style=flat-square)

<a href="https://atmajadesna.github.io/absen-qr/"><img src="docs/screenshot.jpg" alt="Tangkapan layar Absen QR" width="100%"></a>

</div>

## Masalahnya

Absen pakai kode statis gampang dititipkan: foto kode hari ini, kirim ke teman, besok masih bisa dipakai. Absen pakai QR biasa juga sama — gambarnya bisa disimpan.

## Yang menarik di dalamnya

**Kode turunan waktu** — `kode = base32(HMAC-SHA256(kunci, "w:" + floor(now/30000)))`. Tanpa kunci, kode tidak bisa dihitung, jadi tidak bisa ditebak dari jam.
**Jendela 30 detik** — Jendela sebelumnya masih diterima supaya mahasiswa yang telat beberapa detik tidak gagal absen.
**Nama ganda ditolak** — Satu nama hanya bisa absen sekali per sesi.
**Kunci di perangkat** — Kunci 128-bit dan log absensi disimpan di `localStorage`, jadi tidak ada server yang perlu dipercaya.

## Jalanin

Buka `index.html` di browser. Tidak ada build step.

```bash
python3 -m http.server 8000
```

Tidak ada dependency, tidak ada build step. Semua jalan di browser.

## Struktur

```
index.html    tampilan dan struktur halaman
app.js        seluruh logika: data, hitungan, penyimpanan
styles.css    tata letak dan komponen
tokens.css    warna, ukuran teks, dan spasi sebagai variabel
```

## Catatan

Ini demo sisi klien: kode dihitung di browser dosen. Untuk pemakaian nyata, verifikasi harus pindah ke server supaya kuncinya tidak ikut terkirim.

Dibuat dengan JavaScript, Web Crypto, HTML, tanpa framework.
