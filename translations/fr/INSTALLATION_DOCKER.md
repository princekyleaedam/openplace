
# OpenPlace — Guide d’installation avec Docker

Ce guide vous aidera à exécuter **openplace** avec Docker.

## Prérequis

Vous devez avoir **Docker** et **Docker Compose** installés sur votre système.

### Installer Docker

-   **Windows** : Téléchargez Docker Desktop depuis [docker.com](https://www.docker.com/products/docker-desktop/)
-   **macOS** : Téléchargez Docker Desktop depuis [docker.com](https://www.docker.com/products/docker-desktop/)
-   **Linux** : Suivez le guide d’installation correspondant à votre distribution sur [docs.docker.com](https://docs.docker.com/engine/install/)

## 1. Cloner le dépôt

```bash
git clone --recurse-submodules https://github.com/openplaceteam/openplace
cd openplace
````

## 2. Configurer l’environnement

1. Copiez le fichier `.env.example` vers `.env` :

```bash
cp .env.example .env
```

2. Modifiez le fichier `.env` et configurez vos paramètres :

   * Définissez votre `JWT_SECRET` (générez une chaîne aléatoire sécurisée)
   * Définissez votre `DATABASE_URL` sur `"mysql://root:password@db/openplace"`
   * Le mot de passe root de MariaDB est défini sur `password` (modifiez-le si nécessaire)

> [AVERTISSEMENT ⚠️]
> Échappez les caractères spéciaux listés dans ce tableau : [Encodage pourcentuel](https://developer.mozilla.org/en-US/docs/Glossary/Percent-encoding)

## 3. Démarrer l’application

Lancez l’ensemble de la pile avec Docker Compose :

```bash
docker-compose up -d
```

Cela démarrera :

* **Base de données MariaDB** sur le port 3306
* **Application Node.js** (backend)
* **Proxy inverse Caddy** sur le port 443

## 4. Accéder à l’application

Une fois tous les services en cours d’exécution, vous pouvez accéder à OpenPlace à l’adresse :

```
http://localhost
https://localhost
```

