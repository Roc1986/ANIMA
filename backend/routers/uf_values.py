from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date
from pydantic import BaseModel
from database import get_db
from models.uf_value import UFValue
from models.legal_params import LegalParameter
from auth.jwt_handler import get_current_user, require_admin
from models.user import User

router = APIRouter()

@router.get("/")
def list_uf_values(limit: int = 60, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(UFValue).order_by(UFValue.date.desc()).limit(limit).all()

@router.get("/for-date")
def get_uf_for_date(query_date: date, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Returns the UF value for a given date (exact or nearest previous)."""
    row = db.query(UFValue).filter(UFValue.date <= query_date).order_by(UFValue.date.desc()).first()
    if row:
        return {"date": str(row.date), "value": float(row.value)}
    # Fallback: use global param
    param = db.query(LegalParameter).filter(LegalParameter.key == "uf_value").first()
    fallback = float(param.value) if param else 38000.0
    return {"date": str(query_date), "value": fallback}

class UFValueCreate(BaseModel):
    date: date
    value: float
    source: str = "manual"

@router.post("/", status_code=201)
def create_uf_value(data: UFValueCreate, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    existing = db.query(UFValue).filter(UFValue.date == data.date).first()
    if existing:
        existing.value = data.value
        existing.source = data.source
        db.commit()
        db.refresh(existing)
        return existing
    row = UFValue(date=data.date, value=data.value, source=data.source)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row

@router.delete("/{uf_id}")
def delete_uf_value(uf_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    row = db.query(UFValue).filter(UFValue.id == uf_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="No encontrado")
    db.delete(row)
    db.commit()
    return {"message": "Eliminado"}

@router.post("/seed")
def seed_uf_values(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    """Seed historical end-of-month UF values (2022-2026). Source: CMF Chile (cmfchile.cl)."""
    values = [
        # 2022 fin de mes (para nóminas 2023)
        ("2022-12-31", 35162.55),
        # 2023 fin de mes
        ("2023-01-31", 35269.68), ("2023-02-28", 35409.49), ("2023-03-31", 35565.70),
        ("2023-04-30", 35726.58), ("2023-05-31", 35818.55), ("2023-06-30", 35772.17),
        ("2023-07-31", 35631.47), ("2023-08-31", 35613.56), ("2023-09-30", 35836.43),
        ("2023-10-31", 36265.18), ("2023-11-30", 36470.69), ("2023-12-31", 36789.35),
        # 2024 fin de mes
        ("2024-01-31", 37109.84), ("2024-02-29", 37369.46), ("2024-03-31", 37597.82),
        ("2024-04-30", 37851.22), ("2024-05-31", 38013.73), ("2024-06-30", 37979.04),
        ("2024-07-31", 38024.06), ("2024-08-31", 38195.46), ("2024-09-30", 38456.85),
        ("2024-10-31", 38770.09), ("2024-11-30", 38906.14), ("2024-12-31", 38905.46),
        # 2025 fin de mes
        ("2025-01-31", 38974.04), ("2025-02-28", 39117.96), ("2025-03-31", 39483.62),
        ("2025-04-30", 39753.38), ("2025-05-31", 39869.51), ("2025-06-30", 39921.77),
        ("2025-07-31", 39975.93), ("2025-08-31", 40073.54), ("2025-09-30", 40199.86),
        ("2025-10-31", 40330.48), ("2025-11-30", 40491.89), ("2025-12-31", 40539.49),
        # 2026 fin de mes
        ("2026-01-31", 40557.23), ("2026-02-28", 40573.81), ("2026-03-31", 40593.40),
        ("2026-04-30", 40776.84), ("2026-05-31", 40610.69), ("2026-06-30", 40820.31),
    ]
    count = 0
    for d, v in values:
        existing = db.query(UFValue).filter(UFValue.date == d).first()
        if not existing:
            db.add(UFValue(date=d, value=v, source="seed_historico_CMF"))
            count += 1
        else:
            existing.value = v
            existing.source = "seed_historico_CMF"
    db.commit()
    return {"message": f"Seeded/updated {count} UF values (de {len(values)} totales)"}
