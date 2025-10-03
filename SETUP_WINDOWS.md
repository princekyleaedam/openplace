# OpenPlace — Windows Setup Guide

This guide will help you prepare a **Windows** machine to run **openplace**.

---

## 1. Install prerequisites

You need **Node.js**, **Git**, **MariaDB**, **Caddy**.

- Using **winget** (Windows 10/11 PowerShell as Administrator):

```powershell
winget install Git.Git
winget install OpenJS.NodeJS.LTS
winget install CaddyServer.Caddy
winget install nssm
```

- Using **Chocolatey** (cmd as Administrator):

```cmd
choco install git nodejs-lts caddy nssm -y
```

- Download MariaDB Server via this link: [MariaDB Server](https://mirror.mva-n.net/mariadb///mariadb-12.0.2/winx64-packages/mariadb-12.0.2-winx64.msi)
- Run the Installer
- Set a root password and keep everything default
  
---

## 2. Clone the repository

```powershell
git clone --recurse-submodules https://github.com/openplaceteam/openplace
cd openplace
```

---

## 3. Install Node dependencies

```powershell
npm install
npm install -g pm2
```

---

## 4 Stop Caddy services (required if installed as service)

- If Caddy was installed as services, stop it via **Services.msc**  
- Or manually:

```powershell
net stop caddy
```

---

## 5. Configure and build the database

1. Copy `.env.example` to `.env`:

```powershell
Copy-Item .env.example .env
```

Edit `.env` and replace `root:password` with your MariaDB root password and change the `JWT_SECRET`.

> [!WARNING]
> Escape special character listed in this table: [Percent-Encoding](https://developer.mozilla.org/en-US/docs/Glossary/Percent-encoding)

---

## 6. Setup Prisma and database

```powershell
npx prisma migrate deploy
npx prisma generate
npx prisma db push
```

---

## 7.A Run each server on its own

run frontend in one terminal: 
```powershell
npm run dev
```
run caddy in a second terminal:
```powershell
caddy run --config .\Caddyfile
```

---

## 7.B Run both with one terminal

```cmd
npm run exec
```

## 7.C Run Caddy in background and node in forground

```
pm2 start ecosystem.config.cjs
pm2 save
```


---

## Spinning up your server

- For production, configure an SSL certificate.  
- For local/private use, navigate to:

```
https://{your-local-IP}:8080
```

> [!WARNING]
> ⚠️ **Important:** OpenPlace only works over HTTPS. If you try HTTP, you’ll get **400 Bad Request**.


---

## Updating your database

If the schema changes, run:

```powershell
npm run db:push
```

---
