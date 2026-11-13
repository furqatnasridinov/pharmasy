from datetime import date, datetime

from sqlalchemy import Boolean, Date, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, utcnow


class Banner(Base):
    """Рекламный баннер на главной (только для вошедших): большой слайдер или малый справа."""

    __tablename__ = "banners"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    subtitle: Mapped[str | None] = mapped_column(String(300))
    image_url: Mapped[str | None] = mapped_column(String(500))
    # С картинкой: True — заголовок и подпись поверх фото; False — картинка целиком (текст уже на ней)
    show_text: Mapped[bool] = mapped_column(Boolean, default=True)
    link_url: Mapped[str | None] = mapped_column(String(500))
    placement: Mapped[str] = mapped_column(String(20), default="slider")  # slider | side
    theme: Mapped[str] = mapped_column(String(20), default="teal")  # teal | amber | blue
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    starts_at: Mapped[date | None] = mapped_column(Date)
    ends_at: Mapped[date | None] = mapped_column(Date)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
