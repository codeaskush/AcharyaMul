from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    database_url: str = "sqlite:///./rootslegx_dev.db"

    # Google OAuth
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost/api/v1/auth/google/callback"

    # JWT
    jwt_secret: str = "changeme"
    jwt_algorithm: str = "HS256"
    jwt_expiry_hours: int = 24

    # Dev Admin (local login bypass)
    dev_admin_username: str = "admin"
    dev_admin_password: str = "admin123"

    # App
    app_env: str = "development"
    app_url: str = "http://localhost"
    cors_origins: str = "http://localhost"

    class Config:
        env_file = ".env"


settings = Settings()
