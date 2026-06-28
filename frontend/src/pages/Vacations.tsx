import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  PlusIcon,
  SunIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline'
import { vacationsApi, employeesApi, downloadBlob } from '../api/client'
import DateInput from '../components/DateInput'
import { useAuth } from '../contexts/AuthContext'

interface VacationSummary {
  employee_id: number
  employee_name: string
  rut: string
  position: string
  department: string
  hire_date: string
  days_earned: number
  days_taken: number
  days_pending: number
  years_worked: number
  months_worked: number
}

interface VacationRequest {
  id: number
  employee_id: number
  employee_name: string
  rut: string
  start_date: string
  end_date: string
  days_requested: number
  reason?: string
  status: 'pending' | 'approved' | 'rejected'
  notes?: string
  created_at?: string
}

interface EmployeeDetail {
  employee_id: number
  employee_name: string
  rut: string
  position: string
  hire_date: string
  days_earned: number
  days_taken: number
  days_pending: number
  years_worked: number
  months_worked: number
  base_days: number
  progressive_days: number
  requests: {
    id: number
    start_date: string
    end_date: string
    days_requested: number
    reason?: string
    status: string
    notes?: string
    created_at?: string
  }[]
}

interface SimpleEmployee {
  id: number
  rut: string
  first_name: string
  last_name: string
  position: string
}

function pendingColor(days: number): string {
  if (days > 30) return 'text-red-700 bg-red-100'
  if (days > 20) return 'text-yellow-700 bg-yellow-100'
  return 'text-green-700 bg-green-100'
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
}

