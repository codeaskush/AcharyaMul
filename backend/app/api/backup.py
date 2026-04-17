import csv
import io
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.person import Person
from app.models.relationship import Relationship
from app.models.enums import Role, ApprovalStatus
from app.services.bs_ad_converter import date_to_display

router = APIRouter()

CSV_PERSON_FIELDS = [
    "id", "generation", "first_name", "middle_name", "last_name",
    "first_name_devanagari", "middle_name_devanagari", "last_name_devanagari",
    "gender", "dob_ad", "dob_bs", "dod_ad", "dod_bs",
    "place_of_birth", "current_address", "occupation",
    "is_alive", "status",
]

CSV_RELATIONSHIP_FIELDS = [
    "id", "type", "person_a_id", "person_a_name",
    "person_b_id", "person_b_name",
    "marriage_status", "marriage_date", "marriage_location",
    "marriage_id", "status",
]


@router.get("/export/members")
def export_members_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export all approved members as CSV."""
    if current_user.role != Role.admin:
        raise HTTPException(status_code=403, detail="Only admins can export data")

    persons = db.query(Person).filter(Person.status == ApprovalStatus.approved).order_by(Person.id).all()

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=CSV_PERSON_FIELDS)
    writer.writeheader()

    for p in persons:
        dob = date_to_display(p.dob)
        dod = date_to_display(p.dod)
        writer.writerow({
            "id": p.id,
            "generation": p.generation,
            "first_name": p.first_name,
            "middle_name": p.middle_name or "",
            "last_name": p.last_name or "",
            "first_name_devanagari": p.first_name_devanagari or "",
            "middle_name_devanagari": p.middle_name_devanagari or "",
            "last_name_devanagari": p.last_name_devanagari or "",
            "gender": p.gender.value,
            "dob_ad": dob.get("ad") if dob else "",
            "dob_bs": dob.get("bs") if dob else "",
            "dod_ad": dod.get("ad") if dod else "",
            "dod_bs": dod.get("bs") if dod else "",
            "place_of_birth": p.place_of_birth or "",
            "current_address": p.current_address or "",
            "occupation": p.occupation or "",
            "is_alive": "Yes" if p.is_alive else "No",
            "status": p.status.value,
        })

    output.seek(0)
    today = date.today().isoformat()
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=acharyamul_members_{today}.csv"},
    )


@router.get("/export/relationships")
def export_relationships_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export all relationships as CSV."""
    if current_user.role != Role.admin:
        raise HTTPException(status_code=403, detail="Only admins can export data")

    rels = db.query(Relationship).order_by(Relationship.id).all()
    person_map = {p.id: p for p in db.query(Person).all()}

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=CSV_RELATIONSHIP_FIELDS)
    writer.writeheader()

    for r in rels:
        a = person_map.get(r.person_a_id)
        b = person_map.get(r.person_b_id)
        a_name = " ".join(filter(None, [a.first_name, a.middle_name, a.last_name])) if a else ""
        b_name = " ".join(filter(None, [b.first_name, b.middle_name, b.last_name])) if b else ""

        writer.writerow({
            "id": r.id,
            "type": r.type.value,
            "person_a_id": r.person_a_id,
            "person_a_name": a_name,
            "person_b_id": r.person_b_id,
            "person_b_name": b_name,
            "marriage_status": r.marriage_status.value if r.marriage_status else "",
            "marriage_date": str(r.marriage_date) if hasattr(r, 'marriage_date') and r.marriage_date else "",
            "marriage_location": r.marriage_location if hasattr(r, 'marriage_location') and r.marriage_location else "",
            "marriage_id": r.marriage_id or "",
            "status": r.status.value,
        })

    output.seek(0)
    today = date.today().isoformat()
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=acharyamul_relationships_{today}.csv"},
    )
