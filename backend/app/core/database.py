"""Подключение к SQLite и фабрика сессий."""
from datetime import datetime, timezone

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings

db_file = settings.sqlite_file
if db_file is not None:
    db_file.parent.mkdir(parents=True, exist_ok=True)

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False},
)


@event.listens_for(engine, "connect")
def _sqlite_setup(dbapi_conn, _record):
    # Внешние ключи в SQLite по умолчанию выключены
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()
    # Встроенный lower() в SQLite не понимает кириллицу —
    # регистрируем свою функцию для поиска без учёта регистра.
    dbapi_conn.create_function("py_lower", 1, lambda s: s.lower() if isinstance(s, str) else s)


SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
