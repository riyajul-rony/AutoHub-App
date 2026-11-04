# Lead Reach AI — Production Deployment & Operations Runbook

> **Target Environment**: Hostinger VPS (Server ID: `1492862`)  
> **Production URL**: `https://leadreachai.cerkitlabs.tech`  
> **Reverse Proxy**: Traefik with Let's Encrypt automated TLS  
> **Stack**: Next.js 16 App Router (Node 20 Alpine), PostgreSQL 16 Alpine, Redis 7 Alpine, BullMQ Background Worker Supervisor, Docker Compose.

---

## 1. System Architecture

```text
                                Internet (HTTPS / 443)
                                          │
                                          ▼
                      ┌───────────────────────────────────────┐
                      │    Traefik Edge Reverse Proxy         │
                      │  (Network: n8n-scad_cerkitlabs)       │
                      │  TLS Cert Resolver: Let's Encrypt     │
                      └──────────────────┬────────────────────┘
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   │                                           │
                   ▼ (Port 3000 / HTTP)                        ▼ (External Webhooks)
┌───────────────────────────────────────┐   ┌───────────────────────────────────────┐
│     lead-reach-ai-web-1 (Next.js)     │   │      Stripe / Meta / Google APIs      │
│  - App Router Web UI (Linear Dark)    │   └───────────────────────────────────────┘
│  - REST API & Server Actions          │
│  - DB Session Auth & Guard Filters    │
│  - Mounted Storage: /data/uploads     │
└──────────────┬────────────────────────┘
               │
               ├─────────────────────────┐
               ▼                         ▼
┌─────────────────────────┐   ┌────────────────────────────────────────────────────────┐
│  lead-reach-ai-db-1     │   │  lead-reach-ai-redis-1                                 │
│  PostgreSQL 16 Alpine   │   │  Redis 7 Alpine (AOF Enabled)                          │
│  - Tenant-isolated data │   │  - User Auth Sessions & Revocation Sets                │
│  - 18+ Prisma schema    │   │  - BullMQ Queue Broker (7 distinct queues)             │
│  - Volume: pgdata       │   │  - Rate Limiter & Fast Cache (5-min TTL)               │
└──────────────┬──────────┘   └──────────────────────────┬─────────────────────────────┘
               │                                         │
               └─────────────────────────┬───────────────┘
                                         │
                                         ▼
                      ┌───────────────────────────────────────┐
                      │    lead-reach-ai-worker-1 (Worker)    │
                      │  Supervisor: 7 Parallel Processors    │
                      │  1. Lead Search Worker (Apify engine) │
                      │  2. Cold Email Dispatch (25/hr rate)  │
                      │  3. IMAP Stop-on-Reply Detector       │
                      │  4. Social Media Multi-Publisher      │
                      │  5. Dynamic Follow-up Sequencer       │
                      │  6. Monthly Quota Usage Reset         │
                      │  7. Zombie Job & Temp Cleanup         │
                      │  Mounted Storage: /data/uploads       │
                      └───────────────────────────────────────┘
```

---

## 2. Server Deployment Guide (Step-by-Step)

### Prerequisites on VPS:
- Hostinger VPS Ubuntu 22.04 / 24.04 with Docker Engine and Docker Compose v2.
- Traefik external Docker network running: `n8n-scad_cerkitlabs`.
- DNS A Record configured: `leadreachai.cerkitlabs.tech` -> VPS IP address.

### 2.1 One-Line Update & Zero-Downtime Deployment
To pull latest codebase changes and rebuild the production application:

```bash
# 1. SSH into the VPS
ssh root@<YOUR_VPS_IP>

# 2. Navigate to project root
cd /opt/lead-reach-ai

# 3. Pull latest code from main branch
git pull origin main

# 4. Verify environment file exists and is populated
test -f .env && echo ".env is present" || echo "CRITICAL: .env is missing!"

# 5. Build and recreate containers cleanly
docker compose up -d --build

# 6. Apply database schema migrations safely
docker compose exec web npx prisma migrate deploy

# 7. Verify all containers are healthy
docker compose ps
```

