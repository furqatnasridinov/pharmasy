"""Тестовые данные. Выполняется при старте, если в базе нет пользователей."""
import random
from datetime import date, datetime, timedelta
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.models import Category, Medicine, Order, OrderItem, OrderStatus, Promotion, Review, User
from app.seed_data import (
    ADDRESSES, ADMIN, CATEGORIES, CUSTOMERS, DEALS_OF_DAY, DISCOUNTS, EXPIRED, EXPIRING,
    LOW_STOCK, MAIN_USER, MEDICINES, OUT_OF_STOCK, REVIEW_TEXTS,
)
from app.seed_images import write_image

SEED_IMAGE_DIR = "seed"


def seed_if_empty(db: Session) -> None:
    if db.scalar(select(func.count(User.id))):
        return
    rnd = random.Random(2026)  # фиксированное зерно — одинаковые данные при каждом сбросе
    print("[seed] База пустая — заполняю тестовыми данными…")

    users = _seed_users(db)
    categories = _seed_categories(db)
    medicines = _seed_medicines(db, categories, rnd)
    _seed_promotions(db, categories)
    _seed_reviews(db, users, medicines, rnd)
    _seed_orders(db, users, medicines, rnd)
    db.commit()
    print(f"[seed] Готово: {len(medicines)} препаратов, {len(categories)} категорий, {len(users)} пользователей.")


def _seed_users(db: Session) -> list[User]:
    admin = User(email=settings.ADMIN_EMAIL, password_hash=hash_password(settings.ADMIN_PASSWORD),
                 full_name=ADMIN[0], phone=ADMIN[1], role="admin")
    main = User(email="user@pharmacy.local", password_hash=hash_password("user123"),
                full_name=MAIN_USER[0], phone=MAIN_USER[1], role="user")
    common_hash = hash_password("user123")
    others = [
        User(email=f"{login}@pharmacy.local", password_hash=common_hash, full_name=name,
             phone=f"+992 9{i % 10} {300 + i * 7}-{10 + i:02d}-{40 + i:02d}", role="user")
        for i, (name, login) in enumerate(CUSTOMERS)
    ]
    db.add_all([admin, main, *others])
    db.flush()
    return [main, *others]  # покупатели; admin не пишет отзывы и не заказывает


def _seed_categories(db: Session) -> dict[str, Category]:
    cats = {name: Category(name=name, description=desc) for name, desc in CATEGORIES}
    db.add_all(cats.values())
    db.flush()
    return cats


def _seed_medicines(db: Session, categories: dict[str, Category], rnd: random.Random) -> dict[str, Medicine]:
    today = date.today()
    image_dir = settings.upload_path / SEED_IMAGE_DIR
    result: dict[str, Medicine] = {}
    created = datetime.now() - timedelta(days=90)

    for cat_name, items in MEDICINES.items():
        for name, substance, form, dosage, package, maker, price, rx, short in items:
            if name in EXPIRED:
                expiry = today + timedelta(days=EXPIRED[name])
            elif name in EXPIRING:
                expiry = today + timedelta(days=EXPIRING[name])
            else:
                expiry = today + timedelta(days=rnd.randint(150, 900))

            if name in OUT_OF_STOCK:
                stock = 0
            elif name in LOW_STOCK:
                stock = LOW_STOCK[name]
            else:
                stock = rnd.randint(8, 120)

            description = (
                f"{short}\n\nДействующее вещество: {substance}. "
                f"Форма выпуска: {form}{', ' + dosage if dosage else ''}, {package}. "
                f"Производитель: {maker}.\n\n"
                + ("Препарат отпускается по рецепту врача. " if rx else "")
                + "Перед применением ознакомьтесь с инструкцией и проконсультируйтесь со специалистом."
            )
            med = Medicine(
                name=name, description=description, category_id=categories[cat_name].id, manufacturer=maker,
                active_substance=substance, form=form, dosage=dosage, package=package,
                price=Decimal(str(price)), stock=stock, expiry_date=expiry, requires_prescription=rx,
                discount_percent=DISCOUNTS.get(name, 0), is_deal_of_day=name in DEALS_OF_DAY,
                created_at=created + timedelta(hours=len(result) * 13),
            )
            db.add(med)
            db.flush()
            filename = f"medicine-{med.id}.svg"
            write_image(image_dir, filename, name=name, form=form, dosage=dosage, package=package, category=cat_name)
            med.image_url = f"/uploads/{SEED_IMAGE_DIR}/{filename}"
            result[name] = med
    return result


