from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from fastapi import Query as QueryParam

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.relationship import Relationship
from app.models.enums import Role, RelationshipType
from app.schemas.relationship import RelationshipCreate, RelationshipUpdate
from app.services import relationship_service, revision_service, person_service

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


@router.get("/marriages/{person_id}")
def get_marriages_for_person(
    person_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all marriages for a person, with spouse details."""
    rels = (
        db.query(Relationship)
        .filter(
            Relationship.type == RelationshipType.marriage,
            (Relationship.person_a_id == person_id) | (Relationship.person_b_id == person_id),
        )
        .all()
    )
    result = []
    for r in rels:
        spouse_id = r.person_b_id if r.person_a_id == person_id else r.person_a_id
        spouse = person_service.get_person_by_id(db, spouse_id)
        result.append({
            "marriage_id": r.id,
            "spouse_id": spouse_id,
            "spouse_name": f"{spouse.first_name} {spouse.last_name or ''}".strip() if spouse else "Unknown",
            "spouse_gender": spouse.gender.value if spouse else None,
            "marriage_status": r.marriage_status.value if r.marriage_status else None,
        })
    return {"data": result}


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