---

## 3. Environment Variables Master Reference

Create or verify `/opt/lead-reach-ai/.env` with these exact keys:

| Environment Variable | Required | Description | Example / Allowed Values |
|---|---|---|---|
| `NODE_ENV` | Yes | Node execution environment | `production` |
| `APP_DOMAIN` | Yes | FQDN without protocol | `leadreachai.cerkitlabs.tech` |
| `APP_URL` | Yes | Canonical root URL (no trailing slash) | `https://leadreachai.cerkitlabs.tech` |
| `TRAEFIK_NETWORK` | Yes | Existing Traefik bridge network | `n8n-scad_cerkitlabs` |
| `TRAEFIK_ENTRYPOINT`| Yes | Traefik SSL entrypoint name | `websecure` |
| `TRAEFIK_CERTRESOLVER`| Yes | ACME resolver name | `letsencrypt` |
| `AUTH_SECRET` | Yes | Session token HMAC secret (32+ chars) | Generate: `openssl rand -base64 32` |
| `APP_ENCRYPTION_KEY` | Yes | AES-256-GCM data key (32 bytes Hex or Base64) | Generate: `openssl rand -hex 32` (64 chars) or `openssl rand -base64 32` (44 chars) |
| `POSTGRES_USER` | Yes | PostgreSQL username | `leadreach` |
| `POSTGRES_PASSWORD` | Yes | PostgreSQL password | Strong alphanumeric string |
| `POSTGRES_DB` | Yes | PostgreSQL database name | `leadreach` |
| `DATABASE_URL` | Yes | Internal connection string | `postgresql://leadreach:<PASS>@db:5432/leadreach` |
| `REDIS_URL` | Yes | Internal Redis connection string | `redis://redis:6379` |
| `ADMIN_EMAIL` | Yes | Primary platform administrator | `admin@cerkitlabs.tech` |
| `REGISTRATION_MODE` | Yes | Account signup access control | `invite` or `public` |
| `SYSTEM_SMTP_HOST` | Yes | Transactional SMTP server hostname | `smtp.zoho.com` |
| `SYSTEM_SMTP_PORT` | Yes | Transactional SMTP port | `587` (STARTTLS) or `465` (SSL) |
| `SYSTEM_SMTP_USER` | Yes | Transactional SMTP email login | `support@cerkitlabs.tech` |
| `SYSTEM_SMTP_PASS` | Yes | Transactional SMTP app-specific password | Zoho App Password |
| `SYSTEM_SMTP_FROM` | Yes | Outgoing transactional sender name | `"Lead Reach AI" <support@cerkitlabs.tech>` |
| `GOOGLE_CLIENT_ID` | Optional| Google OAuth App Client ID | `*.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET`| Optional| Google OAuth App Client Secret | Google Secret |
| `STORAGE_PATH` | Yes | Directory for uploads | `/data/uploads` |

---

## 4. Production Architectural Fixes & Safeguards

This section records the exact production resolutions implemented for the 8 core issues:

### Problem 1: System SMTP Gateway & Email Verification
- **Cause**: Port 587 without strict TLS enforcement caused silent timeouts on Zoho SMTP.
- **Resolution**: Port 587 uses `requireTLS: true` and `minVersion: "TLSv1.2"`; port 465 uses `secure: true`.
- **Admin Verification**: Built-in test email button at `https://leadreachai.cerkitlabs.tech/admin/setup` tests real socket handshakes and displays live error diagnostics.

### Problem 2: Onboarding Redirect Loop
- **Cause**: After completing onboarding, the user's cached Redis session retained `onboarding_completed: false`.
- **Resolution**: `refreshSessionCache(userId)` is triggered on onboarding submit to invalidate all active session tokens in Redis. Next.js cache is refreshed via `revalidatePath('/', 'layout')`.

