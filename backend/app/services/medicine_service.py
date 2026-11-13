"""Каталог: фильтры, сортировка, рейтинг, итоговая цена со скидкой."""
import math
from datetime import date, timedelta

from sqlalchemy import Select, and_, desc, func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.models import Medicine, Order, OrderItem, OrderStatus, Review
from app.schemas.medicine import MedicineOut, MedicinePage

# Итоговая цена со скидкой как SQL-выражение — для фильтра и сортировки по цене
FINAL_PRICE = Medicine.price * (100 - Medicine.discount_percent) / 100.0

SORTS = {"price_asc", "price_desc", "name", "rating", "newest", "discount"}

# Группы форм выпуска для фильтра (как «Форма выпуска» на сайтах аптек).
# Порядок важен: инъекции проверяются раньше, чем «раствор» и «порошок».
FORM_GROUPS: dict[str, tuple[str, ...]] = {
    "Инъекции": ("%инъекц%",),
    "Таблетки": ("таблетки%",),
    "Капсулы": ("капсулы%",),
    "Драже": ("драже%",),
    "Сироп": ("сироп%",),
    "Суспензия": ("суспензия%",),
    "Капли": ("капли%",),
    "Спрей": ("спрей%", "аэрозоль%"),
    "Мазь": ("мазь%",),
    "Крем": ("крем%",),
    "Гель": ("гель%",),
    "Порошок": ("порошок%", "гранулы%"),
    "Раствор": ("раствор%",),
    "Свечи": ("суппозитории%",),
    "Паста": ("паста%",),
}


def form_group(form: str) -> str:
    f = (form or "").lower()
    for group, patterns in FORM_GROUPS.items():
        for pat in patterns:
            core = pat.strip("%")
            if (pat.startswith("%") and core in f) or (not pat.startswith("%") and f.startswith(core)):
                return group
    return "Другое"


def expiry_status(expiry: date) -> str:
    today = date.today()
    if expiry < today:
        return "expired"
    if expiry <= today + timedelta(days=settings.EXPIRY_WARNING_DAYS):
        return "expiring"
    return "ok"


def to_out(med: Medicine, rating: float | None = None, reviews_count: int = 0) -> MedicineOut:
    status = expiry_status(med.expiry_date)
    return MedicineOut(
        id=med.id,
        name=med.name,
        description=med.description,
        category_id=med.category_id,
        category_name=med.category.name if med.category else "",
        manufacturer=med.manufacturer,
        country=med.country,
        active_substance=med.active_substance,
        form=med.form,
        dosage=med.dosage,
        package=med.package,
        price=float(med.price),
        final_price=float(med.final_price),
        discount_percent=med.discount_percent or 0,
        is_deal_of_day=med.is_deal_of_day,
        stock=med.stock,
        expiry_date=med.expiry_date,
        expiry_status=status,
        is_available=med.stock > 0 and status != "expired",
        requires_prescription=med.requires_prescription,
        image_url=med.image_url,
        rating=round(float(rating), 1) if rating is not None else None,
        reviews_count=reviews_count or 0,
        created_at=med.created_at,
        updated_at=med.updated_at,
    )


def _ratings_subquery():
    return (
        select(
            Review.medicine_id.label("medicine_id"),
            func.avg(Review.rating).label("rating"),
            func.count(Review.id).label("reviews_count"),
        )
        .group_by(Review.medicine_id)
        .subquery()
    )


def ratings_for(db: Session, ids: list[int]) -> dict[int, tuple[float | None, int]]:
    if not ids:
        return {}
    rows = db.execute(
        select(Review.medicine_id, func.avg(Review.rating), func.count(Review.id))
        .where(Review.medicine_id.in_(ids))
        .group_by(Review.medicine_id)
    ).all()
    return {mid: (avg, cnt) for mid, avg, cnt in rows}


def to_out_many(db: Session, meds: list[Medicine]) -> list[MedicineOut]:
    ratings = ratings_for(db, [m.id for m in meds])
    return [to_out(m, *ratings.get(m.id, (None, 0))) for m in meds]


def available_condition():
    return and_(Medicine.stock > 0, Medicine.expiry_date >= date.today())


