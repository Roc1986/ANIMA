from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from database import engine, Base
from models import *  # noqa - ensures all models are registered

from routers import auth, employees, payroll, attendance, documents, reports, ai_legal

# Create all tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ANIMA HR - Sistema de RRHH y Nóminas Chile",
    description="Sistema integral de gestión de recursos humanos y nóminas para empresas chilenas",
    version="1.0.0",
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


@app.get("/")
def root():
    return {"message": "ANIMA HR API v1.0", "docs": "/docs"}


@app.get("/api/health")
def health():
    return {"status": "ok"}
