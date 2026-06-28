"""
Seed endpoint for test data — creates employees and payroll runs for Test SRL.
Only available in non-production environments or when explicitly called.
All operations are idempotent (safe to call multiple times).
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date, timedelta
from decimal import Decimal

from database import get_db
from auth.jwt_handler import require_admin
from models.user import User
from models.employee import Employee, AFP, HealthSystem, Gender, MaritalStatus
from models.contract import Contract, ContractType
from models.company import Company
from models.payroll import PayrollRun, PayrollEntry, PayrollStatus
from models.vacation import VacationBalance

router = APIRouter()

# IMM/UF values per period for retroactive accuracy
PERIOD_VALUES = {
    (2026, 3): {"imm": 539000.0, "uf": 38702.0, "utm": 71506.0},
    (2026, 4): {"imm": 539000.0, "uf": 38780.0, "utm": 71506.0},
    (2026, 5): {"imm": 553553.0, "uf": 38858.0, "utm": 71506.0},
    (2026, 6): {"imm": 553553.0, "uf": 38935.0, "utm": 71506.0},
}

EMPLOYEES_DATA = [
    # 1. Sueldo mínimo, FONASA, indefinido, >1 año
    {
        "rut": "14.222.111-3",
        "first_name": "Ana", "last_name": "Pérez", "second_last_name": "Silva",
        "gender": Gender.female, "birth_date": date(1992, 6, 15),
        "marital_status": MaritalStatus.single,
        "afp": AFP.habitat, "health_system": HealthSystem.fonasa,
        "hire_date": date(2024, 3, 1),
        "position": "Auxiliar de Aseo", "department": "Operaciones",
        "base_salary": Decimal("553553"),
        "contract_type": ContractType.indefinido, "gratificacion_type": "legal",
        "tag": "sueldo_minimo",
    },
    # 2. Sueldo medio, FONASA, indefinido, <1 año
    {
        "rut": "16.333.222-4",
        "first_name": "Carlos", "last_name": "Muñoz", "second_last_name": "Rojas",
        "gender": Gender.male, "birth_date": date(1995, 11, 20),
        "marital_status": MaritalStatus.single,
        "afp": AFP.provida, "health_system": HealthSystem.fonasa,
        "hire_date": date(2026, 1, 15),
        "position": "Vendedor", "department": "Comercial",
        "base_salary": Decimal("950000"),
        "contract_type": ContractType.indefinido, "gratificacion_type": "legal",
        "tag": "sueldo_medio_menos_1_año",
    },
    # 3. Sueldo alto (sobre tope cotizaciones), Isapre en UF, indefinido, >1 año
    {
        "rut": "12.444.333-5",
        "first_name": "Valentina", "last_name": "Torres", "second_last_name": "Vega",
        "gender": Gender.female, "birth_date": date(1985, 3, 8),
        "marital_status": MaritalStatus.married,
        "afp": AFP.cuprum, "health_system": HealthSystem.isapre,
        "isapre_name": "Banmédica", "isapre_monthly_amount": Decimal("3.5"),
        "isapre_amount_type": "uf",
        "hire_date": date(2021, 8, 1),
        "position": "Gerente de Ventas", "department": "Comercial",
        "base_salary": Decimal("4200000"),
        "contract_type": ContractType.indefinido, "gratificacion_type": "legal",
        "tag": "sueldo_alto_tope",
    },
    # 4. Plazo fijo, sueldo mínimo, FONASA (cesantía trabajador = 0%)
    {
        "rut": "18.555.444-6",
        "first_name": "Diego", "last_name": "González", "second_last_name": "Parra",
        "gender": Gender.male, "birth_date": date(2000, 7, 22),
        "marital_status": MaritalStatus.single,
        "afp": AFP.planvital, "health_system": HealthSystem.fonasa,
        "hire_date": date(2026, 3, 1),
        "position": "Promotor", "department": "Comercial",
        "base_salary": Decimal("553553"),
        "contract_type": ContractType.plazo_fijo, "gratificacion_type": "legal",
        "tag": "plazo_fijo",
    },
    # 5. Con pensión alimenticia (15% sueldo), FONASA, indefinido
    {
        "rut": "13.666.555-7",
        "first_name": "Roberto", "last_name": "Fuentes", "second_last_name": "Moya",
        "gender": Gender.male, "birth_date": date(1980, 4, 10),
        "marital_status": MaritalStatus.divorced,
        "afp": AFP.capital, "health_system": HealthSystem.fonasa,
        "hire_date": date(2022, 5, 1),
        "position": "Técnico", "department": "Operaciones",
        "base_salary": Decimal("750000"),
        "pension_alimenticia_tipo": "porcentaje_sueldo",
        "pension_alimenticia_raw": Decimal("15"),
        "contract_type": ContractType.indefinido, "gratificacion_type": "legal",
        "tag": "pension_alimenticia",
    },
    # 6. Gratificación anual (no mensual), FONASA, indefinido, >1 año
    {
        "rut": "11.777.666-8",
        "first_name": "Marcela", "last_name": "Soto", "second_last_name": "Lagos",
        "gender": Gender.female, "birth_date": date(1988, 9, 5),
        "marital_status": MaritalStatus.cohabiting,
        "afp": AFP.model, "health_system": HealthSystem.fonasa,
        "hire_date": date(2023, 2, 1),
        "position": "Contadora", "department": "Administración",
        "base_salary": Decimal("1200000"),
        "contract_type": ContractType.indefinido, "gratificacion_type": "anual",
        "tag": "gratificacion_anual",
    },
    # 7. Mujer para licencia pre/postnatal, FONASA, indefinido
    {
        "rut": "17.888.777-9",
        "first_name": "Catalina", "last_name": "Ramos", "second_last_name": "Díaz",
        "gender": Gender.female, "birth_date": date(1993, 12, 18),
        "marital_status": MaritalStatus.married,
        "afp": AFP.habitat, "health_system": HealthSystem.fonasa,
        "hire_date": date(2024, 6, 1),
        "position": "Asistente Administrativa", "department": "Administración",
        "base_salary": Decimal("700000"),
        "contract_type": ContractType.indefinido, "gratificacion_type": "legal",
        "tag": "prenatal_postnatal",
    },
    # 8. Hombre para licencia parental + permiso defunción, FONASA, indefinido
    {
        "rut": "15.999.888-K",
        "first_name": "Felipe", "last_name": "Herrera", "second_last_name": "Cruz",
        "gender": Gender.male, "birth_date": date(1991, 2, 14),
        "marital_status": MaritalStatus.married,
        "afp": AFP.provida, "health_system": HealthSystem.fonasa,
        "hire_date": date(2023, 9, 1),
        "position": "Operario", "department": "Producción",
        "base_salary": Decimal("620000"),
        "contract_type": ContractType.indefinido, "gratificacion_type": "legal",
        "tag": "licencia_parental",
    },
    # 9. Sueldo medio con bono colación y movilización, Isapre pesos, >1 año
    {
        "rut": "10.111.999-2",
        "first_name": "Sofía", "last_name": "Morales", "second_last_name": "Ibáñez",
        "gender": Gender.female, "birth_date": date(1990, 8, 30),
        "marital_status": MaritalStatus.married,
        "afp": AFP.uno, "health_system": HealthSystem.isapre,
        "isapre_name": "Colmena", "isapre_monthly_amount": Decimal("95000"),
        "isapre_amount_type": "pesos",
        "hire_date": date(2022, 11, 1),
        "position": "Jefa de RRHH", "department": "Administración",
        "base_salary": Decimal("1500000"),
        "bono_colacion": Decimal("95000"),
        "bono_movilizacion": Decimal("45000"),
        "contract_type": ContractType.indefinido, "gratificacion_type": "legal",
        "tag": "bonos_isapre_pesos",
    },
]


def _get_test_company(db: Session) -> Company:
    company = db.query(Company).filter(
        Company.name.ilike("%test%")
    ).first()
    if not company:
        company = db.query(Company).first()
    if not company:
        raise HTTPException(status_code=404, detail="No se encontró empresa de prueba")
    return company


def _ensure_vacation_balance(db: Session, emp: Employee):
    existing = db.query(VacationBalance).filter(VacationBalance.employee_id == emp.id).first()
    if not existing:
        # Calculate days accrued based on hire date
        today = date.today()
        months = max(0, (today.year - emp.hire_date.year) * 12 + today.month - emp.hire_date.month)
        accrued = round(months * 1.25, 2)
        vb = VacationBalance(
            employee_id=emp.id,
            year=date.today().year,
            days_earned=accrued,
            days_taken=0,
        )
        db.add(vb)


@router.post("/employees")
def seed_test_employees(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Creates test employees for Test SRL. Idempotent — skips existing RUTs."""
    company = _get_test_company(db)
    created = []
    skipped = []

    for data in EMPLOYEES_DATA:
        rut_clean = data["rut"].replace(".", "").replace("-", "")
        rut_stored = data["rut"].replace(".", "")  # stored as 12345678-9

        existing = db.query(Employee).filter(
            Employee.rut == rut_stored,
            Employee.company_id == company.id,
        ).first()
        if existing:
            skipped.append(data["rut"])
            continue

        contract_type = data.pop("contract_type")
        gratificacion_type = data.pop("gratificacion_type")
        tag = data.pop("tag")

        emp = Employee(
            company_id=company.id,
            rut=rut_stored,
            first_name=data["first_name"],
            last_name=data["last_name"],
            second_last_name=data.get("second_last_name"),
            gender=data.get("gender"),
            birth_date=data.get("birth_date"),
            marital_status=data.get("marital_status"),
            nationality="Chilena",
            afp=data["afp"],
            health_system=data["health_system"],
            isapre_name=data.get("isapre_name"),
            isapre_monthly_amount=data.get("isapre_monthly_amount", Decimal("0")),
            isapre_amount_type=data.get("isapre_amount_type", "pesos"),
            bono_colacion=data.get("bono_colacion", Decimal("0")),
            bono_movilizacion=data.get("bono_movilizacion", Decimal("0")),
            pension_alimenticia_tipo=data.get("pension_alimenticia_tipo"),
            pension_alimenticia_raw=data.get("pension_alimenticia_raw", Decimal("0")),
            hire_date=data["hire_date"],
            position=data["position"],
            department=data.get("department"),
            base_salary=data["base_salary"],
            is_active=True,
            bank_name="Banco Estado",
            bank_account_type="Cuenta Vista",
        )
        db.add(emp)
        db.flush()

        contract = Contract(
            employee_id=emp.id,
            contract_type=contract_type,
            start_date=data["hire_date"],
            base_salary=data["base_salary"],
            weekly_hours=40,
            gratificacion_type=gratificacion_type,
            is_active=True,
        )
        db.add(contract)
        _ensure_vacation_balance(db, emp)
        created.append(f"{data['first_name']} {data['last_name']} ({data['rut']})")

    db.commit()
    return {
        "company": company.name,
        "created": created,
        "skipped": skipped,
        "total_created": len(created),
    }


