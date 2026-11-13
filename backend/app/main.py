"""Точка входа: API, раздача загрузок и собранного React, SPA fallback."""
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select

from app import models  # noqa: F401 — регистрирует модели в Base.metadata
from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.models import Medicine
from app.routers import admin, auth, banners, categories, favorites, medicines, orders, promotions, reviews
from app.seed import seed_banners_if_empty, seed_if_empty
from app.seed_data import MANUFACTURER_COUNTRY
from app.seed_photos import SOURCES, install_all_medicine_photos, medicine_photo_url

STATIC_DIR = Path(settings.STATIC_DIR)


def upgrade_existing_db() -> None:
    """Мягкое обновление базы, созданной прошлой версией проекта (без потери данных)."""
    with engine.begin() as conn:
        columns = {row[1] for row in conn.exec_driver_sql("PRAGMA table_info(medicines)")}
        if columns and "country" not in columns:
            conn.exec_driver_sql("ALTER TABLE medicines ADD COLUMN country VARCHAR(100)")
        banner_columns = {row[1] for row in conn.exec_driver_sql("PRAGMA table_info(banners)")}
        if banner_columns and "show_text" not in banner_columns:
            # У старых баннеров с картинкой текст был нарисован на самой картинке
            conn.exec_driver_sql("ALTER TABLE banners ADD COLUMN show_text BOOLEAN NOT NULL DEFAULT 1")
            conn.exec_driver_sql("UPDATE banners SET show_text = 0 WHERE image_url IS NOT NULL")
    # Картинки препаратов из seed хранятся локально (PNG в seed_assets → /uploads/seed-medicines/).
    # Старые варианты в базе — сгенерированные SVG, ссылки на Wikimedia и на чужие сайты — заменяем.
    # Картинки, которые администратор загрузил или указал сам, не трогаем.
    install_all_medicine_photos()
    old_external = set(SOURCES.values())
    with SessionLocal() as db:
        for med in db.scalars(select(Medicine)):
            url = med.image_url
            outdated = (
                url is None
                or url.startswith("/uploads/seed/")
                or ".wikimedia.org/" in url
                or url in old_external
            )
            if outdated:
                med.image_url = medicine_photo_url(med.name)
            if not med.country:
                med.country = MANUFACTURER_COUNTRY.get(med.manufacturer or "")
        db.commit()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    settings.upload_path.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(bind=engine)
    upgrade_existing_db()
    with SessionLocal() as db:
        seed_if_empty(db)
        seed_banners_if_empty(db)
    yield


app = FastAPI(title="Darmon — API аптеки", version="1.0.0", lifespan=lifespan)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(_request: Request, exc: RequestValidationError):
    """Превращаем ошибки Pydantic в понятный текст для пользователя (HTTP 400)."""
    messages = []
    for err in exc.errors():
        field = ".".join(str(p) for p in err.get("loc", []) if p not in ("body", "query", "path"))
        msg = err.get("msg", "").removeprefix("Value error, ")
        messages.append(f"{field}: {msg}" if field else msg)
    return JSONResponse(status_code=400, content={"detail": "; ".join(messages)})


for r in (auth, categories, medicines, favorites, reviews, orders, promotions, banners, admin):
    app.include_router(r.router)
app.include_router(banners.admin)


@app.get("/api/health", tags=["health"])
def health():
    return {"status": "ok"}


app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR, check_dir=False), name="uploads")
if (STATIC_DIR / "assets").is_dir():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")


@app.get("/{full_path:path}", include_in_schema=False)
def spa_fallback(full_path: str):
    """Все пути, кроме /api, /docs, /uploads, /assets, отдают index.html (React Router)."""
    if full_path.startswith("api/") or full_path == "api":
        raise HTTPException(404, "Метод API не найден")
    index = STATIC_DIR / "index.html"
    if not index.exists():
        return JSONResponse({"detail": "Фронтенд не собран. Для разработки запустите `npm run dev` в frontend/."}, 404)
    candidate = (STATIC_DIR / full_path).resolve()
    if full_path and candidate.is_file() and STATIC_DIR.resolve() in candidate.parents:
        return FileResponse(candidate)
    return FileResponse(index)
