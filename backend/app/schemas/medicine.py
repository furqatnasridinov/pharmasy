from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field

ExpiryStatus = Literal["ok", "expiring", "expired"]


class MedicineIn(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    description: str | None = None
    category_id: int
    manufacturer: str | None = Field(default=None, max_length=255)
    country: str | None = Field(default=None, max_length=100)
    active_substance: str | None = Field(default=None, max_length=255)
    form: str = Field(min_length=2, max_length=60)
    dosage: str | None = Field(default=None, max_length=60)
    package: str | None = Field(default=None, max_length=60)
    price: float = Field(gt=0, le=100000)
    stock: int = Field(ge=0)
    expiry_date: date
    requires_prescription: bool = False
    image_url: str | None = Field(default=None, max_length=500)
    discount_percent: int = Field(default=0, ge=0, le=90)
    is_deal_of_day: bool = False


class StockUpdate(BaseModel):
    stock: int = Field(ge=0)


class MedicineOut(BaseModel):
    id: int
    name: str
    description: str | None
    category_id: int
    category_name: str
    manufacturer: str | None
    country: str | None
    active_substance: str | None
    form: str
    dosage: str | None
    package: str | None
    price: float
    final_price: float
    discount_percent: int
    is_deal_of_day: bool
    stock: int
    expiry_date: date
    expiry_status: ExpiryStatus
    is_available: bool
    requires_prescription: bool
    image_url: str | None
    rating: float | None
    reviews_count: int
    created_at: datetime
    updated_at: datetime


class MedicinePage(BaseModel):
    items: list[MedicineOut]
    total: int
    page: int
    page_size: int
    pages: int


class FacetItem(BaseModel):
    name: str
    count: int


class MedicineFacets(BaseModel):
    manufacturers: list[FacetItem]
    forms: list[FacetItem]
    price_min: float
    price_max: float
