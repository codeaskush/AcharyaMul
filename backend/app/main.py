import os
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from starlette.middleware.sessions import SessionMiddleware

from app.config import settings
from app.api import auth, persons, relationships, contributions, calculator, users, graph, backup, life_events, admin_logs, contribution_requests, analytics, platform
from app.database import init_db

app = FastAPI(
    title="Acharyamul API",
    description="Collaborative family tree API for the Acharya family",
    version="1.0.0",
    docs_url="/api/docs" if settings.app_env == "development" else None,
    redoc_url="/api/redoc" if settings.app_env == "development" else None,
)

# Session middleware — required for OAuth state parameter
app.add_middleware(SessionMiddleware, secret_key=settings.jwt_secret)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(persons.router, prefix="/api/v1/persons", tags=["persons"])
app.include_router(relationships.router, prefix="/api/v1/relationships", tags=["relationships"])
app.include_router(contributions.router, prefix="/api/v1/contributions", tags=["contributions"])
app.include_router(calculator.router, prefix="/api/v1/calculator", tags=["calculator"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(graph.router, prefix="/api/v1/graph", tags=["graph"])
app.include_router(backup.router, prefix="/api/v1/backup", tags=["backup"])
app.include_router(life_events.router, prefix="/api/v1", tags=["life-events"])
app.include_router(admin_logs.router, prefix="/api/v1/admin-logs", tags=["admin-logs"])
app.include_router(contribution_requests.router, prefix="/api/v1/contribution-requests", tags=["contribution-requests"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["analytics"])
app.include_router(platform.router, prefix="/api/v1/platform", tags=["platform"])


@app.on_event("startup")
def on_startup():
    if settings.app_env == "development":
        init_db()


@app.get("/api/v1/health")
def health_check():
    return {"status": "ok"}


# Serve frontend static files (built by frontend container into /app/static)
STATIC_DIR = Path("/app/static")
if STATIC_DIR.exists() and (STATIC_DIR / "index.html").exists():
    app.mount("/assets", StaticFiles(directory=str(STATIC_DIR / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(request: Request, full_path: str):
        """Serve frontend SPA — all non-API routes return index.html."""
        file_path = STATIC_DIR / full_path
        if file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(STATIC_DIR / "index.html"))