@router.post("/payroll-runs")
def seed_test_payroll_runs(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Creates draft payroll runs for March–June 2026 for Test SRL."""
    from services.payroll_calculator import ChileanPayrollCalculator
    from models.legal_params import LegalParameter

    company = _get_test_company(db)
    periods = [(2026, 3), (2026, 4), (2026, 5), (2026, 6)]

    legal_params_rows = db.query(LegalParameter).filter(
        LegalParameter.is_active == True,
        LegalParameter.company_id == None,
    ).all()
    legal_params = {p.key: float(p.value) for p in legal_params_rows}

    employees = db.query(Employee).filter(
        Employee.company_id == company.id,
        Employee.is_active == True,
    ).all()

    results = []
    for year, month in periods:
        existing_run = db.query(PayrollRun).filter(
            PayrollRun.company_id == company.id,
            PayrollRun.period_year == year,
            PayrollRun.period_month == month,
        ).first()
        if existing_run:
            results.append(f"{year}-{month:02d}: ya existe (id={existing_run.id})")
            continue

        pv = PERIOD_VALUES.get((year, month), {"imm": 553553.0, "uf": 38935.0, "utm": 71506.0})
        run = PayrollRun(
            company_id=company.id,
            period_year=year,
            period_month=month,
            status=PayrollStatus.draft,
            uf_value=pv["uf"],
            utm_value=pv["utm"],
            imm_value=pv["imm"],
        )
        db.add(run)
        db.flush()

        calculator = ChileanPayrollCalculator(
            uf_value=pv["uf"],
            utm_value=pv["utm"],
            imm_value=pv["imm"],
            legal_params=legal_params,
        )

        period_start = date(year, month, 1)
        entries_created = 0
        for emp in employees:
            if emp.hire_date > period_start:
                continue

            from models.contract import Contract as ContractModel
            contract = db.query(ContractModel).filter(
                ContractModel.employee_id == emp.id,
                ContractModel.is_active == True,
            ).first()
            ct = str(contract.contract_type).split(".")[-1] if contract else "indefinido"
            gt = str(contract.gratificacion_type) if contract else "legal"

            result = calculator.calculate(
                emp,
                contract_type=ct,
                gratificacion_type=gt,
            )

            entry = PayrollEntry(
                payroll_run_id=run.id,
                employee_id=emp.id,
                base_salary=result.get("base_salary", emp.base_salary),
                gratificacion=result.get("gratificacion", 0),
                bono_colacion=result.get("bono_colacion", 0),
                bono_movilizacion=result.get("bono_movilizacion", 0),
                bono_otros=0,
                asignacion_familiar=0,
                total_haberes=result.get("total_haberes", 0),
                remuneracion_imponible=result.get("remuneracion_imponible", 0),
                remuneracion_tributable=result.get("remuneracion_tributable", 0),
                descuento_afp=result.get("descuento_afp", 0),
                descuento_salud=result.get("descuento_salud", 0),
                descuento_cesantia=result.get("descuento_cesantia_trabajador", 0),
                impuesto_unico=result.get("impuesto_unico", 0),
                pension_alimenticia=result.get("pension_alimenticia", 0),
                descuento_voluntario=result.get("descuento_voluntario", 0),
                descuento_ccaf=result.get("descuento_ccaf", 0),
                descuento_vivienda=result.get("descuento_vivienda", 0),
                liquido_pagar=result.get("liquido_pagar", 0),
                aporte_cesantia_empleador=result.get("aporte_empleador_cesantia", 0),
                aporte_sis=result.get("aporte_empleador_sis", 0),
                total_costo_empleador=result.get("total_costo_empleador", 0),
                pension_alimenticia_tipo=str(emp.pension_alimenticia_tipo) if emp.pension_alimenticia_tipo else None,
                pension_alimenticia_raw=float(emp.pension_alimenticia_raw) if emp.pension_alimenticia_raw else 0,
                afp_name=str(emp.afp),
                health_system=str(emp.health_system),
                contract_type=ct,
                breakdown=result,
            )
            db.add(entry)
            entries_created += 1

        run.status = PayrollStatus.calculated
        db.commit()
        results.append(f"{year}-{month:02d}: creada con {entries_created} entradas")

    return {"company": company.name, "periods": results}
