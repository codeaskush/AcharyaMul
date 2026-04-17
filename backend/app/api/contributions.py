from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.contribution import Contribution
from app.models.person import Person
from app.models.relationship import Relationship
from app.models.enums import Role, ContributionType, ContributionStatus, ApprovalStatus
from app.services import contribution_service
from app.services.admin_log_service import log_action

router = APIRouter()


# --- Schemas ---

class FieldEditSubmission(BaseModel):
    person_id: int
    field: str = Field(..., min_length=1)
    value: str | None = None
    message: str = Field(..., min_length=1)


class PersonAddSubmission(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=255)
    middle_name: str | None = None
    last_name: str | None = None
    first_name_devanagari: str | None = None
    middle_name_devanagari: str | None = None
    last_name_devanagari: str | None = None
    dob: date | None = None
    dod: date | None = None
    place_of_birth: str | None = None
    current_address: str | None = None
    occupation: str | None = None
    gender: str
    is_alive: bool = True
    message: str = Field(..., min_length=1)


class RelationshipAddSubmission(BaseModel):
    person_a_id: int
    person_b_id: int
    type: str  # "marriage" or "parent_child"
    marriage_id: int | None = None
    message: str = Field(..., min_length=1)


class MessageSubmission(BaseModel):
    entity_type: str  # "person" or "relationship"
    entity_id: int
    message: str = Field(..., min_length=1)


class ReviewSubmission(BaseModel):
    action: str = Field(..., pattern="^(approve|reject|draft)$")
    comment: str = Field(..., min_length=1)
    edited_data: dict | None = None  # Admin can edit fields before approving


# --- Helper ---

def _require_contributor_or_admin(user: User):
    if user.role not in (Role.admin, Role.contributor):
        raise HTTPException(status_code=403, detail="Only contributors and admins can submit contributions")


def _check_limit(db, user, ctype):
    if user.role == Role.admin:
        return
    if not contribution_service.check_rate_limit(db, user, ctype):
        raise HTTPException(
            status_code=429,
            detail="Rate limit reached. Please wait for your existing submissions to be reviewed.",
        )


# --- Submission Endpoints ---

