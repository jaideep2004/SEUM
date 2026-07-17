# SEUM VPS Deployment Guide

## Prerequisites

- Hostinger VPS (Ubuntu 22.04/24.04)
- A domain name pointing to your VPS IP
    - `yourdomain.com` → frontend (A record)
    - `api.yourdomain.com` → backend (A record)
- Supabase project with your database (already setup)
- Git repo with the code

## 1. Initial Server Setup

SSH into your VPS and run:

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 18.x LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs git nginx certbot python3-certbot-nginx

# Verify
node -v   # should be v18.x
npm -v    # should be 9.x or 10.x
```

## 2. Clone Repository

```bash
mkdir -p /var/www
cd /var/www
git clone <your-repo-url> seum
cd /var/www/seum
```

## 3. Backend Setup

```bash
cd /var/www/seum/backend

# Create env file
cp .env.production .env
nano .env
```

Paste your actual values (use your Supabase credentials from local `.env`):

```
DATABASE_URL=postgresql://postgres:your-password@db.your-project.supabase.co:6543/postgres?pgbouncer=true
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
PORT=4000
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com
AUDIT_LOG_RETENTION_DAYS=90
```

Save with `Ctrl+X`, `Y`, `Enter`. Then:

```bash
# Install deps
npm install

# Build TypeScript
npm run build

# Create logs dir
mkdir -p logs

# Run database migrations (creates tables)
npm run setup-supabase

# Seed test data
npm run seed
```

## 4. Frontend Setup

```bash
cd /var/www/seum/apps/web

# Create env file
cp .env.production .env
nano .env
```

Set:

```
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1
```

Save, then:

```bash
# Install deps
npm install

# Build Next.js
npm run build

# Create logs dir
mkdir -p logs
```

## 5. PM2 Process Manager

```bash
# Install PM2 globally
npm install -g pm2

# Start backend
cd /var/www/seum/backend
pm2 start ecosystem.config.js

# Start frontend
cd /var/www/seum/apps/web
pm2 start ecosystem.config.js

# Save process list (auto-restart on reboot)
pm2 save
pm2 startup   # ← run the command it outputs
```

Test locally:

```bash
# Backend health check
curl http://localhost:4000/api/v1/health

# Frontend check
curl http://localhost:3000/login
```

## 6. Nginx Reverse Proxy

Create the Nginx config:

```bash
nano /etc/nginx/sites-available/seum
```

Paste:

```nginx
# Frontend — yourdomain.com
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Backend API — api.yourdomain.com
server {
    listen 80;
    server_name api.yourdomain.com;

    # Increase body size for file uploads
    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upstream;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable it:

```bash
ln -s /etc/nginx/sites-available/seum /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default   # remove default
nginx -t                                  # test config
systemctl restart nginx
```

## 7. SSL Certificate (Certbot)

```bash
# Get SSL for both domains
certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com

# Follow the prompts — choose to redirect HTTP to HTTPS

# Test auto-renewal
certbot renew --dry-run
```

Certbot auto-renews via systemd timer. No further action needed.

## 8. Firewall (if enabled)

```bash
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 22/tcp
ufw enable
```

## 9. Verify Everything

| URL | Expected |
|---|---|
| `https://yourdomain.com` | Login page loads |
| `https://api.yourdomain.com/api/v1/health` | `{"success":true,...}` |
| `https://api.yourdomain.com/api/v1/auth/login` | POST works (returns 200 or 401 for bad creds) |

## Monitoring

```bash
# PM2 status
pm2 status
pm2 logs seum-backend
pm2 logs seum-frontend

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# System
htop
```

## Updating Code

```bash
cd /var/www/seum
git pull

# Backend
cd backend && npm install && npm run build && pm2 restart seum-backend

# Frontend
cd apps/web && npm install && npm run build && pm2 restart seum-frontend
```
