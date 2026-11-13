"""Жизненный цикл заказа и работа со складом.

Статусы:  new -> accepted -> ready -> completed
          new / accepted / ready -> cancelled

Склад:
  * new -> accepted        — остатки списываются (409, если не хватает);
  * accepted/ready -> cancelled — товар возвращается на склад;
  * new -> cancelled       — склад не меняется.
Все изменения выполняются в одной транзакции.
"""
from collections import defaultdict
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Medicine, Order, OrderItem, OrderStatus, User
from app.schemas.order import OrderCreate, OrderCustomer, OrderItemOut, OrderOut

S = OrderStatus

# Кто может выполнять переход: admin / owner (покупатель)
TRANSITIONS: dict[str, dict[str, set[str]]] = {
    S.NEW: {S.ACCEPTED: {"admin"}, S.CANCELLED: {"admin", "owner"}},
    S.ACCEPTED: {S.READY: {"admin"}, S.CANCELLED: {"admin"}},
    S.READY: {S.COMPLETED: {"admin"}, S.CANCELLED: {"admin"}},
    S.COMPLETED: {},
    S.CANCELLED: {},
}

STATUS_LABELS = {
    S.NEW: "Новый",
    S.ACCEPTED: "Принят",
    S.READY: "Готов",
    S.COMPLETED: "Выполнен",
    S.CANCELLED: "Отменён",
}


def allowed_transitions(order: Order, actor: str) -> list[str]:
    return [target for target, actors in TRANSITIONS[order.status].items() if actor in actors]


def create_order(db: Session, user: User, data: OrderCreate) -> Order:
    # Одинаковые позиции из корзины складываем
    quantities: dict[int, int] = defaultdict(int)
    for item in data.items:
        quantities[item.medicine_id] += item.quantity

    order = Order(
        user_id=user.id,
        status=S.NEW,
        delivery_method=data.delivery_method,
        delivery_address=(data.delivery_address or "").strip() or None
        if data.delivery_method == "delivery" else None,
        comment=(data.comment or "").strip() or None,
        total_price=Decimal("0"),
    )
    total = Decimal("0")
    for medicine_id, qty in quantities.items():
        med = db.get(Medicine, medicine_id)
        if med is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, f"Препарат #{medicine_id} не найден")
        if med.is_expired:
            raise HTTPException(status.HTTP_409_CONFLICT, f"«{med.name}» недоступен: истёк срок годности")
        if med.stock < qty:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                f"Недостаточно товара «{med.name}»: в наличии {med.stock} шт., в заказе {qty} шт.",
            )
        price = med.final_price  # цена фиксируется на момент заказа, со скидкой
        order.items.append(OrderItem(medicine_id=med.id, quantity=qty, price_at_purchase=price))
        total += price * qty

    order.total_price = total
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


def change_status(db: Session, order: Order, new_status: str, actor: str) -> Order:
    old_status = order.status
    actors = TRANSITIONS[old_status].get(new_status)
    if not actors:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Нельзя перевести заказ из «{STATUS_LABELS[old_status]}» в «{STATUS_LABELS.get(new_status, new_status)}»",
        )
    if actor not in actors:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Это действие доступно только администратору")

    try:
        if old_status == S.NEW and new_status == S.ACCEPTED:
            # Сначала проверяем всё, потом списываем — чтобы не списать частично
            for item in order.items:
                med = item.medicine
                if med.stock < item.quantity:
                    raise HTTPException(
                        status.HTTP_409_CONFLICT,
                        f"Недостаточно товара «{med.name}»: на складе {med.stock} шт., нужно {item.quantity} шт.",
                    )
            for item in order.items:
                item.medicine.stock -= item.quantity

        elif new_status == S.CANCELLED and old_status in (S.ACCEPTED, S.READY):
            for item in order.items:
                item.medicine.stock += item.quantity

        order.status = new_status
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(order)
    return order


def to_out(order: Order, actor: str) -> OrderOut:
    items = [
        OrderItemOut(
            id=i.id,
            medicine_id=i.medicine_id,
            medicine_name=i.medicine.name,
            medicine_image=i.medicine.image_url,
            dosage=i.medicine.dosage,
            form=i.medicine.form,
            quantity=i.quantity,
            price_at_purchase=float(i.price_at_purchase),
            subtotal=float(i.price_at_purchase * i.quantity),
        )
        for i in order.items
    ]
    return OrderOut(
        id=order.id,
        status=order.status,
        delivery_method=order.delivery_method,
        delivery_address=order.delivery_address,
        comment=order.comment,
        total_price=float(order.total_price),
        items_count=sum(i.quantity for i in order.items),
        created_at=order.created_at,
        updated_at=order.updated_at,
        items=items,
        customer=OrderCustomer(
            id=order.user.id, full_name=order.user.full_name, email=order.user.email, phone=order.user.phone
        ),
        allowed_transitions=allowed_transitions(order, actor),
    )
