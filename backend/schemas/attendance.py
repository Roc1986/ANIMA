from pydantic import BaseModel
from typing import Optional, List
from datetime import date, time, datetime
from decimal import Decimal
from models.attendance import AttendanceType


class AttendanceCreate(BaseModel):
    employee_id: int
    date: date
    check_in: Optional[time] = None
    check_out: Optional[time] = None
    attendance_type: AttendanceType = AttendanceType.regular
    regular_hours: Decimal = Decimal("0")
    overtime_weekday_hours: Decimal = Decimal("0")
    overtime_sunday_hours: Decimal = Decimal("0")
    is_holiday: bool = False
    notes: Optional[str] = None


class AttendanceUpdate(BaseModel):
    check_in: Optional[time] = None
    check_out: Optional[time] = None
    attendance_type: Optional[AttendanceType] = None
    regular_hours: Optional[Decimal] = None
    overtime_weekday_hours: Optional[Decimal] = None
    overtime_sunday_hours: Optional[Decimal] = None
    is_holiday: Optional[bool] = None
    notes: Optional[str] = None


class AttendanceOut(BaseModel):
    id: int
    employee_id: int
    date: date
    check_in: Optional[time]
    check_out: Optional[time]
    attendance_type: AttendanceType
    regular_hours: Decimal
    overtime_weekday_hours: Decimal
    overtime_sunday_hours: Decimal
    is_holiday: bool
    notes: Optional[str]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


class AttendanceBulkCreate(BaseModel):
    records: List[AttendanceCreate]


class AttendanceBulkPeriod(BaseModel):
    employee_id: int
    start_date: date
    end_date: date
    regular_hours: Decimal = Decimal("8")
    skip_weekends: bool = True
