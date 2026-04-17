from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.enums import Role
from app.services import admin_log_service

router = APIRouter()


@router.get("")
def get_admin_logs(
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != Role.admin:
        raise HTTPException(status_code=403, detail="Only admins can view action logs")

    logs = admin_log_service.get_logs(db, limit)
    return {"data": [admin_log_service.serialize_log(entry, db) for entry in logs]}
