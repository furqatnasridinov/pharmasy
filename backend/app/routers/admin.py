from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import require_admin
from app.core.security import hash_password
from app.models import Category, Medicine, Order, OrderItem, OrderStatus, Promotion, Review, User
from app.routers.orders import ORDER_LOAD
from app.routers.reviews import review_out
from app.schemas.admin import DashboardOut, TopMedicine
from app.schemas.order import OrderOut, StatusUpdate
from app.schemas.promotion import PromotionIn, PromotionOut
from app.schemas.review import ReviewOut
from app.schemas.user_admin import OrderAdminUpdate, UserAdminCreate, UserAdminOut, UserAdminUpdate
from app.services import order_service
from app.services.medicine_service import to_out_many

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_admin)])


# ---------- Дашборд ----------

@router.get("/dashboard", response_model=DashboardOut)
def dashboard(db: Session = Depends(get_db)):
    today = date.today()
    completed = Order.status == OrderStatus.COMPLETED
    month_ago = datetime.now() - timedelta(days=30)

    top_rows = db.execute(
        select(
            Medicine.id, Medicine.name, Medicine.dosage,
            func.sum(OrderItem.quantity).label("sold"),
            func.sum(OrderItem.quantity * OrderItem.price_at_purchase).label("revenue"),
        )
        .join(OrderItem, OrderItem.medicine_id == Medicine.id)
        .join(Order, Order.id == OrderItem.order_id)
        .where(completed)
        .group_by(Medicine.id)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(5)
    ).all()

    def meds(*conditions, order_by):
        return to_out_many(db, list(db.scalars(
            select(Medicine).options(joinedload(Medicine.category)).where(*conditions).order_by(order_by)
        ).unique()))

    warn_until = today + timedelta(days=settings.EXPIRY_WARNING_DAYS)
    return DashboardOut(
        new_orders=db.scalar(select(func.count(Order.id)).where(Order.status == OrderStatus.NEW)) or 0,
        total_orders=db.scalar(select(func.count(Order.id))) or 0,
        revenue_total=float(db.scalar(select(func.coalesce(func.sum(Order.total_price), 0)).where(completed)) or 0),
        revenue_30d=float(db.scalar(
            select(func.coalesce(func.sum(Order.total_price), 0)).where(completed, Order.updated_at >= month_ago)
        ) or 0),
        medicines_total=db.scalar(select(func.count(Medicine.id))) or 0,
        users_total=db.scalar(select(func.count(User.id))) or 0,
        top_medicines=[
            TopMedicine(id=r.id, name=r.name, dosage=r.dosage, sold=int(r.sold), revenue=float(r.revenue or 0))
            for r in top_rows
        ],
        low_stock=meds(Medicine.stock < settings.LOW_STOCK_THRESHOLD, order_by=Medicine.stock),
        expiring=meds(Medicine.expiry_date >= today, Medicine.expiry_date <= warn_until, order_by=Medicine.expiry_date),
        expired=meds(Medicine.expiry_date < today, order_by=Medicine.expiry_date),
        expiry_warning_days=settings.EXPIRY_WARNING_DAYS,
        low_stock_threshold=settings.LOW_STOCK_THRESHOLD,
    )


# ---------- Заказы ----------

@router.get("/orders", response_model=list[OrderOut])
def list_orders(status_filter: str | None = Query(None, alias="status"), db: Session = Depends(get_db)):
    query = select(Order).options(*ORDER_LOAD).order_by(Order.created_at.desc())
    if status_filter:
        query = query.where(Order.status == status_filter)
    return [order_service.to_out(o, "admin") for o in db.scalars(query).all()]


@router.get("/orders/counts")
def order_counts(db: Session = Depends(get_db)):
    rows = db.execute(select(Order.status, func.count(Order.id)).group_by(Order.status)).all()
    return {s.value: 0 for s in OrderStatus} | {st: cnt for st, cnt in rows}


@router.patch("/orders/{order_id}/status", response_model=OrderOut)
def update_order_status(order_id: int, data: StatusUpdate, db: Session = Depends(get_db)):
    order = db.scalar(select(Order).options(*ORDER_LOAD).where(Order.id == order_id))
    if order is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Заказ не найден")
    order = order_service.change_status(db, order, data.status, "admin")
    return order_service.to_out(order, "admin")


# ---------- Отзывы ----------

@router.get("/reviews", response_model=list[ReviewOut])
def all_reviews(db: Session = Depends(get_db)):
    reviews = db.scalars(
        select(Review).options(joinedload(Review.user), joinedload(Review.medicine)).order_by(Review.created_at.desc())
    ).all()
    return [review_out(r) for r in reviews]


# ---------- Акции ----------

def _promo_or_404(db: Session, promo_id: int) -> Promotion:
    promo = db.get(Promotion, promo_id)
    if promo is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Акция не найдена")
    return promo


