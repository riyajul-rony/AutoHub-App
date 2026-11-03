# Lead Reach AI — Production Deployment Guide (Hostinger VPS with Traefik)

This guide provides step-by-step instructions to deploy **Lead Reach AI** (`leadreachai.cerkitlabs.tech`) on your Hostinger VPS alongside your existing **Traefik** (`traefik-praa`) and **n8n** (`n8n-scad`) containers.

---

## 1. Architecture Overview (How It Works with Your Existing Traefik)

Your VPS runs Traefik in `network_mode: host` listening on ports 80 and 443, with an external Docker network named `n8n-scad_cerkitlabs` and certificate resolver `letsencrypt`.

- **Web Service (`web`)**:
  - Exposes port `3000` internally (no host port binding).
  - Connects to Traefik's external network `n8n-scad_cerkitlabs`.
  - Traefik automatically discovers `web` via Docker labels, routes HTTPS requests from `leadreachai.cerkitlabs.tech`, and generates a free Let's Encrypt TLS certificate.
- **Worker Service (`worker`)**:
  - Runs background BullMQ queue processors for lead discovery, email campaigns, IMAP reply polling, and social auto-posting.
  - Starts reliably after `web`, `db`, and `redis` report healthy status.
- **Database & Cache (`db` & `redis`)**:
  - Run PostgreSQL 16 and Redis 7 on an isolated, private bridge network (`leadreach_internal`).
  - **Zero host ports are published**, protecting your database from the public internet.

---

## 2. DNS Setup (Before Deploying)

1. Log in to your DNS provider (Cloudflare, Namecheap, or Hostinger DNS).
2. Add an **A Record**:
   - **Type**: `A`
   - **Name**: `leadreachai` (or `leadreachai.cerkitlabs.tech`)
   - **IPv4 Address**: Your Hostinger VPS Public IP
   - **Proxy Status**: DNS Only (if using Cloudflare, turn proxy off initially so Traefik ACME HTTP-01 challenge completes cleanly)
   - **TTL**: Auto / 14400

---

## 3. GitHub Container Registry (GHCR) Image Settings

The Docker image is built automatically by GitHub Actions on push to `main` and pushed to:
`ghcr.io/riyajul-rony/lead-reach-ai:latest` (and dual-tagged as `ghcr.io/riyajul-rony/autohub-app:latest`)

### Choose One of Two Options for Hostinger Access:

#### Option A: Set Package to Public (Recommended for Hostinger "Compose from URL")
1. Open your GitHub browser: `https://github.com/users/riyajul-rony/packages/container/package/lead-reach-ai`
   *(Also verify `https://github.com/users/riyajul-rony/packages/container/package/autohub-app` is Public)*
2. Click **Package settings** (in the right sidebar).
3. Scroll to the **Danger Zone** at the bottom.
4. Click **Change visibility** > select **Public** > confirm.
> **Trade-off**: Anyone can pull the container image, but your application **secrets, passwords, and database are NOT in the image** (they are injected via environment variables on your VPS).

#### Option B: Keep Package Private (Requires VPS Docker Login)
If you prefer keeping the image private, SSH into your VPS once:
```bash
echo "<YOUR_GITHUB_PERSONAL_ACCESS_TOKEN>" | docker login ghcr.io -u riyajul-rony --password-stdin
```
Hostinger Docker will then have authenticated access to pull private images.

---

## 4. Deploying in Hostinger Docker Manager ("Compose from URL")

### Step 1: Open Docker Manager
1. Log in to **Hostinger hPanel**.
2. Go to **VPS** > Select your VPS.
3. In the left menu, select **Docker** > **Compose**.
4. Click **Create Project** (or **Add Compose**).

### Step 2: Configure Project Details
- **Project Name**: `leadreach-ai`
- **Compose Source**: **URL**
- **Compose URL** (Choose the file that matches your server):
  - **For your VPS (With Traefik running)** — **DEFAULT**:
    ```
    https://raw.githubusercontent.com/riyajul-rony/Lead-Reach-AI/main/docker-compose.yml
    ```
  - *(For a server without Traefik / standalone with Caddy)*:
    ```
    https://raw.githubusercontent.com/riyajul-rony/Lead-Reach-AI/main/docker-compose.standalone.yml
    ```

### Step 3: Enter Required Environment Variables
In Hostinger's **Environment Variables** section, add the following variables:

| Variable | Required | Example / Recommended Value | Description |
|---|---|---|---|
| `APP_DOMAIN` | **Yes** | `leadreachai.cerkitlabs.tech` | Domain mapped in Traefik labels |
| `ADMIN_EMAIL` | **Yes** | `admin@cerkitlabs.tech` | Admin notification & fallback email |
| `POSTGRES_PASSWORD` | **Yes** | *(Generate strong password)* | Dedicated database password |
| `AUTH_SECRET` | **Yes** | *(Generate 32+ char secret)* | Session JWT cookie secret (`openssl rand -hex 32`) |
| `APP_ENCRYPTION_KEY` | **Yes** | *(Generate 32-byte Base64 key)* | AES-256 key for stored credentials (`openssl rand -base64 32`) |
| `TRAEFIK_NETWORK` | No | `n8n-scad_cerkitlabs` | Traefik external network (default matches your VPS) |
| `TRAEFIK_ENTRYPOINT` | No | `websecure` | Traefik HTTPS entrypoint (default matches your VPS) |
| `TRAEFIK_CERTRESOLVER` | No | `letsencrypt` | Traefik cert resolver (default matches your VPS) |
| `GOOGLE_CLIENT_ID` | No | *(Your OAuth client ID)* | For Google OAuth / Sheets |
| `GOOGLE_CLIENT_SECRET` | No | *(Your OAuth secret)* | For Google OAuth / Sheets |
| `OPENAI_API_KEY` | No | *(Your OpenAI key)* | AI copy & campaign generation |

> [!WARNING]
> **Old Docker Volumes Notice**: If PostgreSQL was started previously on the VPS with an old password, the persistent volume `leadreach-ai_pgdata` holds that initial password. If you change `POSTGRES_PASSWORD`, you must remove the old volume (`docker volume rm leadreach-ai_pgdata`) before deploying so the database re-initializes with the new password.

### Step 4: Click Deploy
Click **Deploy** (or **Start**).
Hostinger will fetch `docker-compose.yml`, pull the image, connect `web` to Traefik, run Prisma database migrations on startup, and start `web` and `worker`.

---

## 5. Verification & Health Checks

Once deployed, verify your setup:

1. **Check Containers**:
   In Hostinger Docker Manager, verify that all 4 containers show **Running / Healthy**:
   - `leadreach-ai-web-1` (Next.js App on Traefik network)
   - `leadreach-ai-worker-1` (BullMQ workers)
   - `leadreach-ai-db-1` (PostgreSQL 16)
   - `leadreach-ai-redis-1` (Redis 7)

2. **HTTP Health Check**:
   Open in your browser:
   `https://leadreachai.cerkitlabs.tech/api/health`
   Expected response:
   ```json
   {
     "status": "healthy",
     "timestamp": "2026-11-02T...",
     "components": {
       "database": { "status": "up", "latencyMs": 2 },
       "redis": { "status": "up" }
     }
   }
   ```

3. **Login & Admin Access**:
   Navigate to `https://leadreachai.cerkitlabs.tech/login`.
   The first user to register automatically receives `super_admin` permissions.

---

## 6. How to Update the App in the Future

When you push updates to GitHub:
1. GitHub Actions automatically builds and publishes the new image to GHCR.
2. In Hostinger Docker Manager > `leadreach-ai` project:
   Click **Restart** (or **Pull & Restart**).
3. The container starts, automatically runs any new Prisma migrations, and resumes serving traffic.

---

## 7. Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| **Port 80/443 address already in use** | Caddy or another service trying to bind host port 80/443 | Make sure you deployed `docker-compose.yml` (Traefik-enabled), NOT `docker-compose.standalone.yml`. |
| **Traefik returns 404 / Bad Gateway** | `web` not connected to Traefik network or wrong domain | Verify that `APP_DOMAIN` matches your DNS record and that `TRAEFIK_NETWORK` matches `n8n-scad_cerkitlabs`. |
| **SSL Certificate not issued** | DNS not pointing to VPS or rate-limited | Check Traefik logs: `docker logs traefik-praa`. Ensure port 80 is not blocked by a Cloudflare proxy during challenge. |
| **Worker container not starting** | Worker waits for `web`, `db`, and `redis` to be healthy | Check `web` logs: `docker logs leadreach-ai-web-1`. Ensure Prisma migrations completed. |
| **Database connection refused** | Old volume retaining old password | Remove volume: `docker volume rm leadreach-ai_pgdata` and restart stack. |
