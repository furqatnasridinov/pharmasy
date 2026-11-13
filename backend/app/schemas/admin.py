from pydantic import BaseModel

from app.schemas.medicine import MedicineOut


class TopMedicine(BaseModel):
    id: int
    name: str
    dosage: str | None
    sold: int
    revenue: float


class DashboardOut(BaseModel):
    new_orders: int
    total_orders: int
    revenue_total: float
    revenue_30d: float
    medicines_total: int
    users_total: int
    top_medicines: list[TopMedicine]
    low_stock: list[MedicineOut]
    expiring: list[MedicineOut]
    expired: list[MedicineOut]
    expiry_warning_days: int
    low_stock_threshold: int
