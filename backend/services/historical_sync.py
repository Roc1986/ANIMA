"""
Sync historical end-of-month UF and UTM values from mindicador.cl.
Runs at startup and on the 1st of each month to keep tables complete.
"""
import httpx
import logging
from datetime import date

from database import SessionLocal
from models.uf_value import UFValue
from models.utm_value import UTMValue

logger = logging.getLogger(__name__)

MINDICADOR_API = "https://mindicador.cl/api"
HISTORY_FROM_YEAR = 2022


def sync_uf_historical_bg():
    """Download end-of-month UF values from CMF via mindicador.cl."""
    today = date.today()
    db = SessionLocal()
    saved = 0
    try:
        for year in range(HISTORY_FROM_YEAR, today.year + 1):
            try:
                with httpx.Client(timeout=20) as client:
                    r = client.get(f"{MINDICADOR_API}/uf/{year}")
                    r.raise_for_status()
                    serie = r.json().get("serie", [])

                # Keep only the last entry per (year, month)
                month_last: dict = {}
                for entry in serie:
                    entry_date = date.fromisoformat(entry["fecha"][:10])
                    key = (entry_date.year, entry_date.month)
                    if key not in month_last or entry_date > month_last[key][0]:
                        month_last[key] = (entry_date, float(entry["valor"]))

                for (y, m), (eom_date, value) in month_last.items():
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
                logger.warning(f"UF historical sync failed for {year}: {e}")
        logger.info(f"UF historical sync complete: {saved} new records")
    finally:
        db.close()


def sync_utm_historical_bg():
    """Download monthly UTM values from SII via mindicador.cl."""
    today = date.today()
    db = SessionLocal()
    saved = 0
    try:
        for year in range(HISTORY_FROM_YEAR, today.year + 1):
            try:
                with httpx.Client(timeout=20) as client:
                    r = client.get(f"{MINDICADOR_API}/utm/{year}")
                    r.raise_for_status()
                    serie = r.json().get("serie", [])

                for entry in serie:
                    entry_date = date.fromisoformat(entry["fecha"][:10])
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
                logger.warning(f"UTM historical sync failed for {year}: {e}")
        logger.info(f"UTM historical sync complete: {saved} new records")
    finally:
        db.close()