### Problem 3: Avatar Uploads & Dropdown Navigation
- **Cause**: Static user avatars and lack of an interactive topbar menu with reliable logout.
- **Resolution**: User avatars are stored in persistent volume `appdata:/data/uploads/avatars`. A dedicated path-traversal-protected API route (`/api/v1/uploads/avatars/[filename]`) serves images. Added topbar `UserMenu` with profile link, theme toggle, and `logoutAction`.

### Problem 4: Apify Key AES-256-GCM Decryption & Key Pool
- **Cause**: Encryption key parser failed when given Hex vs Base64 format strings, causing `Failed to save key into pool`.
- **Resolution**: `parseEncryptionKeyBuffer` automatically handles both 64-character Hex strings and 44-character Base64 keys, stripping accidental quotes and whitespace. Key pool errors are explicitly displayed in the admin UI.

### Problem 5: White-Labeling & Apify Obfuscation
- **Cause**: Apify technical error traces were exposed in lead finder UI and API error responses.
- **Resolution**: All user-facing scrapers, search logs, and error responses are sanitized through `sanitizeUserFacingLeadError()`. The UI labels the engine as "Lead Reach AI Lead Engine".

### Problem 6: Google OAuth `redirect_uri_mismatch`
- **Cause**: Google Cloud Console lacked the Cold Outreach authorization callback URL.
- **Resolution**: Two canonical URLs are registered in Google Cloud Console Credentials:
  1. `https://leadreachai.cerkitlabs.tech/api/v1/auth/google/callback` (Auth Login)
  2. `https://leadreachai.cerkitlabs.tech/api/v1/auth/google/outreach/callback` (Cold Outreach Mailboxes)
- `getAppUrl()` strips trailing slashes to guarantee exact URI match.

### Problem 7: Dark-Mode First & Theme Persistence
- **Cause**: Inconsistent CSS theme defaults caused light mode flash (FOUC).
- **Resolution**: CSS `:root` and `data-theme="dark"` set Linear/Notion dark mode as default (`#09090B`). Theme selection is synchronized to both `localStorage` and `document.cookie` (`leadreach_theme`), with server-rendered `<html data-theme="...">` and an inline blocking script.

### Problem 8: Admin Branding & Site Content CMS
- **Cause**: Brand name, logo, hero copy, and metadata were hardcoded in `src/app/page.tsx`.
- **Resolution**: Dynamic CMS at `/admin/branding` stores settings in `system_settings` with Redis caching. Dynamic `generateMetadata()` provides live SEO titles and OpenGraph tags.

---

## 5. Database Management & Disaster Recovery

### 5.1 Applying Migrations
Always apply migrations inside the production container using `migrate deploy` (never `migrate dev`):

```bash
docker compose exec web npx prisma migrate deploy
```

To verify migration synchronization status:
```bash
docker compose exec web npx prisma migrate status
```

### 5.2 Database Backup (Daily Automated / Manual)
Run a compressed PostgreSQL dump:

```bash
# Create backups directory
mkdir -p /opt/lead-reach-ai/backups

# Create timestamped dump
docker compose exec -t db pg_dump -U leadreach -d leadreach | gzip > /opt/lead-reach-ai/backups/db_backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Verify backup size
ls -lh /opt/lead-reach-ai/backups/
```

### 5.3 Database Disaster Recovery (Restore)
To restore a backup into a fresh or recovered database:

```bash
# 1. Stop web and worker services to prevent active connections
docker compose stop web worker

# 2. Decompress and stream the backup directly into postgres
gunzip -c /opt/lead-reach-ai/backups/db_backup_YYYYMMDD_HHMMSS.sql.gz | docker compose exec -T db psql -U leadreach -d leadreach

# 3. Restart services
docker compose start web worker
```

### 5.4 Redis State Recovery
Redis is configured with Append-Only File (`AOF`) enabled. Snapshots and logs are persisted to Docker volume `redisdata`. To force a snapshot:

```bash
docker compose exec redis redis-cli bgsave
```

---

## 6. Background Worker Operations & Monitoring

