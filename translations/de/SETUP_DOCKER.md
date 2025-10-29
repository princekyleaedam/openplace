# Openplace — Installationsanweisungen unter Docker

Diese Anweisungen helfen Ihnen, **openplace** über Docker zu laufen.


## Installationsvoraussetzungen

Es werden **Docker** und **Docker Compose** auf dem System benötigt.

### Docker installieren

-   **Windows**: Docker Desktop über [docker.com](https://www.docker.com/products/docker-desktop/) herunterladen
-   **macOS**: Docker Desktop über [docker.com](https://www.docker.com/products/docker-desktop/) herunterladen
-   **Linux**: Die Installationsanweisungen auf [docs.docker.com](https://docs.docker.com/engine/install/) für die eigene Distribution folgen

## 1. Die Respository klonen

```bash
git clone --recurse-submodules https://github.com/openplaceteam/openplace
cd openplace
```

## 2. Die Umgebung konfigurieren

1. `.env.example` nach `.env` kopieren:

```bash
cp .env.example .env
```

2. Die `.env` Datei bearbeiten unde einstellen:
    - `JWT_SECRET` zu einem zufälligen sicheren Text umändern
    - `DATABASE_URL` zu `"mysql://root:password@db/openplace"` setzen
    - Das MariaDB Root-Passwort lautet `password` (ändern falls benötigt)

> [ACHTUNG ⚠️]
> Sonderzeichen aus dieser Tabelle Escapen: [Percent-Encoding](https://developer.mozilla.org/en-US/docs/Glossary/Percent-encoding)

## 3. Die Applikation starten

Alles durch Docker Compose starten:

```bash
docker-compose up -d
```

Dies wird gestartet:

-   Die **MariaDB datenbank** auf Port 3306
-   Die **Node.js applikation** (backend)
-   Den **Caddy reverse proxy** auf Port 443

## 4. Auf die Applikation zugreifen

Wenn alle Dienste laufen, kann openplace über folgene links zugegriffen werden:
```
http://localhost
https://localhost
```
