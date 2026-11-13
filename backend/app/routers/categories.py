from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_admin
from app.models import Category, Medicine
from app.schemas.category import CategoryIn, CategoryOut

router = APIRouter(prefix="/api/categories", tags=["categories"])


def _with_count(db: Session, cat: Category) -> CategoryOut:
    count = db.scalar(select(func.count(Medicine.id)).where(Medicine.category_id == cat.id)) or 0
    return CategoryOut(id=cat.id, name=cat.name, description=cat.description, medicines_count=count)


def _check_unique(db: Session, name: str, exclude_id: int | None = None):
    query = select(Category).where(func.py_lower(Category.name) == name.strip().lower())
    if exclude_id:
        query = query.where(Category.id != exclude_id)
    if db.scalar(query):
        raise HTTPException(status.HTTP_409_CONFLICT, "Категория с таким названием уже существует")


@router.get("", response_model=list[CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    rows = db.execute(
        select(Category, func.count(Medicine.id))
        .outerjoin(Medicine, Medicine.category_id == Category.id)
        .group_by(Category.id)
        .order_by(Category.name)
    ).all()
    return [
        CategoryOut(id=c.id, name=c.name, description=c.description, medicines_count=cnt) for c, cnt in rows
    ]


@router.post("", response_model=CategoryOut, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_admin)])
def create_category(data: CategoryIn, db: Session = Depends(get_db)):
    _check_unique(db, data.name)
    cat = Category(name=data.name.strip(), description=data.description)
    db.add(cat)
    db.commit()
    return _with_count(db, cat)


@router.put("/{category_id}", response_model=CategoryOut, dependencies=[Depends(require_admin)])
def update_category(category_id: int, data: CategoryIn, db: Session = Depends(get_db)):
    cat = db.get(Category, category_id)
    if cat is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Категория не найдена")
    _check_unique(db, data.name, exclude_id=category_id)
    cat.name = data.name.strip()
    cat.description = data.description
    db.commit()
    return _with_count(db, cat)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
def delete_category(category_id: int, db: Session = Depends(get_db)):
    cat = db.get(Category, category_id)
    if cat is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Категория не найдена")
    count = db.scalar(select(func.count(Medicine.id)).where(Medicine.category_id == category_id)) or 0
    if count:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Нельзя удалить категорию «{cat.name}»: в ней {count} препарат(ов). Сначала перенесите или удалите их.",
        )
    db.delete(cat)
    db.commit()