def _check_promo_category(db: Session, data: PromotionIn):
    if data.category_id and db.get(Category, data.category_id) is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Указанная категория не существует")


@router.get("/promotions", response_model=list[PromotionOut])
def list_promotions(db: Session = Depends(get_db)):
    return db.scalars(select(Promotion).order_by(Promotion.starts_at.desc())).all()


@router.post("/promotions", response_model=PromotionOut, status_code=status.HTTP_201_CREATED)
def create_promotion(data: PromotionIn, db: Session = Depends(get_db)):
    _check_promo_category(db, data)
    promo = Promotion(**data.model_dump())
    db.add(promo)
    db.commit()
    db.refresh(promo)
    return promo


@router.put("/promotions/{promo_id}", response_model=PromotionOut)
def update_promotion(promo_id: int, data: PromotionIn, db: Session = Depends(get_db)):
    promo = _promo_or_404(db, promo_id)
    _check_promo_category(db, data)
    for key, value in data.model_dump().items():
        setattr(promo, key, value)
    db.commit()
    db.refresh(promo)
    return promo


@router.delete("/promotions/{promo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_promotion(promo_id: int, db: Session = Depends(get_db)):
    db.delete(_promo_or_404(db, promo_id))
    db.commit()


# ---------- Пользователи ----------

def _user_out(db: Session, u: User) -> UserAdminOut:
    return UserAdminOut(
        id=u.id, email=u.email, full_name=u.full_name, phone=u.phone, role=u.role, created_at=u.created_at,
        orders_count=db.scalar(select(func.count(Order.id)).where(Order.user_id == u.id)) or 0,
        reviews_count=db.scalar(select(func.count(Review.id)).where(Review.user_id == u.id)) or 0,
    )


def _user_or_404(db: Session, user_id: int) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Пользователь не найден")
    return user


def _check_email_free(db: Session, email: str, exclude_id: int | None = None):
    query = select(User).where(func.lower(User.email) == email.lower())
    if exclude_id:
        query = query.where(User.id != exclude_id)
    if db.scalar(query):
        raise HTTPException(status.HTTP_409_CONFLICT, "Этот email уже занят другим пользователем")


@router.get("/users", response_model=list[UserAdminOut])
def list_users(db: Session = Depends(get_db)):
    return [_user_out(db, u) for u in db.scalars(select(User).order_by(User.role, User.full_name)).all()]


@router.post("/users", response_model=UserAdminOut, status_code=status.HTTP_201_CREATED)
def create_user(data: UserAdminCreate, db: Session = Depends(get_db)):
    _check_email_free(db, data.email)
    user = User(email=data.email, full_name=data.full_name.strip(), phone=(data.phone or "").strip() or None,
                role=data.role, password_hash=hash_password(data.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return _user_out(db, user)


@router.put("/users/{user_id}", response_model=UserAdminOut)
def update_user(user_id: int, data: UserAdminUpdate, db: Session = Depends(get_db),
                admin: User = Depends(require_admin)):
    user = _user_or_404(db, user_id)
    if user.id == admin.id and data.role != "admin":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Нельзя снять роль администратора с самого себя")
    _check_email_free(db, data.email, exclude_id=user.id)
    user.email = data.email
    user.full_name = data.full_name.strip()
    user.phone = (data.phone or "").strip() or None
    user.role = data.role
    if data.new_password:
        if len(data.new_password) < 6:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Новый пароль должен быть не короче 6 символов")
        user.password_hash = hash_password(data.new_password)
    db.commit()
    db.refresh(user)
    return _user_out(db, user)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    user = _user_or_404(db, user_id)
    if user.id == admin.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Нельзя удалить собственный аккаунт")
    if db.scalar(select(func.count(Order.id)).where(Order.user_id == user.id)):
        raise HTTPException(status.HTTP_409_CONFLICT,
                            "У пользователя есть заказы — удалить нельзя. Можно изменить его данные.")
    db.delete(user)
    db.commit()


# ---------- Правка заказа (адрес, способ получения, комментарий) ----------

@router.put("/orders/{order_id}", response_model=OrderOut)
def edit_order(order_id: int, data: OrderAdminUpdate, db: Session = Depends(get_db)):
    order = db.scalar(select(Order).options(*ORDER_LOAD).where(Order.id == order_id))
    if order is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Заказ не найден")
    if order.status in (OrderStatus.COMPLETED, OrderStatus.CANCELLED):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Завершённый или отменённый заказ изменить нельзя")
    address = (data.delivery_address or "").strip()
    if data.delivery_method == "delivery" and not address:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Укажите адрес доставки")
    order.delivery_method = data.delivery_method
    order.delivery_address = address if data.delivery_method == "delivery" else None
    order.comment = (data.comment or "").strip() or None
    db.commit()
    db.refresh(order)
    return order_service.to_out(order, "admin")
