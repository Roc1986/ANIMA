from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os
import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from database import engine, Base
from models import *  # noqa - ensures all models are registered
from models.uf_value import UFValue  # noqa - ensure uf_values table is created
from models.imm_value import IMMValue  # noqa - ensure imm_values table is created

from routers import (
    auth, employees, payroll, attendance, documents, reports,
    ai_legal, warning_letters, finiquito, company, vacations, contracts, super_admin, accounting
)
from routers.uf_values import router as uf_values_router
from routers.imm_values import router as imm_values_router
from routers.calendar import router as calendar_router
from services.indicators_sync import sync_all, sync_uf, sync_utm
from services.email_service import send_deadline_reminder

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler(timezone="America/Santiago")


def _send_deadline_reminders():
    """Checks upcoming deadlines and sends email reminders 4 days before."""
    from datetime import date, timedelta
    from database import SessionLocal
    from models.company import Company
    from models.user import User as UserModel
    from routers.calendar import _get_deadline_events, _days_until

    db = SessionLocal()
    try:
        today = date.today()
        events = _get_deadline_events(today.year, today.month)
        # Also check next month if we're near end of month
        if today.day >= 25:
            m = today.month + 1 if today.month < 12 else 1
            y = today.year if today.month < 12 else today.year + 1
            events.extend(_get_deadline_events(y, m))

        companies = db.query(Company).filter(Company.is_active == True).all()
        for company in companies:
            # Find admin emails for this company
            admins = db.query(UserModel).filter(
                UserModel.company_id == company.id,
                UserModel.role.in_(["admin", "company_admin"]),
                UserModel.is_active == True,
            ).all()
            emails = [u.email for u in admins if u.email]
            if not emails:
                continue
            for ev in events:
                days = _days_until(ev["date"])
                if days == 4:  # exactly 4 days before
                    for email in emails:
                        send_deadline_reminder(
                            to=email,
                            event_name=ev["title"],
                            event_date=date.fromisoformat(ev["date"]),
                            days_left=days,
                            company_name=company.name,
                        )
    except Exception as e:
        logger.error("Deadline reminder job failed: %s", e)
    finally:
        db.close()


