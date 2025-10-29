# Openplace - Installationsanweisungen unter macOS

Diese Anweisungen helfen Ihnen, ein **macOS**-Gerät für die Ausführung von **openplace** vorzubereiten.

---

## Schritt 1: Installationsvoraussetzungen
Folgene Anwendungen werden benötigt:
- **Homebrew**
- **Node.js**
- **Git**

---

## Schritt 2: Die Repository klonen
```bash
git clone --recurse-submodules https://github.com/openplaceteam/openplace
cd openplace
```

---

## Schritt 3: Abhängigkeiten installieren
```bash
npm i && brew install mariadb caddy nss
```
Falls Brew die Dienste nicht automatisch startet, dies ausführen:
```bash
brew services start mariadb
brew services start caddy
```

---

## Schritt 4: Die Datenbank konfigurieren und erstellen

Das `secure_installation` Skript für MySQL ausführen:
```bash
sudo mysql_secure_installation
```

Folgene Fragen beantworten:
1. **Enter** für das jetzige Root-Passwort eingeben.
2. **`n`** eingeben, wenn nach Wechsel zur unix_socket Authentifizierung gefragt wird.
3. **`y`** eingeben, um das Root-Passwort zu ändern.
   ⚠️ **Nicht** "password" wie in der Demo gezeigt verwenden.
4. **`y`** eingeben, um anonyme Nutzer zu entfernen.
5. **`y`** eingeben, falls Remote-Root-Logins deaktiviert werden sollen (**empfohlen: y, sonst n**).
6. **`y`** eingeben, um die Test-Datenbank zu entfernen.
7. **`y`** eingeben, um die Konfiguration neuzuladen.

Anschließend die Umgebung konfigurieren:
```bash
cp .env.example .env
```
Die `.env` Datei mit dem ausgewähltem MySQL-Passwort aktualisieren.

---

## Schritt 5: Datenbank aufsetzen

Folgene Prisma-Befehle ausfüren:
```bash
npm run db:generate
npm run setup
```

---

## Schritt 6: Die Applikation starten

Den Dev-Server ausführen:
```bash
npm run dev
```

In einem anderen Terminal Caddy ausführen:
```bash
caddy run --config Caddyfile
```

---

## SSL
Openplace **braucht HTTPS**.  
If you are testing locally, you can access the app at:
Beim lokalen Testen kann man auf die App hier zugreifen:
```
https://{IP}:8080
```
⚠️ Beim Versuch, sich mit HTTP zu verbinden, kommt es zu einem **HTTP 400 Bad Request** Fehler.

---

## Die Datenbank aktualisieren
Falls sich das Schema ändert, folgendes ausführen:

```powershell
npm run db:push
```
