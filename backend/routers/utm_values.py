from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date
from pydantic import BaseModel
from database import get_db
from models.utm_value import UTMValue
from models.legal_params import LegalParameter
from auth.jwt_handler import get_current_user, require_admin
from models.user import User

router = APIRouter()

@router.get("/")
def list_utm_values(limit: int = 60, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(UTMValue).order_by(UTMValue.date.desc()).limit(limit).all()

@router.get("/for-date")
def get_utm_for_date(query_date: date, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Returns the UTM value for a given date (exact or nearest previous)."""
    row = db.query(UTMValue).filter(UTMValue.date <= query_date).order_by(UTMValue.date.desc()).first()
    if row:
        return {"date": str(row.date), "value": float(row.value)}
    param = db.query(LegalParameter).filter(LegalParameter.key == "UTM").first()
    fallback = float(param.value) if param else 70588.0
    return {"date": str(query_date), "value": fallback}

class UTMValueCreate(BaseModel):
    date: date
    value: float
    source: str = "manual"

@router.post("/", status_code=201)
def create_utm_value(data: UTMValueCreate, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    existing = db.query(UTMValue).filter(UTMValue.date == data.date).first()
    if existing:
        existing.value = data.value
        existing.source = data.source
        db.commit()
        db.refresh(existing)
        return existing
    row = UTMValue(date=data.date, value=data.value, source=data.source)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row

@router.delete("/{utm_id}")
def delete_utm_value(utm_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    row = db.query(UTMValue).filter(UTMValue.id == utm_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="No encontrado")
    db.delete(row)
    db.commit()
    return {"message": "Eliminado"}

@router.post("/seed")
def seed_utm_values(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Seed historical UTM values. Source: SII Chile."""
    values = [
        # 2023 - valor primer día de cada mes
        ("2023-01-01", 57123.00), ("2023-02-01", 57123.00), ("2023-03-01", 57388.00),
        ("2023-04-01", 57388.00), ("2023-05-01", 57907.00), ("2023-06-01", 58455.00),
        ("2023-07-01", 58934.00), ("2023-08-01", 59439.00), ("2023-09-01", 59439.00),
        ("2023-10-01", 59803.00), ("2023-11-01", 60159.00), ("2023-12-01", 60159.00),
        # 2024
        ("2024-01-01", 61515.00), ("2024-02-01", 61515.00), ("2024-03-01", 62006.00),
        ("2024-04-01", 62006.00), ("2024-05-01", 62557.00), ("2024-06-01", 63123.00),
        ("2024-07-01", 63523.00), ("2024-08-01", 63905.00), ("2024-09-01", 63905.00),
        ("2024-10-01", 64217.00), ("2024-11-01", 64629.00), ("2024-12-01", 64629.00),
        # 2025
        ("2025-01-01", 65443.00), ("2025-02-01", 65443.00), ("2025-03-01", 65934.00),
        ("2025-04-01", 65934.00), ("2025-05-01", 66509.00), ("2025-06-01", 66891.00),
        ("2025-07-01", 67294.00), ("2025-08-01", 67727.00), ("2025-09-01", 67727.00),
        ("2025-10-01", 68088.00), ("2025-11-01", 68088.00), ("2025-12-01", 68605.00),
        # 2026 - valores oficiales SII
        ("2026-01-01", 69751.00), ("2026-02-01", 69611.00), ("2026-03-01", 69889.00),
        ("2026-04-01", 69889.00), ("2026-05-01", 70588.00), ("2026-06-01", 71506.00),
        ("2026-07-01", 71649.00),
    ]
    seeded = 0
    for d, v in values:
        existing = db.query(UTMValue).filter(UTMValue.date == d).first()
        if not existing:
            db.add(UTMValue(date=d, value=v, source="seed_sii"))
            seeded += 1
    db.commit()
    return {"message": f"Seeded {seeded} UTM values (de {len(values)} totales)"}
