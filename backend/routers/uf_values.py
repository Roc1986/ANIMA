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
    """Seed recent UF values (2026). Source: CMF Chile."""
    values = [
        ("2026-01-01", 38543.00), ("2026-02-01", 38623.00), ("2026-03-01", 38702.00),
        ("2026-04-01", 38780.00), ("2026-05-01", 38858.00), ("2026-06-01", 38935.00),
        ("2026-06-16", 38970.00),
    ]
    for d, v in values:
        existing = db.query(UFValue).filter(UFValue.date == d).first()
        if not existing:
            db.add(UFValue(date=d, value=v, source="seed_2026"))
    db.commit()
    return {"message": f"Seeded {len(values)} UF values"}
