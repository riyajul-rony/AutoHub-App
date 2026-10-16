# AutoHub — Administrator & Operations Guide (`README_ADMIN.md`)

Welcome to the **AutoHub Control Center & System Administration** reference documentation. This guide outlines platform security, role-based access control (RBAC), multi-tenant subscription tiers, background workers, and safe production deployment procedures.

---

## 1. System Architecture & Tech Stack

AutoHub is built for high-performance marketing automation, cold outreach, and lead generation:
- **Framework**: Next.js (App Router), React 19, TypeScript
- **Database & ORM**: PostgreSQL via Prisma ORM
- **Cache & Key-Value Store**: Redis (ioredis) for quotas, settings caching, and rate limiting
- **Background Job Engine**: BullMQ with 8 dedicated subsystem worker queues
- **Security & Cryptography**: Argon2id password hashing, AES-256-GCM credential encryption, CSRF protection, and server-side RBAC guards
- **UI Design System**: Vanilla CSS tokens, glassmorphism (`.glass`, `.btn`, `.badge`, `.input`), and responsive Dark/Light theme switching

---

## 2. Staff Roles & Permission Hierarchy

All administrative routes, API endpoints, and Server Actions enforce server-side role validation using `requirePermission(permission)` and `assertPermission(role, permission)`.

### Permission Matrix

| Permission | Description | `super_admin` | `admin` | `support` | `finance` |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `users.read` | View users list, account status, usage metrics, profile | ✅ | ✅ | ✅ | ❌ |
| `users.manage` | Suspend, activate, delete users, reset passwords, clear sessions | ✅ | ✅ | ❌ | ❌ |
| `plans.manage` | Create, edit, activate/deactivate plans; override limits; usage charts | ✅ | ✅ | ❌ | ✅ |
| `billing.manage` | Approve manual payments, view transactions, manage subscriptions | ✅ | ✅ | ❌ | ✅ |
| `settings.manage` | Global settings, registration mode, maintenance mode, host API keys | ✅ | ✅ | ❌ | ❌ |
| `logs.read` | View activity logs, admin audit trail, and worker error logs | ✅ | ✅ | ✅ | ✅ |
| `staff.manage` | Invite staff, modify staff roles, revoke administrative access | ✅ | ❌ | ❌ | ❌ |

### Staff Role Definitions
1. **Super Admin (`super_admin`)**: Highest platform authority. Full control over system setup, host keys, staff appointments, and dangerous administrative actions. Super admins cannot be deleted or suspended by anyone.
2. **Admin (`admin`)**: Operational platform manager. Can manage users, subscription plans, billing, view logs, and configure system queues. Cannot modify other staff roles.
3. **Support Specialist (`support`)**: Customer support representative. Read-only visibility into users, profiles, connected accounts, and error logs to assist users with debugging.
4. **Finance Manager (`finance`)**: Revenue operations. Access to billing records, manual invoice approvals, subscription statuses, and plan pricing.

---

## 3. Staff Management Workflow

### How to Invite or Elevate Staff
1. Navigate to `/admin/staff` (accessible strictly by `super_admin`).
2. Click **Invite Staff Member**.
3. Enter the user's email address and assign an initial role (`admin`, `support`, or `finance`).
4. AutoHub creates a cryptographically signed staff invitation token. If the user already exists, their role is elevated immediately; otherwise, an invitation link is generated for account setup.

### Role Modification & Session Security
- When a staff member's role is changed or revoked, **all active browser sessions for that user are instantly invalidated from Redis and PostgreSQL**.
- The staff member is forced to re-authenticate to prevent privilege retention.
- Every role alteration is permanently written to the `admin_audit_logs` table with timestamp, admin ID, IP, and state diff.

---

## 4. Plans & Limits Management

AutoHub features a centralized resource quota system protecting APIs from abuse.

### Resource Limits Enforced
Every plan configures monthly limits for:
- `monthly_leads`: Google Maps and web scraping limit
- `monthly_social_posts`: Auto-published posts to Facebook, Instagram, LinkedIn, X
- `monthly_outreach_emails`: SMTP / Gmail outbound campaigns
- `max_social_accounts`: Linked OAuth social accounts
- `max_email_accounts`: Connected IMAP/SMTP sending inboxes
- `max_campaigns`: Active parallel outreach workflows

### Adding / Modifying Plans
1. Navigate to `/admin/plans`.
2. Click **Create New Plan**.
3. Specify name, slug, monthly price, yearly price, and quota caps.
4. Mark as **Active** for public availability.
5. **Protection Rule**: A plan that currently has active assigned users **cannot be deleted**. It can only be deactivated, allowing existing users to keep their plan while preventing new assignments.

