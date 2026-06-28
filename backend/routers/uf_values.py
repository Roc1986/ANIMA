import httpx
import calendar as cal_mod
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

MINDICADOR_API = "https://mindicador.cl/api"


@router.get("/")
def list_uf_values(limit: int = 60, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(UFValue).order_by(UFValue.date.desc()).limit(limit).all()


@router.get("/for-date")
def get_uf_for_date(query_date: date, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Returns the UF value for a given date (exact or nearest previous)."""
    row = db.query(UFValue).filter(UFValue.date <= query_date).order_by(UFValue.date.desc()).first()
    if row:
        return {"date": str(row.date), "value": float(row.value)}
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


@router.post("/sync-historical")
def sync_uf_historical(
    from_year: int = 2022,
    to_year: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """
    Descarga valores UF fin-de-mes desde mindicador.cl (CMF) para cada año
    en el rango solicitado y los almacena en la tabla uf_values.
    Solo guarda el último valor de cada mes (fin de mes).
    """
    today = date.today()
    if to_year == 0:
        to_year = today.year

    saved = 0
    errors = []

    for year in range(from_year, to_year + 1):
        try:
            with httpx.Client(timeout=20) as client:
                r = client.get(f"{MINDICADOR_API}/uf/{year}")
                r.raise_for_status()
                serie = r.json().get("serie", [])

            # Build map: (year, month) -> last entry value for that month
            month_last: dict[tuple, tuple] = {}
            for entry in serie:
                # fecha format: "2024-01-31T00:00:00.000Z"
                entry_date_str = entry["fecha"][:10]
                entry_date = date.fromisoformat(entry_date_str)
                key = (entry_date.year, entry_date.month)
                # Keep the entry with the highest day (last day of month)
                if key not in month_last or entry_date > month_last[key][0]:
                    month_last[key] = (entry_date, float(entry["valor"]))

            for (y, m), (eom_date, value) in month_last.items():
                # Skip future months
                if eom_date > today:
                    continue
                existing = db.query(UFValue).filter(UFValue.date == eom_date).first()
                if existing:
                    existing.value = value
                    existing.source = "mindicador.cl/CMF"
                else:
                    db.add(UFValue(date=eom_date, value=value, source="mindicador.cl/CMF"))
                    saved += 1

            db.commit()

        except Exception as e:
            errors.append(f"Error año {year}: {str(e)}")

    return {
        "message": f"Sincronizados {saved} valores UF desde mindicador.cl (CMF)",
        "years": list(range(from_year, to_year + 1)),
        "errors": errors,
    }


@router.post("/seed")
def seed_uf_values(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    """Alias de sync-historical para compatibilidad. Descarga desde mindicador.cl/CMF."""
    return sync_uf_historical(from_year=2022, db=db, current_user=current_user)
