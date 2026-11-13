from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.auth import Email


class UserAdminOut(BaseModel):
    id: int
    email: str
    full_name: str
    phone: str | None
    role: str
    created_at: datetime
    orders_count: int
    reviews_count: int


class UserAdminUpdate(BaseModel):
    email: Email
    full_name: str = Field(min_length=2, max_length=255)
    phone: str | None = Field(default=None, max_length=50)
    role: Literal["user", "admin"]
    # Пустое значение — пароль не меняется
    new_password: str | None = Field(default=None, max_length=128)


class UserAdminCreate(BaseModel):
    email: Email
    full_name: str = Field(min_length=2, max_length=255)
    phone: str | None = Field(default=None, max_length=50)
    role: Literal["user", "admin"] = "user"
    password: str = Field(min_length=6, max_length=128)


class OrderAdminUpdate(BaseModel):
    delivery_method: Literal["pickup", "delivery"]
    delivery_address: str | None = Field(default=None, max_length=500)
    comment: str | None = Field(default=None, max_length=1000)
