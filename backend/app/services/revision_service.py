from sqlalchemy.orm import Session

from app.models.revision import Revision


def get_revisions(db: Session, entity_type: str, entity_id: int) -> list[Revision]:
    return (
        db.query(Revision)
        .filter(Revision.entity_type == entity_type, Revision.entity_id == entity_id)
        .order_by(Revision.created_at.desc())
        .all()
    )


def serialize_revision(revision: Revision) -> dict:
    return {
        "id": revision.id,
        "entity_type": revision.entity_type,
        "entity_id": revision.entity_id,
        "field_changed": revision.field_changed,
        "old_value": revision.old_value,
        "new_value": revision.new_value,
        "submitted_by_id": revision.submitted_by_id,
        "approved_by_id": revision.approved_by_id,
        "comment": revision.comment,
        "action": revision.action.value,
        "created_at": revision.created_at.isoformat() if revision.created_at else None,
    }
