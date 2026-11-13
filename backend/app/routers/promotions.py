from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Promotion
from app.schemas.promotion import PromotionOut

router = APIRouter(prefix="/api/promotions", tags=["promotions"])


@router.get("", response_model=list[PromotionOut])
def active_promotions(db: Session = Depends(get_db)):
    today = date.today()
    return db.scalars(
        select(Promotion)
        .where(
            Promotion.is_active.is_(True),
            Promotion.starts_at <= today,
            or_(Promotion.ends_at.is_(None), Promotion.ends_at >= today),
        )
        .order_by(Promotion.discount_percent.desc().nulls_last(), Promotion.id)
    ).all()
