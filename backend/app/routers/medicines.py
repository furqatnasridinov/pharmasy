from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_admin
from app.models import Category, Medicine, OrderItem
from app.schemas.medicine import MedicineFacets, MedicineIn, MedicineOut, MedicinePage, StockUpdate
from app.services import medicine_service as svc
from app.services.upload_service import save_image

router = APIRouter(prefix="/api/medicines", tags=["medicines"])


def _get_or_404(db: Session, medicine_id: int) -> Medicine:
    med = db.get(Medicine, medicine_id)
    if med is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Препарат не найден")
    return med


def _out(db: Session, med: Medicine) -> MedicineOut:
    return svc.to_out_many(db, [med])[0]


def _check_category(db: Session, category_id: int):
    if db.get(Category, category_id) is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Указанная категория не существует")


@router.get("", response_model=MedicinePage)
def list_medicines(
    search: str | None = Query(None, max_length=100),
    category_id: int | None = None,
    min_price: float | None = Query(None, ge=0),
    max_price: float | None = Query(None, ge=0),
    in_stock: bool = False,
    on_sale: bool = False,
    otc_only: bool = False,
    manufacturer: list[str] = Query(default=[]),
    form: list[str] = Query(default=[]),
    substance: str | None = Query(None, max_length=255),
    exclude_id: int | None = None,
    sort: str = "name",
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=60),
    db: Session = Depends(get_db),
):
    return svc.list_medicines(
        db, search=search, category_id=category_id, min_price=min_price, max_price=max_price,
        in_stock=in_stock, on_sale=on_sale, otc_only=otc_only, manufacturers=manufacturer, forms=form,
        substance=substance, exclude_id=exclude_id, sort=sort, page=page, page_size=page_size,
    )


@router.get("/facets", response_model=MedicineFacets)
def medicine_facets(category_id: int | None = None, search: str | None = Query(None, max_length=100),
                    db: Session = Depends(get_db)):
    return svc.facets(db, category_id=category_id, search=search)


@router.get("/deals", response_model=list[MedicineOut])
def deals(limit: int = Query(8, ge=1, le=24), db: Session = Depends(get_db)):
    return svc.deals_of_day(db, limit)


@router.get("/bestsellers", response_model=list[MedicineOut])
def bestsellers(limit: int = Query(8, ge=1, le=24), db: Session = Depends(get_db)):
    return svc.bestsellers(db, limit)


@router.get("/{medicine_id}", response_model=MedicineOut)
def get_medicine(medicine_id: int, db: Session = Depends(get_db)):
    return _out(db, _get_or_404(db, medicine_id))


@router.post("", response_model=MedicineOut, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_admin)])
def create_medicine(data: MedicineIn, db: Session = Depends(get_db)):
    _check_category(db, data.category_id)
    med = Medicine(**data.model_dump())
    db.add(med)
    db.commit()
    db.refresh(med)
    return _out(db, med)


@router.put("/{medicine_id}", response_model=MedicineOut, dependencies=[Depends(require_admin)])
def update_medicine(medicine_id: int, data: MedicineIn, db: Session = Depends(get_db)):
    med = _get_or_404(db, medicine_id)
    _check_category(db, data.category_id)
    for key, value in data.model_dump().items():
        setattr(med, key, value)
    db.commit()
    db.refresh(med)
    return _out(db, med)


@router.patch("/{medicine_id}/stock", response_model=MedicineOut, dependencies=[Depends(require_admin)])
def update_stock(medicine_id: int, data: StockUpdate, db: Session = Depends(get_db)):
    med = _get_or_404(db, medicine_id)
    med.stock = data.stock
    db.commit()
    db.refresh(med)
    return _out(db, med)


@router.delete("/{medicine_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
def delete_medicine(medicine_id: int, db: Session = Depends(get_db)):
    med = _get_or_404(db, medicine_id)
    if db.scalar(select(OrderItem.id).where(OrderItem.medicine_id == medicine_id).limit(1)):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Препарат есть в заказах — удалить нельзя. Поставьте остаток 0, чтобы снять его с продажи.",
        )
    db.delete(med)
    db.commit()


@router.post("/{medicine_id}/image", response_model=MedicineOut, dependencies=[Depends(require_admin)])
async def upload_image(medicine_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    med = _get_or_404(db, medicine_id)
    med.image_url = await save_image(file)
    db.commit()
    db.refresh(med)
    return _out(db, med)
