from datetime import datetime

from sqlalchemy import Integer, String, Text, Enum, ForeignKey, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ContributionRequest(Base):
    __tablename__ = "contribution_requests"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    areas: Mapped[list] = mapped_column(JSON, nullable=False)  # ["members", "events", "news", "articles", "literature"]
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, approved, rejected
    admin_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
