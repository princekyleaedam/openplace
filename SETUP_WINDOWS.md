# OpenPlace — Windows Setup Guide

This guide will help you prepare a **Windows** machine to run **openplace**.

---

## 1. Install prerequisites

You need **Node.js**, **Git**, **MariaDB**, **Caddy**.

- Using **winget** (Windows 10/11 PowerShell as Administrator):

```powershell
winget install Git.Git
winget install OpenJS.NodeJS.LTS
winget install MariaDB.Server
winget install CaddyServer.Caddy
```

- Using **Chocolatey** (cmd as Administrator):

```cmd
choco install git nodejs-lts mariadb caddy -y
```

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

Edit `.env` and replace `root:password` with your MariaDB root password.

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

## 7. Run the development server

```powershell
npm run dev
```

---

## 8. Run Caddy

If not already running, start Caddy in another terminal:

```powershell
caddy run --config .\Caddyfile
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