def _seed_promotions(db: Session, categories: dict[str, Category]) -> None:
    today = date.today()
    db.add_all([
        Promotion(title="Сезон простуды", discount_percent=20, theme="teal",
                  description="Скидка на препараты от простуды, гриппа и капли для носа.",
                  category_id=categories["Простуда и грипп"].id,
                  starts_at=today - timedelta(days=12), ends_at=today + timedelta(days=18)),
        Promotion(title="Витамины: 2 упаковки по цене одной", theme="amber",
                  description="На витамин D3, Компливит и омегу-3 — вторая упаковка в подарок.",
                  category_id=categories["Витамины"].id,
                  starts_at=today - timedelta(days=5), ends_at=today + timedelta(days=32)),
        Promotion(title="Бесплатная доставка", theme="blue",
                  description="Для заказов от 200 смн по всему Душанбе.",
                  starts_at=today - timedelta(days=60), ends_at=None),
    ])


def _seed_reviews(db: Session, users: list[User], medicines: dict[str, Medicine], rnd: random.Random) -> None:
    now = datetime.now()
    for med in medicines.values():
        authors = rnd.sample(users, k=rnd.choice([0, 1, 2, 2, 3, 3, 4, 5]))
        for author in authors:
            rating = rnd.choices([5, 4, 3], weights=[60, 30, 10])[0]
            db.add(Review(
                user_id=author.id, medicine_id=med.id, rating=rating,
                text=rnd.choice(REVIEW_TEXTS[rating]),
                created_at=now - timedelta(days=rnd.randint(1, 80), hours=rnd.randint(0, 23)),
            ))


def _order(db, user, status, items, *, days_ago, method="pickup", address=None, comment=None) -> None:
    created = datetime.now() - timedelta(days=days_ago, hours=random.Random(days_ago).randint(0, 8))
    order = Order(user_id=user.id, status=status, delivery_method=method, delivery_address=address,
                  comment=comment, total_price=Decimal("0"), created_at=created, updated_at=created + timedelta(hours=3))
    total = Decimal("0")
    for med, qty in items:
        price = med.final_price
        order.items.append(OrderItem(medicine_id=med.id, quantity=qty, price_at_purchase=price))
        total += price * qty
    order.total_price = total
    db.add(order)


def _seed_orders(db: Session, users: list[User], m: dict[str, Medicine], rnd: random.Random) -> None:
    main = users[0]
    S = OrderStatus
    # Заказы основного пользователя (Алишер Рахимов) — во всех статусах
    _order(db, main, S.COMPLETED, [(m["Цетрин"], 1), (m["Компливит"], 1), (m["Но-шпа"], 2)], days_ago=21)
    _order(db, main, S.CANCELLED, [(m["Арбидол"], 1)], days_ago=9, comment="Передумал, купил в другой аптеке")
    _order(db, main, S.READY, [(m["Терафлю Экстра"], 2), (m["Називин"], 1), (m["Цетрин"], 1)], days_ago=0,
           method="delivery", address=ADDRESSES[0], comment="Позвоните за 10 минут")
    _order(db, main, S.NEW, [(m["Парацетамол"], 2), (m["Смекта"], 1)], days_ago=0)

    # Выполненные заказы других покупателей — для «Хитов продаж» и выручки
    popular = ["Нурофен", "Цетрин", "Парацетамол", "Но-шпа", "Мезим форте", "Смекта", "Аквадетрим",
               "Компливит", "Магне B6", "Омез", "Отривин", "Бепантен", "Лазолван", "Ибуклин", "Супрастин"]
    weights = [10, 9, 9, 8, 7, 6, 6, 5, 5, 4, 4, 4, 3, 3, 3]
    for i in range(24):
        buyer = users[1 + i % (len(users) - 1)]
        names = set(rnd.choices(popular, weights=weights, k=rnd.randint(1, 4)))
        delivery = rnd.random() < 0.6
        _order(db, buyer, S.COMPLETED, [(m[n], rnd.randint(1, 3)) for n in names], days_ago=rnd.randint(1, 55),
               method="delivery" if delivery else "pickup",
               address=rnd.choice(ADDRESSES[1:]) if delivery else None)

    # Активные заказы для админки
    _order(db, users[1], S.NEW, [(m["Аквадетрим"], 2), (m["Магне B6"], 1)], days_ago=0,
           method="delivery", address=ADDRESSES[1])
    _order(db, users[2], S.NEW, [(m["Амоксиклав"], 1)], days_ago=0, comment="Рецепт покажу при получении")
    _order(db, users[3], S.ACCEPTED, [(m["Нурофен"], 1), (m["Стрепсилс"], 2)], days_ago=1,
           method="delivery", address=ADDRESSES[2])
    _order(db, users[4], S.CANCELLED, [(m["Эриус"], 1)], days_ago=3)
