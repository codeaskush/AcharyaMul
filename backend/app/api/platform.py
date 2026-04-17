import json
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db, Base, engine
from app.dependencies import get_current_user
from app.models.user import User
from app.models.person import Person
from app.models.relationship import Relationship
from app.models.life_event import LifeEvent
from app.models.contribution import Contribution
from app.models.admin_log import AdminLog
from app.models.contribution_request import ContributionRequest
from app.models.revision import Revision
from app.models.enums import Role, Gender, ApprovalStatus, RelationshipType, MarriageStatus, InviteStatus
from app.services.admin_log_service import log_action
from app.config import settings

router = APIRouter()

SEED_FILE = Path(__file__).parent.parent.parent / "seed_data.json"


def _parse_date(val):
    if not val:
        return None
    from datetime import date
    return date.fromisoformat(val)


@router.post("/clear-database")
def clear_database(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Clear all family data (persons, relationships, life events, contributions). Keeps users."""
    if current_user.role != Role.admin:
        raise HTTPException(status_code=403, detail="Only admins can clear the database")
    if settings.app_env != "development":
        raise HTTPException(status_code=403, detail="Database clear is only available in development mode")

    # Delete in order to respect FK constraints
    db.query(LifeEvent).delete()
    db.query(Contribution).delete()
    db.query(ContributionRequest).delete()
    db.query(Revision).delete()
    db.query(AdminLog).delete()
    db.query(Relationship).delete()
    db.query(Person).delete()
    db.commit()

    log_action(db, current_user, action="database_cleared", target_type="platform")
    db.commit()

    return {"data": {"message": "All family data cleared. Users preserved."}}


@router.post("/load-seed")
def load_seed_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Load seed data from seed_data.json into the database. Clears existing family data first."""
    if current_user.role != Role.admin:
        raise HTTPException(status_code=403, detail="Only admins can load seed data")
    if settings.app_env != "development":
        raise HTTPException(status_code=403, detail="Seed loading is only available in development mode")

    if not SEED_FILE.exists():
        raise HTTPException(status_code=404, detail="seed_data.json not found")

    with open(SEED_FILE, "r") as f:
        data = json.load(f)

    # Clear existing family data
    db.query(LifeEvent).delete()
    db.query(Contribution).delete()
    db.query(ContributionRequest).delete()
    db.query(Revision).delete()
    db.query(AdminLog).delete()
    db.query(Relationship).delete()
    db.query(Person).delete()
    db.commit()

    # Load persons
    for p in data.get("persons", []):
        db.add(Person(
            id=p["id"], generation=p["generation"],
            first_name=p["first_name"], middle_name=p.get("middle_name"),
            last_name=p.get("last_name"),
            first_name_devanagari=p.get("first_name_devanagari"),
            middle_name_devanagari=p.get("middle_name_devanagari"),
            last_name_devanagari=p.get("last_name_devanagari"),
            dob=_parse_date(p.get("dob")), dod=_parse_date(p.get("dod")),
            place_of_birth=p.get("place_of_birth"),
            current_address=p.get("current_address"),
            occupation=p.get("occupation"),
            gender=Gender(p["gender"]),
            is_alive=p.get("is_alive", True),
            photo_url=p.get("photo_url"),
            status=ApprovalStatus(p.get("status", "approved")),
            created_by_id=p.get("created_by_id", current_user.id),
            approved_by_id=p.get("created_by_id", current_user.id),
        ))
    db.flush()

    # Load relationships
    for r in data.get("relationships", []):
        db.add(Relationship(
            id=r["id"],
            type=RelationshipType(r["type"]),
            person_a_id=r["person_a_id"], person_b_id=r["person_b_id"],
            marriage_status=MarriageStatus(r["marriage_status"]) if r.get("marriage_status") else None,
            child_birth_order=r.get("child_birth_order"),
            marriage_id=r.get("marriage_id"),
            status=ApprovalStatus(r.get("status", "approved")),
            created_by_id=r.get("created_by_id", current_user.id),
            approved_by_id=r.get("created_by_id", current_user.id),
        ))
    db.flush()

    # Load life events
    for e in data.get("life_events", []):
        db.add(LifeEvent(
            id=e["id"], person_id=e["person_id"],
            event_type=e["event_type"], title=e["title"],
            description=e.get("description"),
            event_date=_parse_date(e.get("event_date")),
            end_date=_parse_date(e.get("end_date")),
            organization=e.get("organization"), role=e.get("role"),
            is_current=e.get("is_current", False),
            excluded=e.get("excluded", False),
            sort_order=e.get("sort_order", 0),
        ))

    db.commit()

    log_action(db, current_user, action="seed_data_loaded", target_type="platform",
               details={"persons": len(data.get("persons", [])), "relationships": len(data.get("relationships", []))})
    db.commit()

    return {"data": {
        "message": "Seed data loaded successfully",
        "persons": len(data.get("persons", [])),
        "relationships": len(data.get("relationships", [])),
        "life_events": len(data.get("life_events", [])),
    }}


@router.post("/sync-seed")
def sync_to_seed(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export current approved family data to seed_data.json."""
    if current_user.role != Role.admin:
        raise HTTPException(status_code=403, detail="Only admins can sync seed data")
    if settings.app_env != "development":
        raise HTTPException(status_code=403, detail="Seed sync is only available in development mode")

    persons = db.query(Person).filter(Person.status == ApprovalStatus.approved).order_by(Person.id).all()
    relationships = db.query(Relationship).order_by(Relationship.id).all()
    life_events = db.query(LifeEvent).order_by(LifeEvent.id).all()
    users = db.query(User).all()

    seed = {
        "users": [{
            "id": u.id, "email": u.email, "display_name": u.display_name,
            "role": u.role.value, "invite_status": u.invite_status.value,
            "language_preference": u.language_preference,
        } for u in users],
        "persons": [{
            "id": p.id, "generation": p.generation,
            "first_name": p.first_name, "middle_name": p.middle_name, "last_name": p.last_name,
            "first_name_devanagari": p.first_name_devanagari,
            "middle_name_devanagari": p.middle_name_devanagari,
            "last_name_devanagari": p.last_name_devanagari,
            "dob": str(p.dob) if p.dob else None, "dod": str(p.dod) if p.dod else None,
            "place_of_birth": p.place_of_birth, "current_address": p.current_address,
            "occupation": p.occupation, "gender": p.gender.value,
            "is_alive": p.is_alive, "photo_url": p.photo_url,
            "status": p.status.value, "created_by_id": p.created_by_id,
            "visibility_settings": p.visibility_settings,
        } for p in persons],
        "relationships": [{
            "id": r.id, "type": r.type.value,
            "person_a_id": r.person_a_id, "person_b_id": r.person_b_id,
            "marriage_status": r.marriage_status.value if r.marriage_status else None,
            "child_birth_order": r.child_birth_order, "marriage_id": r.marriage_id,
            "status": r.status.value, "created_by_id": r.created_by_id,
        } for r in relationships],
        "life_events": [{
            "id": e.id, "person_id": e.person_id,
            "event_type": e.event_type, "title": e.title, "description": e.description,
            "event_date": str(e.event_date) if e.event_date else None,
            "end_date": str(e.end_date) if e.end_date else None,
            "organization": e.organization, "role": e.role,
            "is_current": e.is_current, "excluded": e.excluded, "sort_order": e.sort_order,
        } for e in life_events],
    }

    with open(SEED_FILE, "w") as f:
        json.dump(seed, f, indent=2)

    log_action(db, current_user, action="seed_data_synced", target_type="platform",
               details={"persons": len(persons), "relationships": len(relationships)})
    db.commit()

    return {"data": {
        "message": "Current data synced to seed_data.json",
        "persons": len(persons),
        "relationships": len(relationships),
        "life_events": len(life_events),
    }}
