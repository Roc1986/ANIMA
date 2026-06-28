import httpx
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

MINDICADOR_API = "https://mindicador.cl/api"


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


@router.post("/sync-historical")
def sync_utm_historical(
    from_year: int = 2022,
    to_year: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """
    Descarga valores UTM desde mindicador.cl (SII) para cada año en el rango
    y los almacena con fecha del primer día del mes vigente.
    """
    today = date.today()
    if to_year == 0:
        to_year = today.year

    saved = 0
    errors = []

    for year in range(from_year, to_year + 1):
        try:
            with httpx.Client(timeout=20) as client:
                r = client.get(f"{MINDICADOR_API}/utm/{year}")
                r.raise_for_status()
                serie = r.json().get("serie", [])

            for entry in serie:
                entry_date_str = entry["fecha"][:10]
                entry_date = date.fromisoformat(entry_date_str)
                # Store as first day of the month the UTM is valid for
                first_of_month = date(entry_date.year, entry_date.month, 1)
                if first_of_month > today:
                    continue
                value = float(entry["valor"])
                existing = db.query(UTMValue).filter(UTMValue.date == first_of_month).first()
                if existing:
                    existing.value = value
                    existing.source = "mindicador.cl/SII"
                else:
                    db.add(UTMValue(date=first_of_month, value=value, source="mindicador.cl/SII"))
                    saved += 1

            db.commit()

        except Exception as e:
            errors.append(f"Error año {year}: {str(e)}")

    return {
        "message": f"Sincronizados {saved} valores UTM desde mindicador.cl (SII)",
        "years": list(range(from_year, to_year + 1)),
        "errors": errors,
    }


@router.post("/seed")
def seed_utm_values(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Alias de sync-historical para compatibilidad. Descarga desde mindicador.cl/SII."""
    return sync_utm_historical(from_year=2022, db=db, current_user=current_user)
