from datetime import datetime

from pydantic import BaseModel, Field


class ReviewIn(BaseModel):
    rating: int = Field(ge=1, le=5)
    text: str | None = Field(default=None, max_length=2000)


class ReviewOut(BaseModel):
    id: int
    user_id: int
    user_name: str
    medicine_id: int
    medicine_name: str
    rating: int
    text: str | None
    created_at: datetime
