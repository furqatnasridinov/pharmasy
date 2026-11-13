from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class BannerIn(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    subtitle: str | None = Field(default=None, max_length=300)
    image_url: str | None = Field(default=None, max_length=500)
    show_text: bool = True
    link_url: str | None = Field(default=None, max_length=500)
    placement: Literal["slider", "side"] = "slider"
    theme: Literal["teal", "amber", "blue"] = "teal"
    sort_order: int = Field(default=0, ge=0, le=999)
    starts_at: date | None = None
    ends_at: date | None = None
    is_active: bool = True

    @field_validator("title", "subtitle", "image_url", "link_url", mode="before")
    @classmethod
    def strip(cls, v):
        if isinstance(v, str):
            v = v.strip()
            return v or None
        return v

    @field_validator("link_url", "image_url")
    @classmethod
    def check_url(cls, v):
        if v and not v.startswith(("/", "http://", "https://")):
            raise ValueError("Ссылка должна начинаться с /, http:// или https://")
        return v

    @model_validator(mode="after")
    def check_dates(self):
        if self.starts_at and self.ends_at and self.ends_at < self.starts_at:
            raise ValueError("Дата окончания раньше даты начала")
        return self


class BannerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    subtitle: str | None
    image_url: str | None
    show_text: bool
    link_url: str | None
    placement: str
    theme: str
    sort_order: int
    starts_at: date | None
    ends_at: date | None
    is_active: bool
