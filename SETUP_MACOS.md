# Getting Started with OpenPlace (macOS)

This guide will help you prepare a **macOS** machine to run **OpenPlace**.

---

## Step 1: Install Prerequisites
Make sure you have the following installed on your system:
- **Homebrew**
- **Node.js**
- **Git**

---

## Step 2: Clone the Repository
```bash
git clone --recurse-submodules https://github.com/openplaceteam/openplace
cd openplace
```

---

## Step 3: Install Dependencies
```bash
npm i && brew install mariadb caddy nss
```
If brew does not automatically start the services, run:
```bash
brew services start mariadb
brew services start caddy
```

---

## Step 4: Configure and Build the Database

Run the secure installation script for MySQL:
```bash
sudo mysql_secure_installation
```

Follow the prompts:
1. Press **Enter** for the current root password.
2. Enter **`n`** when asked to switch to unix_socket authentication.
3. Enter **`y`** when asked to change your root password.  
   ⚠️ Do **not** use "password" as shown in this demo.
4. Enter **`y`** to remove anonymous users.
5. Choose whether to disallow remote root logins (**recommended: y**).
6. Enter **`y`** to remove the test database.
7. Enter **`y`** to reload configuration.

Next, configure the environment:
```bash
cp .env.example .env
```
Update the `.env` file with your chosen MySQL password.

---

## Step 5: Database Setup

Run the following Prisma commands:
```bash
npm run db:generate
npm run setup
```

---

## Step 6: Run the Application

Start the dev server:
```bash
npm run dev
```

In another terminal, run Caddy:
```bash
caddy run --config Caddyfile
```

---

## Notes on SSL
OpenPlace **requires HTTPS**.  
If you are testing locally, you can access the app at:
```
https://{IP}:8080
```
⚠️ Attempting to use HTTP will result in an **HTTP 400 error**.

---

## Updating the Database
If the database schema changes, update it with:
```bash
npm run db:push
```
