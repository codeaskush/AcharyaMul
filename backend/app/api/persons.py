from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.enums import Role
from app.schemas.person import PersonCreate, PersonUpdate
from app.services import person_service, revision_service, photo_service

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
    per_page: int = Query(25, ge=1, le=100),
    sort_by: str = Query("first_name"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    is_admin = current_user.role == Role.admin
    persons, total = person_service.get_all_persons(db, page, per_page, sort_by)
    return {
        "data": [person_service.serialize_person(p, is_admin=is_admin) for p in persons],
        "pagination": {"page": page, "per_page": per_page, "total": total},
    }


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
