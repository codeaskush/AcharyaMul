from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth
from jose import jwt
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.models.enums import InviteStatus

router = APIRouter()

# --- Google OAuth setup ---
oauth = OAuth()
oauth.register(
    name="google",
    client_id=settings.google_client_id,
    client_secret=settings.google_client_secret,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)


def _create_jwt(email: str) -> str:
    payload = {
        "sub": email,
        "exp": datetime.utcnow() + timedelta(hours=settings.jwt_expiry_hours),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def _set_token_cookie(response: Response, token: str):
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=settings.app_env != "development",
        samesite="lax",
        max_age=settings.jwt_expiry_hours * 3600,
        path="/",
    )


@router.get("/google")
async def google_login(request: Request):
    """Redirect to Google OAuth consent screen."""
    if not settings.google_client_id:
        raise HTTPException(status_code=501, detail="Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.")
    redirect_uri = settings.google_redirect_uri
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    """Handle Google OAuth callback — exchange code for user info, issue JWT."""
    try:
        token = await oauth.google.authorize_access_token(request)
    except Exception:
        raise HTTPException(status_code=400, detail="OAuth authorization failed")

    userinfo = token.get("userinfo")
    if not userinfo or not userinfo.get("email"):
        raise HTTPException(status_code=400, detail="Could not retrieve email from Google")

    email = userinfo["email"].lower()
    display_name = userinfo.get("name", email.split("@")[0])

    # Check if user is in the authorized list
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return RedirectResponse(url=f"{settings.app_url}/login?error=access_denied")

    # Update user on first login
    if user.invite_status == InviteStatus.pending:
        user.invite_status = InviteStatus.accepted
    user.display_name = display_name
    user.last_login = datetime.utcnow()
    db.commit()

    # Issue JWT as httpOnly cookie and redirect to app
    jwt_token = _create_jwt(email)
    response = RedirectResponse(url=settings.app_url, status_code=302)
    _set_token_cookie(response, jwt_token)
    return response


@router.get("/me")
async def get_current_user_info(request: Request, db: Session = Depends(get_db)):
    """Return the current authenticated user, or 401 if not logged in."""
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        email = payload.get("sub")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return {"data": _serialize_user(user)}


@router.post("/dev-login")
async def dev_login(request: Request, response: Response, db: Session = Depends(get_db)):
    """Dev-only: login with username/password for the local admin account."""
    if settings.app_env != "development":
        raise HTTPException(status_code=404, detail="Not found")

    body = await request.json()
    username = body.get("username", "")
    password = body.get("password", "")

    if username != settings.dev_admin_username or password != settings.dev_admin_password:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user = db.query(User).filter(User.email == "dev@admin.local").first()
    if not user:
        raise HTTPException(status_code=500, detail="Dev admin user not found in database")

    jwt_token = _create_jwt(user.email)
    _set_token_cookie(response, jwt_token)

    return {"data": _serialize_user(user)}


@router.post("/logout")
async def logout(response: Response):
    """Clear the auth cookie."""
    response.delete_cookie("access_token", path="/")
    return {"data": {"message": "Logged out"}}


def _serialize_user(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "display_name": user.display_name,
        "role": user.role.value,
        "invite_status": user.invite_status.value,
        "language_preference": user.language_preference,
    }
