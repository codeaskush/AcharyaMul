from sqlalchemy.orm import Session

from app.models.admin_log import AdminLog
from app.models.user import User
from app.models.person import Person


def log_action(
    db: Session, admin: User, action: str,
    target_type: str = None, target_id: int = None,
    details: dict = None, comment: str = None,
):
    entry = AdminLog(
        admin_id=admin.id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        details=details,
        comment=comment,
    )
    db.add(entry)
    # Don't commit here — let the caller commit as part of their transaction


def get_logs(db: Session, limit: int = 100) -> list[AdminLog]:
    return (
        db.query(AdminLog)
        .order_by(AdminLog.created_at.desc())
        .limit(limit)
        .all()
    )


def serialize_log(entry: AdminLog, db: Session = None) -> dict:
    result = {
        "id": entry.id,
        "admin_id": entry.admin_id,
        "action": entry.action,
        "target_type": entry.target_type,
        "target_id": entry.target_id,
        "details": entry.details,
        "comment": entry.comment,
        "created_at": entry.created_at.isoformat() if entry.created_at else None,
    }

    if db:
        # Resolve admin name
        admin = db.query(User).filter(User.id == entry.admin_id).first()
        if admin:
            result["admin_name"] = admin.display_name or admin.email

        # Resolve target name
        if entry.target_type == "person" and entry.target_id:
            # Try details.name first (stored on deletion when person no longer exists)
            if entry.details and entry.details.get("name"):
                result["target_name"] = entry.details["name"]
            else:
                person = db.query(Person).filter(Person.id == entry.target_id).first()
                if person:
                    result["target_name"] = " ".join(filter(None, [person.first_name, person.middle_name, person.last_name]))

        elif entry.target_type == "user" and entry.target_id:
            if entry.details and entry.details.get("email"):
                result["target_name"] = entry.details["email"]
            else:
                user = db.query(User).filter(User.id == entry.target_id).first()
                if user:
                    result["target_name"] = user.display_name or user.email

        elif entry.target_type == "contribution" and entry.details:
            # For contribution actions, build a summary
            ctype = entry.details.get("contribution_type", "")
            etype = entry.details.get("entity_type", "")
            eid = entry.details.get("entity_id")
            if etype == "person" and eid:
                person = db.query(Person).filter(Person.id == eid).first()
                if person:
                    result["target_name"] = f"{ctype}: {person.first_name} {person.last_name or ''}".strip()
                else:
                    result["target_name"] = f"{ctype}: person #{eid}"
            else:
                result["target_name"] = f"{ctype}: {etype} #{eid}" if eid else ctype

    return result
