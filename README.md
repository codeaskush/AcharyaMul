# rootslegx

Collaborative family tree web application for the Acharya family of Tanahun, Nepal. A digital vanshavali tracing lineage from Shree Krishna Acharya through Bhanubhakta Acharya (1814-1868 AD) to the current generation.

## Tech Stack

- **Frontend:** React + Vite (JavaScript)
- **Backend:** FastAPI (Python 3.11+)
- **Database:** PostgreSQL 16+
- **Chart:** React Flow
- **Deployment:** Docker Compose

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Google Cloud project with OAuth 2.0 credentials

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/rootslegx.git
   cd rootslegx
   ```

2. Create environment file:
   ```bash
   cp .env.example .env
   # Edit .env with your values (Google OAuth credentials, database password, JWT secret)
   ```

3. Start the application:
   ```bash
   docker compose up -d
   ```

4. Access the app at `http://localhost`

### Development

For local development with hot reload:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

- Frontend: http://localhost:5173
- API: http://localhost:8000
- API Docs: http://localhost:8000/api/docs

## Features

- Interactive family chart with pan/zoom and auto-collapse
- Person management with Roman + Devanagari names, AD/BS dates
- Relationship calculator with Nepali kinship terms
- Contributor workflow with pending states and optimistic UI
- Admin moderation with revision history and rollback
- Bilingual UI (English/Nepali)
- Gmail SSO authentication
- Automated daily backups

## Project Structure

```
rootslegx/
├── frontend/          # React + Vite SPA
├── backend/           # FastAPI + SQLAlchemy
├── nginx/             # Reverse proxy config
├── scripts/           # Backup and restore scripts
├── db/                # Database initialization
└── docker-compose.yml
```

## License

Open source. Built by the Acharya family, for the Acharya family.
