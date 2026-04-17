from sqlalchemy.orm import Session

from app.models.person import Person
from app.models.relationship import Relationship
from app.models.revision import Revision
from app.models.user import User
from app.models.enums import RelationshipType, MarriageStatus, ApprovalStatus, RevisionAction
from app.schemas.relationship import RelationshipCreate, RelationshipUpdate


def create_relationship(db: Session, data: RelationshipCreate, current_user: User) -> Relationship:
    # For marriage: set marriage_status to active if not provided
    marriage_status = data.marriage_status
    if data.type == RelationshipType.marriage and marriage_status is None:
        marriage_status = MarriageStatus.active

    relationship = Relationship(
        person_a_id=data.person_a_id,
        person_b_id=data.person_b_id,
        type=data.type,
        marriage_status=marriage_status,
        marriage_date=data.marriage_date,
        marriage_location=data.marriage_location,
        child_birth_order=data.child_birth_order,
        marriage_id=data.marriage_id,
        status=ApprovalStatus.approved,
        created_by_id=current_user.id,
        approved_by_id=current_user.id,
    )
    db.add(relationship)
    db.flush()

    # For parent-child: update child's generation
    if data.type == RelationshipType.parent_child:
        _update_child_generation(db, data.person_a_id, data.person_b_id)

    # For marriage: sync spouse's generation to match
    if data.type == RelationshipType.marriage:
        _sync_spouse_generation(db, data.person_a_id, data.person_b_id)

    # Create revision
    person_a = db.query(Person).get(data.person_a_id)
    person_b = db.query(Person).get(data.person_b_id)
    type_label = "spouse" if data.type == RelationshipType.marriage else "child"
    revision = Revision(
        entity_type="relationship",
        entity_id=relationship.id,
        field_changed="*",
        old_value=None,
        new_value=f"{person_a.first_name} → {person_b.first_name} ({type_label})",
        submitted_by_id=current_user.id,
        approved_by_id=current_user.id,
        comment=f"Created {type_label} relationship",
        action=RevisionAction.create,
    )
    db.add(revision)
    db.commit()
    db.refresh(relationship)

    return relationship


def _sync_spouse_generation(db: Session, person_a_id: int, person_b_id: int):
    """When two people marry, sync the spouse with no parent to match the other's generation."""
    a = db.query(Person).get(person_a_id)
    b = db.query(Person).get(person_b_id)
    if not a or not b:
        return
    # If one has a higher generation (is a child in the tree), update the other to match
    if a.generation != b.generation:
        if a.generation > b.generation:
            b.generation = a.generation
        else:
            a.generation = b.generation


def _update_child_generation(db: Session, parent_id: int, child_id: int):
    """Set child's generation to parent's generation + 1, cascade to descendants."""
    parent = db.query(Person).get(parent_id)
    child = db.query(Person).get(child_id)
    if not parent or not child:
        return

    new_generation = parent.generation + 1
    if child.generation == new_generation:
        return

    old_generation = child.generation
    child.generation = new_generation

    # Sync spouse of the child to match new generation
    _sync_spouse_of(db, child_id)

    # Cascade: update all descendants of this child
    _cascade_generation(db, child_id, new_generation - old_generation)


def _sync_spouse_of(db: Session, person_id: int):
    """Find this person's spouse(s) and sync their generation."""
    spouse_rels = (
        db.query(Relationship)
        .filter(
            Relationship.type == RelationshipType.marriage,
            (Relationship.person_a_id == person_id) | (Relationship.person_b_id == person_id),
        )
        .all()
    )
    person = db.query(Person).get(person_id)
    if not person:
        return
    for rel in spouse_rels:
        spouse_id = rel.person_b_id if rel.person_a_id == person_id else rel.person_a_id
        spouse = db.query(Person).get(spouse_id)
        if spouse and spouse.generation != person.generation:
            spouse.generation = person.generation


def _cascade_generation(db: Session, person_id: int, delta: int):
    """Recursively update generation for all descendants."""
    child_rels = (
        db.query(Relationship)
        .filter(
            Relationship.person_a_id == person_id,
            Relationship.type == RelationshipType.parent_child,
        )
        .all()
    )
    for rel in child_rels:
        descendant = db.query(Person).get(rel.person_b_id)
        if descendant:
            descendant.generation += delta
            _cascade_generation(db, descendant.id, delta)


def update_relationship(db: Session, relationship: Relationship, data: RelationshipUpdate, current_user: User) -> Relationship:
    update_data = data.model_dump(exclude_unset=True, exclude={"comment"})

    for field, new_value in update_data.items():
        old_value = getattr(relationship, field)
        if old_value != new_value:
            revision = Revision(
                entity_type="relationship",
                entity_id=relationship.id,
                field_changed=field,
                old_value=str(old_value) if old_value is not None else None,
                new_value=str(new_value) if new_value is not None else None,
                submitted_by_id=current_user.id,
                approved_by_id=current_user.id,
                comment=data.comment,
                action=RevisionAction.update,
            )
            db.add(revision)
            setattr(relationship, field, new_value)

    db.commit()
    db.refresh(relationship)
    return relationship


def get_relationship_by_id(db: Session, rel_id: int) -> Relationship | None:
    return db.query(Relationship).filter(Relationship.id == rel_id).first()


def get_all_relationships(db: Session, include_pending: bool = True) -> list[Relationship]:
    query = db.query(Relationship)
    if not include_pending:
        query = query.filter(Relationship.status == ApprovalStatus.approved)
    return query.all()


def serialize_relationship(rel: Relationship, db: Session = None) -> dict:
    from app.services.bs_ad_converter import date_to_display
    result = {
        "id": rel.id,
        "person_a_id": rel.person_a_id,
        "person_b_id": rel.person_b_id,
        "type": rel.type.value,
        "marriage_status": rel.marriage_status.value if rel.marriage_status else None,
        "marriage_date": date_to_display(rel.marriage_date),
        "marriage_location": rel.marriage_location,
        "child_birth_order": rel.child_birth_order,
        "marriage_id": rel.marriage_id,
        "status": rel.status.value,
        "created_at": rel.created_at.isoformat() if rel.created_at else None,
        "updated_at": rel.updated_at.isoformat() if rel.updated_at else None,
    }
    # Resolve person names when db is available
    if db:
        for key in ("person_a_id", "person_b_id"):
            pid = getattr(rel, key)
            person = db.query(Person).filter(Person.id == pid).first()
            if person:
                result[f"{key}_name"] = " ".join(filter(None, [person.first_name, person.middle_name, person.last_name]))
    return result
