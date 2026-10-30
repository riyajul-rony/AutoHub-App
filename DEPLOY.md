# Lead Reach AI — Production Deployment Guide (Hostinger VPS)

This guide provides exact, step-by-step instructions to deploy **Lead Reach AI** on a **Hostinger VPS** using Docker Manager (**Compose from URL**) or via standard SSH Git clone.

---

## 1. Why Did the Previous Hostinger Deployment Fail?

When deploying via **Hostinger Docker Manager > Compose > URL**, using:
`https://github.com/riyajul-rony/AutoHub-App`

Hostinger returned:
> **`"Deployment failed. Docker project not found."`**

### The 3 Root Causes:
1. **GitHub Repository Webpage URL vs. Raw File URL**:
   - Hostinger's "Compose from URL" feature requires a direct link to the **raw YAML content** of the compose file.
   - Providing `https://github.com/riyajul-rony/AutoHub-App` downloads GitHub's HTML page, which Hostinger cannot parse.
   - **Correct Raw URL**:
     ```
     https://raw.githubusercontent.com/riyajul-rony/AutoHub-App/main/docker-compose.yml
     ```
2. **Hostinger Compose Does Not Clone the Repo**:
   - Hostinger only downloads the single compose file to `/docker/<project>/docker-compose.yml`.
   - Host file mounts (like `./docker/Caddyfile`) fail because local files do not exist on the VPS host. The new `docker-compose.yml` is **100% self-contained** using an inline Caddy command and Docker named volumes.
3. **Container Registry Tag & Permissions**:
   - The image was previously pointing to an invalid organization (`ghcr.io/autohub/autohub`). It now correctly targets `ghcr.io/riyajul-rony/autohub-app:latest`.
   - GitHub Container Registry packages are private by default; you must toggle your package visibility to **Public** so Hostinger can pull it without credentials.

---

## 2. Pre-Deployment: Set GitHub Package to Public (One-Time Setup)

GitHub Container Registry (GHCR) packages are private by default. To allow Hostinger VPS to pull your container image:

1. Go to your GitHub profile or repository:
   `https://github.com/riyajul-rony/AutoHub-App`
2. On the right sidebar, click on **Packages** (or navigate to `https://github.com/users/riyajul-rony/packages`).
3. Click on the package named **`autohub-app`**.
4. In the right sidebar, click **Package settings**.
5. Scroll down to the **Danger Zone** section.
6. Under **Change package visibility**, click **Change visibility**, select **Public**, type the confirmation text, and click **I understand the consequences, make this package public**.

---

## 3. Deploying via Hostinger Docker Manager ("Compose from URL")

This is the recommended one-click deployment method.

### Step 1: Open Docker Manager in Hostinger
1. Log in to your **Hostinger Control Panel (hPanel)**.
2. Navigate to **VPS** > Select your VPS.
3. In the left sidebar, click **Docker** (or **Docker Manager**).
4. Click the **Compose** tab.
5. Click **Create Project** (or **Add Compose**).

### Step 2: Enter Project Details
- **Project Name**: `leadreach-ai`
- **Deployment Source**: Select **URL** (or **Compose from URL**).
- **Compose File URL**: Paste the following Raw GitHub URL:
  ```
  https://raw.githubusercontent.com/riyajul-rony/AutoHub-App/main/docker-compose.yml
  ```

### Step 3: Configure Environment Variables
In the **Environment Variables** section of the Hostinger Docker Manager form, add the following variables:

| Variable Name | Required | Example / Recommended Value | Description |
|---|---|---|---|
| `APP_DOMAIN` | Yes | `leadreachai.cerkitlabs.tech` | Your live domain (or VPS IP if testing) |
| `ADMIN_EMAIL` | Yes | `admin@cerkitlabs.tech` | Primary admin email |
| `POSTGRES_PASSWORD` | Yes | *Generate strong password* | Database password |
| `AUTH_SECRET` | Yes | *Generate 32+ char secret* | Session cookie encryption |
| `APP_ENCRYPTION_KEY` | Yes | *Generate 32-byte Base64 key* | AES-256 key for stored API credentials |
| `REGISTRATION_MODE` | No | `invite` (default) or `public` | User signup policy |

> **How to generate secure keys:**
> - For `AUTH_SECRET`: Run `openssl rand -hex 32` or any random 32-character string.
> - For `APP_ENCRYPTION_KEY`: Run `openssl rand -base64 32` (must be 32 bytes Base64).
>
> *(Note: If you leave `AUTH_SECRET` or `APP_ENCRYPTION_KEY` blank, the container entrypoint will automatically generate and persist secure keys into the `/data` volume).*

### Step 4: Click Deploy
1. Click **Deploy** (or **Start**).
2. Hostinger will fetch `docker-compose.yml`, pull the containers, initialize the database volume, run Prisma migrations automatically, and start all services.

---

## 4. Pointing Your Domain (DNS Setup)

1. Go to your DNS provider (Cloudflare, Namecheap, or Hostinger DNS).
2. Add an **A Record**:
   - **Type**: `A`
   - **Name**: `@` (or `leadreachai` for subdomain)
   - **IPv4 Address**: Your Hostinger VPS Public IP address
   - **TTL**: Auto / 14400
3. Caddy will automatically provision a free Let's Encrypt / ZeroSSL TLS certificate for your domain as soon as traffic hits port 80/443.

---

## 5. Alternative Deployment: SSH Git Clone Method

If you prefer deploying via terminal SSH on your VPS:

1. Connect to your VPS:
   ```bash
   ssh root@<YOUR_VPS_IP>
   ```
2. Clone the repository:
   ```bash
   git clone https://github.com/riyajul-rony/AutoHub-App.git /opt/leadreach-ai
   cd /opt/leadreach-ai
   ```
3. Copy and edit `.env`:
   ```bash
   cp .env.example .env
   nano .env
   ```
4. Run the automated deployment script:
   ```bash
   chmod +x scripts/*.sh
   bash scripts/deploy.sh
   ```

---

## 6. Verifying Deployment & Health Checks

Once running, verify that all services are healthy:

1. **In Hostinger Docker Manager**:
   - Check that all 5 containers show **Healthy** / **Running**:
     - `leadreach-ai-caddy-1` (Gateway on port 80 & 443)
     - `leadreach-ai-web-1` (Next.js App on port 3000)
     - `leadreach-ai-worker-1` (BullMQ background task processor)
     - `leadreach-ai-db-1` (PostgreSQL 16)
     - `leadreach-ai-redis-1` (Redis 7)

2. **HTTP Health Check**:
   Visit `https://<YOUR_DOMAIN>/api/health` in your browser. It returns:
   ```json
   {
     "status": "healthy",
     "timestamp": "2026-10-30T...",
     "components": {
       "database": { "status": "up", "latencyMs": 2 },
       "redis": { "status": "up" }
     }
   }
   ```

3. **Initial Admin Setup**:
   - Navigate to `https://<YOUR_DOMAIN>/login` or `/signup`.
   - The first registered user automatically becomes the `super_admin`.

---

## 7. How to Update in the Future

### When using Hostinger Docker Manager:
1. Push your changes to the `main` branch on GitHub.
2. The GitHub Actions workflow automatically builds and pushes the updated container image to `ghcr.io/riyajul-rony/autohub-app:latest`.
3. In Hostinger Docker Manager, select the `leadreach-ai` project and click **Restart** (or **Pull & Restart**).
4. Container restarts, runs any new Prisma database migrations on startup, and resumes traffic with zero downtime.

### When using SSH:
```bash
cd /opt/leadreach-ai
git pull origin main
docker compose build --pull web worker
docker compose up -d
```

