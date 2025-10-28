# OpenPlace — Guide d’installation Windows

Ce guide vous aidera à préparer une machine **Windows** pour exécuter **openplace**.

---

## 1. Installer les prérequis

Vous aurez besoin de **Node.js**, **Git**, **MariaDB**, et **Caddy**.

- Avec **winget** (sous Windows 10/11, PowerShell en tant qu’administrateur) :

```powershell
winget install Git.Git
winget install OpenJS.NodeJS.LTS
winget install CaddyServer.Caddy
winget install nssm
````

* Avec **Chocolatey** (cmd en tant qu’administrateur) :

```cmd
choco install git nodejs-lts caddy nssm -y
```

* Téléchargez le serveur MariaDB via ce lien : [MariaDB Server](https://mirror.mva-n.net/mariadb///mariadb-12.0.2/winx64-packages/mariadb-12.0.2-winx64.msi)
* Exécutez l’installateur
* Définissez un mot de passe root et laissez les autres options par défaut

---

## 2. Cloner le dépôt

```powershell
git clone --recurse-submodules https://github.com/openplaceteam/openplace
cd openplace
```

---

## 3. Installer les dépendances Node

```powershell
npm install
npm install -g pm2
```

---

## 4. Arrêter les services Caddy (si installés comme service)

* Si Caddy a été installé en tant que service, arrêtez-le via **Services.msc**
* Ou manuellement :

```powershell
net stop caddy
```

---

## 5. Configurer et initialiser la base de données

1. Copiez `.env.example` vers `.env` :

```powershell
Copy-Item .env.example .env
```

Modifiez `.env` et remplacez `root:password` par le mot de passe root de votre base MariaDB, puis changez la valeur de `JWT_SECRET`.

> [AVERTISSEMENT ⚠️]
> Échappez les caractères spéciaux listés dans ce tableau : [Encodage pourcentuel](https://developer.mozilla.org/en-US/docs/Glossary/Percent-encoding)

---

## 6. Configurer Prisma et la base de données

```powershell
npm run db:generate
npm run setup
```

---

## 7.A Exécuter chaque serveur séparément

Lancez le frontend dans un terminal :

```powershell
npm run dev
```

Lancez Caddy dans un second terminal :

```powershell
caddy run --config .\Caddyfile
```

---

## 7.B Exécuter les deux dans un seul terminal

```cmd
npm run exec
```

---

## 7.C Exécuter Caddy en arrière-plan et Node au premier plan

```powershell
pm2 start ecosystem.config.cjs
pm2 save
```

---

## Démarrer votre serveur

* En production, configurez un certificat SSL.
* Pour un usage local ou privé, accédez à :

```
https://{votre-IP-locale}:8080
```

> [AVERTISSEMENT ⚠️]
> ⚠️ **Important :** OpenPlace ne fonctionne qu’en HTTPS. Si vous essayez en HTTP, vous obtiendrez une **erreur 400 Bad Request**.

---

## Mettre à jour la base de données

Si le schéma change, exécutez :

```powershell
npm run db:push
```
