from sqlalchemy import Column, Integer, String, Date, Boolean, DateTime, Enum, Numeric, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from database import Base


class Gender(str, enum.Enum):
    male = "male"
    female = "female"
    other = "other"


class MaritalStatus(str, enum.Enum):
    single = "single"
    married = "married"
    divorced = "divorced"
    widowed = "widowed"
    cohabiting = "cohabiting"


class AFP(str, enum.Enum):
    habitat = "Habitat"
    provida = "Provida"
    capital = "Capital"
    cuprum = "Cuprum"
    planvital = "Planvital"
    model = "Model"
    uno = "Uno"


class HealthSystem(str, enum.Enum):
    fonasa = "FONASA"
    isapre = "ISAPRE"


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    rut = Column(String(12), unique=True, index=True, nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    second_last_name = Column(String(100))
    email = Column(String(150), unique=True)
    phone = Column(String(20))
    address = Column(String(255))
    city = Column(String(100))
    region = Column(String(100))
    birth_date = Column(Date)
    gender = Column(Enum(Gender))
    marital_status = Column(Enum(MaritalStatus))
    nationality = Column(String(100), default="Chilena")

    # Previsión
    afp = Column(Enum(AFP), nullable=False)
    health_system = Column(Enum(HealthSystem), nullable=False)
    isapre_name = Column(String(100))
    isapre_monthly_amount = Column(Numeric(12, 2), default=0)

    # Laboral
    hire_date = Column(Date, nullable=False)
    position = Column(String(150), nullable=False)
    department = Column(String(150))
    cost_center = Column(String(50))
    base_salary = Column(Numeric(12, 2), nullable=False)

    # Estado
    is_active = Column(Boolean, default=True)
    termination_date = Column(Date)
    termination_reason = Column(Text)

    # Banco
    bank_name = Column(String(100))
    bank_account_type = Column(String(50))
    bank_account_number = Column(String(50))

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    contracts = relationship("Contract", back_populates="employee", cascade="all, delete-orphan")
    attendances = relationship("Attendance", back_populates="employee", cascade="all, delete-orphan")
    payroll_entries = relationship("PayrollEntry", back_populates="employee")
    documents = relationship("Document", back_populates="employee", cascade="all, delete-orphan")
    vacation_balance = relationship("VacationBalance", back_populates="employee", uselist=False, cascade="all, delete-orphan")
    vacation_requests = relationship("VacationRequest", back_populates="employee", cascade="all, delete-orphan")

    @property
    def full_name(self):
        parts = [self.first_name, self.last_name]
        if self.second_last_name:
            parts.append(self.second_last_name)
        return " ".join(parts)
