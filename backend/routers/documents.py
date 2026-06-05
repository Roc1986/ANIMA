from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import shutil
import uuid

from database import get_db
from models.document import Document, DocumentType
from auth.jwt_handler import get_current_user, require_admin
from models.user import User

router = APIRouter()

UPLOAD_DIR = "/app/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.get("/")
def list_documents(
    employee_id: Optional[int] = None,
    document_type: Optional[DocumentType] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Document)
    if employee_id:
        q = q.filter(Document.employee_id == employee_id)
    if document_type:
        q = q.filter(Document.document_type == document_type)
    return q.order_by(Document.created_at.desc()).all()


@router.post("/upload", status_code=201)
def upload_document(
    employee_id: Optional[int] = None,
    document_type: DocumentType = DocumentType.otro,
    title: str = "Documento",
    period_year: Optional[int] = None,
    period_month: Optional[int] = None,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    ext = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    doc = Document(
        employee_id=employee_id,
        document_type=document_type,
        title=title,
        file_path=file_path,
        period_year=period_year,
        period_month=period_month,
        generated_by=current_user.id,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


@router.get("/{doc_id}/download")
def download_document(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    if not doc.file_path or not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="Archivo no encontrado en disco")
    return FileResponse(doc.file_path, filename=os.path.basename(doc.file_path))


@router.delete("/{doc_id}")
def delete_document(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    if doc.file_path and os.path.exists(doc.file_path):
        os.remove(doc.file_path)
    db.delete(doc)
    db.commit()
    return {"message": "Documento eliminado"}
