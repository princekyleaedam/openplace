# Openplace — Installationsanweisungen unter Windows

Diese Anweisungen helfen Ihnen, ein **Windows**-Gerät für die Ausführung von **openplace** vorzubereiten.

---

## 1. Installationsvoraussetzungen

Es werden **Node.js**, **Git**, **MariaDB** und **Caddy** benötigt.

- Installation durch **winget** (Windows 10/11 PowerShell als Administrator):

```powershell
winget install Git.Git
winget install OpenJS.NodeJS.LTS
winget install CaddyServer.Caddy
winget install nssm
```

- Installation durch **Chocolatey** (cmd als Administrator):

```cmd
choco install git nodejs-lts caddy nssm -y
```

- MariaDB-Server durch diesen Link herunterladen: [MariaDB Server](https://mirror.mva-n.net/mariadb///mariadb-12.0.2/winx64-packages/mariadb-12.0.2-winx64.msi)
- Das Installationsprogramm starten
- Ein Root-Passwort setzen und alles voreingestellt lassen
  
---

## 2. Die Repository klonen

```powershell
git clone --recurse-submodules https://github.com/openplaceteam/openplace
cd openplace
```

---

## 3. Die Node-Abhängigkeiten installieren

```powershell
npm install
npm install -g pm2
```

---

## 4. Die Caddy Dienste stoppen (benötigt falls als Dienst installiert)

- Fals Caddy als Dienst installiert wurde, via **Services.msc** stoppen  
- Oder manuell:

```powershell
net stop caddy
```

---

## 5. Die Datenbank konfigurieren und erstellen

1. `.env.example` nach `.env` kopieren:

```powershell
Copy-Item .env.example .env
```

`.env` bearbeiten und `root:password` mit dem MariaDB Root-Passwort ersetzen und das `JWT_SECRET` ändern.

> [ACHTUNG ⚠️]
> Sonderzeichen aus dieser Tabelle Escapen: [Percent-Encoding](https://developer.mozilla.org/en-US/docs/Glossary/Percent-encoding)

---

## 6. Prisma und die Datenbank aufsetzen

```powershell
npm run db:generate
npm run setup
```

---

## 7.A Jeden server allein starten

Frontend einem Terminal laufen lassen: 
```powershell
npm run dev
```
Caddy in einem zweiten Terminal laufen lassen:
```powershell
caddy run --config .\Caddyfile
```

---

## 7.B Beides durch ein Terminal laufen lassen

```cmd
npm run exec
```

## 7.C Caddy im Hintergrund laufen lassen und Node im vordergrund

```
pm2 start ecosystem.config.cjs
pm2 save
```


---

## Den Server starten

- In der Produktion, konfigurieren Sie ein SSL-Zertifikat.  
- Für lokalen/privaten Zweck, hier navigieren:

```
https://{your-local-IP}:8080
```

> [ACHTUNG ⚠️]
> ⚠️ **WICHTIG:** Openplace funktioniert nur über HTTPS. Beim Versuch, sich mit HTTP zu verbinden, kommt es zu einem **HTTP 400 Bad Request** Fehler.


---

## Die Datenbank aktualisieren
Falls sich das Schema ändert, folgendes ausführen:

```powershell
npm run db:push
```