def list_medicines(
    db: Session,
    *,
    search: str | None = None,
    category_id: int | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    in_stock: bool = False,
    on_sale: bool = False,
    otc_only: bool = False,
    manufacturers: list[str] | None = None,
    forms: list[str] | None = None,
    substance: str | None = None,
    exclude_id: int | None = None,
    sort: str = "name",
    page: int = 1,
    page_size: int = 12,
) -> MedicinePage:
    ratings = _ratings_subquery()
    query: Select = (
        select(Medicine, ratings.c.rating, ratings.c.reviews_count)
        .outerjoin(ratings, ratings.c.medicine_id == Medicine.id)
        .options(joinedload(Medicine.category))
    )

    if search:
        pattern = f"%{search.strip().lower()}%"
        query = query.where(
            or_(
                func.py_lower(Medicine.name).like(pattern),
                func.py_lower(Medicine.active_substance).like(pattern),
            )
        )
    if category_id:
        query = query.where(Medicine.category_id == category_id)
    if min_price is not None:
        query = query.where(FINAL_PRICE >= min_price)
    if max_price is not None:
        query = query.where(FINAL_PRICE <= max_price)
    if in_stock:
        query = query.where(available_condition())
    if on_sale:
        query = query.where(Medicine.discount_percent > 0)
    if otc_only:
        query = query.where(Medicine.requires_prescription.is_(False))
    if manufacturers:
        query = query.where(Medicine.manufacturer.in_(manufacturers))
    if forms:
        patterns = [p for f in forms for p in FORM_GROUPS.get(f, ())]
        if patterns:
            query = query.where(or_(*[func.py_lower(Medicine.form).like(p) for p in patterns]))
    if substance:
        # «Показать аналоги»: то же действующее вещество
        query = query.where(func.py_lower(Medicine.active_substance) == substance.strip().lower())
    if exclude_id:
        query = query.where(Medicine.id != exclude_id)

    order_by = {
        "price_asc": [FINAL_PRICE.asc()],
        "price_desc": [FINAL_PRICE.desc()],
        "rating": [desc(func.coalesce(ratings.c.rating, 0)), desc(func.coalesce(ratings.c.reviews_count, 0))],
        "newest": [Medicine.created_at.desc()],
        "discount": [Medicine.discount_percent.desc()],
    }.get(sort, [func.py_lower(Medicine.name).asc()])
    query = query.order_by(*order_by, Medicine.id)

    total = db.scalar(select(func.count()).select_from(query.order_by(None).subquery())) or 0
    page_size = max(1, min(page_size, 60))
    pages = max(1, math.ceil(total / page_size))
    page = max(1, page)

    rows = db.execute(query.offset((page - 1) * page_size).limit(page_size)).unique().all()
    items = [to_out(med, rating, cnt) for med, rating, cnt in rows]
    return MedicinePage(items=items, total=total, page=page, page_size=page_size, pages=pages)


def deals_of_day(db: Session, limit: int = 8) -> list[MedicineOut]:
    meds = db.scalars(
        select(Medicine)
        .options(joinedload(Medicine.category))
        .where(Medicine.is_deal_of_day.is_(True), available_condition())
        .order_by(Medicine.discount_percent.desc())
        .limit(limit)
    ).all()
    return to_out_many(db, list(meds))


def bestsellers(db: Session, limit: int = 8) -> list[MedicineOut]:
    """Топ по количеству в выполненных заказах, добор — по рейтингу."""
    sold = (
        select(OrderItem.medicine_id, func.sum(OrderItem.quantity).label("sold"))
        .join(Order, Order.id == OrderItem.order_id)
        .where(Order.status == OrderStatus.COMPLETED)
        .group_by(OrderItem.medicine_id)
        .subquery()
    )
    ids = list(
        db.scalars(
            select(Medicine.id)
            .join(sold, sold.c.medicine_id == Medicine.id)
            .where(available_condition())
            .order_by(sold.c.sold.desc())
            .limit(limit)
        )
    )
    if len(ids) < limit:
        ratings = _ratings_subquery()
        extra = db.scalars(
            select(Medicine.id)
            .outerjoin(ratings, ratings.c.medicine_id == Medicine.id)
            .where(available_condition(), Medicine.id.notin_(ids or [0]))
            .order_by(desc(func.coalesce(ratings.c.reviews_count, 0)), desc(func.coalesce(ratings.c.rating, 0)))
            .limit(limit - len(ids))
        )
        ids += list(extra)

    meds = {m.id: m for m in db.scalars(
        select(Medicine).options(joinedload(Medicine.category)).where(Medicine.id.in_(ids))
    ).unique()}
    return to_out_many(db, [meds[i] for i in ids if i in meds])


def facets(db: Session, *, category_id: int | None = None, search: str | None = None) -> dict:
    """Значения для фильтров каталога с количеством препаратов."""
    query = select(Medicine.manufacturer, Medicine.form, FINAL_PRICE)
    if category_id:
        query = query.where(Medicine.category_id == category_id)
    if search:
        pattern = f"%{search.strip().lower()}%"
        query = query.where(or_(func.py_lower(Medicine.name).like(pattern),
                                func.py_lower(Medicine.active_substance).like(pattern)))
    rows = db.execute(query).all()
    makers: dict[str, int] = {}
    groups: dict[str, int] = {}
    prices = []
    for maker, form, price in rows:
        if maker:
            makers[maker] = makers.get(maker, 0) + 1
        g = form_group(form)
        groups[g] = groups.get(g, 0) + 1
        prices.append(float(price))
    order = list(FORM_GROUPS) + ["Другое"]
    return {
        "manufacturers": [{"name": k, "count": v} for k, v in sorted(makers.items(), key=lambda kv: (-kv[1], kv[0]))],
        "forms": [{"name": k, "count": groups[k]} for k in order if k in groups],
        "price_min": min(prices) if prices else 0,
        "price_max": max(prices) if prices else 0,
    }
