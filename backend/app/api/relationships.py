from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from fastapi import Query as QueryParam

from pydantic import BaseModel, Field
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.relationship import Relationship
from app.models.revision import Revision
from app.models.enums import Role, RelationshipType, RevisionAction
from app.schemas.relationship import RelationshipCreate, RelationshipUpdate
from app.services import relationship_service, revision_service, person_service
from app.services.admin_log_service import log_action

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
    return {"data": relationship_service.serialize_relationship(rel, db)}


@router.get("")
def list_relationships(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rels = relationship_service.get_all_relationships(db)
    return {"data": [relationship_service.serialize_relationship(r, db) for r in rels]}


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


@router.get("/parents/{child_id}")
def get_parents_for_child(
    child_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all parent-child relationships where this person is the child."""
    rels = (
        db.query(Relationship)
        .filter(
            Relationship.type == RelationshipType.parent_child,
            Relationship.person_b_id == child_id,
        )
        .all()
    )
    # Collect all parent IDs for this child
    parent_ids = set(r.person_a_id for r in rels)

    # For each parent, resolve their info + spouse via marriage
    result = []
    for r in rels:
        parent = person_service.get_person_by_id(db, r.person_a_id)
        entry = {
            "relationship_id": r.id,
            "parent_id": r.person_a_id,
            "parent_name": f"{parent.first_name} {parent.middle_name or ''} {parent.last_name or ''}".strip() if parent else "Unknown",
            "parent_gender": parent.gender.value if parent else None,
            "marriage_id": r.marriage_id,
            "spouse": None,
            "marriage_info": None,
        }

        # Resolve spouse via marriage_id
        if r.marriage_id:
            marriage = db.query(Relationship).filter(Relationship.id == r.marriage_id).first()
            if marriage:
                spouse_id = marriage.person_b_id if marriage.person_a_id == r.person_a_id else marriage.person_a_id
                spouse = person_service.get_person_by_id(db, spouse_id)
                if spouse:
                    entry["spouse"] = {
                        "id": spouse.id,
                        "name": f"{spouse.first_name} {spouse.middle_name or ''} {spouse.last_name or ''}".strip(),
                        "gender": spouse.gender.value,
                        "is_also_parent": spouse.id in parent_ids,
                    }
                entry["marriage_info"] = {
                    "id": marriage.id,
                    "status": marriage.marriage_status.value if marriage.marriage_status else "active",
                    "date": str(marriage.marriage_date) if marriage.marriage_date else None,
                    "location": marriage.marriage_location,
                }
        else:
            # No marriage link — try to find spouse from other parent links
            # (if there's another parent for this child who is married to this parent)
            for other_r in rels:
                if other_r.person_a_id != r.person_a_id:
                    # Check if these two parents are married
                    marriage = (
                        db.query(Relationship)
                        .filter(
                            Relationship.type == RelationshipType.marriage,
                            ((Relationship.person_a_id == r.person_a_id) & (Relationship.person_b_id == other_r.person_a_id)) |
                            ((Relationship.person_a_id == other_r.person_a_id) & (Relationship.person_b_id == r.person_a_id)),
                        )
                        .first()
                    )
                    if marriage:
                        other_parent = person_service.get_person_by_id(db, other_r.person_a_id)
                        if other_parent:
                            entry["spouse"] = {
                                "id": other_parent.id,
                                "name": f"{other_parent.first_name} {other_parent.middle_name or ''} {other_parent.last_name or ''}".strip(),
                                "gender": other_parent.gender.value,
                                "is_also_parent": True,
                            }
                            entry["marriage_info"] = {
                                "id": marriage.id,
                                "status": marriage.marriage_status.value if marriage.marriage_status else "active",
                                "date": str(marriage.marriage_date) if marriage.marriage_date else None,
                                "location": marriage.marriage_location,
                            }
                        break

        result.append(entry)
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
    return {"data": relationship_service.serialize_relationship(rel, db)}


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


class RelationshipDeleteRequest(BaseModel):
    comment: str = Field(..., min_length=1)


@router.put("/{rel_id}/delete")
def delete_relationship(
    rel_id: int,
    data: RelationshipDeleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != Role.admin:
        raise HTTPException(status_code=403, detail="Only admins can delete relationships")

    rel = relationship_service.get_relationship_by_id(db, rel_id)
    if not rel:
        raise HTTPException(status_code=404, detail="Relationship not found")

    # Build description for the log
    person_a = person_service.get_person_by_id(db, rel.person_a_id)
    person_b = person_service.get_person_by_id(db, rel.person_b_id)
    a_name = f"{person_a.first_name} {person_a.last_name or ''}".strip() if person_a else f"#{rel.person_a_id}"
    b_name = f"{person_b.first_name} {person_b.last_name or ''}".strip() if person_b else f"#{rel.person_b_id}"
    rel_label = "marriage" if rel.type == RelationshipType.marriage else "parent-child"

    # Create revision record
    revision = Revision(
        entity_type="relationship",
        entity_id=rel.id,
        field_changed="*",
        old_value=f"{a_name} → {b_name} ({rel_label})",
        new_value="DELETED",
        submitted_by_id=current_user.id,
        approved_by_id=current_user.id,
        comment=data.comment,
        action=RevisionAction.update,
    )
    db.add(revision)

    log_action(db, current_user, action="relationship_deleted", target_type="relationship", target_id=rel.id,
               details={"type": rel_label, "person_a": a_name, "person_b": b_name}, comment=data.comment)

    db.delete(rel)
    db.commit()

    return {"data": {"deleted": True}}
