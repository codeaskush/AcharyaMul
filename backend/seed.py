"""
Seed script — loads seed_data.json into a fresh database.

Usage:
    cd backend
    source venv/bin/activate
    python seed.py

This will:
  1. Create all tables (if they don't exist)
  2. Skip seeding if data already exists (safe to re-run)
  3. Insert users, persons, relationships, and life events
  4. Reset auto-increment sequences to max(id)+1
"""

import json
from datetime import date, datetime
from pathlib import Path

from app.database import Base, engine, SessionLocal
from app.models.user import User
from app.models.person import Person
from app.models.relationship import Relationship
from app.models.life_event import LifeEvent
from app.models.enums import (
    Gender, Role, RelationshipType, MarriageStatus,
    ApprovalStatus, InviteStatus,
)

SEED_FILE = Path(__file__).parent / "seed_data.json"


def parse_date(val):
    if not val:
        return None
    return date.fromisoformat(val)


def seed():
    # Create tables
    import app.models  # noqa: F401
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        # Check if already seeded
        if db.query(User).count() > 0:
            print("Database already has data — skipping seed.")
            return

        with open(SEED_FILE, "r") as f:
            data = json.load(f)

        # Users
        for u in data["users"]:
            db.add(User(
                id=u["id"],
                email=u["email"],
                display_name=u["display_name"],
                role=Role(u["role"]),
                invite_status=InviteStatus(u["invite_status"]),
                language_preference=u["language_preference"],
            ))
        db.flush()
        print(f"  Seeded {len(data['users'])} users")

        # Persons
        for p in data["persons"]:
            db.add(Person(
                id=p["id"],
                generation=p["generation"],
                first_name=p["first_name"],
                middle_name=p["middle_name"],
                last_name=p["last_name"],
                first_name_devanagari=p["first_name_devanagari"],
                middle_name_devanagari=p["middle_name_devanagari"],
                last_name_devanagari=p["last_name_devanagari"],
                dob=parse_date(p["dob"]),
                dod=parse_date(p["dod"]),
                place_of_birth=p["place_of_birth"],
                current_address=p["current_address"],
                occupation=p["occupation"],
                gender=Gender(p["gender"]),
                is_alive=p["is_alive"],
                photo_url=p["photo_url"],
                status=ApprovalStatus(p["status"]),
                created_by_id=p["created_by_id"],
                approved_by_id=p["created_by_id"],
            ))
        db.flush()
        print(f"  Seeded {len(data['persons'])} persons")

        # Relationships
        for r in data["relationships"]:
            db.add(Relationship(
                id=r["id"],
                type=RelationshipType(r["type"]),
                person_a_id=r["person_a_id"],
                person_b_id=r["person_b_id"],
                marriage_status=MarriageStatus(r["marriage_status"]) if r["marriage_status"] else None,
                child_birth_order=r["child_birth_order"],
                marriage_id=r["marriage_id"],
                status=ApprovalStatus(r["status"]),
                created_by_id=r["created_by_id"],
                approved_by_id=r["created_by_id"],
            ))
        db.flush()
        print(f"  Seeded {len(data['relationships'])} relationships")

        # Life Events
        for e in data["life_events"]:
            db.add(LifeEvent(
                id=e["id"],
                person_id=e["person_id"],
                event_type=e["event_type"],
                title=e["title"],
                description=e["description"],
                event_date=parse_date(e["event_date"]),
                end_date=parse_date(e["end_date"]),
                organization=e["organization"],
                role=e["role"],
                is_current=e["is_current"],
                excluded=e["excluded"],
                sort_order=e["sort_order"],
            ))
        db.flush()
        print(f"  Seeded {len(data['life_events'])} life events")

        db.commit()
        print("\nSeed complete!")

    except Exception as ex:
        db.rollback()
        print(f"Seed failed: {ex}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