The background worker supervisor (`src/server/worker/runner.ts`) runs as a standalone service (`lead-reach-ai-worker-1`) and operates 7 specialized processors.

### 6.1 Check Worker Health & Logs
```bash
# Check worker status
docker ps --filter "name=lead-reach-ai-worker"

# Tail live worker supervisor logs
docker logs -f --tail 50 lead-reach-ai-worker-1
```

Expected healthy output:
```text
{"level":30,"msg":"Lead Reach AI Worker Supervisor starting..."}
{"level":30,"msg":"Starting all Lead Reach AI background workers..."}
{"level":30,"msg":"All 7 Lead Reach AI background workers are active."}
```

### 6.2 BullMQ Queue Maintenance
To inspect or clear stuck jobs if a queue encounters a deadlock:

```bash
# Access Redis CLI
docker compose exec redis redis-cli

# Check queue lengths
KEYS bull:*
LLEN bull:lead-search:wait
LLEN bull:email-dispatch:wait
```

---

## 7. Operational Troubleshooting Matrix

| Symptom / Error | Probable Root Cause | Resolution Command |
|---|---|---|
| `502 Bad Gateway` from Traefik | Web container stopped or unhealthy | `docker compose logs --tail 50 web`<br>`docker compose restart web` |
| `Traefik 404 Not Found` | Domain mismatch or missing docker network | Verify `APP_DOMAIN` in `.env` matches request Host header.<br>Check `docker network inspect n8n-scad_cerkitlabs` |
| `PrismaClientInitializationError` | Postgres container not ready | `docker compose exec db pg_isready`<br>`docker compose restart db` |
| `Failed to save key into pool` | Invalid `APP_ENCRYPTION_KEY` | Generate 32-byte hex key: `openssl rand -hex 32` and update `.env`. |
| `SMTP Connection Timeout (587)` | VPS firewall blocks port or incorrect host | Run `curl -v telnet://smtp.zoho.com:587`. Use port 465 with SSL if 587 is filtered. |
| `redirect_uri_mismatch` (Google) | Callback missing in Google Cloud Console | Add `https://leadreachai.cerkitlabs.tech/api/v1/auth/google/outreach/callback` to Google Console Authorized Redirect URIs. |
| User stuck in `/onboarding` loop | Redis session cache retained old state | Restart redis: `docker compose restart redis` or submit form again after clearing cookies. |
| Avatars disappear after container recreate | Upload folder was not mounted | Verify `docker volume inspect lead-reach-ai_appdata` is attached to `/data` in `docker-compose.yml`. |

---

## 8. Final Production Verification Checklist

Run through this checklist after deploying updates to `https://leadreachai.cerkitlabs.tech`:

- [ ] **Home Page & CMS**: Visit `/` — check custom branding, title, and dark mode theme.
- [ ] **Theme Switcher**: Click Sun/Moon icon in header and profile — verifies smooth toggle without page reload.
- [ ] **Email Verification**: Register test account or resend verification — check inbox for Zoho delivery.
- [ ] **Onboarding Flow**: Complete wizard — verifies instant redirection to `/app/dashboard`.
- [ ] **Profile & Avatar**: Upload photo in `/app/settings/profile` — verifies avatar rendering and topbar dropdown.
- [ ] **Logout**: Click Avatar dropdown -> "Log Out" — verifies clean session destruction and redirect to `/login`.
- [ ] **Admin Setup & SMTP Test**: In `/admin/setup`, click "Send Test Email" — verifies green delivery confirmation.
- [ ] **Apify Key Management**: In `/admin/apify`, add Apify token — verifies successful AES-256-GCM encryption.
- [ ] **Lead Search White-Label**: Run search in `/app/leads` — verifies clean status without exposing Apify internal error strings.
- [ ] **Google OAuth**: Test Gmail mailbox connection in `/app/outreach/email-accounts` — verifies callback success.
- [ ] **Background Workers**: Run `docker logs lead-reach-ai-worker-1` — verifies all 7 workers are active.
