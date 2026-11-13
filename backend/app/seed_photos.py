"""Фото препаратов для тестовых данных.

PNG-файлы лежат в репозитории (seed_assets/medicines) и при старте копируются в папку
загрузок — так же, как фото баннеров. Сайт раздаёт их сам (/uploads/seed-medicines/...),
поэтому картинки не пропадут, если исходный сайт закроет доступ или сменит адрес.

У препаратов, которых нет в списке, показывается заглушка. Остальные фото добавляются
в админке (Лекарства → «Изменить» → «Изображение») — загрузкой файла или ссылкой.
"""
import shutil
from pathlib import Path

from app.core.config import settings

ASSETS_DIR = Path(__file__).parent / "seed_assets" / "medicines"
UPLOAD_SUBDIR = "seed-medicines"

# Название препарата из seed_data.MEDICINES → файл в seed_assets/medicines
PHOTOS: dict[str, str] = {
    "Нурофен": "nurofen.png",
    "Аквадетрим": "akvadetrim.png",
    "Бепантен": "bepanten.png",
    "Називин": "nazivin.png",
    "Парацетамол": "paracetamol.png",
    "Цетрин": "cetrin.png",
    "Но-шпа": "no-shpa.png",
    "Отривин": "otrivin.png",
    "Мезим форте": "mezim-forte.png",
    "Смекта": "smekta.png",
}

# Откуда взяты исходные картинки (до конвертации в PNG). Раньше seed ссылался на них
# напрямую — при старте такие ссылки в базе заменяются локальными файлами.
SOURCES: dict[str, str] = {
    "Нурофен": "https://media.uteka.ru/media/1024/4/5d/45dfae0eabb34f9bf2aa24fe4c9f7de6.jpg",
    "Аквадетрим": "https://maksavit.ru/upload/iblock/017/017034684a75af01045152833f476344/0eca0722c04c87782fa78e1b88dff9bb.jpg",
    "Бепантен": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTET9tOGPLCu5SINkTCXdbNocz7L9iuz9Re1zUxTypfW4qKAhM4EjEbVr7t&s=10",
    "Називин": "https://cdn.rigla.ru/media/catalog/product/cache/1e8ef93b9b4867ab9f3538dde2cb3b8a/3/5/35245-b-0-c-6-b0c609702a5bd4993f21c3b149abb6456cec57c8_35245.jpg",
    "Парацетамол": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRBcLMscXG7pK4l6XaBivuNPDl-3ry7N_eGxa3sGooTq2h-8Q_YfJLs5UU&s=10",
    "Цетрин": "https://s.zhivika.ru/images/cat_position/images_upload/bigger/25/2534300.jpg",
    "Но-шпа": "https://www.add.ua/media/catalog/product/cache/74c1057f7991b4edb2bc7bdaa94de933/n/o/no-spa_24_03_png.webp",
    "Отривин": "https://cloud.salomat.net/storage/uploads/products/2513/QEqJusKaQMWMshfEECQe6YBZ.webp",
    "Мезим форте": "https://healthplanet.by/upload/iblock/ecb/f6ps201q0tk3sxkse35rsb3w4j2jqde4.jpg",
    "Смекта": "https://asevalar.ru/upload/webp-converter.micro/converted_images/as_catalog_detail_card/as_catalog_detail/480/480/100/webp/758bf19a97a54e07032bbc2c626448b5.jpg.webp",
}


def medicine_photo_url(name: str) -> str | None:
    """Копирует PNG препарата в uploads (если его там ещё нет) и возвращает URL; None — фото нет."""
    filename = PHOTOS.get(name)
    if not filename:
        return None
    src = ASSETS_DIR / filename
    if not src.is_file():
        return None
    dest_dir = settings.upload_path / UPLOAD_SUBDIR
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / filename
    if not dest.exists():
        shutil.copyfile(src, dest)
    return f"/uploads/{UPLOAD_SUBDIR}/{filename}"


def install_all_medicine_photos() -> None:
    """Восстанавливает файлы в uploads, если папку data очистили."""
    for name in PHOTOS:
        medicine_photo_url(name)
