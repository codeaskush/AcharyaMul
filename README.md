# आचार्यमूल (Acharyamul)

Collaborative family tree web application for the Acharya family of Tanahun, Nepal.

## Tech Stack

- **Frontend:** React 19 + Vite + Tailwind CSS + shadcn/ui
- **Backend:** FastAPI + SQLAlchemy 2.0 (Python 3.11+)
- **Database:** PostgreSQL 16+ (SQLite for local dev)
- **Charts:** React Flow (vertical) + D3.js (horizontal)
- **Auth:** Google OAuth 2.0 + JWT (httpOnly cookies)
- **Deployment:** Docker Compose + Nginx

## Quick Start (Local Dev)

```bash
# 1. Clone
git clone https://github.com/your-username/rootslegx.git acharyamul
cd acharyamul

# 2. Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Edit with your Google OAuth creds
python seed.py        # Load mock family data

# 3. Frontend
cd ../frontend
npm install

# 4. Run both
cd ..
./dev.sh
# → Backend: http://localhost:8000
# → Frontend: http://localhost:5173
```

Login with **"Login as Admin (Dev)"** using `admin` / `admin123`.

## Features

- **Home Portal** — News, events countdown, history, literature, gallery
- **Family Chart** — Vertical (React Flow) and horizontal (D3) with view switcher
- **Person Management** — 4-column form with employment, life events, live timeline
- **Relationships** — Marriage (date, location, status) + parent-child with parent assignment
- **Analytics** — Gender, age, location, occupation, generation charts
- **Members List** — Paginated, searchable, dual-script (Roman + Devanagari)
- **Relationship Calculator** — Name-to-relation + step-by-step path builder with Nepali kinship terms
- **Contributor Workflow** — Suggest corrections, add pending persons/relationships, rate limiting
- **Admin Panel** — User management, contribution review, drafts, quarantine, expression of interest, activity log, platform settings
- **Auth** — Google SSO + dev admin login, role-based access (admin/contributor/viewer)
- **Bilingual UI** — English/Nepali toggle
- **Data Safety** — Automated daily backups, seed data management

## Deployment

See [DEPLOY.md](DEPLOY.md) for UAT/production deployment instructions.

```bash
# Docker deploy
cp .env.example .env  # Configure
docker compose up -d --build
```

## Project Structure

```
acharyamul/
├── frontend/           # React + Vite SPA
│   └── src/features/   # chart, person, home, admin, analytics, auth, contributor
├── backend/            # FastAPI + SQLAlchemy
│   ├── app/api/        # REST endpoints
│   ├── app/models/     # SQLAlchemy ORM models
│   ├── app/services/   # Business logic
│   ├── seed.py         # Database seeder
│   └── seed_data.json  # Mock family data
├── nginx/              # Reverse proxy config
├── scripts/            # Backup/restore scripts
├── dev.sh              # Local dev starter
├── DEPLOY.md           # Deployment guide
└── docker-compose.yml
```

## License

Built by the Acharya family, for the Acharya family.
