from collections import Counter

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.person import Person
from app.models.enums import ApprovalStatus

router = APIRouter()


def _extract_country(address: str | None) -> str:
    if not address:
        return "Unknown"
    parts = [p.strip() for p in address.split(",")]
    return parts[-1] if len(parts) > 1 else parts[0]


def _extract_city(address: str | None) -> str:
    if not address:
        return "Unknown"
    parts = [p.strip() for p in address.split(",")]
    return parts[0]


@router.get("")
def get_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Aggregated family analytics — accessible to all authenticated users."""
    persons = db.query(Person).filter(Person.status == ApprovalStatus.approved).all()

    total = len(persons)
    if total == 0:
        return {"data": {"total": 0}}

    # Gender distribution
    gender_counts = Counter(p.gender.value for p in persons)

    # Alive / Deceased
    alive = sum(1 for p in persons if p.is_alive)
    deceased = total - alive

    # Generation breakdown
    gen_counts = Counter(p.generation for p in persons)
    generation_stats = [{"generation": g, "count": c} for g, c in sorted(gen_counts.items())]

    # Current residence — by country
    residence_country = Counter(_extract_country(p.current_address) for p in persons)
    residence_country_list = [{"name": k, "count": v} for k, v in residence_country.most_common(20)]

    # Current residence — by city
    residence_city = Counter(_extract_city(p.current_address) for p in persons if p.current_address)
    residence_city_list = [{"name": k, "count": v} for k, v in residence_city.most_common(15)]

    # Place of birth
    birth_place = Counter(p.place_of_birth for p in persons if p.place_of_birth)
    birth_place_list = [{"name": k, "count": v} for k, v in birth_place.most_common(15)]

    # Occupation distribution
    occupation_counts = Counter(p.occupation for p in persons if p.occupation)
    occupation_list = [{"name": k, "count": v} for k, v in occupation_counts.most_common(20)]

    # Age distribution (living members only)
    from datetime import date
    today = date.today()
    age_groups = {"0-10": 0, "11-20": 0, "21-30": 0, "31-40": 0, "41-50": 0, "51-60": 0, "61-70": 0, "71+": 0}
    for p in persons:
        if p.is_alive and p.dob:
            age = today.year - p.dob.year - ((today.month, today.day) < (p.dob.month, p.dob.day))
            if age <= 10: age_groups["0-10"] += 1
            elif age <= 20: age_groups["11-20"] += 1
            elif age <= 30: age_groups["21-30"] += 1
            elif age <= 40: age_groups["31-40"] += 1
            elif age <= 50: age_groups["41-50"] += 1
            elif age <= 60: age_groups["51-60"] += 1
            elif age <= 70: age_groups["61-70"] += 1
            else: age_groups["71+"] += 1
    age_distribution = [{"range": k, "count": v} for k, v in age_groups.items()]

    return {
        "data": {
            "total": total,
            "gender": {"male": gender_counts.get("male", 0), "female": gender_counts.get("female", 0), "other": gender_counts.get("other", 0)},
            "alive": alive,
            "deceased": deceased,
            "generations": generation_stats,
            "residence_by_country": residence_country_list,
            "residence_by_city": residence_city_list,
            "birth_places": birth_place_list,
            "occupations": occupation_list,
            "age_distribution": age_distribution,
        }
    }
