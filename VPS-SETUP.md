# SEUM VPS Deployment Guide (Ubuntu 22.04/24.04)

Verified against this repo: npm workspaces monorepo, Next.js 14 web (port 3000),
Express API (port 4000, Socket.IO), Supabase PostgreSQL, PM2, Nginx.

---

## 0. Before you start

Gather:

- VPS: Ubuntu 22.04/24.04, **2 GB RAM minimum** (Next.js build; 1 GB works only with swap), 2 vCPU.
- Domain with DNS control. This guide uses:
  - `seum.example.com` → web (A record)
  - `api.seum.example.com` → API (A record)
- Existing Supabase `DATABASE_URL` (recommended: keep the same DB, no data migration).
- The values of the current `backend/.env` (DB URL, JWT secrets, SMTP). **Keep the same JWT
  secrets** if you don't want to force every user to log in again.
- Files from `backend/uploads/` (employee docs, vehicle docs, expense receipts…). DB rows are on
  Supabase; uploaded files live on the server disk and are NOT in the repo.

> Commit and push your latest code first — deploying by `git clone` only gets committed code.

---

## 1. Base server setup

```bash
ssh root@YOUR_VPS_IP

apt update && apt upgrade -y
timedatectl set-timezone Asia/Riyadh

apt install -y curl git nginx certbot python3-certbot-nginx build-essential python3 ufw

# Node.js 22 LTS (matches local dev; Next 14 needs >= 18.17)
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs

node -v    # v22.x
npm -v
```

Swap (needed for the Next build on small VPS):

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

Firewall:

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
```

PM2:

```bash
npm install -g pm2
```

---

## 2. Clone the repo

```bash
mkdir -p /var/www && cd /var/www
git clone https://github.com/jaideep2004/SEUM.git seum
cd /var/www/seum
```

Install dependencies **from the repo root only** (npm workspaces; installing inside
`backend/` or `apps/web/` separately will break `@seum/shared`):

```bash
npm ci
```

---

## 3. Environment files

### 3.1 `backend/.env`

Copy the current production values from the old server (or from your local `backend/.env`).
Minimum required keys (names verified in `backend/src/config.ts`):

```env
# Supabase (session pooler or direct; sslmode=disable only for localhost)
DATABASE_URL=postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres

# MUST be the same as the old server to keep existing sessions valid
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...

PORT=4000
NODE_ENV=production

# Web origin(s), comma-separated
CORS_ORIGIN=https://seum.example.com

# Used in password-reset / notification links
APP_URL=https://seum.example.com

AUDIT_LOG_RETENTION_DAYS=90

# Optional
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=SEUM <no-reply@seum.app>

# Report-only endpoints for external GPS devices (if used)
GPS_INGEST_KEY=...

# Only if you run more than one API instance (not needed for single PM2 process)
# REDIS_URL=redis://127.0.0.1:6379
```

> `NODE_ENV=production` makes auth cookies `Secure` — login only works over HTTPS
> (finish step 7 before testing logins).

### 3.2 `apps/web/.env`

```env
NEXT_PUBLIC_API_URL=https://api.seum.example.com/api/v1
```

**Important:** `NEXT_PUBLIC_*` is baked at build time. Set this file **before** running
`npm run build`.

---

## 4. Build

```bash
cd /var/www/seum
npm run build:all          # backend tsc -> backend/dist, then next build -> apps/web/.next
mkdir -p backend/logs backend/uploads
```

---

## 5. Database migrations

### Keeping the existing Supabase DB (normal move)

Nothing to run. The current DB already includes `migrate-phase2.11` (selling price).
If you later add migrations, run only the new ones:

```bash
cd /var/www/seum/backend
npm run migrate:phaseX
```

**Do NOT run `npm run setup-supabase` or `npm run seed` against an existing production DB** —
they create/seed demo data (`super@seum.com`, demo tenant, etc.).

### Fresh/empty database only

```bash
cd /var/www/seum/backend
npm run setup-supabase      # base auth/tenant schema + permissions
npm run migrate:run         # node-pg-migrate (backend/migrations, 3 files)

for p in phase1 phase2 phase2_5 phase2.7 phase2.8 phase2.9 phase2.10 phase2.11 \
         phase3 phase3.2 phase3.3 phase3.4 phase3.5 phase3.6 \
         phase4.1 phase4.2 phase4.3 phase4.4 phase4.5 phase4.6 phase4.7 phase4.8 \
         phase5.1 phase5.2 phase5.3 phase5.4 phase5.5 \
         phase6.1 phase6.2 phase6.3 phase6.4 phase6.5 \
         phase7.1 phase7.2 phase7.3 phase7.4b phase7.5 phase7.6 phase7.7-7.8 \
         phase8 phase9; do
  echo "== $p"; npx tsx "src/migrate-$p.ts" || exit 1
done

