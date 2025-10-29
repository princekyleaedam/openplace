# openplace  

<p align="center"><strong>Translations</strong></p>
<p align="center">
    <a href="../../README.md"><img src="https://flagcdn.com/256x192/us.png" width="48" alt="United States Flag"></a>
  &nbsp;

## 

Openplace (écrit en minuscules) est un backend libre, non officiel et open source pour [wplace.](https://wplace.live) Notre objectif est d’offrir la liberté et la flexibilité à tous les utilisateurs afin qu’ils puissent créer leur propre expérience wplace privée — pour eux-mêmes, leurs amis ou même leur communauté.  

> [AVERTISSEMENT ⚠️]  
> Ce projet est en cours de développement. Attendez-vous à des fonctionnalités incomplètes et à des bugs. Merci de nous aider en signalant les problèmes dans le canal #tech-support sur notre [serveur Discord](https://discord.gg/ZRC4DnP9Z2) ou en proposant des *pull requests*. Merci !  

## Pour commencer  

### Windows  
- [Guide d’installation pour Windows](INSTALLATION_WINDOWS.md)  

### macOS  
- [Guide d’installation pour macOS](INSTALLATION_MACOS.md)  

### Docker  
- [Guide d’installation pour Docker](INSTALLATION_DOCKER.md)  

### Accessibilité du serveur  
Vous devrez configurer un certificat SSL si vous prévoyez d’utiliser ce service en production. Cependant, si vous ne l’utilisez qu’avec vos amis, vous pouvez simplement accéder à `https://{IP}:8080`.  
**Remarque :** openplace n’est hébergé qu’en HTTPS. Vous obtiendrez une erreur HTTP 400 si vous tentez de charger le site en HTTP.  

### Mise à jour de la base de données  
Si le schéma de la base de données change, il vous suffit d’exécuter `npm run db:push` pour mettre à jour le schéma.  

## Licence  
Sous licence **Apache License, version 2.0**. Voir [LICENSE.md](https://github.com/openplaceteam/openplace/blob/main/LICENSE.md).  

### Remerciements  
Les données régionales proviennent du [GeoNames Gazetteer](https://download.geonames.org/export/dump/), sous licence [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/).  
Les données sont fournies « telles quelles », sans garantie ni déclaration concernant leur exactitude, leur actualité ou leur exhaustivité.