@router.post("/field-edit", status_code=status.HTTP_201_CREATED)
def submit_field_edit(
    data: FieldEditSubmission,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_contributor_or_admin(current_user)
    _check_limit(db, current_user, ContributionType.field_edit)
    contribution = contribution_service.submit_field_edit(
        db, data.person_id, data.field, data.value, data.message, current_user
    )
    return {"data": contribution_service.serialize_contribution(contribution, db)}


@router.post("/person-add", status_code=status.HTTP_201_CREATED)
def submit_person_add(
    data: PersonAddSubmission,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_contributor_or_admin(current_user)
    _check_limit(db, current_user, ContributionType.person_add)
    person_data = data.model_dump(exclude={"message"})
    contribution = contribution_service.submit_person_add(
        db, person_data, data.message, current_user
    )
    return {"data": contribution_service.serialize_contribution(contribution, db)}


@router.post("/relationship-add", status_code=status.HTTP_201_CREATED)
def submit_relationship_add(
    data: RelationshipAddSubmission,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_contributor_or_admin(current_user)
    _check_limit(db, current_user, ContributionType.relationship_add)
    contribution = contribution_service.submit_relationship_add(
        db, data.person_a_id, data.person_b_id, data.type, data.marriage_id, data.message, current_user
    )
    return {"data": contribution_service.serialize_contribution(contribution, db)}


@router.post("/message", status_code=status.HTTP_201_CREATED)
def submit_message(
    data: MessageSubmission,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_contributor_or_admin(current_user)
    _check_limit(db, current_user, ContributionType.message)
    contribution = contribution_service.submit_message(
        db, data.entity_type, data.entity_id, data.message, current_user
    )
    return {"data": contribution_service.serialize_contribution(contribution, db)}


# --- Query Endpoints ---

@router.get("/mine")
def get_my_contributions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    contributions = contribution_service.get_my_contributions(db, current_user)
    return {"data": [contribution_service.serialize_contribution(c, db) for c in contributions]}


@router.get("/pending")
def get_pending(
    type_filter: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != Role.admin:
        raise HTTPException(status_code=403, detail="Only admins can view pending contributions")
    contributions = contribution_service.get_pending_contributions(db, type_filter)
    return {"data": [contribution_service.serialize_contribution(c, db) for c in contributions]}


@router.get("/drafts")
def get_drafts(
    type_filter: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != Role.admin:
        raise HTTPException(status_code=403, detail="Only admins can view drafts")
    contributions = contribution_service.get_draft_contributions(db, type_filter)
    return {"data": [contribution_service.serialize_contribution(c, db) for c in contributions]}


# --- Review Endpoint ---

@router.put("/{contribution_id}/review")
def review_contribution(
    contribution_id: int,
    data: ReviewSubmission,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != Role.admin:
        raise HTTPException(status_code=403, detail="Only admins can review contributions")

    contribution = db.query(Contribution).filter(Contribution.id == contribution_id).first()
    if not contribution:
        raise HTTPException(status_code=404, detail="Contribution not found")

    if contribution.status not in (ContributionStatus.pending, ContributionStatus.draft):
        raise HTTPException(status_code=400, detail="Contribution already finalized")

    # If admin edited data, update the contribution and the linked entity
    if data.edited_data and contribution.entity_id:
        contribution.data = data.edited_data
        _apply_edited_data(db, contribution, data.edited_data, current_user)

    if data.action == "draft":
        contribution.status = ContributionStatus.draft
        contribution.admin_comment = data.comment
        contribution.reviewed_by_id = current_user.id

    elif data.action == "approve":
        contribution.status = ContributionStatus.approved
        if data.edited_data:
            contribution.status = ContributionStatus.approved_with_changes
        _approve_entity(db, contribution, current_user)
        contribution.admin_comment = data.comment
        contribution.reviewed_by_id = current_user.id
        contribution.reviewed_at = datetime.utcnow()

    elif data.action == "reject":
        contribution.status = ContributionStatus.rejected
        _reject_entity(db, contribution)
        contribution.admin_comment = data.comment
        contribution.reviewed_by_id = current_user.id
        contribution.reviewed_at = datetime.utcnow()

    log_action(
        db, current_user,
        action=f"contribution_{data.action}",
        target_type="contribution",
        target_id=contribution.id,
        details={"contribution_type": contribution.type.value, "entity_type": contribution.entity_type, "entity_id": contribution.entity_id},
        comment=data.comment,
    )

    db.commit()
    db.refresh(contribution)
    return {"data": contribution_service.serialize_contribution(contribution, db)}


def _approve_entity(db: Session, contribution: Contribution, admin: User):
    if contribution.entity_type == "person" and contribution.entity_id:
        person = db.query(Person).filter(Person.id == contribution.entity_id).first()
        if person and person.status == ApprovalStatus.pending:
            person.status = ApprovalStatus.approved
            person.approved_by_id = admin.id
    elif contribution.entity_type == "relationship" and contribution.entity_id:
        rel = db.query(Relationship).filter(Relationship.id == contribution.entity_id).first()
        if rel and rel.status == ApprovalStatus.pending:
            rel.status = ApprovalStatus.approved
            rel.approved_by_id = admin.id


def _reject_entity(db: Session, contribution: Contribution):
    if contribution.type == ContributionType.person_add and contribution.entity_id:
        person = db.query(Person).filter(
            Person.id == contribution.entity_id, Person.status == ApprovalStatus.pending
        ).first()
        if person:
            db.delete(person)
    elif contribution.type == ContributionType.relationship_add and contribution.entity_id:
        rel = db.query(Relationship).filter(
            Relationship.id == contribution.entity_id, Relationship.status == ApprovalStatus.pending
        ).first()
        if rel:
            db.delete(rel)


def _apply_edited_data(db: Session, contribution: Contribution, edited_data: dict, admin: User):
    """Apply admin edits to the linked pending entity."""
    if contribution.type == ContributionType.person_add and contribution.entity_id:
        person = db.query(Person).filter(Person.id == contribution.entity_id).first()
        if person:
            for field in ['first_name', 'middle_name', 'last_name', 'first_name_devanagari',
                          'middle_name_devanagari', 'last_name_devanagari', 'place_of_birth',
                          'current_address', 'occupation', 'gender', 'is_alive']:
                if field in edited_data:
                    setattr(person, field, edited_data[field])
            if 'dob' in edited_data:
                from datetime import date as date_type
                person.dob = date_type.fromisoformat(edited_data['dob']) if edited_data['dob'] else None
            if 'dod' in edited_data:
                from datetime import date as date_type
                person.dod = date_type.fromisoformat(edited_data['dod']) if edited_data['dod'] else None
