# AutoHub — Multi-Tenant SaaS Automation Platform

Production-ready, multi-tenant B2B automation platform for **Social Media Auto Posting**, **Lead Generation**, **Deep Website Enrichment**, and **Cold Email Outreach with Threaded Follow-up Sequences**.

Built with Next.js 16 (App Router), React 19, TypeScript, PostgreSQL 16 via Prisma, Redis 7 + BullMQ, Caddy, and TailwindCSS v4.

---

## Architecture & Features

1. **Multi-Tenant SaaS Foundation (Phase 1)**:
   - Full data isolation across tenants using deterministic `scoped(userId, ...)` helpers.
   - Dual Authentication: Google OAuth 2.0 & Email/Password with Argon2id hashing and sliding session cookies.
   - User profile onboarding, password management, and account lifecycle.

2. **Tenant API Key Management (Phase 2)**:
   - Bring-Your-Own-Key (BYOK) for OpenAI and Bright Data.
   - Stored using hardware-grade AES-256-GCM encryption (`key_enc`). Plaintext keys are never logged or sent to the browser.
   - Masked key management (`••••7890`) and real-time live API validation.

3. **Lead Generation via Bright Data (Phase 3)**:
   - Live scraping adapters for Google Maps, Meta Ads, and LinkedIn.
   - SHA-256 deduplication and credit usage estimation before launching scraping jobs.

4. **Deep Website Scraper & Enrichment (Phase 4)**:
   - Fast, resilient deep crawler that discovers team/contact/about subpages.
   - Cloudflare email obfuscation decoding, Schema.org JSON-LD structured data extraction, and SSRF SafeFetch protection.

5. **Social Media Auto Post (Phase 5)**:
   - Multi-platform OAuth connecting Facebook Pages, Instagram Business, and LinkedIn.
   - AI post caption generator powered by the tenant's OpenAI API key.
   - BullMQ planner & worker with exponential backoff, status tracking, and 1-click manual retry.

6. **Cold Email Outreach & Threaded Follow-ups (Phase 6)**:
   - Multiple SMTP/IMAP sender accounts per tenant with AES-256-GCM password encryption.
   - Strict 25 emails/hour rate cap per sender account (Spec 5.6).
   - Automated multi-step follow-up sequences with delay enforcement and In-Reply-To RFC threading.
   - Immediate **stop-on-reply** detection via IMAP background polling.
   - RFC 8058 1-click unsubscribe links and permanent suppression lists.

---

## Deployment on Hostinger VPS (KVM 1: 1 vCPU, 4 GB RAM, 50 GB NVMe)

AutoHub is pre-configured for a **single-command deployment** via Docker Compose.

### Memory & CPU Budget (Optimized for 4 GB RAM / 1 vCPU)

| Service | CPU Limit | Memory Limit | Memory Reservation | Purpose |
|---|---|---|---|---|
| **`web`** (App + Scraper) | 1.0 core | 2048 MB (2.0 GB) | 1024 MB (1.0 GB) | Next.js server + supervised scraper on `127.0.0.1:8080` + Chromium |
| **`worker`** (5 BullMQ Workers) | 0.5 core | 512 MB | 256 MB | Social planner/publisher, email dispatch/send, and IMAP reply poller |
| **`db`** (Postgres 16) | 0.5 core | 512 MB | 256 MB | PostgreSQL relational database |
| **`redis`** (Redis 7) | 0.25 core | 256 MB | 128 MB | BullMQ queue state & cache |
| **`caddy`** (Caddy 2) | 0.25 core | 128 MB | 64 MB | Automated TLS/SSL reverse proxy & HTTP compression |
| **Total Stack Limits** | ≤ 1 core active | **3456 MB (~3.4 GB)** | **1728 MB (~1.7 GB)** | **Leaves >600 MB free RAM + 2 GB Swap** |

---

### Step 1: Configure 2 GB Swap File on Hostinger VPS

Run the automated swap setup script:
```bash
chmod +x scripts/setup-swap.sh && sudo ./scripts/setup-swap.sh
```

---

### Step 2: Configure Production Environment

Copy `.env.example` to `.env` and fill in your domain and database credentials:
```bash
cp .env.example .env
nano .env
```

Key variables to configure:
- `APP_DOMAIN`: Your custom domain (e.g. `app.yourdomain.com`) pointing to your VPS IP address.
- `POSTGRES_PASSWORD`: Strong password for PostgreSQL.
- `ADMIN_EMAIL`: Your primary administrator email for TLS certificates and notifications.
- `AUTH_SECRET`: Random 32-byte secret (auto-generated if omitted).
- `APP_ENCRYPTION_KEY`: Random 32-byte base64 AES key (auto-generated into `/data/.secrets` if omitted).

---

### Step 3: Automated One-Command Deployment

Run the automated deployment script:
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

Or deploy directly with Docker Compose:
```bash
docker compose up -d
```

On first startup:
1. `caddy` automatically requests and provisions free SSL/TLS certificates via Let's Encrypt / ZeroSSL.
2. `web` applies Prisma database migrations (`prisma migrate deploy`) and starts Next.js.
3. `worker` boots all 5 background supervisor queues.

---

### Step 4: Automated Backups & Maintenance

To create an on-demand database backup:
```bash
chmod +x scripts/backup-db.sh
./scripts/backup-db.sh
```

To schedule daily backups at 03:00 UTC, add to crontab (`crontab -e`):
```bash
0 3 * * * cd /opt/autohub && ./scripts/backup-db.sh >> /var/log/autohub-backup.log 2>&1
```

---

### Step 5: Verification & Monitoring

- **Container Status**: `docker compose ps`
- **Resource Usage**: `docker stats`
- **Live Logs**:
  ```bash
  docker compose logs -f web
  docker compose logs -f worker
  ```
- **Health Check Endpoint**: `https://<YOUR_DOMAIN>/api/health`

---

### Local Development

To run the application locally without Docker:
```bash
npm install
npm run dev
```

Run automated test suite:
```bash
node ./node_modules/vitest/vitest.mjs run --fileParallelism=false
```
