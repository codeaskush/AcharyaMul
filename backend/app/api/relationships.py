from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.enums import Role
from app.schemas.relationship import RelationshipCreate, RelationshipUpdate
from app.services import relationship_service, revision_service

router = APIRouter()


@router.post("", status_code=status.HTTP_201_CREATED)
def create_relationship(
    data: RelationshipCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != Role.admin:
        raise HTTPException(status_code=403, detail="Only admins can create relationships directly")

    if data.person_a_id == data.person_b_id:
        raise HTTPException(status_code=400, detail="Cannot create a relationship between a person and themselves")

    rel = relationship_service.create_relationship(db, data, current_user)
    return {"data": relationship_service.serialize_relationship(rel)}


@router.get("")
def list_relationships(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rels = relationship_service.get_all_relationships(db)
    return {"data": [relationship_service.serialize_relationship(r) for r in rels]}


@router.get("/{rel_id}")
def get_relationship(
    rel_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rel = relationship_service.get_relationship_by_id(db, rel_id)
    if not rel:
        raise HTTPException(status_code=404, detail="Relationship not found")
    return {"data": relationship_service.serialize_relationship(rel)}


@router.put("/{rel_id}")
def update_relationship(
    rel_id: int,
    data: RelationshipUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != Role.admin:
        raise HTTPException(status_code=403, detail="Only admins can update relationships directly")

    rel = relationship_service.get_relationship_by_id(db, rel_id)
    if not rel:
        raise HTTPException(status_code=404, detail="Relationship not found")

    updated = relationship_service.update_relationship(db, rel, data, current_user)
    return {"data": relationship_service.serialize_relationship(updated)}


@router.get("/{rel_id}/revisions")
def get_relationship_revisions(
    rel_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != Role.admin:
        raise HTTPException(status_code=403, detail="Only admins can view revision history")

    rel = relationship_service.get_relationship_by_id(db, rel_id)
    if not rel:
        raise HTTPException(status_code=404, detail="Relationship not found")

    revisions = revision_service.get_revisions(db, "relationship", rel_id)
    return {"data": [revision_service.serialize_revision(r) for r in revisions]}
