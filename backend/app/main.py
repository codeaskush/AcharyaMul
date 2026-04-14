from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api import auth, persons, relationships, contributions, calculator, users, graph, backup, life_events
from app.database import init_db

app = FastAPI(
    title="rootslegx API",
    description="Collaborative family tree API for the Acharya family",
    version="1.0.0",
    docs_url="/api/docs" if settings.app_env == "development" else None,
    redoc_url="/api/redoc" if settings.app_env == "development" else None,
)

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


@app.on_event("startup")
def on_startup():
    if settings.app_env == "development":
        init_db()


@app.get("/api/v1/health")
def health_check():
    return {"status": "ok"}
