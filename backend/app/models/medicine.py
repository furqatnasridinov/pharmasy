from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Boolean, Date, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, utcnow


class Medicine(Base):
    __tablename__ = "medicines"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    description: Mapped[str | None] = mapped_column(Text)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id"))
    manufacturer: Mapped[str | None] = mapped_column(String(255))
    active_substance: Mapped[str | None] = mapped_column(String(255))
    form: Mapped[str] = mapped_column(String(60))           # таблетки, сироп, мазь...
    dosage: Mapped[str | None] = mapped_column(String(60))  # "500 мг"
    package: Mapped[str | None] = mapped_column(String(60))  # "20 таблеток"
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    stock: Mapped[int] = mapped_column(Integer, default=0)
    expiry_date: Mapped[date] = mapped_column(Date)
    requires_prescription: Mapped[bool] = mapped_column(Boolean, default=False)
    image_url: Mapped[str | None] = mapped_column(String(500))
    discount_percent: Mapped[int] = mapped_column(Integer, default=0)
    is_deal_of_day: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=utcnow, onupdate=utcnow)

    category = relationship("Category", back_populates="medicines")
    reviews = relationship("Review", back_populates="medicine", cascade="all, delete-orphan")
    favorites = relationship("Favorite", back_populates="medicine", cascade="all, delete-orphan")

    @property
    def final_price(self) -> Decimal:
        """Цена с учётом скидки, округлённая до дирамов."""
        price = Decimal(self.price)
        if not self.discount_percent:
            return price
        return (price * (100 - self.discount_percent) / 100).quantize(Decimal("0.01"))

    @property
    def is_expired(self) -> bool:
        return self.expiry_date < date.today()
