from sqlalchemy import Column, Integer, Date, Time, DateTime, Enum, Numeric, ForeignKey, String, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from database import Base


class AttendanceType(str, enum.Enum):
    regular = "regular"
    overtime_weekday = "overtime_weekday"
    overtime_sunday = "overtime_sunday"
    absence = "absence"
    vacation = "vacation"
    sick_leave = "sick_leave"
    legal_license = "legal_license"
    administrative_permit = "administrative_permit"


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    date = Column(Date, nullable=False)
    check_in = Column(Time)
    check_out = Column(Time)
    attendance_type = Column(Enum(AttendanceType), default=AttendanceType.regular)
    regular_hours = Column(Numeric(5, 2), default=0)
    overtime_weekday_hours = Column(Numeric(5, 2), default=0)
    overtime_sunday_hours = Column(Numeric(5, 2), default=0)
    is_holiday = Column(Boolean, default=False)
    notes = Column(Text)
    approved_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    employee = relationship("Employee", back_populates="attendances")
