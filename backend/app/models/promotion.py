from datetime import date, datetime

from sqlalchemy import Boolean, Date, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, utcnow


class Promotion(Base):
    """Баннер акции на главной и в каталоге."""

    __tablename__ = "promotions"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    discount_percent: Mapped[int | None] = mapped_column(Integer)
    category_id: Mapped[int | None] = mapped_column(ForeignKey("categories.id", ondelete="SET NULL"))
    starts_at: Mapped[date] = mapped_column(Date)
    ends_at: Mapped[date | None] = mapped_column(Date)  # None = «Постоянно»
    theme: Mapped[str] = mapped_column(String(20), default="teal")  # teal | amber | blue
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)

    category = relationship("Category")
