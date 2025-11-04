# openplace  

<p align="center"><strong>Terjemahan</strong> v4.1</p>
<p align="center">
    <a href="../../README.md"><img src="https://flagcdn.com/256x192/us.png" width="48" alt="United States Flag"></a>    
    <a href="../de/LIESMICH.md"><img src="https://flagcdn.com/256x192/de.png" width="48" alt="German Flag"></a>
    <a href="../fr/LISEZMOI.md"><img src="https://flagcdn.com/256x192/fr.png" width="48" alt="French Flag"></a>
  &nbsp;

## 
Openplace (format huruf kecil) adalah backend sumber terbuka gratis yang tidak resmi untuk [wplace.](https://wplace.live) Kami bertujuan untuk memberikan kebebasan dan fleksibilitas bagi semua pengguna agar dapat menciptakan pengalaman wplace pribadi mereka sendiri, baik untuk diri mereka sendiri, teman-teman mereka, maupun komunitas mereka.

> [PERINGATAN ⚠️]
> Ini adalah proyek yang masih dalam pengembangan. Harap diperhatikan bahwa beberapa fitur masih belum selesai dan mungkin masih terdapat bug. Bantuan kalian sangatlah diperlukan dengan melaporkan masalah yang ditemukan ke #help-n-support di [Discord server](https://discord.gg/ZRC4DnP9Z2) kami atau dengan mengirimkan pull requests. Terima kasih!

## Memulai

### Windows

- [Panduan Instalasi untuk Windows](SETUP_WINDOWS.md)

### macOS

- [Panduan Instalasi untuk macOS](SETUP_MACOS.md)

### Docker

- [Panduan Instalasi untuk Docker](SETUP_DOCKER.md)


### Aksesibilitas server
Anda diharuskan untuk mengonfigurasi sertifikat SSL jika berencana menggunakan ini dalam lingkungan produksi. Namun, jika Anda hanya menggunakan ini bersama teman-teman Anda, Anda dapat langsung mengakses `https://{IP}:8080` CATATAN: openplace hanya dihosting melalui HTTPS. Anda akan mengalami kesalahan HTTP 400 jika mencoba memuat situs web melalui HTTP.

### Memperbarui database Anda
Jika skema database berubah, Anda cukup menjalankan `npm run db:push` untuk memperbarui skema database Anda.

## Lisensi
Dilisensikan di bawah Lisensi Apache, versi 2.0. Lihat [LICENSE.md](https://github.com/openplaceteam/openplace/blob/main/LICENSE.md).

### Ucapan Terima Kasih  
Data wilayah diperoleh dari [GeoNames Gazetteer](https://download.geonames.org/export/dump/), dan dilisensikan di bawah [Creative Commons Attribution 4.0 License](https://creativecommons.org/licenses/by/4.0/). Data disediakan "apa adanya" tanpa jaminan atau representasi mengenai keakuratan, ketepatan waktu, atau kelengkapan.
