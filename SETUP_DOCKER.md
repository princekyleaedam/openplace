# OpenPlace — Docker Setup Guide

This guide will help you run **openplace** with Docker.

## Prerequisites

You need **Docker** and **Docker Compose** installed on your system.

### Install Docker

-   **Windows**: Download Docker Desktop from [docker.com](https://www.docker.com/products/docker-desktop/)
-   **macOS**: Download Docker Desktop from [docker.com](https://www.docker.com/products/docker-desktop/)
-   **Linux**: Follow the installation guide for your distribution at [docs.docker.com](https://docs.docker.com/engine/install/)

## 1. Clone the repository

```bash
git clone --recurse-submodules https://github.com/openplaceteam/openplace
cd openplace
```

## 2. Configure environment

1. Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

2. Edit `.env` file and configure your settings:
    - Set your `JWT_SECRET` (generate a secure random string)
    - Set your `DATABASE_URL` to `"mysql://root:password@db/openplace"`
    - The MariaDB root password is set to `password` (change if needed)

> [!WARNING]
> Escape special characters listed in this table: [Percent-Encoding](https://developer.mozilla.org/en-US/docs/Glossary/Percent-encoding)

## 3. Start the application

Run the entire stack with Docker Compose:

```bash
docker-compose up -d
```

This will start:

-   **MariaDB database** on port 3306
-   **Node.js application** (backend)
-   **Caddy reverse proxy** on port 443

## 4. Access the application

Once all services are running, you can access OpenPlace at:

```
http://localhost
https://localhost
```
