# Acharyamul — UAT Deployment Guide

## Prerequisites

- VPS with Docker and Docker Compose installed (Ubuntu 22.04+ recommended)
- Domain name (optional, can use IP)
- Google Cloud project with OAuth 2.0 credentials

## Step 1: Clone and Configure

```bash
# Clone the repository
git clone https://github.com/your-username/rootslegx.git acharyamul
cd acharyamul

# Create environment file
cp .env.example .env
```

Edit `.env` with your values:

```bash
nano .env
```

**Required changes:**

| Variable | What to set |
|---|---|
| `POSTGRES_PASSWORD` | Strong random password |
| `DATABASE_URL` | Update password to match above |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |
| `GOOGLE_REDIRECT_URI` | `http://YOUR_DOMAIN/api/v1/auth/google/callback` |
| `JWT_SECRET` | Generate with: `openssl rand -hex 32` |
| `APP_URL` | `http://YOUR_DOMAIN` (or `http://YOUR_IP`) |
| `CORS_ORIGINS` | Same as APP_URL |
| `APP_ENV` | `development` for UAT (enables dev admin login + platform tools) |
| `DEV_ADMIN_USERNAME` | Your admin username |
| `DEV_ADMIN_PASSWORD` | Your admin password |

## Step 2: Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 Client ID (Web application)
3. Add **Authorized redirect URI**: `http://YOUR_DOMAIN/api/v1/auth/google/callback`
4. Copy Client ID and Client Secret into `.env`

## Step 3: Deploy

```bash
# Build and start all services
docker compose up -d --build

# Check services are running
docker compose ps

# View logs
docker compose logs -f api
```

Services:
- **nginx** → Port 80 (frontend + API proxy)
- **api** → Port 8000 (FastAPI backend)
- **db** → Port 5432 (PostgreSQL)
- **backup** → Daily automated backups
- **frontend** → Builds static files for nginx

## Step 4: First Login

1. Open `http://YOUR_DOMAIN` in browser
2. Use **"Login as Admin (Dev)"** with credentials from `.env`
3. Or use **"Login with Google"** (your email must be in the seed data users list)

## Step 5: Load Test Data (Optional)

After logging in as admin:
1. Go to **Admin → Platform Settings → Database & Seed**
2. Click **"Load Seed Data"** → type `LOAD SEED` → confirm
3. This loads the mock family with 32 members and 30 relationships

## Common Operations

### View logs
```bash
docker compose logs -f api        # Backend logs
docker compose logs -f nginx      # Nginx access logs
docker compose logs -f db         # Database logs
```

### Restart a service
```bash
docker compose restart api
```

### Rebuild after code changes
```bash
docker compose up -d --build
```

### Database backup (manual)
```bash
docker compose exec backup sh /backup.sh
```

### Restore from backup
```bash
# List backups
docker compose exec backup ls -la /backups/

# Restore (replace filename)
docker compose exec backup sh -c "gunzip -c /backups/rootslegx_20260415_020000.sql.gz | psql"
```

### Reset everything
```bash
docker compose down -v    # WARNING: deletes all data including database
docker compose up -d --build
```

## Architecture

```
                    ┌─────────────┐
                    │   Browser   │
                    └──────┬──────┘
                           │ :80
                    ┌──────▼──────┐
                    │    nginx    │
                    │ (reverse    │
                    │  proxy)     │
                    └──┬──────┬───┘
                       │      │
              /api/*   │      │  /*
                       │      │
                ┌──────▼──┐ ┌─▼────────┐
                │  api    │ │ frontend │
                │ FastAPI │ │ (static) │
                └────┬────┘ └──────────┘
                     │
              ┌──────▼──────┐
              │  PostgreSQL  │
              │   (db)       │
              └──────────────┘
```

## UAT vs Production

| Setting | UAT | Production |
|---|---|---|
| `APP_ENV` | `development` | `production` |
| Dev admin login | Enabled | Disabled |
| Platform tools | Enabled | Disabled |
| API docs | `/api/docs` | Disabled |
| JWT_SECRET | Any string | Strong random |

For production: set `APP_ENV=production`, disable dev admin, use HTTPS (add SSL certs to `nginx/ssl/`).
