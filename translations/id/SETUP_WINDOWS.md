# OpenPlace — Panduan Pengaturan Windows

Panduan ini akan membantu Anda menyiapkan **Windows** untuk menjalankan **openplace**.

---

## 1. Prasyarat Instal

Anda butuh **Node.js**, **Git**, **MariaDB**, **Caddy**.

- Memakai **winget** (Windows 10/11 PowerShell sebagai Administrator):

```powershell
winget install Git.Git
winget install OpenJS.NodeJS.LTS
winget install CaddyServer.Caddy
winget install nssm
```

- Memakai **Chocolatey** (cmd sebagai Administrator):

```cmd
choco install git nodejs-lts caddy nssm -y
```

- Download MariaDB Server via link ini: [MariaDB Server](https://mirror.mva-n.net/mariadb///mariadb-12.0.2/winx64-packages/mariadb-12.0.2-winx64.msi)
- Jalankan Installernya
- Atur root password dan biarkan semua pengaturan tetap default
  
---

## 2. Clone repositorynya

```powershell
git clone --recurse-submodules https://github.com/openplaceteam/openplace
cd openplace
```

---

## 3. Install dependensi Node

```powershell
npm install
npm install -g pm2
```

---

## 4. Stop servis Caddy (Diperlukan jika diinstal sebagai layanan)

- Jika Caddy sudah terinstal sebagai servis, stop via **Services.msc**  
- Atau secara manual:

```powershell
net stop caddy
```

---

## 5. Konfigurasikan dan bangun database

1. Copy `.env.example` ke `.env`:

```powershell
Copy-Item .env.example .env
```

Edit `.env` dan timpa `root:password` dengan root password MariaDB mu dan ubah `JWT_SECRET`nya.

> [PEEINGATAN ⚠️]
> Mengganti karakter khusus yang tercantum dalam tabel ini: [Percent-Encoding](https://developer.mozilla.org/en-US/docs/Glossary/Percent-encoding)

---

## 6. Setup Prisma dan database

```powershell
npm run db:generate
npm run setup
```

---

## 7.A Jalankan setiap server secara terpisah.

jalankan frontend dalam satu terminal: 
```powershell
npm run dev
```
jalankan caddy dalam terminal kedua:
```powershell
caddy run --config .\Caddyfile
```

---

## 7.B Jalankan keduanya dalam satu terminal

```cmd
npm run exec
```

## 7.C Jalankan Caddy di latar belakang dan node di latar depan

```
pm2 start ecosystem.config.cjs
pm2 save
```


---

## Mengaktifkan server Anda

- Untuk production, konfigurasikan sertifikat SSL.
- Untuk penggunaan lokal/pribadi, navigasikan ke:

```
https://{your-local-IP}:8080
```

> [PERINGATAN ⚠️]
> ⚠️ **Penting:** OpenPlace hanya berfungsi melalui HTTPS. Jika Anda mencoba menggunakan HTTP, Anda akan mendapatkan **400 Bad Request**.


---

## Memperbarui database Anda

Jika skema berubah, jalankan:

```powershell
npm run db:push
```
