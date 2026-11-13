from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models import Medicine, Review, User
from app.schemas.review import ReviewIn, ReviewOut

router = APIRouter(tags=["reviews"])


def review_out(r: Review) -> ReviewOut:
    return ReviewOut(
        id=r.id, user_id=r.user_id, user_name=r.user.full_name, medicine_id=r.medicine_id,
        medicine_name=r.medicine.name, rating=r.rating, text=r.text, created_at=r.created_at,
    )


def _get_review(db: Session, review_id: int) -> Review:
    review = db.get(Review, review_id)
    if review is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Отзыв не найден")
    return review


@router.get("/api/medicines/{medicine_id}/reviews", response_model=list[ReviewOut])
def list_reviews(medicine_id: int, db: Session = Depends(get_db)):
    if db.get(Medicine, medicine_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Препарат не найден")
    reviews = db.scalars(
        select(Review)
        .options(joinedload(Review.user), joinedload(Review.medicine))
        .where(Review.medicine_id == medicine_id)
        .order_by(Review.created_at.desc())
    ).all()
    return [review_out(r) for r in reviews]


@router.post("/api/medicines/{medicine_id}/reviews", response_model=ReviewOut, status_code=status.HTTP_201_CREATED)
def create_review(
    medicine_id: int, data: ReviewIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    if db.get(Medicine, medicine_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Препарат не найден")
    if db.scalar(select(Review).where(Review.user_id == user.id, Review.medicine_id == medicine_id)):
        raise HTTPException(status.HTTP_409_CONFLICT, "Вы уже оставили отзыв на этот препарат — его можно изменить")
    review = Review(user_id=user.id, medicine_id=medicine_id, rating=data.rating, text=(data.text or "").strip() or None)
    db.add(review)
    db.commit()
    db.refresh(review)
    return review_out(review)


@router.put("/api/reviews/{review_id}", response_model=ReviewOut)
def update_review(review_id: int, data: ReviewIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    review = _get_review(db, review_id)
    if review.user_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Можно изменять только свои отзывы")
    review.rating = data.rating
    review.text = (data.text or "").strip() or None
    db.commit()
    db.refresh(review)
    return review_out(review)


@router.delete("/api/reviews/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_review(review_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    review = _get_review(db, review_id)
    if review.user_id != user.id and user.role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Можно удалять только свои отзывы")
    db.delete(review)
    db.commit()
