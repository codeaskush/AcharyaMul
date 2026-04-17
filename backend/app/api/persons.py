from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.enums import Role
from pydantic import BaseModel, Field
from app.schemas.person import PersonCreate, PersonUpdate
from app.models.enums import ApprovalStatus
from app.services import person_service, revision_service, photo_service
from app.services.admin_log_service import log_action

router = APIRouter()


@router.post("", status_code=status.HTTP_201_CREATED)
def create_person(
    data: PersonCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != Role.admin:
        raise HTTPException(status_code=403, detail="Only admins can create persons directly")

    person = person_service.create_person(db, data, current_user)
    return {"data": person_service.serialize_person(person, is_admin=True)}


@router.get("")
def list_persons(
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=500),
    sort_by: str = Query("first_name"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    is_admin = current_user.role == Role.admin
    is_viewer = current_user.role == Role.viewer
    persons, total = person_service.get_all_persons(db, page, per_page, sort_by, approved_only=is_viewer)
    return {
        "data": [person_service.serialize_person(p, is_admin=is_admin) for p in persons],
        "pagination": {"page": page, "per_page": per_page, "total": total},
    }


@router.get("/quarantined")
def list_quarantined(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all quarantined persons. Admin only."""
    if current_user.role != Role.admin:
        raise HTTPException(status_code=403, detail="Only admins can view quarantined persons")

    from app.models.person import Person
    persons = db.query(Person).filter(Person.status == ApprovalStatus.quarantined).order_by(Person.first_name).all()
    return {"data": [person_service.serialize_person(p, is_admin=True) for p in persons]}


@router.get("/{person_id}")
def get_person(
    person_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    person = person_service.get_person_by_id(db, person_id)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    is_admin = current_user.role == Role.admin
    return {"data": person_service.serialize_person(person, is_admin=is_admin)}


@router.put("/{person_id}")
def update_person(
    person_id: int,
    data: PersonUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != Role.admin:
        raise HTTPException(status_code=403, detail="Only admins can edit persons directly")

    person = person_service.get_person_by_id(db, person_id)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    updated = person_service.update_person(db, person, data, current_user)
    return {"data": person_service.serialize_person(updated, is_admin=True)}


@router.put("/{person_id}/visibility")
def update_visibility(
    person_id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != Role.admin:
        raise HTTPException(status_code=403, detail="Only admins can change visibility settings")

    person = person_service.get_person_by_id(db, person_id)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    # Validate keys and build new dict (SQLAlchemy needs a new object to detect JSON change)
    allowed_keys = {"dob", "address", "phone", "email"}
    visibility = dict(person.visibility_settings or {"dob": True, "address": True, "phone": True, "email": True})
    for key, val in data.items():
        if key in allowed_keys and isinstance(val, bool):
            visibility[key] = val

    person.visibility_settings = visibility
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(person, "visibility_settings")
    db.commit()
    db.refresh(person)
    return {"data": person_service.serialize_person(person, is_admin=True)}


@router.get("/{person_id}/revisions")
def get_person_revisions(
    person_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != Role.admin:
        raise HTTPException(status_code=403, detail="Only admins can view revision history")

    person = person_service.get_person_by_id(db, person_id)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    revisions = revision_service.get_revisions(db, "person", person_id)
    return {"data": [revision_service.serialize_revision(r) for r in revisions]}


@router.post("/{person_id}/photo", status_code=status.HTTP_200_OK)
async def upload_photo(
    person_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != Role.admin:
        raise HTTPException(status_code=403, detail="Only admins can upload photos directly")

    person = person_service.get_person_by_id(db, person_id)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    try:
        photo_url = await photo_service.save_photo(file)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Delete old photo if exists
    photo_service.delete_photo(person.photo_url)

    old_url = person.photo_url
    person.photo_url = photo_url
    db.commit()
    db.refresh(person)

    return {"data": person_service.serialize_person(person, is_admin=True)}


class QuarantineRequest(BaseModel):
    reason: str = Field(..., min_length=1)


@router.put("/{person_id}/quarantine")
def quarantine_person(
    person_id: int,
    data: QuarantineRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Soft-delete: set person status to pending (quarantine for review)."""
    if current_user.role != Role.admin:
        raise HTTPException(status_code=403, detail="Only admins can quarantine persons")

    person = person_service.get_person_by_id(db, person_id)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    person.status = ApprovalStatus.quarantined
    log_action(db, current_user, action="person_quarantined", target_type="person", target_id=person_id,
               details={"name": f"{person.first_name} {person.last_name or ''}".strip()}, comment=data.reason)
    db.commit()
    db.refresh(person)
    return {"data": person_service.serialize_person(person, is_admin=True)}


@router.put("/{person_id}/restore")
def restore_person(
    person_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Restore a quarantined person back to approved."""
    if current_user.role != Role.admin:
        raise HTTPException(status_code=403, detail="Only admins can restore persons")

    person = person_service.get_person_by_id(db, person_id)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    person.status = ApprovalStatus.approved
    person.approved_by_id = current_user.id
    log_action(db, current_user, action="person_restored", target_type="person", target_id=person_id,
               details={"name": f"{person.first_name} {person.last_name or ''}".strip()})
    db.commit()
    db.refresh(person)
    return {"data": person_service.serialize_person(person, is_admin=True)}


@router.put("/{person_id}/soft-delete")
def soft_delete_person(
    person_id: int,
    data: QuarantineRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Permanently remove a quarantined person from the tree."""
    if current_user.role != Role.admin:
        raise HTTPException(status_code=403, detail="Only admins can delete persons")

    person = person_service.get_person_by_id(db, person_id)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    if person.status != ApprovalStatus.quarantined:
        raise HTTPException(status_code=400, detail="Person must be quarantined before deletion")

    log_action(db, current_user, action="person_deleted", target_type="person", target_id=person_id,
               details={"name": f"{person.first_name} {person.last_name or ''}"}, comment=data.reason)

    # Delete related relationships
    from app.models.relationship import Relationship
    db.query(Relationship).filter(
        (Relationship.person_a_id == person_id) | (Relationship.person_b_id == person_id)
    ).delete(synchronize_session=False)

    # Delete life events
    from app.models.life_event import LifeEvent
    db.query(LifeEvent).filter(LifeEvent.person_id == person_id).delete(synchronize_session=False)

    db.delete(person)
    db.commit()
    return {"data": {"deleted": True}}
