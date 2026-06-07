"""
Auto-sync UF (daily) and UTM (monthly) from mindicador.cl public API.
"""
import httpx
import logging
from datetime import date
from sqlalchemy.orm import Session

from database import SessionLocal
from models.legal_params import LegalParameter, LegalParamAudit

logger = logging.getLogger(__name__)

MINDICADOR_API = "https://mindicador.cl/api"


async def _fetch_indicator(code: str) -> float | None:
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(f"{MINDICADOR_API}/{code}")
            r.raise_for_status()
            data = r.json()
            return float(data["serie"][0]["valor"])
    except Exception as e:
        logger.error(f"Error fetching {code} from mindicador.cl: {e}")
        return None


def _update_global_param(db: Session, key: str, value: float, description: str, source: str):
    param = db.query(LegalParameter).filter(
        LegalParameter.key == key,
        LegalParameter.company_id == None,
        LegalParameter.is_active == True,
    ).first()

    if param:
        old_value = float(param.value)
        if abs(old_value - value) < 0.01:
            return  # no change
        audit = LegalParamAudit(
            parameter_key=key,
            old_value=old_value,
            new_value=value,
            change_reason=f"Auto-sync desde {source}",
            ai_proposed=False,
        )
        db.add(audit)
        param.value = value
        param.source = source
        param.effective_date = date.today()
    else:
        param = LegalParameter(
            key=key,
            value=value,
            description=description,
            unit="CLP",
            source=source,
            effective_date=date.today(),
            is_active=True,
            company_id=None,
        )
        db.add(param)

    db.commit()
    logger.info(f"Global param {key} updated to {value}")


async def sync_uf():
    logger.info("Syncing UF from mindicador.cl...")
    value = await _fetch_indicator("uf")
    if value is None:
        return
    db = SessionLocal()
    try:
        _update_global_param(db, "UF", value, "Unidad de Fomento (auto-sincronizado)", "CMF / mindicador.cl")
    finally:
        db.close()


async def sync_utm():
    logger.info("Syncing UTM from mindicador.cl...")
    value = await _fetch_indicator("utm")
    if value is None:
        return
    db = SessionLocal()
    try:
        _update_global_param(db, "UTM", value, "Unidad Tributaria Mensual (auto-sincronizado)", "SII / mindicador.cl")
    finally:
        db.close()


async def sync_all():
    await sync_uf()
    await sync_utm()
