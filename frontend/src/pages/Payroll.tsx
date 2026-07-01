import { useEffect, useState } from 'react'
import { payrollApi, employeesApi, reportsApi, aiLegalApi, ufValuesApi, immValuesApi, utmValuesApi, formatCLP, MONTHS, downloadBlob } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { useForm, Controller } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  PlusIcon, CalculatorIcon, CheckIcon, DocumentArrowDownIcon,
  ChevronDownIcon, ChevronRightIcon, ArrowsRightLeftIcon, EnvelopeIcon
} from '@heroicons/react/24/outline'
import DateInput from '../components/DateInput'
import { SearchableSelect, RHFSearchableSelect } from '../components/SearchableSelect'

interface PayrollRun {
  id: number
  company_id?: number
  company_name?: string
  period_year: number
  period_month: number
  status: string
  uf_value: number
  utm_value: number
  imm_value: number
  payment_date?: string
  created_at: string
}

interface PayrollEntry {
  id: number
  employee_id: number
  base_salary: number
  gratificacion: number
  total_haberes: number
  descuento_afp: number
  descuento_salud: number
  descuento_cesantia: number
  impuesto_unico: number
  total_descuentos_previsionales: number
  liquido_pagar: number
  afp_name: string
  health_system: string
  dias_trabajados: number
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Borrador', cls: 'badge-gray' },
  calculated: { label: 'Calculada', cls: 'badge-blue' },
  approved: { label: 'Aprobada', cls: 'badge-green' },
  paid: { label: 'Pagada', cls: 'badge-green' },
  cancelled: { label: 'Cancelada', cls: 'badge-red' },
}

interface ReverseCalcResult {
  liquido_deseado: number
  sueldo_base_requerido: number
  remuneracion_imponible: number
  gratificacion: number
  descuento_afp: number
  descuento_salud: number
  descuento_cesantia: number
  impuesto_unico: number
  total_descuentos: number
  liquido_resultante: number
  diferencia: number
}

interface Ley21735Alert { date: string; days_until: number; cap_pct: number; fapp_pct: number; total_pct: number }

