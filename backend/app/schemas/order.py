from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator

OrderStatusLiteral = Literal["new", "accepted", "ready", "completed", "cancelled"]


class OrderItemIn(BaseModel):
    medicine_id: int
    quantity: int = Field(ge=1, le=100)


class OrderCreate(BaseModel):
    items: list[OrderItemIn] = Field(min_length=1)
    delivery_method: Literal["pickup", "delivery"]
    delivery_address: str | None = Field(default=None, max_length=500)
    comment: str | None = Field(default=None, max_length=1000)

    @model_validator(mode="after")
    def address_required_for_delivery(self):
        if self.delivery_method == "delivery" and not (self.delivery_address or "").strip():
            raise ValueError("Укажите адрес доставки")
        return self


class StatusUpdate(BaseModel):
    status: OrderStatusLiteral


class OrderItemOut(BaseModel):
    id: int
    medicine_id: int
    medicine_name: str
    medicine_image: str | None
    dosage: str | None
    form: str
    quantity: int
    price_at_purchase: float
    subtotal: float


class OrderCustomer(BaseModel):
    id: int
    full_name: str
    email: str
    phone: str | None


class OrderOut(BaseModel):
    id: int
    status: OrderStatusLiteral
    delivery_method: str
    delivery_address: str | None
    comment: str | None
    total_price: float
    items_count: int
    created_at: datetime
    updated_at: datetime
    items: list[OrderItemOut]
    customer: OrderCustomer
    allowed_transitions: list[OrderStatusLiteral]
