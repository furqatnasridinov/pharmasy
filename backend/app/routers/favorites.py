from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models import Favorite, Medicine, User
from app.schemas.medicine import MedicineOut
from app.services.medicine_service import to_out_many

router = APIRouter(prefix="/api/favorites", tags=["favorites"])


@router.get("", response_model=list[MedicineOut])
def list_favorites(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    meds = db.scalars(
        select(Medicine)
        .join(Favorite, Favorite.medicine_id == Medicine.id)
        .options(joinedload(Medicine.category))
        .where(Favorite.user_id == user.id)
        .order_by(Favorite.created_at.desc())
    ).unique().all()
    return to_out_many(db, list(meds))


@router.get("/ids", response_model=list[int])
def favorite_ids(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return list(db.scalars(select(Favorite.medicine_id).where(Favorite.user_id == user.id)))


@router.post("/{medicine_id}", status_code=status.HTTP_201_CREATED)
def add_favorite(medicine_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if db.get(Medicine, medicine_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Препарат не найден")
    exists = db.scalar(select(Favorite).where(Favorite.user_id == user.id, Favorite.medicine_id == medicine_id))
    if not exists:
        db.add(Favorite(user_id=user.id, medicine_id=medicine_id))
        db.commit()
    return {"medicine_id": medicine_id, "is_favorite": True}


@router.delete("/{medicine_id}")
def remove_favorite(medicine_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    fav = db.scalar(select(Favorite).where(Favorite.user_id == user.id, Favorite.medicine_id == medicine_id))
    if fav:
        db.delete(fav)
        db.commit()
    return {"medicine_id": medicine_id, "is_favorite": False}
