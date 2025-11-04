# openplace  

<p align="center"><strong>Translations</strong> v4.1</p>
<p align="center">
    <a href="../../README.md"><img src="https://flagcdn.com/256x192/us.png" width="48" alt="United States Flag"></a>    
    <a href="../de/LIESMICH.md"><img src="https://flagcdn.com/256x192/de.png" width="48" alt="German Flag"></a>
    <a href="../id/README.md"><img src="https://flagcdn.com/256x192/id.png" width="48" alt="Indonesia Flag"></a>
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

## Ajout d'une traduction

> [AVERTISSEMENT ⚠️]
> Les contributions réalisées à l’aide de l’IA seront rejetées, et vous **SEREZ** banni du dépôt. Vous devez maîtriser la langue que vous traduisez.

Pour contribuer à ce dépôt et traduire le `README.md` ainsi que les autres fichiers d’installation, veuillez suivre les étapes ci-dessous.

### Modifier le numéro de version en haut de ce README pour indiquer qu’une nouvelle langue a été ajoutée

Le numéro de version est au format `X.XX`, où le premier « X » représente le nombre de langues officiellement traduites jusqu’à présent. Le second ensemble de « X » après le point est modifié chaque fois qu’un changement est apporté à la version anglaise du README.
Ce numéro de version aide les traducteurs à savoir quand ils doivent mettre à jour leur contenu traduit.

### Créer un nouveau dossier dans le répertoire `translations` portant le code ISO de votre langue

Si vous ne connaissez pas votre code ISO, vous pouvez le vérifier [ici](https://gist.githubusercontent.com/josantonius/b455e315bc7f790d14b136d61d9ae469/raw/416def353b8849c427e9062a9db6445c62e77f75/language-codes.json) ou simplement le rechercher en ligne. Vous cherchez un code à deux lettres, comme `"en"` pour l’anglais.

### Copier les fichiers anglais dans votre nouveau dossier

Copiez les fichiers anglais du dossier `translations` ainsi que le fichier principal `README.md` dans le dossier que vous venez de créer.
Vous devriez maintenant avoir quatre fichiers : `README.md` et trois fichiers d’installation au format markdown (`.md`).

### Ajouter le drapeau de votre pays en haut de chaque README

En haut de **chaque** README (dans toutes les langues), ajoutez une nouvelle ligne affichant le drapeau de la langue que vous traduisez.
Vous devez ajouter un drapeau qui renvoie à vos fichiers traduits. Utilisez le modèle suivant :

```html
<a href="translations/LANGUAGE_ISO_CODE/NAME_OF_YOUR_README.md"><img src="https://flagcdn.com/256x192/LANGUAGE_ISO_CODE.png" width="48" alt="Drapeau de NAME_OF_COUNTRY"></a>
```

Remplacez les éléments entre guillemets par les valeurs correctes correspondant à votre langue.

> [AVERTISSEMENT ⚠️]
> Attention ! Chaque README doit renvoyer directement à tous les autres READMEs.
> Les drapeaux doivent rester dans le même ordre (alphabétique selon leurs codes ISO) sauf pour l’anglais, qui apparaît toujours en premier (par exemple : `en`, `de`, `es`, `fr`).

### Mettre à jour les liens dans la section Démarrage

Dans la section **Démarrage**, mettez à jour les liens afin qu’ils pointent vers vos fichiers traduits.
Si vous ne savez pas comment faire, consultez un autre dossier de langue (par exemple, `fr`).

### Traduire tous les fichiers

Traduisez tous les fichiers complètement et avec précision.
Une fois terminé, créez une pull request. Un contributeur ou un utilisateur vérifiera votre travail.
**N’oubliez pas :** l’utilisation de l’IA est strictement interdite et entraînera un bannissement permanent si elle est détectée.

### Vérifier votre travail

Cliquez sur **TOUS** les liens et drapeaux. Chacun doit fonctionner correctement et mener au fichier ou au site approprié.
Si quelque chose ne fonctionne pas, corrigez-le avant de soumettre votre pull request.
Une fois que tout fonctionne comme prévu, vous pouvez soumettre votre pull request en toute confiance.
Souvenez-vous : ces directives seront examinées pour toutes les traductions afin d’assurer une conformité totale.


## Licence  
Sous licence **Apache License, version 2.0**. Voir [LICENSE.md](https://github.com/openplaceteam/openplace/blob/main/LICENSE.md).  

### Remerciements  
Les données régionales proviennent du [GeoNames Gazetteer](https://download.geonames.org/export/dump/), sous licence [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/).  
Les données sont fournies « telles quelles », sans garantie ni déclaration concernant leur exactitude, leur actualité ou leur exhaustivité.
