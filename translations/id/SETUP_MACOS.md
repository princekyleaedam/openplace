# Memulai dengan OpenPlace (macOS)

Panduan ini akan membantu Anda menyiapkan **macOS** untuk menjalankan **OpenPlace**.

---

## Langkah 1: Instal Persyaratan
Pastikan Anda telah menginstal hal-hal berikut pada sistem Anda:
- **Homebrew**
- **Node.js**
- **Git**

---

## Langkah 2: Clone Repositorynya
```bash
git clone --recurse-submodules https://github.com/openplaceteam/openplace
cd openplace
```

---

## Langkah 3: Instal dependensinya
```bash
npm i && brew install mariadb caddy nss
```
Jika brew tidak secara otomatis memulai layanan, jalankan:
```bash
brew services start mariadb
brew services start caddy
```

---

## Langkah 4: Atur dan bangun Databasenya

Jalankan skrip instalasi aman untuk MySQL:
```bash
sudo mysql_secure_installation
```

Ikuti petunjuk berikut:
1. Tekan **Enter** untuk memasukkan kata sandi root saat ini.
2. Masukkan **`n`** saat diminta untuk beralih ke otentikasi unix_socket.
3. Masukkan **`y`** saat diminta untuk mengubah kata sandi root Anda.  
   ⚠️ Jangan gunakan "password" seperti yang ditampilkan dalam demo ini.
4. Masukkan **`y`** untuk menghapus pengguna anonim.  
5. Pilih apakah akan melarang login root jarak jauh (**disarankan: y**).  
6. Masukkan **`y`** untuk menghapus basis data uji.  
7. Masukkan **`y`** untuk memuat ulang konfigurasi.

Selanjutnya, Konfigurasikan lingkungannya:
```bash
cp .env.example .env
```
Update file `.env` dengan password MySQL yang sudah diatur sebelumnya.

---

## Langkah 5: Atur Databasenya

Jalankan perintah Prisma berikut ini:
```bash
npm run db:generate
npm run setup
```

---

## Langkah 6: Jalankan Aplikasinya

Mulai server dev:
```bash
npm run dev
```

Di terminal lain, jalankan Caddy:
```bash
caddy run --config Caddyfile
```

---

## Catatan untuk SSL
OpenPlace **membutuhkan HTTPS**.  
Jika Anda melakukan pengujian secara lokal, Anda dapat mengakses aplikasinya di:
```
https://{IP}:8080
```
⚠️ Mencobanya dengan menggunakan HTTP justru akan membuat error HTTP 400..

---

## Memperbarui Database
Jika skema database berubah, perbarui dengan:
```bash
npm run db:push
```
