"""Local testing entry point — uses SQLite, no PostgreSQL needed."""
import sys
import os

# Patch database module to use SQLite
import database_local as _db_local
import database as _db
_db.engine = _db_local.engine
_db.SessionLocal = _db_local.SessionLocal
_db.Base = _db_local.Base
_db.get_db = _db_local.get_db

# Patch config to avoid missing env vars
import config as _config
class _Settings:
    DATABASE_URL = "sqlite:///./anima_hr_test.db"
    SECRET_KEY = "local_test_secret_key_change_in_production"
    ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = 480
    ANTHROPIC_API_KEY = ""
    UPLOAD_DIR = "./uploads"
    COMPANY_NAME = "Mi Empresa SpA"
    COMPANY_RUT = "76.000.000-0"

_config.settings = _Settings()

os.makedirs("./uploads", exist_ok=True)

# Now import and run the real app
from main import app
from database_local import Base, engine

# Create all tables
Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    import uvicorn
    print("\n✅ ANIMA HR — Modo de prueba local (SQLite)")
    print("📋 API docs: http://localhost:8000/docs")
    print("🔑 Crea el admin en: http://localhost:8000/api/auth/seed-superadmin")
    print("   (ábrelo en tu navegador o usa el botón Try it en /docs)\n")
    uvicorn.run("main_local:app", host="0.0.0.0", port=8000, reload=True)
