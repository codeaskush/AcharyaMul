from functools import wraps

from fastapi import Depends, HTTPException, Request, status
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.models.enums import Role, InviteStatus


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get("access_token")

    # Dev bypass — only if no real token, auto-create and return admin user
    if not token and settings.app_env == "development":
        user = db.query(User).filter(User.email == "dev@admin.local").first()
        if not user:
            user = User(
                email="dev@admin.local",
                display_name="Dev Admin",
                role=Role.admin,
                invite_status=InviteStatus.accepted,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        return user
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied — contact your family admin")

    return user


def require_role(*roles: Role):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, current_user: User = Depends(get_current_user), **kwargs):
            if current_user.role not in roles:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Role '{current_user.role.value}' does not have permission for this action",
                )
            return await func(*args, current_user=current_user, **kwargs)
        return wrapper
    return decorator
