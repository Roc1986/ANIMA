from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from pydantic import BaseModel

from database import get_db
from models.warning_letter import WarningLetter, WarningType
from models.employee import Employee
from models.company import Company
from auth.jwt_handler import get_current_user, require_admin
from models.user import User
from services.pdf_generator import generate_warning_letter_pdf

router = APIRouter()


class WarningLetterCreate(BaseModel):
    employee_id: int
    date: date
    type: WarningType
    reason: str
    description: str
    signature_required: bool = True


class WarningLetterOut(BaseModel):
    id: int
    employee_id: int
    date: date
    type: WarningType
    reason: str
    description: str
    signature_required: bool
    created_by: Optional[int]
    created_at: Optional[str]

    class Config:
        from_attributes = True


@router.post("/", status_code=201)
def create_warning_letter(
    data: WarningLetterCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    emp = db.query(Employee).filter(Employee.id == data.employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    letter = WarningLetter(**data.model_dump(), created_by=current_user.id)
    db.add(letter)
    db.commit()
    db.refresh(letter)
    return letter


@router.get("/")
def list_warning_letters(
    employee_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(WarningLetter)
    if employee_id:
        q = q.filter(WarningLetter.employee_id == employee_id)
    return q.order_by(WarningLetter.date.desc()).all()


@router.get("/{letter_id}")
def get_warning_letter(
    letter_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    letter = db.query(WarningLetter).filter(WarningLetter.id == letter_id).first()
    if not letter:
        raise HTTPException(status_code=404, detail="Carta de amonestación no encontrada")
    return letter


@router.get("/{letter_id}/pdf")
def download_warning_letter_pdf(
    letter_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    letter = db.query(WarningLetter).filter(WarningLetter.id == letter_id).first()
    if not letter:
        raise HTTPException(status_code=404, detail="Carta de amonestación no encontrada")
    employee = db.query(Employee).filter(Employee.id == letter.employee_id).first()
    company = db.query(Company).first()
    filepath = generate_warning_letter_pdf(letter, employee, company)
    return FileResponse(filepath, media_type="application/pdf", filename=f"amonestacion_{letter_id}.pdf")


@router.delete("/{letter_id}")
def delete_warning_letter(
    letter_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    letter = db.query(WarningLetter).filter(WarningLetter.id == letter_id).first()
    if not letter:
        raise HTTPException(status_code=404, detail="Carta de amonestación no encontrada")
    db.delete(letter)
    db.commit()
    return {"message": "Carta de amonestación eliminada"}
