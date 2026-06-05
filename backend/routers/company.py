from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional
import os
import shutil
import uuid
from pydantic import BaseModel

from database import get_db
from models.company import Company
from auth.jwt_handler import get_current_user, require_admin
from models.user import User

router = APIRouter()

LOGOS_DIR = "/app/uploads/logos"
os.makedirs(LOGOS_DIR, exist_ok=True)


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    rut: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    primary_color: Optional[str] = None


def _get_or_create_company(db: Session) -> Company:
    company = db.query(Company).first()
    if not company:
        company = Company(name="Mi Empresa", primary_color="#1e3a5f")
        db.add(company)
        db.commit()
        db.refresh(company)
    return company


@router.get("/")
def get_company(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _get_or_create_company(db)


@router.put("/")
def update_company(
    data: CompanyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    company = _get_or_create_company(db)
    for field, value in data.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(company, field, value)
    db.commit()
    db.refresh(company)
    return company


@router.post("/logo")
def upload_logo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".png", ".jpg", ".jpeg", ".gif", ".svg"]:
        raise HTTPException(status_code=400, detail="Formato de imagen no soportado. Use PNG, JPG o GIF.")
    filename = f"logo_{uuid.uuid4().hex[:8]}{ext}"
    filepath = os.path.join(LOGOS_DIR, filename)
    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)
    company = _get_or_create_company(db)
    # Remove old logo
    if company.logo_path and os.path.exists(company.logo_path):
        try:
            os.remove(company.logo_path)
        except Exception:
            pass
    company.logo_path = filepath
    db.commit()
    db.refresh(company)
    return {"message": "Logo actualizado", "logo_path": filepath}


@router.get("/logo")
def get_logo(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    company = _get_or_create_company(db)
    if not company.logo_path or not os.path.exists(company.logo_path):
        raise HTTPException(status_code=404, detail="Logo no configurado")
    return FileResponse(company.logo_path)
