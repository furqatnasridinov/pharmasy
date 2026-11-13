from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models import Order, OrderItem, OrderStatus, User
from app.schemas.order import OrderCreate, OrderOut
from app.services import order_service

router = APIRouter(prefix="/api/orders", tags=["orders"])

ORDER_LOAD = (selectinload(Order.items).selectinload(OrderItem.medicine), selectinload(Order.user))


def get_order_for(db: Session, order_id: int, user: User) -> Order:
    order = db.scalar(select(Order).options(*ORDER_LOAD).where(Order.id == order_id))
    if order is None or (order.user_id != user.id and user.role != "admin"):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Заказ не найден")
    return order


@router.post("", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
def create_order(data: OrderCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    order = order_service.create_order(db, user, data)
    return order_service.to_out(get_order_for(db, order.id, user), "owner")


@router.get("/my", response_model=list[OrderOut])
def my_orders(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    orders = db.scalars(
        select(Order).options(*ORDER_LOAD).where(Order.user_id == user.id).order_by(Order.created_at.desc())
    ).all()
    return [order_service.to_out(o, "owner") for o in orders]


@router.get("/{order_id}", response_model=OrderOut)
def get_order(order_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    order = get_order_for(db, order_id, user)
    actor = "owner" if order.user_id == user.id else "admin"
    return order_service.to_out(order, actor)


@router.post("/{order_id}/cancel", response_model=OrderOut)
def cancel_order(order_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    order = get_order_for(db, order_id, user)
    if order.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Заказ не найден")
    if order.status != OrderStatus.NEW:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Отменить можно только новый заказ, который ещё не принят аптекой")
    order = order_service.change_status(db, order, OrderStatus.CANCELLED, "owner")
    return order_service.to_out(order, "owner")
