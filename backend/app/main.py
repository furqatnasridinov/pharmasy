"""Точка входа: API, раздача загрузок и собранного React, SPA fallback."""
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app import models  # noqa: F401 — регистрирует модели в Base.metadata
from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.routers import admin, auth, categories, favorites, medicines, orders, promotions, reviews
from app.seed import seed_if_empty

STATIC_DIR = Path(settings.STATIC_DIR)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    settings.upload_path.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_if_empty(db)
    yield


app = FastAPI(title="Провизор — API аптеки", version="1.0.0", lifespan=lifespan)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(_request: Request, exc: RequestValidationError):
    """Превращаем ошибки Pydantic в понятный текст для пользователя (HTTP 400)."""
    messages = []
    for err in exc.errors():
        field = ".".join(str(p) for p in err.get("loc", []) if p not in ("body", "query", "path"))
        msg = err.get("msg", "").removeprefix("Value error, ")
        messages.append(f"{field}: {msg}" if field else msg)
    return JSONResponse(status_code=400, content={"detail": "; ".join(messages)})


for r in (auth, categories, medicines, favorites, reviews, orders, promotions, admin):
    app.include_router(r.router)


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
