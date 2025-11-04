# openplace

<p align="center"><strong>Übersetzungen</strong> v4.1</p>
<p align="center">
    <a href="../../README.md"><img src="https://flagcdn.com/256x192/us.png" width="48" alt="United States Flag"></a>    
    <a href="../fr/LISEZMOI.md"><img src="https://flagcdn.com/256x192/fr.png" width="48" alt="French Flag"></a>
    <a href="../id/README.md"><img src="https://flagcdn.com/256x192/id.png" width="48" alt="Indonesia Flag"></a>

## 

Openplace (kleingeschrieben) ist ein inoffizielles Open-Source-Backend für [wplace.](https://wplace.live) Unser Ziel ist es, jedem Benutzer die Freiheit zu geben, seine eigene private Wplace-Erfahrung für sich selber, seine Freunde oder sogar für seine Gemeinschaft zu machen.

> [ACHTUNG ⚠️]
> Dieses Projekt ist in Entwicklung. Es können unvollständige Funktionen und Fehler auftreten. Bitte unterstützen Sie uns, indem Sie Probleme unter #help-n-support unter unserem [Discord server](https://discord.gg/ZRC4DnP9Z2) melden oder mit Pull-Requests beitragen.

## Erste Schritte

### Windows

- [Installationsanweisungen unter Windows](SETUP_WINDOWS.md)

### macOS

- [Installationsanweisungen unter macOS](SETUP_MACOS.md)

### Docker

- [Installationsanweisungen unter Docker](SETUP_DOCKER.md)


### Serverzugänglichkeit
Um openplace in Produktion zu benutzen, wird ein SSL-Zertifikat benötigt. Wenn man es einfach nur mit seinen Freunden verwenden möchte, kann man einfach auf `https://{IP}:8080` gehen.
However, if you are only using this with you and your friends, you can simply navigate to `https://{IP}:8080` HINWEIS: openplace wird nur über HTTPS gehosted. Der Versuch, die Seite über HTTP zu verwenden scheitert mit einem HTTP 400 Fehler.

### Datenbank aktualisieren
Falls sich das Datenbankschema ändert, muss man einfach `npm run db:push` starten, um das Datenbankschema zu aktualisieren.

## Lizens
Unter der Apache Lizens, version 2.0 lizensiert. Siehe [LICENSE.md](https://github.com/openplaceteam/openplace/blob/main/LICENSE.md).

### Acknowledgements
Die Regiondaten sind von [GeoNames Gazetteer](https://download.geonames.org/export/dump/), und sind unter der [Creative Commons Attribution 4.0 License](https://creativecommons.org/licenses/by/4.0/) Lizensiert. Die Daten werden “so wie sie sind” zur Verfügung gestellt, ohne Gewährleistung für Richtigkeit, Aktualität oder Vollständigkeit.