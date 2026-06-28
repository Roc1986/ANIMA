import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { ArrowDownTrayIcon, CalculatorIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { api, finiquitoApi, employeesApi, vacationsApi, contractsApi, payrollApi, formatCLP, downloadBlob } from '../api/client'

function formatRUT(raw: string): string {
  if (!raw) return '—'
  const clean = raw.replace(/[^0-9kK]/g, '').toUpperCase()
  if (clean.length < 2) return raw
  const body = clean.slice(0, -1)
  const dv = clean.slice(-1)
  return `${body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${dv}`
}

function formatDateCL(iso: string): string {
  if (!iso) return '—'
  const parts = String(iso).split('-')
  if (parts.length !== 3) return iso
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

// Convert DD/MM/YYYY → YYYY-MM-DD for API
function parseDateCL(ddmmyyyy: string): string {
  if (!ddmmyyyy) return ''
  const parts = ddmmyyyy.replace(/[^0-9]/g, '')
  if (parts.length < 8) return ''
  return `${parts.slice(4, 8)}-${parts.slice(2, 4)}-${parts.slice(0, 2)}`
}

interface Employee {
  id: number
  rut: string
  first_name: string
  last_name: string
  position: string
  hire_date: string
  base_salary: number
}

interface FiniquitoResult {
  employee_id: number
  employee_name: string
  employee_rut: string
  employee_position: string
  hire_date: string
  termination_date: string
  termination_cause: string
  last_salary: number
  years_of_service: number
  months_of_service: number
  indemnizacion_anos: number
  indemnizacion_aviso_previo: number
  vacaciones_proporcionales: number
  remuneraciones_pendientes: number
  gratificacion_proporcional: number
  total_haberes: number
  descuentos_previsionales: number
  afc_deduction: number
  total_neto: number
  breakdown: {
    uf_value: number
    uf_cap: number
    capped_salary: number
    complete_years: number
    vacation_earned_habiles?: number
    pending_vacation_days: number
    total_vacation_habiles?: number
    total_vacation_days: number
    daily_salary: number
    no_advance_notice: boolean
  }
}

function calcGratificacionProporcional(lastSalary: number, terminationDateISO: string, hireDateISO: string, imm: number): number {
  const termDate = new Date(terminationDateISO)
  const hireDate = new Date(hireDateISO)
  const termYear = termDate.getFullYear()
  const termMonth = termDate.getMonth() + 1 // 1-12

  // Start of period: Jan 1 of termination year, or hire date if hired this year
  const startYear = hireDate.getFullYear() === termYear ? hireDate.getMonth() + 1 : 1
  const monthsInYear = termMonth - startYear + 1

  const annualSalary = lastSalary * 12
  const gratiMax = 4.75 * imm
  const gratiBruta = Math.min(annualSalary * 0.25, gratiMax)
  return Math.round(gratiBruta * monthsInYear / 12)
}

const TERMINATION_CAUSES = [
  { value: 'Art. 159 N°1', label: 'Art. 159 N°1 — Mutuo acuerdo de las partes' },
  { value: 'Art. 159 N°2', label: 'Art. 159 N°2 — Renuncia del trabajador' },
  { value: 'Art. 159 N°3', label: 'Art. 159 N°3 — Muerte del trabajador' },
  { value: 'Art. 159 N°4', label: 'Art. 159 N°4 — Vencimiento del plazo' },
  { value: 'Art. 159 N°5', label: 'Art. 159 N°5 — Conclusión del trabajo o servicio' },
  { value: 'Art. 159 N°6', label: 'Art. 159 N°6 — Caso fortuito o fuerza mayor' },
  { value: 'Art. 160 N°1', label: 'Art. 160 N°1 — Falta de probidad / conductas indebidas' },
  { value: 'Art. 160 N°3', label: 'Art. 160 N°3 — Injurias al empleador' },
  { value: 'Art. 160 N°4', label: 'Art. 160 N°4 — Ausencias injustificadas' },
  { value: 'Art. 160 N°7', label: 'Art. 160 N°7 — Incumplimiento grave del contrato' },
  { value: 'Art. 161 N°1', label: 'Art. 161 N°1 — Necesidades de la empresa (con indemnización)' },
  { value: 'Art. 161 N°2', label: 'Art. 161 N°2 — Desahucio del empleador' },
]

export default function Finiquito() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [result, setResult] = useState<FiniquitoResult | null>(null)
  const [calculating, setCalculating] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null)
  const [showGratificacion, setShowGratificacion] = useState(false)
  const [terminationDateDisplay, setTerminationDateDisplay] = useState('')
  const [imm, setImm] = useState(510114)
  const [afcMonthsInSystem, setAfcMonthsInSystem] = useState(0)
  const [afcMissingMonths, setAfcMissingMonths] = useState(0)
  const [afcCoverage, setAfcCoverage] = useState<'none' | 'partial' | 'full' | ''>('')

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm()

  const watchedEmployee = watch('employee_id')
  const watchedCause = watch('termination_cause', '')

  useEffect(() => {
    employeesApi.list({ is_active: true }).then((res) => setEmployees(res.data)).catch(() => {})
    // Fetch IMM from public legal params endpoint
    api.get('/api/finiquito/legal-params').then(res => {
      if (res.data.imm_value) setImm(Number(res.data.imm_value))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!watchedEmployee) return
    const emp = employees.find((e) => e.id === Number(watchedEmployee))
    if (!emp) return
    setSelectedEmp(emp)
    setValue('last_salary', Math.round(emp.base_salary))

    // Auto-fill vacation balance
    vacationsApi.getBalance(emp.id).then(res => {
      const pending = res.data.days_pending ?? 0
      setValue('pending_vacation_days', Math.round(pending * 2) / 2) // round to 0.5
    }).catch(() => {})

    // Auto-fetch AFC accumulated from system payroll records
    const termIso = parseDateCL(terminationDateDisplay) || undefined
    finiquitoApi.afcEstimate(emp.id, termIso).then(res => {
      const { afc_from_system, months_in_system, months_missing, coverage } = res.data
      setAfcMonthsInSystem(months_in_system)
      setAfcMissingMonths(months_missing)
      setAfcCoverage(coverage)
      setValue('afc_deduction', afc_from_system)
    }).catch(() => { setAfcMonthsInSystem(0); setAfcMissingMonths(0); setAfcCoverage('') })

    // Check contract gratificacion_type
    contractsApi.list({ employee_id: emp.id, is_active: true }).then(res => {
      const contracts = res.data
      const active = contracts.find((c: { is_active: boolean }) => c.is_active)
      const gratType = active?.gratificacion_type || 'legal'
      // Show gratificacion field only if annual (not included monthly)
      setShowGratificacion(gratType === 'legal' || gratType === 'garantizada')
    }).catch(() => setShowGratificacion(false))

    // Auto-fill pending salary days from last payroll
    payrollApi.list().then(res => {
      const runs = res.data
      if (!runs.length) return
      // Find last run (sorted desc by year/month)
      const last = runs[0]
      setValue('_last_run_month', last.period_month)
      setValue('_last_run_year', last.period_year)
    }).catch(() => {})
  }, [watchedEmployee, employees, setValue])

  // Re-fetch AFC estimate when termination date changes (affects total months calculation)
  useEffect(() => {
    if (!selectedEmp || !terminationDateDisplay) return
    const termIso = parseDateCL(terminationDateDisplay)
    if (!termIso) return
    finiquitoApi.afcEstimate(selectedEmp.id, termIso).then(res => {
      const { afc_from_system, months_in_system, months_missing, coverage } = res.data
      setAfcMonthsInSystem(months_in_system)
      setAfcMissingMonths(months_missing)
      setAfcCoverage(coverage)
      setValue('afc_deduction', afc_from_system)
    }).catch(() => {})
  }, [terminationDateDisplay, selectedEmp, setValue])

  // Recalculate pending salary days when termination date changes
  useEffect(() => {
    if (!terminationDateDisplay) return
    const isoDate = parseDateCL(terminationDateDisplay)
    if (!isoDate) return
    // Parse locally to avoid UTC timezone shift (new Date("YYYY-MM-DD") is UTC midnight)
    const [termYear, termMonth, termDay] = isoDate.split('-').map(Number)
    if (!termYear || !termMonth || !termDay) return

    payrollApi.list().then(res => {
      const runs = res.data
      if (!runs.length) {
        setValue('pending_salary_days', termDay)
        return
      }
      const last = runs[0]
      const lastRunYear = last.period_year
      const lastRunMonth = last.period_month

      if (termYear === lastRunYear && termMonth === lastRunMonth) {
        setValue('pending_salary_days', 0)
      } else if (termYear > lastRunYear || (termYear === lastRunYear && termMonth > lastRunMonth)) {
        setValue('pending_salary_days', termDay)
      }
    }).catch(() => {})
  }, [terminationDateDisplay, setValue])

  // Auto-calculate gratificación proporcional when termination date and employee are set
  useEffect(() => {
    if (!terminationDateDisplay || !showGratificacion || !selectedEmp) return
    const isoDate = parseDateCL(terminationDateDisplay)
    if (!isoDate) return
    const termDate = new Date(isoDate)
    if (isNaN(termDate.getTime())) return
    const lastSalary = Math.round(selectedEmp.base_salary)
    const calculated = calcGratificacionProporcional(lastSalary, isoDate, selectedEmp.hire_date, imm)
    if (calculated > 0) {
      setValue('pending_gratificacion', calculated)
    }
  }, [terminationDateDisplay, showGratificacion, selectedEmp, imm, setValue])

  const onCalculate = async (data: Record<string, unknown>) => {
    setCalculating(true)
    setResult(null)
    try {
      // Convert date from DD/MM/YYYY to YYYY-MM-DD
      const termDateIso = parseDateCL(terminationDateDisplay)
      if (!termDateIso) {
        toast.error('Fecha de término inválida. Use formato DD/MM/YYYY')
        setCalculating(false)
        return
      }
      const payload = { ...data, termination_date: termDateIso }
      delete payload._last_run_month
      delete payload._last_run_year
      const res = await api.post('/api/finiquito/calculate', payload)
      setResult(res.data)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      toast.error(error.response?.data?.detail || 'Error al calcular finiquito')
    } finally {
      setCalculating(false)
    }
  }

  const handleDownloadPdf = async () => {
    if (!result) return
    setGeneratingPdf(true)
    try {
      const res = await api.post(
        '/api/finiquito/generate-pdf',
        { calculation: result, employee_id: result.employee_id },
        { responseType: 'blob' }
      )
      downloadBlob(res.data, `finiquito_${result.employee_rut}.pdf`)
      toast.success('PDF descargado')
    } catch {
      toast.error('Error al generar PDF')
    } finally {
      setGeneratingPdf(false)
    }
  }

  const handleConfirm = async () => {
    if (!result) return
    if (!confirm(`¿Confirmar finiquito y dar de baja a ${result.employee_name}? El trabajador quedará inactivo.`)) return
    setConfirming(true)
    try {
      await finiquitoApi.confirm({
        employee_id: result.employee_id,
        termination_date: result.termination_date,
        termination_cause: result.termination_cause,
        calculation: result,
      })
      setConfirmed(true)
      toast.success('Finiquito confirmado. Trabajador dado de baja.')
      employeesApi.list({ is_active: true }).then(r => setEmployees(r.data)).catch(() => {})
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      toast.error(e.response?.data?.detail || 'Error al confirmar')
    } finally {
      setConfirming(false)
    }
  }

  // Format date input as user types: auto-insert / separators
  const handleDateInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/[^0-9]/g, '')
    if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2)
    if (v.length > 5) v = v.slice(0, 5) + '/' + v.slice(5)
    if (v.length > 10) v = v.slice(0, 10)
    setTerminationDateDisplay(v)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Finiquito</h1>
        <p className="text-gray-500 text-sm mt-1">Cálculo y generación de finiquito conforme al Código del Trabajo</p>
      </div>

      {/* Form */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Datos del Finiquito</h2>
        <form onSubmit={handleSubmit(onCalculate)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label-field">Empleado *</label>
              <select className="input-field" {...register('employee_id', { required: true, valueAsNumber: true })}>
                <option value="">Seleccionar empleado...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name} — {formatRUT(emp.rut)} — Ingreso: {formatDateCL(emp.hire_date)}
                  </option>
                ))}
              </select>
              {errors.employee_id && <p className="error-text">Empleado requerido</p>}
            </div>

            <div>
              <label className="label-field">Fecha de término *</label>
              <input
                type="text"
                className="input-field"
                placeholder="DD/MM/YYYY"
                value={terminationDateDisplay}
                onChange={handleDateInput}
                maxLength={10}
              />
              {!terminationDateDisplay && errors.termination_date && <p className="error-text">Fecha requerida</p>}
            </div>

            <div>
              <label className="label-field">Causal de término *</label>
              <select className="input-field" {...register('termination_cause', { required: true })}>
                <option value="">Seleccionar causal...</option>
                {TERMINATION_CAUSES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              {errors.termination_cause && <p className="error-text">Causal requerida</p>}
            </div>

            <div>
              <label className="label-field">Última remuneración mensual (CLP) *</label>
              <input
                type="number"
                step="1"
                className="input-field"
                placeholder="Ej: 850000"
                {...register('last_salary', { required: true, valueAsNumber: true, min: 1 })}
              />
              {errors.last_salary && <p className="error-text">Remuneración requerida</p>}
            </div>

            <div>
              <label className="label-field">Días de vacaciones pendientes</label>
              <input
                type="number"
                step="0.5"
                min="0"
                defaultValue="0"
                className="input-field border-2 border-indigo-300 focus:border-indigo-500 bg-indigo-50"
                {...register('pending_vacation_days', { valueAsNumber: true })}
              />
              {selectedEmp && (
                <p className="text-xs text-indigo-500 mt-1">Auto-calculado desde saldo de vacaciones — editable</p>
              )}
            </div>

            <div>
              <label className="label-field">Días de remuneración pendiente</label>
              <input
                type="number"
                step="1"
                min="0"
                defaultValue="0"
                className="input-field"
                {...register('pending_salary_days', { valueAsNumber: true })}
              />
              {selectedEmp && (
                <p className="text-xs text-indigo-500 mt-1">Días del mes de término no incluidos en última nómina</p>
              )}
            </div>

            {showGratificacion && (
              <div>
                <label className="label-field">Gratificación proporcional pendiente (CLP)</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  defaultValue="0"
                  className="input-field"
                  {...register('pending_gratificacion', { valueAsNumber: true })}
                />
                {selectedEmp && terminationDateDisplay ? (
                  <p className="text-xs text-indigo-500 mt-1">Auto-calculado: gratificación legal proporcional</p>
                ) : (
                  <p className="text-xs text-gray-400 mt-1">Solo para gratificación anual no pagada en el año de término</p>
                )}
              </div>
            )}

            {watchedCause && watchedCause.includes('161') && (
              <div className="md:col-span-2 flex items-center gap-2">
                <input type="checkbox" id="no_notice" {...register('no_advance_notice')} className="w-4 h-4" />
                <label htmlFor="no_notice" className="text-sm text-gray-700">
                  No se dio aviso previo de 30 días (agrega indemnización sustitutiva Art. 161)
                </label>
              </div>
            )}

            {watchedCause && watchedCause.includes('161') && (
              <div>
                <label className="label-field">Descuento AFC empleador — Art. 13 Ley 19.728 (CLP)</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  defaultValue="0"
                  className={`input-field border-2 ${
                    afcCoverage === 'full' ? 'border-green-300 bg-green-50' :
                    afcCoverage === 'partial' ? 'border-amber-300 bg-amber-50' :
                    afcCoverage === 'none' ? 'border-red-200 bg-red-50' :
                    ''
                  }`}
                  {...register('afc_deduction', { valueAsNumber: true })}
                />
                {afcCoverage === 'full' && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ {afcMonthsInSystem} meses calculados desde nóminas del sistema (cobertura completa). Editable.
                  </p>
                )}
                {afcCoverage === 'partial' && (
                  <p className="text-xs text-amber-600 mt-1">
                    ⚠ {afcMonthsInSystem} mes(es) calculado(s) desde el sistema — faltan {afcMissingMonths} mes(es) históricos.
                    Ajuste el monto para incluir el período anterior al sistema (registros de la empresa).
                  </p>
                )}
                {afcCoverage === 'none' && (
                  <p className="text-xs text-red-600 mt-1">
                    ✗ Sin nóminas en el sistema — ingrese el monto acumulado desde registros históricos de la empresa.
                  </p>
                )}
                {!afcCoverage && (
                  <p className="text-xs text-gray-400 mt-1">
                    Opcional — se descuenta de la indemnización por años de servicio (Art. 13 Ley 19.728).
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" disabled={calculating} className="btn-primary">
              <CalculatorIcon className="w-4 h-4" />
              {calculating ? 'Calculando...' : 'Calcular Finiquito'}
            </button>
          </div>
        </form>
      </div>

      {/* Result */}
      {result && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Resultado del Finiquito</h2>
            <div className="flex gap-2">
              <button onClick={handleDownloadPdf} disabled={generatingPdf} className="btn-secondary">
                <ArrowDownTrayIcon className="w-4 h-4" />
                {generatingPdf ? 'Generando...' : 'Descargar PDF'}
              </button>
              {!confirmed ? (
                <button onClick={handleConfirm} disabled={confirming} className="btn-primary bg-red-600 hover:bg-red-700">
                  <CheckCircleIcon className="w-4 h-4" />
                  {confirming ? 'Procesando...' : 'Confirmar y dar de baja'}
                </button>
              ) : (
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                  <CheckCircleIcon className="w-4 h-4" /> Trabajador dado de baja
                </span>
              )}
            </div>
          </div>

          {/* Employee summary */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-gray-500">Trabajador</p>
              <p className="font-semibold">{result.employee_name}</p>
            </div>
            <div>
              <p className="text-gray-500">RUT</p>
              <p className="font-semibold">{formatRUT(result.employee_rut)}</p>
            </div>
            <div>
              <p className="text-gray-500">Antigüedad</p>
              <p className="font-semibold">{result.years_of_service.toFixed(2)} años</p>
            </div>
            <div>
              <p className="text-gray-500">Causal</p>
              <p className="font-semibold text-xs">{result.termination_cause}</p>
            </div>
          </div>

          {/* Breakdown table */}
          <table className="w-full text-sm mb-4">
            <thead className="bg-anima-blue text-white">
              <tr>
                <th className="text-left px-4 py-2">Concepto</th>
                <th className="text-left px-4 py-2">Detalle</th>
                <th className="text-right px-4 py-2">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {result.indemnizacion_anos > 0 && (
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-2">Indemnización por años de servicio (Art. 163)</td>
                  <td className="px-4 py-2 text-gray-500 text-xs">
                    {result.breakdown.complete_years} años × {formatCLP(result.breakdown.capped_salary)}
                    {result.breakdown.capped_salary < result.last_salary && ' (tope 90 UF)'}
                  </td>
                  <td className="px-4 py-2 text-right font-medium">{formatCLP(result.indemnizacion_anos)}</td>
                </tr>
              )}
              {result.indemnizacion_aviso_previo > 0 && (
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-2">Indemnización sustitutiva aviso previo (Art. 161)</td>
                  <td className="px-4 py-2 text-gray-500 text-xs">1 mes por falta de aviso previo</td>
                  <td className="px-4 py-2 text-right font-medium">{formatCLP(result.indemnizacion_aviso_previo)}</td>
                </tr>
              )}
              {result.vacaciones_proporcionales > 0 && (
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-2">Vacaciones proporcionales (Art. 73)</td>
                  <td className="px-4 py-2 text-gray-500 text-xs">
                    {result.breakdown.total_vacation_habiles?.toFixed(2) ?? result.breakdown.total_vacation_days.toFixed(2)} días hábiles
                    {' '}→ {result.breakdown.total_vacation_days.toFixed(2)} días corridos × {formatCLP(result.breakdown.daily_salary)}/día
                  </td>
                  <td className="px-4 py-2 text-right font-medium">{formatCLP(result.vacaciones_proporcionales)}</td>
                </tr>
              )}
              {result.remuneraciones_pendientes > 0 && (
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-2">Remuneraciones pendientes</td>
                  <td className="px-4 py-2 text-gray-500 text-xs">Días trabajados no pagados</td>
                  <td className="px-4 py-2 text-right font-medium">{formatCLP(result.remuneraciones_pendientes)}</td>
                </tr>
              )}
              {result.gratificacion_proporcional > 0 && (
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-2">Gratificación proporcional</td>
                  <td className="px-4 py-2 text-gray-500 text-xs">Proporcional al período trabajado</td>
                  <td className="px-4 py-2 text-right font-medium">{formatCLP(result.gratificacion_proporcional)}</td>
                </tr>
              )}
              <tr className="bg-blue-50 font-semibold">
                <td className="px-4 py-2">TOTAL HABERES</td>
                <td></td>
                <td className="px-4 py-2 text-right">{formatCLP(result.total_haberes)}</td>
              </tr>
              {result.descuentos_previsionales > 0 && (
                <tr className="hover:bg-gray-50 text-red-700">
                  <td className="px-4 py-2">(-) Descuentos previsionales</td>
                  <td className="px-4 py-2 text-xs">AFP + Salud sobre rem. pendientes</td>
                  <td className="px-4 py-2 text-right">−{formatCLP(result.descuentos_previsionales)}</td>
                </tr>
              )}
              {result.afc_deduction > 0 && (
                <tr className="hover:bg-gray-50 text-orange-700">
                  <td className="px-4 py-2">(-) Descuento AFC empleador (Art. 13 Ley 19.728)</td>
                  <td className="px-4 py-2 text-xs">Aporte acumulado en cuenta individual AFC</td>
                  <td className="px-4 py-2 text-right">−{formatCLP(result.afc_deduction)}</td>
                </tr>
              )}
              <tr className="bg-anima-blue text-white font-bold text-base">
                <td className="px-4 py-3">TOTAL NETO A PAGAR</td>
                <td></td>
                <td className="px-4 py-3 text-right">{formatCLP(result.total_neto)}</td>
              </tr>
            </tbody>
          </table>

          <p className="text-xs text-gray-400 mt-2">
            UF: {formatCLP(result.breakdown.uf_value)} | Tope 90 UF: {formatCLP(result.breakdown.uf_cap)} |
            Este finiquito debe ser ratificado ante Notario Público o Inspector del Trabajo (Art. 177 Código del Trabajo).
          </p>
        </div>
      )}
    </div>
  )
}
