from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date
from pydantic import BaseModel
from database import get_db
from models.imm_value import IMMValue
from models.legal_params import LegalParameter
from auth.jwt_handler import get_current_user, require_admin
from models.user import User

router = APIRouter()


@router.get("/")
def list_imm_values(limit: int = 60, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(IMMValue).order_by(IMMValue.date.desc()).limit(limit).all()


@router.get("/for-date")
def get_imm_for_date(query_date: date, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Returns the IMM value vigente for a given date (exact or nearest previous)."""
    row = db.query(IMMValue).filter(IMMValue.date <= query_date).order_by(IMMValue.date.desc()).first()
    if row:
        return {"date": str(row.date), "value": float(row.value)}
    # Fallback: use global param
    param = db.query(LegalParameter).filter(LegalParameter.key == "imm_value").first()
    fallback = float(param.value) if param else 553553.0
    return {"date": str(query_date), "value": fallback}


class IMMValueCreate(BaseModel):
    date: date
    value: float
    source: str = "manual"


@router.post("/", status_code=201)
def create_imm_value(data: IMMValueCreate, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    existing = db.query(IMMValue).filter(IMMValue.date == data.date).first()
    if existing:
        existing.value = data.value
        existing.source = data.source
        db.commit()
        db.refresh(existing)
        return existing
    row = IMMValue(date=data.date, value=data.value, source=data.source)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{imm_id}")
def delete_imm_value(imm_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    row = db.query(IMMValue).filter(IMMValue.id == imm_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="No encontrado")
    db.delete(row)
    db.commit()
    return {"message": "Eliminado"}


@router.post("/seed")
def seed_imm_values(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    """Seed historical IMM values. Source: Dirección del Trabajo / BCCh."""
    values = [
        # (vigente_desde, valor)
        ("2020-03-01", 320.500),
        ("2021-03-01", 337.000),
        ("2022-05-01", 380.000),
        ("2022-08-01", 400.000),
        ("2023-05-01", 440.000),
        ("2024-05-01", 500.000),
        ("2025-05-01", 530.000),
        ("2026-05-01", 553.553),
    ]
    count = 0
    for d, v in values:
        existing = db.query(IMMValue).filter(IMMValue.date == d).first()
        if not existing:
            db.add(IMMValue(date=d, value=v, source="seed_historico"))
            count += 1
    db.commit()
    return {"message": f"Seeded {count} IMM values"}
