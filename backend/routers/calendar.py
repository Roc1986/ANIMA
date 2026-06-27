from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, timedelta
import calendar as cal_module

from database import get_db
from auth.jwt_handler import get_current_user
from models.user import User
from models.company import Company

router = APIRouter()


def _get_deadline_events(year: int, month: int) -> List[dict]:
    """Returns fixed statutory deadlines for a given month/year."""
    events = []

    # Last day of month (for calculating next-month deadlines)
    last_day = cal_module.monthrange(year, month)[1]

    # Day 13 of current month → Previred (AFP + Salud + AFC)
    events.append({
        "id": f"previred-{year}-{month:02d}",
        "title": "Pago Previred",
        "description": "AFP + Salud (Fonasa/Isapre) + Seguro Cesantía (AFC)",
        "date": f"{year}-{month:02d}-13",
        "type": "previred",
        "color": "#1e3a5f",
        "reminder_days": 4,
    })

    # Day 20 of current month → F29 IVA
    events.append({
        "id": f"f29-{year}-{month:02d}",
        "title": "Declaración F29 (IVA)",
        "description": "Declaración y pago mensual de IVA ante el SII",
        "date": f"{year}-{month:02d}-20",
        "type": "f29",
        "color": "#7c3aed",
        "reminder_days": 4,
    })

    # Day 10 → Mutual de Seguridad (ACHS/IST/otros)
    events.append({
        "id": f"mutual-{year}-{month:02d}",
        "title": "Cotizaciones Mutual de Seguridad",
        "description": "Pago cotizaciones ACHS / IST / mutual correspondiente",
        "date": f"{year}-{month:02d}-10",
        "type": "mutual",
        "color": "#059669",
        "reminder_days": 4,
    })

    return events


def _days_until(event_date_str: str) -> int:
    today = date.today()
    try:
        event_date = date.fromisoformat(event_date_str)
        return (event_date - today).days
    except Exception:
        return 999


@router.get("/events")
def get_calendar_events(
    year: Optional[int] = None,
    month: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns all calendar events for the given month (defaults to current month)."""
    today = date.today()
    y = year or today.year
    m = month or today.month

    events = _get_deadline_events(y, m)

    # Annotate with days_until and is_upcoming
    for ev in events:
        days = _days_until(ev["date"])
        ev["days_until"] = days
        ev["is_past"] = days < 0
        ev["is_urgent"] = 0 <= days <= 4
        ev["is_today"] = days == 0

    return {"year": y, "month": m, "events": events}


@router.get("/upcoming")
def get_upcoming_deadlines(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns events in the next 30 days sorted by date."""
    today = date.today()
    all_events = []

    # Check this month and next month
    for delta_month in range(2):
        m = today.month + delta_month
        y = today.year
        if m > 12:
            m -= 12
            y += 1
        all_events.extend(_get_deadline_events(y, m))

    # Filter to next 30 days and sort
    upcoming = []
    for ev in all_events:
        days = _days_until(ev["date"])
        if 0 <= days <= 30:
            ev["days_until"] = days
            ev["is_urgent"] = days <= 4
            ev["is_today"] = days == 0
            upcoming.append(ev)

    upcoming.sort(key=lambda e: e["date"])
    return upcoming
