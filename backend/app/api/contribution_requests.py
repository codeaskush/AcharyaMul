from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.contribution_request import ContributionRequest
from app.models.enums import Role
from app.services.admin_log_service import log_action

router = APIRouter()

VALID_AREAS = ["members", "events", "news", "articles", "literature"]


class ContributionRequestCreate(BaseModel):
    areas: list[str] = Field(..., min_length=1)
    message: str | None = None


class ContributionRequestReview(BaseModel):
    action: str = Field(..., pattern="^(approve|reject)$")
    comment: str = Field(..., min_length=1)


def _serialize(req: ContributionRequest, db: Session = None) -> dict:
    result = {
        "id": req.id,
        "user_id": req.user_id,
        "areas": req.areas,
        "message": req.message,
        "status": req.status,
        "admin_comment": req.admin_comment,
        "reviewed_by_id": req.reviewed_by_id,
        "created_at": req.created_at.isoformat() if req.created_at else None,
        "reviewed_at": req.reviewed_at.isoformat() if req.reviewed_at else None,
    }
    if db:
        user = db.query(User).filter(User.id == req.user_id).first()
        if user:
            result["user_name"] = user.display_name or user.email
            result["user_email"] = user.email
    return result


@router.post("", status_code=status.HTTP_201_CREATED)
def submit_request(
    data: ContributionRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Viewer submits interest to become a contributor."""
    # Validate areas
    for area in data.areas:
        if area not in VALID_AREAS:
            raise HTTPException(status_code=400, detail=f"Invalid area: {area}. Valid: {VALID_AREAS}")

    # Check for existing pending request
    existing = db.query(ContributionRequest).filter(
        ContributionRequest.user_id == current_user.id,
        ContributionRequest.status == "pending",
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="You already have a pending contribution request")

    req = ContributionRequest(
        user_id=current_user.id,
        areas=data.areas,
        message=data.message,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return {"data": _serialize(req)}


@router.get("/mine")
def get_my_request(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get current user's latest contribution request."""
    req = (
        db.query(ContributionRequest)
        .filter(ContributionRequest.user_id == current_user.id)
        .order_by(ContributionRequest.created_at.desc())
        .first()
    )
    return {"data": _serialize(req) if req else None}


@router.get("/pending")
def get_pending_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Admin: list all pending contribution requests."""
    if current_user.role != Role.admin:
        raise HTTPException(status_code=403, detail="Only admins can view contribution requests")

    requests = (
        db.query(ContributionRequest)
        .filter(ContributionRequest.status == "pending")
        .order_by(ContributionRequest.created_at.asc())
        .all()
    )
    return {"data": [_serialize(r, db) for r in requests]}


@router.put("/{request_id}/review")
def review_request(
    request_id: int,
    data: ContributionRequestReview,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Admin: approve or reject a contribution request."""
    if current_user.role != Role.admin:
        raise HTTPException(status_code=403, detail="Only admins can review contribution requests")

    req = db.query(ContributionRequest).filter(ContributionRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    if req.status != "pending":
        raise HTTPException(status_code=400, detail="Request already reviewed")

    req.status = data.action + "d"  # "approved" or "rejected"
    req.admin_comment = data.comment
    req.reviewed_by_id = current_user.id
    req.reviewed_at = datetime.utcnow()

    # On approve, promote user to contributor
    if data.action == "approve":
        user = db.query(User).filter(User.id == req.user_id).first()
        if user and user.role == Role.viewer:
            user.role = Role.contributor
            log_action(db, current_user, action="role_changed", target_type="user", target_id=user.id,
                       details={"old_role": "viewer", "new_role": "contributor", "email": user.email, "via": "contribution_request"})

    log_action(db, current_user, action=f"contribution_request_{data.action}d", target_type="contribution_request", target_id=request_id,
               details={"areas": req.areas}, comment=data.comment)

    db.commit()
    db.refresh(req)
    return {"data": _serialize(req, db)}