### User Quota Overrides
If a customer requires custom capacity beyond standard plans:
1. Navigate to `/admin/users/[id]`.
2. Under **Plan & Limit Assignment**, click **Custom Limits Override**.
3. Enter custom quota caps (e.g., 50,000 monthly leads) and save.
4. AutoHub's `checkLimit(userId, resource)` utility automatically prioritizes active overrides before falling back to plan defaults.

---

## 5. Background Queues & Log Retention

AutoHub operates 8 BullMQ queues backed by Redis:
- `planner`: Social post scheduling and publication trigger generator
- `social-publish`: Graph API and social network webhook publishing
- `lead-search`: Asynchronous Google Places scraping
- `lead-enrich`: Company website scraping and email enrichment
- `email-dispatch`: Batch sequencing for outbound outreach
- `email-send`: SMTP delivery and rate-controlled mail transport
- `reply-poll`: IMAP background mailbox listening
- `maintenance`: Quota reset, token expiration, and 90-day log cleanup

### Monitoring & Job Controls (`/admin/jobs`)
- **Queue Overview**: Live counts of `waiting`, `active`, `completed`, `failed`, and `delayed` jobs.
- **Pause / Resume**: Individual queues can be paused during third-party API outages and resumed once resolved.
- **Failed Job Retries**: Failed jobs list their error reason, attempts made, and stacktrace. Administrators can click **Retry** to re-enqueue or **Remove** to discard.

### Automated 90-Day Log Retention
- To comply with data privacy policies and prevent unbounded disk growth, logs older than **90 days** are automatically purged by the scheduled `startMaintenanceWorker`.
- Administrators can trigger an on-demand retention purge anytime by clicking **Retention Purge (90+ Days)** on `/admin/logs`.

---

## 6. Global Platform Settings & Maintenance Mode

Configured via `/admin/setup`:
- **Registration Access Mode**:
  - `Open`: Anyone can sign up freely via email or Google OAuth.
  - `Invite-Only`: Registration requires a valid token in the sign-up form.
  - `Closed`: Account creation is locked. Form is disabled and API rejects new sign-ups.
- **Maintenance Mode**:
  - Toggling Maintenance Mode redirects all regular users to `/maintenance` with a custom announcement message.
  - Staff and administrators bypass maintenance and can log in normally via `/login` to access the control center.
- **Credentials & API Keys**:
  - Keys are encrypted using AES-256-GCM before storage in `system_settings`.
  - Keys reload in **masked format** (`sk-••••••••1234`).
  - Leaving an input empty during save **keeps the existing secret completely untouched**.
  - **Test Connection**: Live verification button tests OpenAI, Google, and Meta API connectivity directly from the server.
- **Redis Cache & Invalidation**:
  - Settings are cached in Redis (`setting:<key>`) with a 300-second TTL.
  - Whenever an admin saves new settings, `invalidateSettingCache()` instantly purges the cache so changes take effect immediately across all instances.

---

## 7. Production Deployment & Safe Database Migrations

### Safe Migration Procedure
Never run `prisma db push` on a production database, as it can cause data loss or schema drift. Always apply versioned migrations:

```bash
# 1. Pull latest production code
git pull origin main

# 2. Install production dependencies
npm ci

# 3. Apply Prisma migrations safely to PostgreSQL
npx prisma migrate deploy

# 4. Generate Prisma Client
npx prisma generate

# 5. Build optimized Next.js production bundle
npm run build

# 6. Restart PM2 or systemd services
pm2 restart autohub-web
pm2 restart autohub-worker
```

### Environment Variables Checklist (`.env`)
Ensure the following variables are configured in production:
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/autohub?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# Security & Encryption (32-byte Base64 key)
APP_ENCRYPTION_KEY="<base64-encoded-32-byte-master-key>"
SESSION_SECRET="<long-random-string-for-tokens>"

# App URL & Admin
APP_URL="https://app.autohub.com"
ADMIN_EMAIL="admin@autohub.com"
```

---

## 8. Security & Incident Response Checklist

1. **Suspected Compromised User Account**:
   - Go to `/admin/users/[id]`.
   - Click **Terminate All Sessions** (instantly clears cookies and token hashes).
   - Click **Suspend Account** (stops all running campaigns and queues).
2. **Third-Party API Outage (e.g., OpenAI / X Rate Limits)**:
   - Go to `/admin/jobs`.
   - Pause the relevant queue (`social-publish` or `planner`).
   - Inspect errors under `/admin/logs?tab=errors`.
   - Resume the queue once API health is restored.
3. **Audit Trail Review**:
   - Check `/admin/logs?tab=audit` for who created plans, changed roles, or altered limits with state diff inspection.
