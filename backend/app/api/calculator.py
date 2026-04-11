from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.services import calculator_service

router = APIRouter()


@router.get("/path")
def find_relationship_path(
    from_id: int = Query(...),
    to_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mode 1: Select two people, get the relationship path and kinship terms."""
    result = calculator_service.find_relationship(db, from_id, to_id)
    return {"data": result}


@router.get("/step")
def get_step_options(
    from_id: int = Query(...),
    relation: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mode 2: Path builder — given a person and relation type, return matching persons."""
    results = calculator_service.get_step_options(db, from_id, relation)
    return {"data": results}
