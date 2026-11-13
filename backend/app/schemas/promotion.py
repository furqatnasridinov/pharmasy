from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class PromotionIn(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    description: str | None = None
    discount_percent: int | None = Field(default=None, ge=1, le=90)
    category_id: int | None = None
    starts_at: date
    ends_at: date | None = None
    theme: Literal["teal", "amber", "blue"] = "teal"
    is_active: bool = True

    @model_validator(mode="after")
    def check_dates(self):
        if self.ends_at and self.ends_at < self.starts_at:
            raise ValueError("Дата окончания раньше даты начала")
        return self


class PromotionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str | None
    discount_percent: int | None
    category_id: int | None
    starts_at: date
    ends_at: date | None
    theme: str
    is_active: bool
