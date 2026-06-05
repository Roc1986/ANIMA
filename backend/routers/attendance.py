from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from database import get_db
from models.attendance import Attendance
from schemas.attendance import AttendanceCreate, AttendanceUpdate, AttendanceOut, AttendanceBulkCreate
from auth.jwt_handler import get_current_user, require_admin
from models.user import User

router = APIRouter()


@router.get("/", response_model=List[AttendanceOut])
def list_attendance(
    employee_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Attendance)
    if employee_id:
        q = q.filter(Attendance.employee_id == employee_id)
    if date_from:
        q = q.filter(Attendance.date >= date_from)
    if date_to:
        q = q.filter(Attendance.date <= date_to)
    return q.order_by(Attendance.date.desc()).offset(skip).limit(limit).all()


@router.post("/", response_model=AttendanceOut, status_code=201)
def create_attendance(
    data: AttendanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    record = Attendance(**data.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.post("/bulk", status_code=201)
def create_bulk_attendance(
    data: AttendanceBulkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    records = [Attendance(**r.model_dump()) for r in data.records]
    db.add_all(records)
    db.commit()
    return {"created": len(records)}


@router.put("/{record_id}", response_model=AttendanceOut)
def update_attendance(
    record_id: int,
    data: AttendanceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    record = db.query(Attendance).filter(Attendance.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(record, field, value)
    db.commit()
    db.refresh(record)
    return record


@router.delete("/{record_id}")
def delete_attendance(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    record = db.query(Attendance).filter(Attendance.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    db.delete(record)
    db.commit()
    return {"message": "Eliminado"}


@router.get("/summary/{employee_id}")
def attendance_summary(
    employee_id: int,
    year: int = Query(...),
    month: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from datetime import date as date_type
    import calendar
    start = date_type(year, month, 1)
    end = date_type(year, month, calendar.monthrange(year, month)[1])

    records = db.query(Attendance).filter(
        Attendance.employee_id == employee_id,
        Attendance.date >= start,
        Attendance.date <= end,
    ).all()

    total_regular = sum(float(r.regular_hours) for r in records)
    total_oe_weekday = sum(float(r.overtime_weekday_hours) for r in records)
    total_oe_sunday = sum(float(r.overtime_sunday_hours) for r in records)
    absences = sum(1 for r in records if r.attendance_type == "absence")
    vacations = sum(1 for r in records if r.attendance_type == "vacation")
    sick = sum(1 for r in records if r.attendance_type == "sick_leave")

    return {
        "employee_id": employee_id,
        "year": year,
        "month": month,
        "total_regular_hours": total_regular,
        "total_overtime_weekday": total_oe_weekday,
        "total_overtime_sunday": total_oe_sunday,
        "absences_days": absences,
        "vacation_days": vacations,
        "sick_leave_days": sick,
        "records_count": len(records),
    }
