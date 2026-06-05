# ANIMA HR — Sistema de RRHH y Nóminas Chile

Sistema integral de gestión de recursos humanos y nóminas para empresas chilenas, conforme a la legislación laboral vigente 2024-2025.

## Características

### Módulos Principales
- **Empleados**: Gestión completa de personal (RUT, AFP, salud, banco, contratos)
- **Remuneraciones**: Cálculo automático de liquidaciones de sueldo según ley chilena
- **Asistencia**: Registro de asistencia, horas extras y licencias
- **Documentos**: Almacenamiento y gestión de documentos laborales
- **Reportes**: Generación de PDF y Excel (Previred, Libro de Remuneraciones, DJ1887)
- **IA Legal**: Asistente Claude para analizar cambios en legislación laboral

### Cálculo de Nómina (Legislación Chilena 2024-2025)
- ✅ Sueldo mínimo: $500,000 CLP
- ✅ AFP: Habitat (11.27%), Provida/Capital/Cuprum (11.44%), PlanVital (11.16%), Model (10.58%), Uno (10.49%)
- ✅ Salud: 7% FONASA/ISAPRE, tope 81.6 UF
- ✅ Seguro Cesantía: Trabajador 0.6%, Empleador 2.4% (indefinido) / 3% (plazo fijo)
- ✅ SIS: 1.49% empleador
- ✅ Tope imponible AFP: 81.6 UF
- ✅ IUSC: Tabla progresiva mensual en UTM (Art. 43 N°1 LIR)
- ✅ Gratificación legal: 25% con tope 4.75 IMM/12
- ✅ Horas extra: 50% hábiles, 100% domingos/festivos
- ✅ Jornada: 40 horas semanales (Ley 21.561)

### Reportes Generados
- **PDF**: Liquidación de sueldo individual, Libro de remuneraciones mensual
- **Excel**: Archivo Previred (formato oficial AFC), Declaración Jurada F1887 (SII)

## Inicio Rápido

### Con Docker Compose (Recomendado)

```bash
# 1. Copiar variables de entorno
cp .env.example .env
# Editar .env con tu ANTHROPIC_API_KEY y datos de empresa

# 2. Iniciar todos los servicios
docker-compose up -d

# 3. Crear usuario administrador (solo primera vez)
curl -X POST http://localhost:8000/api/auth/seed-admin

# 4. Inicializar parámetros legales (en la interfaz)
# Ir a IA Legal → "Inicializar Parámetros Legales 2024-2025"
```

### Acceso
- Frontend: http://localhost:3000
- API Docs: http://localhost:8000/docs
- Usuario admin por defecto: `admin@animahr.cl` / `Admin1234!`

### Desarrollo Local

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Stack Tecnológico

| Componente | Tecnología |
|-----------|-----------|
| Backend | Python + FastAPI + SQLAlchemy |
| Base de datos | PostgreSQL 15 |
| Frontend | React + TypeScript + Tailwind CSS |
| Auth | JWT + bcrypt |
| PDF | ReportLab |
| Excel | openpyxl |
| IA | Anthropic Claude (claude-sonnet-4-6) |
| Deploy | Docker + docker-compose |

## Estructura del Proyecto

```
ANIMA/
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── main.py              # FastAPI app entry point
│   ├── config.py            # Settings
│   ├── database.py          # SQLAlchemy setup
│   ├── models/              # SQLAlchemy models
│   ├── schemas/             # Pydantic schemas
│   ├── routers/             # API endpoints
│   ├── services/            # Business logic
│   │   ├── payroll_calculator.py  # Cálculo de nóminas chilenas
│   │   ├── pdf_generator.py       # Generación de PDFs
│   │   ├── excel_generator.py     # Generación de Excel (Previred, DJ1887)
│   │   └── ai_service.py          # Integración Claude API
│   └── auth/                # JWT handler
└── frontend/
    └── src/
        ├── pages/           # React pages
        ├── components/      # Reusable components
        ├── contexts/        # Auth context
        └── api/             # API client
```

## Flujo de Trabajo de Nómina

1. **Crear Nómina** (período + valores UF/UTM/IMM)
2. **Calcular** (automático para todos los empleados activos)
3. **Revisar** cada liquidación individual con PDF
4. **Aprobar** la nómina
5. **Exportar**: Previred Excel, Libro PDF, DJ1887

## Configuración de Empresa

Editar en `.env`:
```
COMPANY_NAME=Tu Empresa SpA
COMPANY_RUT=76.123.456-7
COMPANY_ADDRESS=Tu Dirección
COMPANY_PHONE=+56 2 2XXX XXXX
```

## Licencia

MIT — Uso libre para fines comerciales y no comerciales.
