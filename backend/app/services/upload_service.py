"""Сохранение загруженных картинок с проверкой типа и размера."""
import uuid

from fastapi import HTTPException, UploadFile, status

from app.core.config import settings

ALLOWED_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}

# Сигнатуры файлов: не доверяем только Content-Type от клиента
MAGIC = {
    ".jpg": (b"\xff\xd8\xff",),
    ".png": (b"\x89PNG\r\n\x1a\n",),
    ".webp": (b"RIFF",),
}


async def save_image(file: UploadFile) -> str:
    ext = ALLOWED_TYPES.get(file.content_type or "")
    if ext is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Допустимы только изображения JPG, PNG или WEBP")

    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    data = await file.read(max_bytes + 1)
    if len(data) > max_bytes:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Файл больше {settings.MAX_UPLOAD_MB} МБ")
    if not any(data.startswith(sig) for sig in MAGIC[ext]):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Файл не похож на изображение")

    settings.upload_path.mkdir(parents=True, exist_ok=True)
    name = f"{uuid.uuid4().hex}{ext}"
    (settings.upload_path / name).write_bytes(data)
    return f"/uploads/{name}"
