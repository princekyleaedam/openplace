# OpenPlace — Panduan Pengaturan Docker

Panduan ini akan membantu Anda menjalankan **openplace** dengan Docker..

## Persyaratan

Anda memerlukan **Docker** dan **Docker Compose** yang terinstal di sistem Anda..

### Instal Docker

-   **Windows**: Download Docker Desktop dari [docker.com](https://www.docker.com/products/docker-desktop/)
-   **macOS**: Download Docker Desktop dari [docker.com](https://www.docker.com/products/docker-desktop/)
-   **Linux**: Ikuti panduan instalasi untuk distro Anda di [docs.docker.com](https://docs.docker.com/engine/install/)

## 1. Clone repositorynya

```bash
git clone --recurse-submodules https://github.com/openplaceteam/openplace
cd openplace
```

## 2. Mengatur environmentnya

1. Salin `.env.example` ke `.env`:

```bash
cp .env.example .env
```

2. Edit file `.env` nya dan atur pengaturan Anda:
    - Atur `JWT_SECRET` mu (Membuat string acak yang aman)
    - Atur `DATABASE_URL` ke `"mysql://root:password@db/openplace"`
    - Root password MariaDB diatur ke `password` (ubah jika diperlukan)

> [PERINGATAN ⚠️]
> Mengganti karakter khusus yang tercantum dalam tabel ini: [Percent-Encoding](https://developer.mozilla.org/en-US/docs/Glossary/Percent-encoding)

## 3. Jalankan aplikasinya

Jalankan seluruh stack dengan Docker Compose:

```bash
docker-compose up -d
```

Ini akan memulai:

-   **Database MariaDB** di port 3306
-   **Aplikasi Node.js** (backend)
-   **Caddy reverse proxy** di port 443

## 4. Akses aplikasinya

Setelah semua servis berjalan, kamu bisa akses OpenPlace di:

```
http://localhost
https://localhost
```
