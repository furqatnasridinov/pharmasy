from datetime import date

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_admin
from app.models import Banner
from app.schemas.banner import BannerIn, BannerOut
from app.services.upload_service import save_image

router = APIRouter(tags=["banners"])

ORDER = (Banner.placement, Banner.sort_order, Banner.id)


@router.get("/api/banners", response_model=list[BannerOut])
def active_banners(db: Session = Depends(get_db)):
    """Баннеры для главной: включённые и попадающие в период показа."""
    today = date.today()
    return db.scalars(
        select(Banner)
        .where(
            Banner.is_active.is_(True),
            or_(Banner.starts_at.is_(None), Banner.starts_at <= today),
            or_(Banner.ends_at.is_(None), Banner.ends_at >= today),
        )
        .order_by(*ORDER)
    ).all()


admin = APIRouter(prefix="/api/admin/banners", tags=["admin"], dependencies=[Depends(require_admin)])


def _banner_or_404(db: Session, banner_id: int) -> Banner:
    banner = db.get(Banner, banner_id)
    if banner is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Баннер не найден")
    return banner


@admin.get("", response_model=list[BannerOut])
def list_banners(db: Session = Depends(get_db)):
    return db.scalars(select(Banner).order_by(*ORDER)).all()


@admin.post("", response_model=BannerOut, status_code=status.HTTP_201_CREATED)
def create_banner(data: BannerIn, db: Session = Depends(get_db)):
    banner = Banner(**data.model_dump())
    db.add(banner)
    db.commit()
    db.refresh(banner)
    return banner


@admin.put("/{banner_id}", response_model=BannerOut)
def update_banner(banner_id: int, data: BannerIn, db: Session = Depends(get_db)):
    banner = _banner_or_404(db, banner_id)
    for key, value in data.model_dump().items():
        setattr(banner, key, value)
    db.commit()
    db.refresh(banner)
    return banner


@admin.post("/{banner_id}/image", response_model=BannerOut)
async def upload_banner_image(banner_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    banner = _banner_or_404(db, banner_id)
    banner.image_url = await save_image(file)
    db.commit()
    db.refresh(banner)
    return banner


@admin.delete("/{banner_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_banner(banner_id: int, db: Session = Depends(get_db)):
    db.delete(_banner_or_404(db, banner_id))
    db.commit()
