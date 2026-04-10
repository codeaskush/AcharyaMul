from datetime import datetime

from sqlalchemy import String, Integer, Enum, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.enums import Role, InviteStatus


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    display_name: Mapped[str] = mapped_column(String(255), nullable=True)
    role: Mapped[Role] = mapped_column(Enum(Role), nullable=False, default=Role.viewer)
    rate_limit_suggestions: Mapped[int] = mapped_column(Integer, default=10)
    rate_limit_messages: Mapped[int] = mapped_column(Integer, default=10)
    invite_status: Mapped[InviteStatus] = mapped_column(Enum(InviteStatus), default=InviteStatus.pending)
    language_preference: Mapped[str] = mapped_column(String(2), default="en")
    invited_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_login: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
