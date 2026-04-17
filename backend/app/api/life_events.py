from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from datetime import date
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.person import Person
from app.models.life_event import LifeEvent
from app.models.enums import Role
from app.services.bs_ad_converter import date_to_display

router = APIRouter()


class LifeEventCreate(BaseModel):
    event_type: str = Field(..., max_length=50)
    title: str = Field(..., min_length=1, max_length=500)
    description: str | None = None
    event_date: date | None = None
    end_date: date | None = None
    organization: str | None = None
    role: str | None = None
    is_current: bool = False
    excluded: bool = False
    sort_order: int = 0


class LifeEventUpdate(BaseModel):
    event_type: str | None = None
    title: str | None = None
    description: str | None = None
    event_date: date | None = None
    end_date: date | None = None
    organization: str | None = None
    role: str | None = None
    is_current: bool | None = None
    excluded: bool | None = None
    sort_order: int | None = None


def serialize_life_event(event: LifeEvent) -> dict:
    return {
        "id": event.id,
        "person_id": event.person_id,
        "event_type": event.event_type,
        "title": event.title,
        "description": event.description,
        "event_date": date_to_display(event.event_date),
        "end_date": date_to_display(event.end_date),
        "organization": event.organization,
        "role": event.role,
        "is_current": event.is_current,
        "excluded": event.excluded,
        "sort_order": event.sort_order,
        "created_at": event.created_at.isoformat() if event.created_at else None,
    }


@router.get("/persons/{person_id}/life-events")
def get_life_events(
    person_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    person = db.query(Person).filter(Person.id == person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    events = (
        db.query(LifeEvent)
        .filter(LifeEvent.person_id == person_id)
        .order_by(LifeEvent.sort_order.asc(), LifeEvent.event_date.asc().nullslast())
        .all()
    )
    return {"data": [serialize_life_event(e) for e in events]}


@router.post("/persons/{person_id}/life-events", status_code=status.HTTP_201_CREATED)
def create_life_event(
    person_id: int,
    data: LifeEventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != Role.admin:
        raise HTTPException(status_code=403, detail="Only admins can manage life events")

    person = db.query(Person).filter(Person.id == person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    event = LifeEvent(
        person_id=person_id,
        event_type=data.event_type,
        title=data.title,
        description=data.description,
        event_date=data.event_date,
        end_date=data.end_date,
        organization=data.organization,
        role=data.role,
        is_current=data.is_current,
        excluded=data.excluded,
        sort_order=data.sort_order,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return {"data": serialize_life_event(event)}


@router.put("/persons/{person_id}/life-events/bulk")
def bulk_save_life_events(
    person_id: int,
    events: list[LifeEventCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Replace all life events for a person with the given list."""
    if current_user.role != Role.admin:
        raise HTTPException(status_code=403, detail="Only admins can manage life events")

    person = db.query(Person).filter(Person.id == person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    # Delete existing events
    db.query(LifeEvent).filter(LifeEvent.person_id == person_id).delete()

    # Insert new ones
    new_events = []
    for i, data in enumerate(events):
        event = LifeEvent(
            person_id=person_id,
            event_type=data.event_type,
            title=data.title,
            description=data.description,
            event_date=data.event_date,
            end_date=data.end_date,
            organization=data.organization,
            role=data.role,
            is_current=data.is_current,
            excluded=data.excluded,
            sort_order=i,
        )
        db.add(event)
        new_events.append(event)

    db.commit()
    for e in new_events:
        db.refresh(e)

    return {"data": [serialize_life_event(e) for e in new_events]}


@router.delete("/persons/{person_id}/life-events/{event_id}")
def delete_life_event(
    person_id: int,
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != Role.admin:
        raise HTTPException(status_code=403, detail="Only admins can manage life events")

    event = db.query(LifeEvent).filter(LifeEvent.id == event_id, LifeEvent.person_id == person_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Life event not found")

    db.delete(event)
    db.commit()
    return {"data": {"deleted": True}}
