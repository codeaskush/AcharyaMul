from datetime import date, datetime

from sqlalchemy.orm import Session
from sqlalchemy import func


def _json_safe(data: dict) -> dict:
    """Convert date objects to ISO strings for JSON storage."""
    out = {}
    for k, v in data.items():
        if isinstance(v, date):
            out[k] = v.isoformat()
        else:
            out[k] = v
    return out

from app.models.contribution import Contribution
from app.models.user import User
from app.models.person import Person
from app.models.relationship import Relationship
from app.models.enums import (
    ContributionType, ContributionStatus, ApprovalStatus,
    Gender, RelationshipType, MarriageStatus, RevisionAction,
)
from app.models.revision import Revision


def submit_field_edit(
    db: Session, person_id: int, field: str, value: str | None, message: str, user: User
) -> Contribution:
    """Story 6.1 — suggest a correction to a person's field."""
    contribution = Contribution(
        type=ContributionType.field_edit,
        entity_type="person",
        entity_id=person_id,
        data={"field": field, "value": value},
        contributor_message=message,
        submitted_by_id=user.id,
    )
    db.add(contribution)
    db.commit()
    db.refresh(contribution)
    return contribution


def submit_person_add(db: Session, person_data: dict, message: str | None, user: User) -> Contribution:
    """Story 6.2 — submit a new person (goes to pending)."""
    # Create the person with pending status
    person = Person(
        first_name=person_data["first_name"],
        middle_name=person_data.get("middle_name"),
        last_name=person_data.get("last_name"),
        first_name_devanagari=person_data.get("first_name_devanagari"),
        middle_name_devanagari=person_data.get("middle_name_devanagari"),
        last_name_devanagari=person_data.get("last_name_devanagari"),
        dob=person_data.get("dob"),
        dod=person_data.get("dod"),
        place_of_birth=person_data.get("place_of_birth"),
        current_address=person_data.get("current_address"),
        occupation=person_data.get("occupation"),
        gender=Gender(person_data["gender"]),
        is_alive=person_data.get("is_alive", True),
        generation=1,
        status=ApprovalStatus.pending,
        created_by_id=user.id,
    )
    db.add(person)
    db.flush()

    contribution = Contribution(
        type=ContributionType.person_add,
        entity_type="person",
        entity_id=person.id,
        data=_json_safe(person_data),
        contributor_message=message,
        submitted_by_id=user.id,
    )
    db.add(contribution)
    db.commit()
    db.refresh(contribution)
    return contribution


def submit_relationship_add(
    db: Session, person_a_id: int, person_b_id: int,
    rel_type: str, marriage_id: int | None, message: str | None, user: User
) -> Contribution:
    """Story 6.3 — submit a new relationship (goes to pending)."""
    # Create relationship with pending status
    relationship = Relationship(
        person_a_id=person_a_id,
        person_b_id=person_b_id,
        type=RelationshipType(rel_type),
        marriage_status=MarriageStatus.active if rel_type == "marriage" else None,
        marriage_id=marriage_id,
        status=ApprovalStatus.pending,
        created_by_id=user.id,
    )
    db.add(relationship)
    db.flush()

    contribution = Contribution(
        type=ContributionType.relationship_add,
        entity_type="relationship",
        entity_id=relationship.id,
        data={
            "person_a_id": person_a_id,
            "person_b_id": person_b_id,
            "type": rel_type,
            "marriage_id": marriage_id,
        },
        contributor_message=message,
        submitted_by_id=user.id,
    )
    db.add(contribution)
    db.commit()
    db.refresh(contribution)
    return contribution


def submit_message(
    db: Session, entity_type: str, entity_id: int, message: str, user: User
) -> Contribution:
    """Story 6.4 — flag an issue via message."""
    contribution = Contribution(
        type=ContributionType.message,
        entity_type=entity_type,
        entity_id=entity_id,
        data={"message": message},
        submitted_by_id=user.id,
    )
    db.add(contribution)
    db.commit()
    db.refresh(contribution)
    return contribution


def get_my_contributions(db: Session, user: User) -> list[Contribution]:
    """Story 6.5 — get all contributions by this user."""
    return (
        db.query(Contribution)
        .filter(Contribution.submitted_by_id == user.id)
        .order_by(Contribution.created_at.desc())
        .all()
    )


def get_pending_contributions(db: Session, type_filter: str | None = None) -> list[Contribution]:
    """Story 7.1 — get all pending contributions for admin review."""
    query = db.query(Contribution).filter(Contribution.status == ContributionStatus.pending)
    if type_filter:
        query = query.filter(Contribution.type == ContributionType(type_filter))
    return query.order_by(Contribution.created_at.asc()).all()


def check_rate_limit(db: Session, user: User, contribution_type: ContributionType) -> bool:
    """Story 6.6 — check if user has exceeded their rate limit.
    Returns True if within limit, False if exceeded."""
    if contribution_type == ContributionType.message:
        limit = user.rate_limit_messages
    else:
        limit = user.rate_limit_suggestions

    # Count pending contributions of this category
    if contribution_type == ContributionType.message:
        count = db.query(func.count(Contribution.id)).filter(
            Contribution.submitted_by_id == user.id,
            Contribution.type == ContributionType.message,
            Contribution.status == ContributionStatus.pending,
        ).scalar()
    else:
        count = db.query(func.count(Contribution.id)).filter(
            Contribution.submitted_by_id == user.id,
            Contribution.type != ContributionType.message,
            Contribution.status == ContributionStatus.pending,
        ).scalar()

    return count < limit


def get_draft_contributions(db: Session, type_filter: str | None = None) -> list[Contribution]:
    """Get all draft contributions for admin review."""
    query = db.query(Contribution).filter(Contribution.status == ContributionStatus.draft)
    if type_filter:
        query = query.filter(Contribution.type == ContributionType(type_filter))
    return query.order_by(Contribution.created_at.asc()).all()


def serialize_contribution(contribution: Contribution, db: Session = None) -> dict:
    result = {
        "id": contribution.id,
        "type": contribution.type.value,
        "entity_type": contribution.entity_type,
        "entity_id": contribution.entity_id,
        "data": contribution.data,
        "contributor_message": contribution.contributor_message,
        "submitted_by_id": contribution.submitted_by_id,
        "reviewed_by_id": contribution.reviewed_by_id,
        "status": contribution.status.value,
        "admin_comment": contribution.admin_comment,
        "created_at": contribution.created_at.isoformat() if contribution.created_at else None,
        "reviewed_at": contribution.reviewed_at.isoformat() if contribution.reviewed_at else None,
    }

    # Resolve person names for relationship contributions
    if db and contribution.type == ContributionType.relationship_add and contribution.data:
        data = contribution.data
        resolved = {}
        for key in ("person_a_id", "person_b_id"):
            pid = data.get(key)
            if pid:
                person = db.query(Person).filter(Person.id == pid).first()
                if person:
                    name = " ".join(filter(None, [person.first_name, person.middle_name, person.last_name]))
                    resolved[f"{key}_name"] = name
        result["resolved"] = resolved

    # Resolve submitter name
    if db:
        submitter = db.query(User).filter(User.id == contribution.submitted_by_id).first()
        if submitter:
            result["submitted_by_name"] = submitter.display_name or submitter.email

    return result