export default function Payroll() {
  const { isHR, isAdmin, isSuperAdmin } = useAuth()
  const [ley21735Alerts, setLey21735Alerts] = useState<Ley21735Alert[]>([])
  const [runs, setRuns] = useState<PayrollRun[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCompanyId, setFilterCompanyId] = useState<number | ''>('')
  const [companies, setCompanies] = useState<{ id: number; name: string }[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [showReverseCalc, setShowReverseCalc] = useState(false)
  const [reverseCalcResult, setReverseCalcResult] = useState<ReverseCalcResult | null>(null)
  const [reverseCalcProcessing, setReverseCalcProcessing] = useState(false)
  const [selectedRun, setSelectedRun] = useState<number | null>(null)
  const [runDetail, setRunDetail] = useState<{ entries: PayrollEntry[]; total_liquido: number; total_costo_empresa: number; total_trabajadores: number } | null>(null)
  const [processing, setProcessing] = useState(false)
  const [showAddEmployee, setShowAddEmployee] = useState<number | null>(null) // run_id
  const [employees, setEmployees] = useState<{ id: number; first_name: string; last_name: string }[]>([])
  const [editingEntry, setEditingEntry] = useState<{ runId: number; entry: PayrollEntry } | null>(null)
  const [editEntryData, setEditEntryData] = useState<Record<string, number | string>>({})
  const [editLoading, setEditLoading] = useState(false)
  const [editWarnings, setEditWarnings] = useState<string[]>([])
  const {
    register: registerAdd,
    handleSubmit: handleSubmitAdd,
    reset: resetAdd,
    control: controlAdd,
  } = useForm({ defaultValues: { employee_id: '', dias_trabajados: 30, horas_extra_habiles: 0, horas_extra_domingo: 0, bono_colacion: 0, bono_movilizacion: 0, bono_otros: 0, asignacion_familiar: 0, adelanto: 0, descuento_otros: 0 } })

  const {
    register: registerReverse,
    handleSubmit: handleSubmitReverse,
    reset: resetReverse,
    control: controlReverse,
  } = useForm({
    defaultValues: {
      liquido_deseado: 600000,
      afp: 'Habitat',
      health_system: 'FONASA',
      contract_type: 'indefinido',
      isapre_monthly_amount: 0,
    }
  })

  const [createPeriodYear, setCreatePeriodYear] = useState(new Date().getFullYear())
  const [createPeriodMonth, setCreatePeriodMonth] = useState(new Date().getMonth() + 1)
  const [periodValuesLoading, setPeriodValuesLoading] = useState(false)

  const { register, handleSubmit, reset, setValue, control } = useForm({
    defaultValues: {
      period_year: new Date().getFullYear(),
      period_month: new Date().getMonth() + 1,
      uf_value: 38500,
      utm_value: 67294,
      imm_value: 500000,
      payment_date: '',
    }
  })

  const fetchRuns = async (companyId?: number | '') => {
    setLoading(true)
    try {
      const params = companyId ? { company_id: companyId as number } : undefined
      const res = await payrollApi.list(params)
      setRuns(res.data)
    } catch {
      toast.error('Error al cargar nóminas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRuns()
    payrollApi.ley21735UpcomingChanges().then(r => setLey21735Alerts(r.data)).catch(() => {})
    employeesApi.list({ is_active: true }).then(r => setEmployees(r.data)).catch(() => {})
    if (isSuperAdmin()) {
      import('../api/client').then(({ api }) =>
        api.get('/api/super/companies').then(r => setCompanies(r.data)).catch(() => {})
      )
    }
  }, [])

  // Auto-load historical UF/UTM/IMM whenever the selected period changes
  useEffect(() => {
    const year = createPeriodYear
    const month = createPeriodMonth
    if (!year || !month) return
    setPeriodValuesLoading(true)
    // UF: last day of the period month (Previred standard)
    const lastDay = new Date(year, month, 0).getDate()
    const ufDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    // UTM/IMM: first day of the period month
    const periodDate = `${year}-${String(month).padStart(2, '0')}-01`
    Promise.all([
      ufValuesApi.forDate(ufDate),
      utmValuesApi.forDate(periodDate),
      immValuesApi.forDate(periodDate),
    ]).then(([ufRes, utmRes, immRes]) => {
      setValue('period_year', year)
      setValue('period_month', month)
      setValue('uf_value', Number(ufRes.data.value))
      setValue('utm_value', Number(utmRes.data.value))
      setValue('imm_value', Number(immRes.data.value))
    }).catch(() => {}).finally(() => setPeriodValuesLoading(false))
  }, [createPeriodYear, createPeriodMonth])

  const openEditEntry = (runId: number, entry: PayrollEntry) => {
    setEditingEntry({ runId, entry })
    setEditWarnings([])
    setEditEntryData({
      dias_trabajados: entry.dias_trabajados ?? 30,
      dias_licencia: 0,
      dias_vacaciones: 0,
      horas_extra_habiles: 0,
      horas_extra_domingo: 0,
      bono_colacion: 0,
      bono_movilizacion: 0,
      bono_otros: 0,
      asignacion_familiar: 0,
      adelanto: 0,
      descuento_otros: 0,
    })
  }

  const saveEditEntry = async () => {
    if (!editingEntry) return
    setEditLoading(true)
    setEditWarnings([])
    try {
      const diasLicencia = Number(editEntryData.dias_licencia) || 0
      const diasVacaciones = Number(editEntryData.dias_vacaciones) || 0
      const diasEfectivos = Math.max(0, Number(editEntryData.dias_trabajados) - diasLicencia - diasVacaciones)
      const res = await payrollApi.addEntry(editingEntry.runId, {
        employee_id: editingEntry.entry.employee_id,
        dias_trabajados: diasEfectivos,
        dias_licencia: diasLicencia,
        dias_vacaciones: diasVacaciones,
        horas_extra_habiles: Number(editEntryData.horas_extra_habiles) || 0,
        horas_extra_domingo: Number(editEntryData.horas_extra_domingo) || 0,
        bono_colacion: Number(editEntryData.bono_colacion) || 0,
        bono_movilizacion: Number(editEntryData.bono_movilizacion) || 0,
        bono_otros: Number(editEntryData.bono_otros) || 0,
        asignacion_familiar: Number(editEntryData.asignacion_familiar) || 0,
        adelanto: Number(editEntryData.adelanto) || 0,
        descuento_otros: Number(editEntryData.descuento_otros) || 0,
      })
      const warnings: string[] = res.data?.data?.warnings || []
      if (warnings.length > 0) {
        setEditWarnings(warnings)
        toast('Liquidación recalculada — revise las advertencias legales', { icon: '⚠️' })
      } else {
        toast.success('Liquidación recalculada con novedades')
        setEditingEntry(null)
      }
      fetchRunDetail(editingEntry.runId)
      fetchRuns()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(msg || 'Error al recalcular')
    } finally {
      setEditLoading(false)
    }
  }

  const openAddEmployee = (runId: number) => {
    resetAdd({ employee_id: '', dias_trabajados: 30, horas_extra_habiles: 0, horas_extra_domingo: 0, bono_colacion: 0, bono_movilizacion: 0, bono_otros: 0, asignacion_familiar: 0, adelanto: 0, descuento_otros: 0 })
    setShowAddEmployee(runId)
  }

  const onAddEmployee = async (data: Record<string, unknown>) => {
    if (!showAddEmployee) return
    setProcessing(true)
    try {
      await payrollApi.addEntry(showAddEmployee, { ...data, employee_id: Number(data.employee_id) })
      toast.success('Empleado agregado a la nómina')
      setShowAddEmployee(null)
      fetchRunDetail(showAddEmployee)
      fetchRuns()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      toast.error(e.response?.data?.detail || 'Error al agregar empleado')
    } finally {
      setProcessing(false)
    }
  }

  const fetchRunDetail = async (runId: number) => {
    try {
      const res = await payrollApi.get(runId)
      setRunDetail(res.data)
    } catch {
      toast.error('Error al cargar detalle')
    }
  }

  const toggleRun = (runId: number) => {
    if (selectedRun === runId) {
      setSelectedRun(null)
      setRunDetail(null)
    } else {
      setSelectedRun(runId)
      fetchRunDetail(runId)
    }
  }

  const onCreate = async (data: unknown) => {
    setProcessing(true)
    try {
      await payrollApi.create(data)
      toast.success('Nómina creada')
      setShowCreate(false)
      reset()
      fetchRuns()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      toast.error(error.response?.data?.detail || 'Error al crear nómina')
    } finally {
      setProcessing(false)
    }
  }

  const onCalculate = async (runId: number) => {
    setProcessing(true)
    try {
      await payrollApi.calculate(runId)
      toast.success('Nómina calculada para todos los empleados activos')
      fetchRuns()
      if (selectedRun === runId) fetchRunDetail(runId)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      toast.error(error.response?.data?.detail || 'Error al calcular')
    } finally {
      setProcessing(false)
    }
  }

  const onApprove = async (runId: number) => {
    setProcessing(true)
    try {
      await payrollApi.approve(runId)
      toast.success('Nómina aprobada')
      fetchRuns()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      toast.error(error.response?.data?.detail || 'Error al aprobar')
    } finally {
      setProcessing(false)
    }
  }

  const onReopen = async (runId: number) => {
    if (!confirm('¿Reabrir esta nómina? Quedará en estado "calculada" para poder modificarla.')) return
    setProcessing(true)
    try {
      await payrollApi.reopen(runId)
      toast.success('Nómina reabierta — ya puedes agregar o modificar entradas')
      fetchRuns()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      toast.error(error.response?.data?.detail || 'Error al reabrir')
    } finally {
      setProcessing(false)
    }
  }

  const onRecalculate = async (runId: number) => {
    if (!confirm('¿Recalcular toda la nómina? Se borrarán los valores actuales y se recalculará con los parámetros vigentes del período.')) return
    setProcessing(true)
    try {
      // Reopen to draft first, then recalculate
      await payrollApi.reopen(runId)
      await payrollApi.calculate(runId)
      toast.success('Nómina recalculada correctamente')
      fetchRuns()
      if (selectedRun === runId) fetchRunDetail(runId)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      toast.error(error.response?.data?.detail || 'Error al recalcular')
    } finally {
      setProcessing(false)
    }
  }

  const downloadLibroPdf = async (runId: number, year: number, month: number) => {
    try {
      const res = await reportsApi.libroPdf(runId)
      downloadBlob(res.data, `libro_remuneraciones_${year}_${month.toString().padStart(2, '0')}.pdf`)
    } catch {
      toast.error('Error al generar PDF')
    }
  }

  const downloadPrevired = async (runId: number, year: number, month: number) => {
    try {
      const res = await reportsApi.previredExcel(runId)
      downloadBlob(res.data, `previred_${year}_${month.toString().padStart(2, '0')}.xlsx`)
    } catch {
      toast.error('Error al generar Excel Previred')
    }
  }

  const downloadPreviredTxt = async (runId: number, year: number, month: number) => {
    try {
      const res = await reportsApi.previredTxt(runId)
      downloadBlob(res.data, `previred_${year}_${month.toString().padStart(2, '0')}.txt`)
    } catch {
      toast.error('Error al generar archivo Previred')
    }
  }

  const downloadLiquidacion = async (runId: number, entryId: number, empId: number) => {
    try {
      const res = await payrollApi.getLiquidacionPdf(runId, entryId)
      downloadBlob(res.data, `liquidacion_${empId}_run${runId}.pdf`)
    } catch {
      toast.error('Error al generar liquidación')
    }
  }

  const onReverseCalculate = async (data: unknown) => {
    setReverseCalcProcessing(true)
    setReverseCalcResult(null)
    try {
      const res = await payrollApi.reverseCalculate(data as Parameters<typeof payrollApi.reverseCalculate>[0])
      setReverseCalcResult(res.data)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      toast.error(error.response?.data?.detail || 'Error al calcular')
    } finally {
      setReverseCalcProcessing(false)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Remuneraciones</h1>
          <p className="text-gray-500 text-sm mt-1">Gestión de nóminas y liquidaciones de sueldo</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setShowReverseCalc(true); setReverseCalcResult(null); resetReverse() }} className="btn-secondary">
            <ArrowsRightLeftIcon className="w-4 h-4" /> Calcular Sueldo Base
          </button>
          {isHR && (
            <button onClick={() => setShowCreate(true)} className="btn-primary">
              <PlusIcon className="w-4 h-4" /> Nueva Nómina
            </button>
          )}
        </div>
      </div>

      {/* Ley 21.735 rate change alert */}
      {ley21735Alerts.map(alert => (
        <div key={alert.date} className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 flex items-start gap-3">
          <span className="text-amber-500 text-xl mt-0.5">⚠️</span>
          <div className="text-sm text-amber-800">
            <span className="font-semibold">Cambio de tasas Ley 21.735 el 1 {alert.date.slice(0, 7).replace('-', '/')}</span>
            {' '}({alert.days_until === 0 ? 'hoy' : `en ${alert.days_until} días`}){': '}
            Capitalización AFP empleador {alert.cap_pct}%, FAPP Expectativas Vida y SIS {alert.fapp_pct}%
            {' '}(total empleador {alert.total_pct}%).
            Las liquidaciones del período indicado aplicarán las nuevas tasas automáticamente.
          </div>
        </div>
      ))}

      {/* Company filter — super admin only */}
      {isSuperAdmin() && companies.length > 0 && (
        <div className="card mb-4 py-3">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-600 whitespace-nowrap">Filtrar por empresa:</label>
            <SearchableSelect
              value={filterCompanyId}
              onChange={v => {
                const val = v !== '' ? Number(v) : ''
                setFilterCompanyId(val)
                fetchRuns(val)
              }}
              options={[
                { value: '', label: 'Todas las empresas' },
                ...companies.map(c => ({ value: c.id, label: c.name })),
              ]}
            />
          </div>
        </div>
      )}

      {/* Runs list */}
      <div className="space-y-3">
        {loading ? (
          <div className="card text-center text-gray-400 py-8">Cargando nóminas...</div>
        ) : runs.length === 0 ? (
          <div className="card text-center py-12">
            <CalculatorIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-400">No hay nóminas creadas</p>
          </div>
        ) : runs.map(run => {
          const si = STATUS_LABELS[run.status] || { label: run.status, cls: 'badge-gray' }
          const isOpen = selectedRun === run.id
          return (
            <div key={run.id} className="card p-0 overflow-hidden">
              {/* Run header */}
              <div
                className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => toggleRun(run.id)}
              >
                {isOpen ? <ChevronDownIcon className="w-4 h-4 text-gray-400" /> : <ChevronRightIcon className="w-4 h-4 text-gray-400" />}
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">
                    {MONTHS[run.period_month - 1]} {run.period_year}
                    {isSuperAdmin() && run.company_name && (
                      <span className="ml-2 text-xs font-normal text-white bg-indigo-500 rounded-full px-2 py-0.5">
                        {run.company_name}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400">
                    UF: ${Number(run.uf_value).toLocaleString('es-CL')} · UTM: ${Number(run.utm_value).toLocaleString('es-CL')} · IMM: ${Number(run.imm_value).toLocaleString('es-CL')}
                  </p>
                </div>
                <span className={si.cls}>{si.label}</span>
                <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                  {isHR && run.status === 'draft' && (
                    <button
                      onClick={() => onCalculate(run.id)}
                      disabled={processing}
                      className="btn-primary text-xs px-2 py-1.5"
                    >
                      <CalculatorIcon className="w-3.5 h-3.5" />
                      Calcular
                    </button>
                  )}
                  {isAdmin && run.status === 'calculated' && (
                    <>
                      <button
                        onClick={() => onRecalculate(run.id)}
                        disabled={processing}
                        className="btn-secondary text-xs px-2 py-1.5 text-blue-700 border-blue-300 hover:bg-blue-50"
                      >
                        <CalculatorIcon className="w-3.5 h-3.5" />
                        Recalcular
                      </button>
                      <button
                        onClick={() => onApprove(run.id)}
                        disabled={processing}
                        className="btn-primary text-xs px-2 py-1.5 bg-green-700 hover:bg-green-800"
                      >
                        <CheckIcon className="w-3.5 h-3.5" />
                        Aprobar
                      </button>
                    </>
                  )}
                  {isAdmin && run.status === 'approved' && (
                    <button
                      onClick={() => onReopen(run.id)}
                      disabled={processing}
                      className="btn-secondary text-xs px-2 py-1.5 text-orange-700 border-orange-300 hover:bg-orange-50"
                    >
                      Reabrir
                    </button>
                  )}
                  {run.status !== 'draft' && (
                    <>
                      <button onClick={() => downloadLibroPdf(run.id, run.period_year, run.period_month)} className="btn-secondary text-xs px-2 py-1.5">
                        <DocumentArrowDownIcon className="w-3.5 h-3.5" /> PDF Libro
                      </button>
                      <button onClick={() => downloadPrevired(run.id, run.period_year, run.period_month)} className="btn-secondary text-xs px-2 py-1.5">
                        <DocumentArrowDownIcon className="w-3.5 h-3.5" /> Previred XLS
                      </button>
                      <button onClick={() => downloadPreviredTxt(run.id, run.period_year, run.period_month)} className="btn-secondary text-xs px-2 py-1.5">
                        <DocumentArrowDownIcon className="w-3.5 h-3.5" /> Previred TXT
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            const res = await payrollApi.downloadAllLiquidacionesZip(run.id)
                            downloadBlob(res.data, `liquidaciones_${run.period_year}${String(run.period_month).padStart(2, '0')}.zip`)
                          } catch {
                            toast.error('Error al generar ZIP')
                          }
                        }}
                        className="btn-secondary text-xs px-2 py-1.5"
                      >
                        <DocumentArrowDownIcon className="w-3.5 h-3.5" /> Descargar Todas
                      </button>
                      <button
                        onClick={async () => {
                          if (!window.confirm(`¿Enviar liquidaciones por email a todos los empleados de esta nómina?\n\nCada PDF estará protegido con contraseña: los últimos 4 dígitos del RUT del empleado (antes del dígito verificador).`)) return
                          const toastId = toast.loading('Enviando liquidaciones...')
                          try {
                            const res = await payrollApi.sendAllLiquidacionesEmails(run.id)
                            const d = res.data
                            toast.dismiss(toastId)
                            const msg = `Enviadas: ${d.sent}${d.skipped > 0 ? ` · Sin email: ${d.skipped}` : ''}${d.errors > 0 ? ` · Errores: ${d.errors}` : ''}`
                            if (d.errors > 0) toast.error(msg)
                            else toast.success(msg)
                          } catch (e: unknown) {
                            toast.dismiss(toastId)
                            const err = e as { response?: { data?: { detail?: string } } }
                            toast.error(err?.response?.data?.detail || 'Error al enviar emails')
                          }
                        }}
                        className="btn-secondary text-xs px-2 py-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                      >
                        <EnvelopeIcon className="w-3.5 h-3.5" /> Enviar Todas
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Run detail */}
              {isOpen && runDetail && (
                <div className="border-t border-gray-100">
                  {/* Summary */}
                  <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50">
                    <div className="text-center">
                      <p className="text-xl font-bold text-gray-800">{runDetail.total_trabajadores}</p>
                      <p className="text-xs text-gray-500">Trabajadores</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold text-blue-700">{formatCLP(runDetail.total_liquido)}</p>
                      <p className="text-xs text-gray-500">Total Líquido</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold text-orange-600">{formatCLP(runDetail.total_costo_empresa)}</p>
                      <p className="text-xs text-gray-500">Costo Empresa</p>
                    </div>
                  </div>

                  {/* Entries table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50">
                          <th className="table-header text-xs">Emp. ID</th>
                          <th className="table-header text-xs">Días</th>
                          <th className="table-header text-xs">Sueldo Base</th>
                          <th className="table-header text-xs">Gratif.</th>
                          <th className="table-header text-xs">Total Hab.</th>
                          <th className="table-header text-xs">AFP</th>
                          <th className="table-header text-xs">Salud</th>
                          <th className="table-header text-xs">Ces.</th>
                          <th className="table-header text-xs">IUSC</th>
                          <th className="table-header text-xs">Líquido</th>
                          <th className="table-header text-xs"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {runDetail.entries.map(entry => (
                          <tr key={entry.id} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="table-cell text-xs">#{entry.employee_id}</td>
                            <td className="table-cell text-xs">{entry.dias_trabajados}</td>
                            <td className="table-cell text-xs">{formatCLP(entry.base_salary)}</td>
                            <td className="table-cell text-xs">{formatCLP(entry.gratificacion)}</td>
                            <td className="table-cell text-xs font-medium">{formatCLP(entry.total_haberes)}</td>
                            <td className="table-cell text-xs text-red-600">-{formatCLP(entry.descuento_afp)}</td>
                            <td className="table-cell text-xs text-red-600">-{formatCLP(entry.descuento_salud)}</td>
                            <td className="table-cell text-xs text-red-600">-{formatCLP(entry.descuento_cesantia)}</td>
                            <td className="table-cell text-xs text-red-600">-{formatCLP(entry.impuesto_unico)}</td>
                            <td className="table-cell text-xs font-bold text-green-700">{formatCLP(entry.liquido_pagar)}</td>
                            <td className="table-cell text-xs">
                              <div className="flex items-center gap-2">
                                {isAdmin && run.status === 'calculated' && (
                                  <button
                                    onClick={() => openEditEntry(run.id, entry)}
                                    className="text-orange-500 hover:text-orange-700 text-xs font-semibold"
                                    title="Ingresar novedades"
                                  >
                                    Novedades
                                  </button>
                                )}
                                <button
                                  onClick={() => downloadLiquidacion(run.id, entry.id, entry.employee_id)}
                                  className="text-blue-600 hover:text-blue-800"
                                  title="Descargar liquidación"
                                >
                                  <DocumentArrowDownIcon className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={async () => {
                                    try {
                                      await payrollApi.sendLiquidacionEmail(run.id, entry.id)
                                      toast.success('Liquidación enviada por email')
                                    } catch (e: unknown) {
                                      const err = e as { response?: { data?: { detail?: string } } }
                                      toast.error(err?.response?.data?.detail || 'Error al enviar email')
                                    }
                                  }}
                                  className="text-gray-500 hover:text-gray-700"
                                  title="Enviar por email"
                                >
                                  <EnvelopeIcon className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {isAdmin && run.status === 'calculated' && (
                    <div className="px-4 pb-4">
                      <button
                        onClick={() => openAddEmployee(run.id)}
                        className="btn-secondary text-sm flex items-center gap-2"
                      >
                        <PlusIcon className="w-4 h-4" /> Agregar empleado a esta nómina
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Novedades del mes Modal */}
      {editingEntry && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="p-6 border-b flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold">Novedades del Mes</h2>
                <p className="text-sm text-gray-500">Empleado #{editingEntry.entry.employee_id} — se recalculará la liquidación</p>
              </div>
              <button onClick={() => setEditingEntry(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Días */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Días del período</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="label">Días del mes</label>
                    <input type="number" className="input" value={editEntryData.dias_trabajados}
                      onChange={e => setEditEntryData(d => ({ ...d, dias_trabajados: Number(e.target.value) }))} min={0} max={31} />
                  </div>
                  <div>
                    <label className="label">Días licencia médica</label>
                    <input type="number" className="input" value={editEntryData.dias_licencia}
                      onChange={e => setEditEntryData(d => ({ ...d, dias_licencia: Number(e.target.value) }))} min={0} max={31} />
                    <p className="text-[10px] text-gray-400 mt-1">No descuenta del sueldo</p>
                  </div>
                  <div>
                    <label className="label">Días vacaciones</label>
                    <input type="number" className="input" value={editEntryData.dias_vacaciones}
                      onChange={e => setEditEntryData(d => ({ ...d, dias_vacaciones: Number(e.target.value) }))} min={0} max={31} />
                    <p className="text-[10px] text-gray-400 mt-1">No descuenta del sueldo</p>
                  </div>
                </div>
                <div className="mt-2 bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-700">
                  Días efectivos a pagar: <strong>{Math.max(0, editEntryData.dias_trabajados - (editEntryData.dias_licencia || 0) - (editEntryData.dias_vacaciones || 0))}</strong>
                </div>
              </div>
              {/* Horas extra */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Horas extra</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Hrs. extra hábiles</label>
                    <input type="number" className="input" value={editEntryData.horas_extra_habiles}
                      onChange={e => setEditEntryData(d => ({ ...d, horas_extra_habiles: Number(e.target.value) }))} min={0} />
                  </div>
                  <div>
                    <label className="label">Hrs. extra domingo/festivo</label>
                    <input type="number" className="input" value={editEntryData.horas_extra_domingo}
                      onChange={e => setEditEntryData(d => ({ ...d, horas_extra_domingo: Number(e.target.value) }))} min={0} />
                  </div>
                </div>
              </div>
              {/* Bonos */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Bonos y otros haberes</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="label">Bono colación</label>
                    <input type="number" className="input" value={editEntryData.bono_colacion}
                      onChange={e => setEditEntryData(d => ({ ...d, bono_colacion: Number(e.target.value) }))} min={0} />
                  </div>
                  <div>
                    <label className="label">Bono movilización</label>
                    <input type="number" className="input" value={editEntryData.bono_movilizacion}
                      onChange={e => setEditEntryData(d => ({ ...d, bono_movilizacion: Number(e.target.value) }))} min={0} />
                  </div>
                  <div>
                    <label className="label">Otros bonos</label>
                    <input type="number" className="input" value={editEntryData.bono_otros}
                      onChange={e => setEditEntryData(d => ({ ...d, bono_otros: Number(e.target.value) }))} min={0} />
                  </div>
                  <div>
                    <label className="label">Asignación familiar</label>
                    <input type="number" className="input" value={editEntryData.asignacion_familiar}
                      onChange={e => setEditEntryData(d => ({ ...d, asignacion_familiar: Number(e.target.value) }))} min={0} />
                  </div>
                </div>
              </div>
              {/* Descuentos del mes */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Descuentos del mes</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Adelanto de sueldo</label>
                    <input type="number" className="input" value={Number(editEntryData.adelanto)}
                      onChange={e => setEditEntryData(d => ({ ...d, adelanto: Number(e.target.value) }))} min={0} />
                  </div>
                  <div>
                    <label className="label">Otros descuentos</label>
                    <input type="number" className="input" value={Number(editEntryData.descuento_otros)}
                      onChange={e => setEditEntryData(d => ({ ...d, descuento_otros: Number(e.target.value) }))} min={0} />
                  </div>
                </div>
              </div>

              {/* Advertencias legales */}
              {editWarnings.length > 0 && (
                <div className="space-y-2">
                  {editWarnings.map((w, i) => (
                    <div key={i} className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
                      ⚠️ {w}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button onClick={() => setEditingEntry(null)} className="btn-secondary">Cerrar</button>
              <button onClick={saveEditEntry} disabled={editLoading} className="btn-primary">
                {editLoading ? 'Recalculando...' : 'Recalcular Liquidación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Employee to Run Modal */}
      {showAddEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-lg font-bold">Agregar Empleado a la Nómina</h2>
              <button onClick={() => setShowAddEmployee(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSubmitAdd(onAddEmployee)} className="p-6 space-y-4">
              <div>
                <label className="label">Empleado</label>
                <RHFSearchableSelect
                  name="employee_id"
                  control={controlAdd}
                  rules={{ required: true }}
                  options={[
                    { value: '', label: 'Seleccionar empleado...' },
                    ...employees.map(e => ({ value: e.id, label: `${e.first_name} ${e.last_name}` })),
                  ]}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Días trabajados</label>
                  <input className="input" type="number" {...registerAdd('dias_trabajados')} />
                </div>
                <div>
                  <label className="label">Bono colación</label>
                  <input className="input" type="number" {...registerAdd('bono_colacion')} />
                </div>
                <div>
                  <label className="label">Bono movilización</label>
                  <input className="input" type="number" {...registerAdd('bono_movilizacion')} />
                </div>
                <div>
                  <label className="label">Otros bonos</label>
                  <input className="input" type="number" {...registerAdd('bono_otros')} />
                </div>
                <div>
                  <label className="label">Adelanto</label>
                  <input className="input" type="number" {...registerAdd('adelanto')} />
                </div>
                <div>
                  <label className="label">Otros descuentos</label>
                  <input className="input" type="number" {...registerAdd('descuento_otros')} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAddEmployee(null)} className="btn-secondary">Cancelar</button>
                <button type="submit" disabled={processing} className="btn-primary">
                  {processing ? 'Calculando...' : 'Agregar y Calcular'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reverse Calculator Modal */}
      {showReverseCalc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">Calculadora de Sueldo Base</h2>
              <p className="text-sm text-gray-500 mt-1">Ingresa el líquido que debe recibir el trabajador</p>
            </div>
            <form onSubmit={handleSubmitReverse(onReverseCalculate)} className="p-6 space-y-4">
              <div>
                <label className="label">Líquido Deseado (CLP)</label>
                <input
                  className="input"
                  type="number"
                  min={500000}
                  step={1000}
                  {...registerReverse('liquido_deseado', { required: true, valueAsNumber: true, min: 500000 })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">AFP</label>
                  <RHFSearchableSelect
                    name="afp"
                    control={controlReverse}
                    options={[
                      { value: 'Habitat', label: 'Habitat' },
                      { value: 'Provida', label: 'Provida' },
                      { value: 'Capital', label: 'Capital' },
                      { value: 'Cuprum', label: 'Cuprum' },
                      { value: 'Planvital', label: 'Planvital' },
                      { value: 'Model', label: 'Model' },
                      { value: 'Uno', label: 'Uno' },
                    ]}
                  />
                </div>
                <div>
                  <label className="label">Sistema de Salud</label>
                  <RHFSearchableSelect
                    name="health_system"
                    control={controlReverse}
                    options={[
                      { value: 'FONASA', label: 'FONASA' },
                      { value: 'ISAPRE', label: 'ISAPRE' },
                    ]}
                  />
                </div>
                <div>
                  <label className="label">Tipo de Contrato</label>
                  <RHFSearchableSelect
                    name="contract_type"
                    control={controlReverse}
                    options={[
                      { value: 'indefinido', label: 'Indefinido' },
                      { value: 'plazo_fijo', label: 'Plazo Fijo' },
                    ]}
                  />
                </div>
                <div>
                  <label className="label">Monto ISAPRE (CLP)</label>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    step={1000}
                    {...registerReverse('isapre_monthly_amount', { valueAsNumber: true })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowReverseCalc(false); setReverseCalcResult(null) }}
                  className="btn-secondary"
                >
                  Cerrar
                </button>
                <button type="submit" disabled={reverseCalcProcessing} className="btn-primary">
                  {reverseCalcProcessing ? 'Calculando...' : 'Calcular'}
                </button>
              </div>
            </form>

            {reverseCalcResult && (
              <div className="px-6 pb-6">
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-gray-800 mb-3">Resultado</h3>
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-gray-100">
                      <tr className="py-2">
                        <td className="py-2 text-gray-600">Sueldo Base Requerido</td>
                        <td className="py-2 text-right font-semibold">{formatCLP(reverseCalcResult.sueldo_base_requerido)}</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-gray-600">Gratificación Legal</td>
                        <td className="py-2 text-right">{formatCLP(reverseCalcResult.gratificacion)}</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-gray-600">Remuneración Imponible</td>
                        <td className="py-2 text-right">{formatCLP(reverseCalcResult.remuneracion_imponible)}</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-gray-600 text-red-600">AFP</td>
                        <td className="py-2 text-right text-red-600">-{formatCLP(reverseCalcResult.descuento_afp)}</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-gray-600 text-red-600">Salud</td>
                        <td className="py-2 text-right text-red-600">-{formatCLP(reverseCalcResult.descuento_salud)}</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-gray-600 text-red-600">Cesantía</td>
                        <td className="py-2 text-right text-red-600">-{formatCLP(reverseCalcResult.descuento_cesantia)}</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-gray-600 text-red-600">Impuesto Único</td>
                        <td className="py-2 text-right text-red-600">-{formatCLP(reverseCalcResult.impuesto_unico)}</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-gray-600 font-medium text-red-700">Total Descuentos</td>
                        <td className="py-2 text-right font-medium text-red-700">-{formatCLP(reverseCalcResult.total_descuentos)}</td>
                      </tr>
                      <tr className="bg-green-50 rounded">
                        <td className="py-2 px-2 text-green-800 font-bold">Líquido a Pagar</td>
                        <td className="py-2 px-2 text-right font-bold text-green-700">{formatCLP(reverseCalcResult.liquido_resultante)}</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-xs text-gray-400">Valores aproximados, pueden variar ±$1 por redondeo</p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(String(reverseCalcResult.sueldo_base_requerido))
                        toast.success('Sueldo base copiado al portapapeles')
                      }}
                      className="btn-secondary text-xs"
                    >
                      Usar este sueldo base
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">Nueva Nómina</h2>
            </div>
            <form onSubmit={handleSubmit(onCreate)} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Año</label>
                  <input className="input" type="number"
                    {...register('period_year', { required: true, valueAsNumber: true })}
                    onChange={e => setCreatePeriodYear(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="label">Mes</label>
                  <Controller
                    name="period_month"
                    control={control}
                    render={({ field }) => (
                      <SearchableSelect
                        options={MONTHS.map((m, i) => ({ value: i + 1, label: m }))}
                        value={field.value}
                        onChange={v => {
                          field.onChange(Number(v))
                          setCreatePeriodMonth(Number(v))
                        }}
                      />
                    )}
                  />
                </div>
              </div>
              {periodValuesLoading ? (
                <p className="text-xs text-gray-400 text-center py-1">Consultando valores históricos...</p>
              ) : (
                <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
                  Valores cargados automáticamente desde tablas históricas para {MONTHS[createPeriodMonth - 1]} {createPeriodYear}. Puedes editarlos si es necesario.
                </p>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Valor UF (CLP)</label>
                  <input className="input" type="number" step="0.01" {...register('uf_value', { required: true, valueAsNumber: true })} />
                </div>
                <div>
                  <label className="label">Valor UTM (CLP)</label>
                  <input className="input" type="number" step="1" {...register('utm_value', { required: true, valueAsNumber: true })} />
                </div>
                <div>
                  <label className="label">IMM (CLP)</label>
                  <input className="input" type="number" step="1" {...register('imm_value', { required: true, valueAsNumber: true })} />
                </div>
                <div>
                  <label className="label">Fecha de Pago</label>
                  <DateInput className="input" {...register('payment_date')} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" disabled={processing || periodValuesLoading} className="btn-primary">
                  {processing ? 'Creando...' : 'Crear Nómina'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
