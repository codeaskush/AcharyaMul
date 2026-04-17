from datetime import datetime

from sqlalchemy import Integer, String, Text, Enum, ForeignKey, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.enums import ContributionType, ContributionStatus


class Contribution(Base):
    __tablename__ = "contributions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    type: Mapped[ContributionType] = mapped_column(Enum(ContributionType), nullable=False)
    entity_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    entity_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    data: Mapped[dict] = mapped_column(JSON, nullable=False)
    submitted_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    reviewed_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    status: Mapped[ContributionStatus] = mapped_column(
        Enum(ContributionStatus), default=ContributionStatus.pending, index=True
    )
    contributor_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    admin_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
