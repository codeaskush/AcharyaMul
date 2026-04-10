from sqlalchemy.orm import Session

from app.models.person import Person
from app.models.revision import Revision
from app.models.user import User
from app.models.enums import ApprovalStatus, RevisionAction
from app.schemas.person import PersonCreate, PersonUpdate
from app.services.bs_ad_converter import date_to_display


def create_person(db: Session, data: PersonCreate, current_user: User) -> Person:
    person = Person(
        first_name=data.first_name,
        middle_name=data.middle_name,
        last_name=data.last_name,
        first_name_devanagari=data.first_name_devanagari,
        middle_name_devanagari=data.middle_name_devanagari,
        last_name_devanagari=data.last_name_devanagari,
        dob=data.dob,
        dod=data.dod,
        place_of_birth=data.place_of_birth,
        current_address=data.current_address,
        occupation=data.occupation,
        gender=data.gender,
        is_alive=data.is_alive,
        generation=1,
        status=ApprovalStatus.approved,
        created_by_id=current_user.id,
        approved_by_id=current_user.id,
    )
    db.add(person)
    db.commit()
    db.refresh(person)

    revision = Revision(
        entity_type="person",
        entity_id=person.id,
        field_changed="*",
        old_value=None,
        new_value=f"Created person: {person.first_name} {person.last_name or ''}".strip(),
        submitted_by_id=current_user.id,
        approved_by_id=current_user.id,
        comment="Person created by admin",
        action=RevisionAction.create,
    )
    db.add(revision)
    db.commit()

    return person


def get_person_by_id(db: Session, person_id: int) -> Person | None:
    return db.query(Person).filter(Person.id == person_id).first()


def get_all_persons(db: Session, page: int = 1, per_page: int = 25, sort_by: str = "first_name"):
    query = db.query(Person)

    if sort_by == "first_name":
        query = query.order_by(Person.first_name.asc())
    elif sort_by == "generation":
        query = query.order_by(Person.generation.asc())

    total = query.count()
    persons = query.offset((page - 1) * per_page).limit(per_page).all()

    return persons, total


def update_person(db: Session, person: Person, data: PersonUpdate, current_user: User) -> Person:
    update_data = data.model_dump(exclude_unset=True, exclude={"comment"})

    for field, new_value in update_data.items():
        old_value = getattr(person, field)
        if old_value != new_value:
            revision = Revision(
                entity_type="person",
                entity_id=person.id,
                field_changed=field,
                old_value=str(old_value) if old_value is not None else None,
                new_value=str(new_value) if new_value is not None else None,
                submitted_by_id=current_user.id,
                approved_by_id=current_user.id,
                comment=data.comment,
                action=RevisionAction.update,
            )
            db.add(revision)
            setattr(person, field, new_value)

    db.commit()
    db.refresh(person)
    return person


def serialize_person(person: Person, is_admin: bool = False) -> dict:
    visibility = person.visibility_settings or {"dob": True, "address": True, "phone": True, "email": True}

    result = {
        "id": person.id,
        "generation": person.generation,
        "first_name": person.first_name,
        "middle_name": person.middle_name,
        "last_name": person.last_name,
        "first_name_devanagari": person.first_name_devanagari,
        "middle_name_devanagari": person.middle_name_devanagari,
        "last_name_devanagari": person.last_name_devanagari,
        "gender": person.gender.value,
        "is_alive": person.is_alive,
        "photo_url": person.photo_url,
        "status": person.status.value,
        "visibility_settings": visibility,
        "created_at": person.created_at.isoformat() if person.created_at else None,
        "updated_at": person.updated_at.isoformat() if person.updated_at else None,
    }

    # Dates — always include both AD and BS
    result["dob"] = date_to_display(person.dob)
    result["dod"] = date_to_display(person.dod)

    # Per-field visibility enforcement (server-side, NFR11)
    if is_admin:
        result["place_of_birth"] = person.place_of_birth
        result["current_address"] = person.current_address
        result["occupation"] = person.occupation
    else:
        result["place_of_birth"] = person.place_of_birth
        result["current_address"] = person.current_address if visibility.get("address", True) else None
        result["occupation"] = person.occupation

    return result
