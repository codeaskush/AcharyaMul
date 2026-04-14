from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, EmailStr
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.enums import Role, InviteStatus

router = APIRouter()


class UserInvite(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    role: Role = Role.viewer


class UserRoleUpdate(BaseModel):
    role: Role


def _serialize_user(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "display_name": user.display_name,
        "role": user.role.value,
        "invite_status": user.invite_status.value,
        "language_preference": user.language_preference,
        "rate_limit_suggestions": user.rate_limit_suggestions,
        "rate_limit_messages": user.rate_limit_messages,
        "last_login": user.last_login.isoformat() if user.last_login else None,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


@router.get("")
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all authorized users. Admin only."""
    if current_user.role != Role.admin:
        raise HTTPException(status_code=403, detail="Only admins can view user list")

    users = db.query(User).order_by(User.created_at.desc()).all()
    return {"data": [_serialize_user(u) for u in users]}


@router.post("", status_code=status.HTTP_201_CREATED)
def invite_user(
    data: UserInvite,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Invite a new user by email with an assigned role. Admin only."""
    if current_user.role != Role.admin:
        raise HTTPException(status_code=403, detail="Only admins can invite users")

    email = data.email.lower().strip()

    # Check if already exists
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=409, detail="User with this email already exists")

    user = User(
        email=email,
        role=data.role,
        invite_status=InviteStatus.pending,
        invited_by_id=current_user.id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return {"data": _serialize_user(user)}


@router.put("/{user_id}")
def update_user_role(
    user_id: int,
    data: UserRoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Change a user's role. Admin only."""
    if current_user.role != Role.admin:
        raise HTTPException(status_code=403, detail="Only admins can change roles")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent self-demotion
    if user.id == current_user.id and data.role != Role.admin:
        raise HTTPException(status_code=400, detail="Cannot demote yourself")

    user.role = data.role
    db.commit()
    db.refresh(user)

    return {"data": _serialize_user(user)}


@router.delete("/{user_id}")
def revoke_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a user's access by deleting them. Admin only."""
    if current_user.role != Role.admin:
        raise HTTPException(status_code=403, detail="Only admins can revoke access")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot revoke your own access")

    db.delete(user)
    db.commit()

    return {"data": {"deleted": True}}
