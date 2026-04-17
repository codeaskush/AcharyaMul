# Acharyamul — Deployment Guide

## Deployment Options

- **Coolify** (recommended for VPS) — automated Docker deployment with SSL
- **Docker Compose** — manual deployment
- **Local Dev** — `./dev.sh`

---

## Option 1: Coolify Deployment (Recommended)

### Prerequisites
- Coolify installed on your VPS
- Domain with DNS pointing to VPS IP (e.g., via Cloudflare)
- Google Cloud project with OAuth 2.0 credentials

### Step 1: Create PostgreSQL Database in Coolify

1. In Coolify → **New Resource → Database → PostgreSQL**
2. Note the **internal hostname** (e.g., `cwrqijz9ja8tzn78ti6h9anw`)
3. Note the generated credentials (user, password, database name)
4. Build the `DATABASE_URL`:
   ```
   postgresql://USER:PASSWORD@INTERNAL_HOSTNAME:5432/DATABASE
   ```
   **Important:** Use `postgresql://` prefix, NOT `postgres://` — SQLAlchemy requires the full prefix.

### Step 2: Create the Application

1. Coolify → **New Resource → Dockerfile**
2. Repository: `https://github.com/codeaskush/AcharyaMul`
3. Branch: `deploy/coolify`
4. Dockerfile location: `/Dockerfile`
5. **Ports Exposed: `8000`** (critical — the app runs on port 8000)

### Step 3: Set Domain

1. In app settings → **FQDN/Domain**: `https://acharyamul.kushagra.com.np`
2. In Cloudflare DNS: A record → `acharyamul` → your VPS IP → **Proxied** (orange cloud)
3. Cloudflare SSL/TLS mode: **Full**

### Step 4: Configure Environment Variables

Add these in Coolify → app → **Environment Variables**:

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<your-postgres-password>
POSTGRES_DB=postgres
DATABASE_URL=postgresql://postgres:<password>@<internal-hostname>:5432/postgres
GOOGLE_CLIENT_ID=<your-google-client-id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
GOOGLE_REDIRECT_URI=https://acharyamul.kushagra.com.np/api/v1/auth/google/callback
JWT_SECRET=<generate-with: openssl rand -hex 32>
JWT_ALGORITHM=HS256
JWT_EXPIRY_HOURS=24
DEV_ADMIN_USERNAME=admin
DEV_ADMIN_PASSWORD=admin123
APP_ENV=development
APP_URL=https://acharyamul.kushagra.com.np
CORS_ORIGINS=https://acharyamul.kushagra.com.np
BACKUP_RETENTION_DAYS=30
```

### Step 5: Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Edit your OAuth 2.0 Client ID
3. Add **Authorized redirect URI**: `https://acharyamul.kushagra.com.np/api/v1/auth/google/callback`

### Step 6: Deploy

Click **Deploy** in Coolify. The build takes ~3-5 minutes (npm + pip install).

### Step 7: First Login

1. Open `https://acharyamul.kushagra.com.np`
2. Click **"Login as Admin (Dev)"** → `admin` / `admin123`
3. Go to **Admin → Platform Settings → Database & Seed**
4. Click **"Load Seed Data"** → type `LOAD SEED` → confirm

### How It Works

The root `Dockerfile` is a multi-stage build:
1. **Stage 1** (Node): Builds the React frontend → outputs to `/app/dist`
2. **Stage 2** (Python): Installs FastAPI backend, copies built frontend into `/app/static`
3. On startup: creates database tables → seeds data (if empty) → starts uvicorn on port 8000

FastAPI serves both the API (`/api/*`) and the frontend (all other routes → `index.html`).

```
┌──────────────────────────────┐
│         Coolify Traefik      │
│    (SSL + reverse proxy)     │
└──────────────┬───────────────┘
               │ :8000
┌──────────────▼───────────────┐
│     FastAPI (uvicorn)        │
│  /api/*  → REST endpoints    │
│  /*      → React SPA         │
└──────────────┬───────────────┘
               │
┌──────────────▼───────────────┐
│    PostgreSQL (Coolify)      │
│    (separate container)      │
└──────────────────────────────┘
```

### Gotchas & Troubleshooting

| Issue | Fix |
|---|---|
| `Can't load plugin: sqlalchemy.dialects:postgres` | Use `postgresql://` not `postgres://` in DATABASE_URL |
| `could not translate host name` | Check DATABASE_URL hostname has no spaces/line breaks |
| `502 Bad Gateway` | Check Ports Exposed is `8000` in Coolify app settings |
| `port already allocated` | Remove exposed ports from docker-compose.yaml — Coolify manages networking |
| Volume mount errors | Don't use docker-compose.yaml with Coolify — use root Dockerfile instead |
| Frontend not loading | Verify `/app/static/index.html` exists inside the container |

---

## Option 2: Docker Compose (Manual VPS)

For manual deployment without Coolify:

```bash
git clone https://github.com/codeaskush/AcharyaMul.git
cd AcharyaMul
cp .env.example .env
# Edit .env with your values
docker compose up -d --build
```

Note: You'll need to handle SSL, reverse proxy, and port conflicts yourself.

---

## Option 3: Local Development

```bash
# Backend
cd backend && python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Edit with Google OAuth creds

# Frontend
cd ../frontend && npm install

# Run both
cd .. && ./dev.sh
# → Backend: http://localhost:8000
# → Frontend: http://localhost:5173
```

Login with **"Login as Admin (Dev)"** → `admin` / `admin123`.

---

## UAT vs Production

| Setting | UAT | Production |
|---|---|---|
| `APP_ENV` | `development` | `production` |
| Dev admin login | Enabled | Disabled |
| Platform tools (clear DB, load seed) | Enabled | Disabled |
| API docs (`/api/docs`) | Enabled | Disabled |
