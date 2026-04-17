# Coolify Deployment Guide

## Option 1: Docker Compose (recommended)

In Coolify, create a new resource → **Docker Compose** → point to your GitHub repo.

Coolify will detect `docker-compose.yml` and deploy all services.

### Environment Variables

Add these in Coolify's environment settings (copy-paste all):

```env
POSTGRES_USER=acharyamul
POSTGRES_PASSWORD=acharyamul_secure_2026
POSTGRES_DB=acharyamul
DATABASE_URL=postgresql://acharyamul:acharyamul_secure_2026@db:5432/acharyamul
GOOGLE_CLIENT_ID=276334032681-sfoku6pbcdu6ofjv24te2frlqj2im88r.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_REDIRECT_URI=https://YOURDOMAIN/api/v1/auth/google/callback
JWT_SECRET=5d9b5ea848d77c91e16c35d2e899910363c36d0bbf6fb28c93425961ea8c31c3
JWT_ALGORITHM=HS256
JWT_EXPIRY_HOURS=24
DEV_ADMIN_USERNAME=admin
DEV_ADMIN_PASSWORD=admin123
APP_ENV=development
APP_URL=https://YOURDOMAIN
CORS_ORIGINS=https://YOURDOMAIN
BACKUP_RETENTION_DAYS=30
```

**Replace `YOURDOMAIN`** with whatever Coolify assigns (e.g., `acharyamul.kushagra.com.np`).

### After Deploy

1. Update Google Cloud Console → add `https://YOURDOMAIN/api/v1/auth/google/callback` as redirect URI
2. Open the app → Login as Admin (Dev) → `admin` / `admin123`
3. Admin → Platform Settings → Load Seed Data

---

## Option 2: Separate Services

If Docker Compose doesn't work in Coolify, deploy as separate services:

### Service 1: PostgreSQL
- Use Coolify's built-in PostgreSQL
- Database: `acharyamul`
- User: `acharyamul`
- Note the connection string Coolify generates

### Service 2: Backend (API)
- Source: GitHub repo, path `backend/`
- Dockerfile: `backend/Dockerfile`
- Build target: (leave blank for production stage)
- Port: `8000`
- Environment variables:
  ```
  DATABASE_URL=<postgresql-connection-string-from-coolify>
  GOOGLE_CLIENT_ID=276334032681-sfoku6pbcdu6ofjv24te2frlqj2im88r.apps.googleusercontent.com
  GOOGLE_CLIENT_SECRET=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
  GOOGLE_REDIRECT_URI=https://YOURDOMAIN/api/v1/auth/google/callback
  JWT_SECRET=5d9b5ea848d77c91e16c35d2e899910363c36d0bbf6fb28c93425961ea8c31c3
  JWT_ALGORITHM=HS256
  JWT_EXPIRY_HOURS=24
  DEV_ADMIN_USERNAME=admin
  DEV_ADMIN_PASSWORD=admin123
  APP_ENV=development
  APP_URL=https://YOURDOMAIN
  CORS_ORIGINS=https://YOURDOMAIN
  ```

### Service 3: Frontend
- Source: GitHub repo, path `frontend/`
- Dockerfile: `frontend/Dockerfile`
- Build target: `build` (outputs static files)
- Serve the `/app/dist` directory
- Or use Coolify's "Static Site" with build command: `npm run build`, publish directory: `dist`

### Nginx / Reverse Proxy
Coolify handles this automatically with Traefik. No nginx config needed.
The key requirement: route `/api/*` to the backend service, everything else to frontend.