export default function Vacations() {
  const { isHR } = useAuth()
  const [summaries, setSummaries] = useState<VacationSummary[]>([])
  const [pendingRequests, setPendingRequests] = useState<VacationRequest[]>([])
  const [employees, setEmployees] = useState<SimpleEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  const [rejectId, setRejectId] = useState<number | null>(null)
  const [rejectNotes, setRejectNotes] = useState('')
  const [expandedEmployee, setExpandedEmployee] = useState<number | null>(null)
  const [businessDays, setBusinessDays] = useState<number | null>(null)

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm()
  const watchStart = watch('start_date')
  const watchEnd = watch('end_date')

  const fetchData = async () => {
    setLoading(true)
    try {
      const [sumRes, reqRes] = await Promise.all([
        vacationsApi.list(),
        vacationsApi.listRequests({ status: 'pending' }),
      ])
      setSummaries(sumRes.data)
      setPendingRequests(reqRes.data)
    } catch {
      toast.error('Error al cargar vacaciones')
    } finally {
      setLoading(false)
    }
  }

  const fetchEmployees = async () => {
    try {
      const res = await employeesApi.list({ is_active: true })
      setEmployees(res.data)
    } catch { /* silent */ }
  }

  useEffect(() => {
    fetchData()
    fetchEmployees()
  }, [])

  // Auto-calculate business days when dates change
  useEffect(() => {
    if (!watchStart || !watchEnd) { setBusinessDays(null); return }
    const start = new Date(watchStart)
    const end = new Date(watchEnd)
    if (end < start) { setBusinessDays(null); return }
    // Simple client-side estimate (Mon-Sat, no holidays)
    let count = 0
    const cur = new Date(start)
    while (cur <= end) {
      const dow = cur.getDay()
      if (dow !== 0) count++ // exclude Sunday
      cur.setDate(cur.getDate() + 1)
    }
    setBusinessDays(count)
  }, [watchStart, watchEnd])

  const handleEmployeeClick = async (employeeId: number) => {
    if (expandedEmployee === employeeId) {
      setExpandedEmployee(null)
      setSelectedEmployee(null)
      return
    }
    setExpandedEmployee(employeeId)
    setLoadingDetail(true)
    try {
      const res = await vacationsApi.getEmployee(employeeId)
      setSelectedEmployee(res.data)
    } catch {
      toast.error('Error al cargar detalle de vacaciones')
    } finally {
      setLoadingDetail(false)
    }
  }

  const onSubmit = async (data: unknown) => {
    setSubmitting(true)
    try {
      await vacationsApi.createRequest(data)
      toast.success('Solicitud de vacaciones creada exitosamente')
      setShowModal(false)
      reset()
      setBusinessDays(null)
      fetchData()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      toast.error(e.response?.data?.detail || 'Error al crear solicitud')
    } finally {
      setSubmitting(false)
    }
  }

  const handleApprove = async (id: number) => {
    try {
      await vacationsApi.approveRequest(id, {})
      toast.success('Solicitud aprobada')
      fetchData()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      toast.error(e.response?.data?.detail || 'Error al aprobar solicitud')
    }
  }

  const handleReject = async () => {
    if (!rejectId || !rejectNotes.trim()) {
      toast.error('Debe ingresar un motivo de rechazo')
      return
    }
    try {
      await vacationsApi.rejectRequest(rejectId, { notes: rejectNotes })
      toast.success('Solicitud rechazada')
      setRejectId(null)
      setRejectNotes('')
      fetchData()
    } catch {
      toast.error('Error al rechazar solicitud')
    }
  }

  const handleDownloadPdf = async (employeeId: number, employeeName: string) => {
    setDownloadingId(employeeId)
    try {
      const res = await vacationsApi.getCertificatePdf(employeeId)
      downloadBlob(res.data, `certificado_vacaciones_${employeeName.replace(/ /g, '_')}.pdf`)
      toast.success('Certificado descargado')
    } catch {
      toast.error('Error al generar certificado PDF')
    } finally {
      setDownloadingId(null)
    }
  }

  const totalEmployees = summaries.length
  const pendingCount = pendingRequests.length
  const criticalCount = summaries.filter((s) => s.days_pending > 30).length

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Control de Vacaciones</h1>
          <p className="text-gray-500 text-sm mt-1">Art. 67 Código del Trabajo — 15 días hábiles por año trabajado</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <PlusIcon className="w-4 h-4" />
          Nueva Solicitud
        </button>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
            <SunIcon className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Empleados</p>
            <p className="text-2xl font-bold text-gray-900">{totalEmployees}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
            <ClockIcon className="w-6 h-6 text-yellow-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Solicitudes Pendientes</p>
            <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
          </div>
        </div>
        <div className={`card p-4 flex items-center gap-4 ${criticalCount > 0 ? 'border-red-200' : ''}`}>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${criticalCount > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
            <ExclamationTriangleIcon className={`w-6 h-6 ${criticalCount > 0 ? 'text-red-600' : 'text-green-600'}`} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Con &gt;30 días pendientes</p>
            <p className={`text-2xl font-bold ${criticalCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>{criticalCount}</p>
          </div>
        </div>
      </div>

      {/* Pending requests panel */}
      {pendingRequests.length > 0 && isHR && (
        <div className="card mb-6">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="font-semibold text-gray-800">Solicitudes Pendientes de Aprobación</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {pendingRequests.map((req) => (
              <div key={req.id} className="px-4 py-3 flex items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="font-medium text-sm">{req.employee_name} <span className="text-gray-400 text-xs">({req.rut})</span></p>
                  <p className="text-xs text-gray-500">
                    {req.start_date} → {req.end_date} · <strong>{req.days_requested} días hábiles</strong>
                    {req.reason && <span className="ml-2 italic">"{req.reason}"</span>}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleApprove(req.id)}
                    className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded bg-green-50 text-green-700 hover:bg-green-100 font-medium"
                  >
                    <CheckCircleIcon className="w-4 h-4" />
                    Aprobar
                  </button>
                  <button
                    onClick={() => { setRejectId(req.id); setRejectNotes('') }}
                    className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded bg-red-50 text-red-700 hover:bg-red-100 font-medium"
                  >
                    <XCircleIcon className="w-4 h-4" />
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Employees table */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="font-semibold text-gray-800">Saldo de Vacaciones por Empleado</h2>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-500">Cargando...</div>
        ) : summaries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <SunIcon className="w-10 h-10 mb-2" />
            <p>No hay empleados activos</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Empleado</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Ingreso</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Ganados</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Tomados</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Disponibles</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {summaries.map((s) => (
                <>
                  <tr
                    key={s.employee_id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleEmployeeClick(s.employee_id)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {expandedEmployee === s.employee_id ? (
                          <ChevronUpIcon className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                        )}
                        <div>
                          <p className="font-medium">{s.employee_name}</p>
                          <p className="text-xs text-gray-400">{s.rut} · {s.position}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{s.hire_date}</td>
                    <td className="px-4 py-3 text-center font-medium">{s.days_earned.toFixed(1)}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{s.days_taken.toFixed(1)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${pendingColor(s.days_pending)}`}>
                        {s.days_pending.toFixed(1)} días
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleDownloadPdf(s.employee_id, s.employee_name)}
                        disabled={downloadingId === s.employee_id}
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                      >
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        {downloadingId === s.employee_id ? 'Generando...' : 'Certificado'}
                      </button>
                    </td>
                  </tr>
                  {expandedEmployee === s.employee_id && (
                    <tr key={`detail-${s.employee_id}`}>
                      <td colSpan={6} className="px-6 py-4 bg-blue-50">
                        {loadingDetail ? (
                          <p className="text-sm text-gray-500">Cargando detalle...</p>
                        ) : selectedEmployee ? (
                          <div>
                            <div className="grid grid-cols-3 gap-4 mb-3 text-xs text-gray-600">
                              <div><span className="font-medium">Años trabajados:</span> {selectedEmployee.years_worked.toFixed(1)}</div>
                              <div><span className="font-medium">Base legal:</span> {selectedEmployee.base_days} días/año</div>
                              {selectedEmployee.progressive_days > 0 && (
                                <div><span className="font-medium">Feriado progresivo:</span> +{selectedEmployee.progressive_days} día(s)</div>
                              )}
                            </div>
                            {selectedEmployee.requests.length > 0 ? (
                              <table className="w-full text-xs border border-gray-200 rounded">
                                <thead className="bg-white">
                                  <tr>
                                    <th className="text-left px-3 py-2 text-gray-600">Desde</th>
                                    <th className="text-left px-3 py-2 text-gray-600">Hasta</th>
                                    <th className="text-center px-3 py-2 text-gray-600">Días hábiles</th>
                                    <th className="text-center px-3 py-2 text-gray-600">Estado</th>
                                    <th className="text-left px-3 py-2 text-gray-600">Motivo</th>
                                    <th className="text-left px-3 py-2 text-gray-600">Notas</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {selectedEmployee.requests.map((req) => (
                                    <tr key={req.id} className="bg-white">
                                      <td className="px-3 py-2">{req.start_date}</td>
                                      <td className="px-3 py-2">{req.end_date}</td>
                                      <td className="px-3 py-2 text-center">{req.days_requested.toFixed(1)}</td>
                                      <td className="px-3 py-2 text-center">
                                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[req.status] || 'bg-gray-100 text-gray-700'}`}>
                                          {STATUS_LABELS[req.status] || req.status}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2 text-gray-500">{req.reason || '—'}</td>
                                      <td className="px-3 py-2 text-gray-500">{req.notes || '—'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <p className="text-sm text-gray-400">Sin solicitudes registradas</p>
                            )}
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Nueva Solicitud Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold text-gray-900">Nueva Solicitud de Vacaciones</h2>
              <button onClick={() => { setShowModal(false); reset(); setBusinessDays(null) }} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div>
                <label className="label-field">Empleado *</label>
                <select className="input-field" {...register('employee_id', { required: true, valueAsNumber: true })}>
                  <option value="">Seleccionar empleado...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} — {emp.rut}
                    </option>
                  ))}
                </select>
                {errors.employee_id && <p className="error-text">Empleado requerido</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-field">Fecha inicio *</label>
                  <DateInput className="input-field" {...register('start_date', { required: true })} />
                  {errors.start_date && <p className="error-text">Fecha requerida</p>}
                </div>
                <div>
                  <label className="label-field">Fecha término *</label>
                  <DateInput className="input-field" {...register('end_date', { required: true })} />
                  {errors.end_date && <p className="error-text">Fecha requerida</p>}
                </div>
              </div>
              {businessDays !== null && (
                <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                  <strong>Días hábiles estimados (Lun-Sáb):</strong> {businessDays}
                  <span className="text-xs text-blue-500 ml-2">(El servidor calculará con feriados chilenos)</span>
                </div>
              )}
              <div>
                <label className="label-field">Motivo (opcional)</label>
                <textarea className="input-field h-20" placeholder="Motivo del período de vacaciones..." {...register('reason')} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); reset(); setBusinessDays(null) }} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? 'Enviando...' : 'Crear Solicitud'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold text-gray-900">Rechazar Solicitud</h2>
              <button onClick={() => setRejectId(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label-field">Motivo de rechazo *</label>
                <textarea
                  className="input-field h-24"
                  placeholder="Indique el motivo del rechazo..."
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setRejectId(null)} className="btn-secondary">Cancelar</button>
                <button onClick={handleReject} className="btn-primary bg-red-600 hover:bg-red-700">Rechazar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