def run_column_migrations(eng):
    """Add new columns to existing tables without dropping data."""
    from sqlalchemy import text
    migrations = [
        "ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS dias_licencia INTEGER DEFAULT 0",
        "ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS dias_vacaciones INTEGER DEFAULT 0",
        "ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS pension_alimenticia NUMERIC(12,2) DEFAULT 0",
        "ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS pension_alimenticia_tipo VARCHAR(30)",
        "ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS pension_alimenticia_raw NUMERIC(12,4) DEFAULT 0",
        "ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS descuento_voluntario NUMERIC(12,2) DEFAULT 0",
        "ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS descuento_vivienda NUMERIC(12,2) DEFAULT 0",
        "ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS descuento_ccaf NUMERIC(12,2) DEFAULT 0",
        "ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS previred_movement_code VARCHAR(5) DEFAULT '0'",
        "ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS warnings JSON",
        "ALTER TABLE employees ADD COLUMN IF NOT EXISTS bono_colacion NUMERIC(12,2) DEFAULT 0",
        "ALTER TABLE employees ADD COLUMN IF NOT EXISTS bono_movilizacion NUMERIC(12,2) DEFAULT 0",
        "ALTER TABLE employees ADD COLUMN IF NOT EXISTS pension_alimenticia_tipo VARCHAR(30)",
        "ALTER TABLE employees ADD COLUMN IF NOT EXISTS pension_alimenticia_raw NUMERIC(12,4) DEFAULT 0",
        "ALTER TABLE employees ADD COLUMN IF NOT EXISTS descuento_ccaf NUMERIC(12,2) DEFAULT 0",
        "ALTER TABLE employees ADD COLUMN IF NOT EXISTS descuento_voluntario NUMERIC(12,2) DEFAULT 0",
        "ALTER TABLE employees ADD COLUMN IF NOT EXISTS descuento_vivienda NUMERIC(12,2) DEFAULT 0",
        "ALTER TABLE employees ADD COLUMN IF NOT EXISTS isapre_amount_type VARCHAR(10) DEFAULT 'pesos'",
        "CREATE TABLE IF NOT EXISTS uf_values (id SERIAL PRIMARY KEY, date DATE UNIQUE NOT NULL, value NUMERIC(12,2) NOT NULL, source VARCHAR(100) DEFAULT 'manual', created_at TIMESTAMPTZ DEFAULT NOW())",
        "CREATE TABLE IF NOT EXISTS imm_values (id SERIAL PRIMARY KEY, date DATE UNIQUE NOT NULL, value NUMERIC(12,2) NOT NULL, source VARCHAR(100) DEFAULT 'manual', created_at TIMESTAMPTZ DEFAULT NOW())",
    ]
    with eng.connect() as conn:
        for sql in migrations:
            try:
                conn.execute(text(sql))
            except Exception:
                pass
        conn.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    run_column_migrations(engine)
    Base.metadata.create_all(bind=engine)
    os.makedirs("/app/uploads", exist_ok=True)

    # Schedule UF sync: daily at 09:05 (CMF publishes ~9am)
    scheduler.add_job(sync_uf, "cron", hour=9, minute=5, id="sync_uf")
    # Schedule UTM sync: 1st of each month at 09:10
    scheduler.add_job(sync_utm, "cron", day=1, hour=9, minute=10, id="sync_utm")
    # Schedule deadline reminders: daily at 08:00
    scheduler.add_job(_send_deadline_reminders, "cron", hour=8, minute=0, id="deadline_reminders")
    scheduler.start()

    # Sync on startup so values are fresh
    try:
        await sync_all()
    except Exception as e:
        logger.warning(f"Initial indicator sync failed (non-fatal): {e}")

    # Migrate IMM to $553.553 (Ley N°21.830, vigente desde 01/05/2026)
    try:
        from database import SessionLocal
        from models.legal_params import LegalParameter
        _db = SessionLocal()
        _imm_outdated = _db.query(LegalParameter).filter(
            LegalParameter.key == "imm_value",
            LegalParameter.value < 553553,
            LegalParameter.company_id == None,
        ).all()
        for _p in _imm_outdated:
            _p.value = 553553
            _p.source = "DT-Ley21830"
        if _imm_outdated:
            _db.commit()
            logger.info(f"Migrated imm_value to 553553 in {len(_imm_outdated)} record(s)")
        _db.close()
    except Exception as e:
        logger.warning(f"IMM migration failed (non-fatal): {e}")

    # Migrate SIS rate from 1.49% to 1.62% if outdated
    try:
        from database import SessionLocal
        from models.legal_params import LegalParameter
        _db = SessionLocal()
        _sis = _db.query(LegalParameter).filter(
            LegalParameter.key == "SIS_EMPLEADOR",
            LegalParameter.value == 1.49,
        ).all()
        for _p in _sis:
            _p.value = 1.62
            _p.source = "SP"
        if _sis:
            _db.commit()
            logger.info(f"Migrated SIS_EMPLEADOR 1.49→1.62 in {len(_sis)} record(s)")
        _db.close()
    except Exception as e:
        logger.warning(f"SIS migration failed (non-fatal): {e}")

    yield

    # Shutdown
    scheduler.shutdown(wait=False)


app = FastAPI(
    title="ANIMA HR - Sistema de RRHH y Nóminas Chile",
    description="Sistema integral de gestión de recursos humanos y nóminas para empresas chilenas",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory="/app/uploads"), name="uploads")

# Include all routers
app.include_router(auth.router, prefix="/api/auth", tags=["Autenticación"])
app.include_router(employees.router, prefix="/api/employees", tags=["Empleados"])
app.include_router(payroll.router, prefix="/api/payroll", tags=["Remuneraciones"])
app.include_router(attendance.router, prefix="/api/attendance", tags=["Asistencia"])
app.include_router(documents.router, prefix="/api/documents", tags=["Documentos"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reportes"])
app.include_router(ai_legal.router, prefix="/api/ai-legal", tags=["IA Legal"])
app.include_router(warning_letters.router, prefix="/api/warning-letters", tags=["Cartas de Amonestación"])
app.include_router(finiquito.router, prefix="/api/finiquito", tags=["Finiquito"])
app.include_router(company.router, prefix="/api/company", tags=["Configuración Empresa"])
app.include_router(vacations.router, prefix="/api/vacations", tags=["Control de Vacaciones"])
app.include_router(contracts.router, prefix="/api/contracts", tags=["Contratos de Trabajo"])
app.include_router(super_admin.router, prefix="/api/super", tags=["Super Administración"])
app.include_router(accounting.router, prefix="/api/accounting", tags=["Contabilidad"])
app.include_router(uf_values_router, prefix="/api/uf-values", tags=["uf-values"])
app.include_router(imm_values_router, prefix="/api/imm-values", tags=["imm-values"])
app.include_router(calendar_router, prefix="/api/calendar", tags=["Calendario"])


@app.get("/")
def root():
    return {"message": "ANIMA HR API v2.0 - Multi-empresa", "docs": "/docs"}


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/super/sync-indicators", tags=["Super Administración"])
async def manual_sync_indicators():
    """Fuerza sincronización inmediata de UF y UTM desde mindicador.cl."""
    await sync_all()
    return {"message": "UF y UTM sincronizados correctamente"}