# Optional demo accounts/data (fresh installs only)
npm run seed
```

### Copying the DB to a new Supabase project (if you are changing DB too)

```bash
pg_dump "$OLD_DATABASE_URL" --no-owner --no-acl -Fc -f /tmp/seum.dump
pg_restore --no-owner --no-acl -d "$NEW_DATABASE_URL" /tmp/seum.dump
```

Then point `DATABASE_URL` to the new project and run any pending `migrate:phaseX` scripts.

---

## 6. PM2

The repo ships `backend/ecosystem.config.js` and `apps/web/ecosystem.config.js`
(fork mode — required for Socket.IO; do not switch to cluster without a Redis adapter and
sticky sessions).

```bash
# API
cd /var/www/seum/backend
pm2 start ecosystem.config.js

# Web
cd /var/www/seum/apps/web
pm2 start ecosystem.config.js

pm2 save
pm2 startup     # run the command it prints (keeps apps alive after reboot)
```

Health checks:

```bash
curl -s http://localhost:4000/api/v1/health
curl -sI http://localhost:3000/login | head -n 1
```

Logs:

```bash
pm2 status
pm2 logs seum-backend
pm2 logs seum-frontend
```

Log rotation (recommended):

```bash
pm2 install pm2-logrotate
```

---

## 7. Nginx reverse proxy

Create `/etc/nginx/conf.d/websocket-upgrade.conf` (once per server):

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}
```

Create `/etc/nginx/sites-available/seum`:

```nginx
# Web — seum.example.com
server {
    listen 80;
    server_name seum.example.com www.seum.example.com;

    client_max_body_size 25m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }
}

# API — api.seum.example.com
server {
    listen 80;
    server_name api.seum.example.com;

    # Uploads are limited to 10 MB in multer; keep headroom
    client_max_body_size 25m;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;

        # Socket.IO / WebSocket upgrade
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Long-lived WebSocket connections
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
```

Enable and reload:

```bash
ln -s /etc/nginx/sites-available/seum /etc/nginx/sites-enabled/seum
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

---

## 8. HTTPS (required for login)

```bash
certbot --nginx \
  -d seum.example.com -d www.seum.example.com \
  -d api.seum.example.com
# choose "Redirect" when asked

certbot renew --dry-run
```

Certbot installs a systemd timer for renewal; no cron needed.

---

## 9. Move uploaded files (only when moving from an existing server)

```bash
# on the NEW server
mkdir -p /var/www/seum/backend/uploads

# from your workstation / old server
rsync -avz OLD_SERVER:/path/to/seum/backend/uploads/ /var/www/seum/backend/uploads/
```

Uploads are served by the API at `/uploads/...`; they are not in git and must survive deployments.

---

## 10. Verify

| Check | Expected |
|---|---|
| `https://seum.example.com/login` | Login page over HTTPS |
| Login `super@seum.com` | Dashboard loads |
| Customers / Trips pages | Lists load (real data) |
| Create trip + PDF | Trip created; print sheet opens |
| `/dashboard/live-trips` | Socket connects (no console errors) |
| Upload a document | File appears, URL under `api.seum.example.com/uploads/...` |
| `https://api.seum.example.com/api/v1/health` | `{"success":true,...}` |
| `pm2 status` | Both processes `online`, restart count stable |

---

## 11. Deploying updates

```bash
cd /var/www/seum
git pull

# only when package-lock.json changed
npm ci

npm run build:all

# run new migrations here, e.g.:
# cd backend && npm run migrate:phase2.12

pm2 restart seum-backend seum-frontend
```

Never run `npm run dev` / `next dev` on the production server.

---

## 12. Backups & housekeeping

- DB: Supabase automated backups (confirm retention in the Supabase dashboard).
- Uploads: nightly archive, e.g.

  ```bash
  tar czf /var/backups/seum-uploads-$(date +%F).tar.gz -C /var/www/seum/backend uploads
  ```

  and prune old archives (`find /var/backups -name 'seum-uploads-*' -mtime +14 -delete`).
- Audit logs cleanup (script exists, optional cron):

  ```bash
  cd /var/www/seum/backend && npm run cleanup-audit-logs
  ```

---

## Troubleshooting

- **Login succeeds but session drops instantly** — cookies are `Secure`; the site must be
  served over HTTPS, and `CORS_ORIGIN` must exactly match the web origin (scheme + host).
- **Browser calls `localhost:4000`** — `NEXT_PUBLIC_API_URL` was missing when `next build` ran.
  Set `apps/web/.env`, rebuild (`npm run build:all`), restart `seum-frontend`.
- **`Cannot find module 'next'` under PM2** — npm workspaces hoist `next` to the repo root;
  always start the web app via `npm start` (the shipped ecosystem file does this).
- **Socket.IO keeps disconnecting** — the API server block is missing the
  `Upgrade`/`Connection` headers or the `proxy_read_timeout 3600s` setting.
- **Uploads 413** — raise `client_max_body_size` in the API server block (multer caps at 10 MB).
- **Next build killed / OOM** — add swap (step 1) or build on a 2 GB+ machine.
- **`npm ci` fails on bcrypt** — install `build-essential python3` (step 1).
