from datetime import datetime

from sqlalchemy import Integer, String, Text, ForeignKey, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AdminLog(Base):
    __tablename__ = "admin_logs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    admin_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g. "contribution_approved", "person_quarantined", "role_changed"
    target_type: Mapped[str | None] = mapped_column(String(50), nullable=True)  # "contribution", "person", "relationship", "user"
    target_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    details: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
