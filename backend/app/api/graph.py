from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.enums import Role
from app.services import person_service, relationship_service

router = APIRouter()


@router.get("")
def get_full_graph(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return all persons and relationships for chart rendering."""
    is_admin = current_user.role == Role.admin
    persons, _ = person_service.get_all_persons(db, page=1, per_page=10000)
    relationships = relationship_service.get_all_relationships(db)

    return {
        "data": {
            "persons": [person_service.serialize_person(p, is_admin=is_admin) for p in persons],
            "relationships": [relationship_service.serialize_relationship(r) for r in relationships],
        }
    }
