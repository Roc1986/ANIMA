from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from database import engine, Base
from models import *  # noqa - ensures all models are registered

from routers import (
    auth, employees, payroll, attendance, documents, reports,
    ai_legal, warning_letters, finiquito, company, vacations, contracts, super_admin
)

# Create all tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ANIMA HR - Sistema de RRHH y Nóminas Chile",
    description="Sistema integral de gestión de recursos humanos y nóminas para empresas chilenas",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure uploads directory exists
os.makedirs("/app/uploads", exist_ok=True)
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


@app.get("/")
def root():
    return {"message": "ANIMA HR API v2.0 - Multi-empresa", "docs": "/docs"}


@app.get("/api/health")
def health():
    return {"status": "ok"}
