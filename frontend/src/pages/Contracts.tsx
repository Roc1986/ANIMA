import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  PlusIcon,
  ClipboardDocumentListIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { contractsApi, employeesApi, downloadBlob } from '../api/client'
import DateInput from '../components/DateInput'
import { useAuth } from '../contexts/AuthContext'

interface Contract {
  id: number
  employee_id: number
  employee_name: string
  rut: string
  position: string
  contract_type: 'indefinido' | 'plazo_fijo' | 'obra_faena' | 'part_time'
  start_date: string
  end_date?: string
  base_salary: number
  weekly_hours: number
  work_schedule?: string
  gratificacion_type: string
  is_active: boolean
  work_location?: string
  schedule_details?: string
  services_description?: string
  additional_clauses?: string
  obra_description?: string
  has_confidentiality: boolean
  notes?: string
  signed_at?: string
  created_at?: string
  status: 'vigente' | 'vencido' | 'por_vencer' | 'inactivo'
}

interface SimpleEmployee {
  id: number
  rut: string
  first_name: string
  last_name: string
  position: string
}

const TYPE_LABELS: Record<string, string> = {
  indefinido: 'Indefinido',
  plazo_fijo: 'Plazo Fijo',
  obra_faena: 'Obra o Faena',
  part_time: 'Part-Time',
}

const TYPE_COLORS: Record<string, string> = {
  indefinido: 'bg-blue-100 text-blue-800',
  plazo_fijo: 'bg-purple-100 text-purple-800',
  obra_faena: 'bg-orange-100 text-orange-800',
  part_time: 'bg-gray-100 text-gray-700',
}

const STATUS_COLORS: Record<string, string> = {
  vigente: 'bg-green-100 text-green-800',
  vencido: 'bg-red-100 text-red-800',
  por_vencer: 'bg-yellow-100 text-yellow-800',
  inactivo: 'bg-gray-100 text-gray-500',
}

const STATUS_LABELS: Record<string, string> = {
  vigente: 'Vigente',
  vencido: 'Vencido',
  por_vencer: 'Por vencer',
  inactivo: 'Inactivo',
}

function formatCLPShort(v: number): string {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(v)
}

export default function Contracts() {
  const { isHR } = useAuth()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [employees, setEmployees] = useState<SimpleEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  const [filterEmployee, setFilterEmployee] = useState<number | undefined>(undefined)
  const [filterType, setFilterType] = useState<string>('')
  const [expiringCount, setExpiringCount] = useState(0)

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm()
  const watchType = watch('contract_type')

  const fetchContracts = async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = {}
      if (filterEmployee) params.employee_id = filterEmployee
      if (filterType) params.contract_type = filterType
      const [contractRes, expiringRes] = await Promise.all([
        contractsApi.list(params),
        contractsApi.expiringSoon(30),
      ])
      setContracts(contractRes.data)
      setExpiringCount(expiringRes.data.length)
    } catch {
      toast.error('Error al cargar contratos')
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
    fetchEmployees()
  }, [])

  useEffect(() => {
    fetchContracts()
  }, [filterEmployee, filterType])

  const onSubmit = async (data: unknown) => {
    setSubmitting(true)
    try {
      const d = data as Record<string, unknown>
      // Ensure numeric
      d.employee_id = Number(d.employee_id)
      d.base_salary = Number(d.base_salary)
      d.weekly_hours = Number(d.weekly_hours)
      d.has_confidentiality = Boolean(d.has_confidentiality)
      // Remove empty strings
      if (!d.end_date) delete d.end_date
      if (!d.work_location) delete d.work_location
      if (!d.schedule_details) delete d.schedule_details
      if (!d.services_description) delete d.services_description
      if (!d.additional_clauses) delete d.additional_clauses
      if (!d.obra_description) delete d.obra_description
      if (!d.signed_at) delete d.signed_at
      await contractsApi.create(d)
      toast.success('Contrato creado exitosamente')
      setShowModal(false)
      reset()
      fetchContracts()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      toast.error(e.response?.data?.detail || 'Error al crear contrato')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDownloadPdf = async (id: number, employeeName: string, contractType: string) => {
    setDownloadingId(id)
    try {
      const res = await contractsApi.downloadPdf(id)
      downloadBlob(res.data, `contrato_${contractType}_${employeeName.replace(/ /g, '_')}_${id}.pdf`)
      toast.success('Contrato descargado')
    } catch {
      toast.error('Error al generar PDF del contrato')
    } finally {
      setDownloadingId(null)
    }
  }

  const handleDeactivate = async (id: number) => {
    if (!confirm('¿Desactivar este contrato?')) return
    try {
      await contractsApi.delete(id)
      toast.success('Contrato desactivado')
      fetchContracts()
    } catch {
      toast.error('Error al desactivar contrato')
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contratos de Trabajo</h1>
          <p className="text-gray-500 text-sm mt-1">Art. 10 Código del Trabajo — Indefinido / Plazo Fijo / Obra o Faena</p>
        </div>
        {isHR && (
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <PlusIcon className="w-4 h-4" />
            Nuevo Contrato
          </button>
        )}
      </div>

      {/* Alert for expiring contracts */}
      {expiringCount > 0 && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 shrink-0" />
          <p className="text-sm text-yellow-800">
            <strong>{expiringCount} contrato(s)</strong> a plazo fijo vencen en los próximos 30 días.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex gap-3 items-center flex-wrap">
        <select
          className="input-field w-64"
          value={filterEmployee ?? ''}
          onChange={(e) => setFilterEmployee(e.target.value ? Number(e.target.value) : undefined)}
        >
          <option value="">Todos los empleados</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.first_name} {emp.last_name} — {emp.rut}
            </option>
          ))}
        </select>
        <select
          className="input-field w-48"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="">Todos los tipos</option>
          <option value="indefinido">Indefinido</option>
          <option value="plazo_fijo">Plazo Fijo</option>
          <option value="obra_faena">Obra o Faena</option>
          <option value="part_time">Part-Time</option>
        </select>
      </div>

      {/* Contracts table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-500">Cargando...</div>
        ) : contracts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <ClipboardDocumentListIcon className="w-10 h-10 mb-2" />
            <p>No hay contratos registrados</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Empleado</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Inicio</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Término</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Sueldo Base</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Estado</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contracts.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium">{c.employee_name}</p>
                    <p className="text-xs text-gray-400">{c.rut} · {c.position}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[c.contract_type]}`}>
                      {TYPE_LABELS[c.contract_type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.start_date}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.end_date ? (
                      <span className={c.status === 'por_vencer' || c.status === 'vencido' ? 'text-red-600 font-medium' : ''}>
                        {c.end_date}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{formatCLPShort(c.base_salary)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[c.status]}`}>
                      {STATUS_LABELS[c.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right flex justify-end gap-2">
                    <button
                      onClick={() => handleDownloadPdf(c.id, c.employee_name, c.contract_type)}
                      disabled={downloadingId === c.id}
                      className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                      title="Descargar contrato PDF"
                    >
                      <ArrowDownTrayIcon className="w-4 h-4" />
                      {downloadingId === c.id ? 'Generando...' : 'PDF'}
                    </button>
                    {isHR && c.is_active && (
                      <button
                        onClick={() => handleDeactivate(c.id)}
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100"
                        title="Desactivar contrato"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* New Contract Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold text-gray-900">Nuevo Contrato de Trabajo</h2>
              <button onClick={() => { setShowModal(false); reset() }} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label-field">Empleado *</label>
                  <select className="input-field" {...register('employee_id', { required: true })}>
                    <option value="">Seleccionar empleado...</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name} — {emp.rut}
                      </option>
                    ))}
                  </select>
                  {errors.employee_id && <p className="error-text">Empleado requerido</p>}
                </div>

                <div>
                  <label className="label-field">Tipo de Contrato *</label>
                  <select className="input-field" {...register('contract_type', { required: true })}>
                    <option value="">Seleccionar tipo...</option>
                    <option value="indefinido">Indefinido</option>
                    <option value="plazo_fijo">Plazo Fijo</option>
                    <option value="obra_faena">Obra o Faena</option>
                    <option value="part_time">Part-Time</option>
                  </select>
                  {errors.contract_type && <p className="error-text">Tipo requerido</p>}
                </div>

                <div>
                  <label className="label-field">Sueldo Base (CLP) *</label>
                  <input
                    type="number"
                    min="0"
                    className="input-field"
                    placeholder="Ej: 800000"
                    {...register('base_salary', { required: true, min: 1 })}
                  />
                  {errors.base_salary && <p className="error-text">Sueldo base requerido</p>}
                </div>

                <div>
                  <label className="label-field">Fecha de Inicio *</label>
                  <DateInput className="input-field" {...register('start_date', { required: true })} />
                  {errors.start_date && <p className="error-text">Fecha requerida</p>}
                </div>

                <div>
                  <label className="label-field">
                    Fecha de Término {watchType === 'plazo_fijo' ? '*' : '(solo plazo fijo)'}
                  </label>
                  <DateInput
                    className="input-field"
                    {...register('end_date', { required: watchType === 'plazo_fijo' })}
                  />
                  {errors.end_date && <p className="error-text">Fecha de término requerida para plazo fijo</p>}
                </div>

                <div>
                  <label className="label-field">Jornada (horas semanales)</label>
                  <select className="input-field" {...register('weekly_hours')}>
                    <option value="40">40 horas (jornada completa)</option>
                    <option value="30">30 horas</option>
                    <option value="20">20 horas</option>
                  </select>
                </div>

                <div>
                  <label className="label-field">Tipo de Gratificación</label>
                  <select className="input-field" {...register('gratificacion_type')}>
                    <option value="legal">Legal (Art. 50 CT)</option>
                    <option value="garantizada">Garantizada</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="label-field">Lugar de prestación de servicios</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Ej: Av. Providencia 123, Santiago"
                    {...register('work_location')}
                  />
                </div>

                <div className="col-span-2">
                  <label className="label-field">Distribución de jornada</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Ej: de lunes a viernes, de 9:00 a 18:00 horas, con una hora de colación"
                    {...register('schedule_details')}
                  />
                </div>

                {watchType === 'obra_faena' && (
                  <div className="col-span-2">
                    <label className="label-field">Descripción de la obra o faena *</label>
                    <textarea
                      className="input-field h-20"
                      placeholder="Describa la obra o faena específica para la cual se contrata al trabajador..."
                      {...register('obra_description')}
                    />
                  </div>
                )}

                <div className="col-span-2">
                  <label className="label-field">Naturaleza de los servicios (cargo y funciones)</label>
                  <textarea
                    className="input-field h-20"
                    placeholder="Describa el cargo y las funciones que desempeñará el trabajador..."
                    {...register('services_description')}
                  />
                </div>

                <div className="col-span-2">
                  <label className="label-field">Cláusulas adicionales / beneficios</label>
                  <textarea
                    className="input-field h-20"
                    placeholder="Bonos, beneficios adicionales, otros pactos entre las partes..."
                    {...register('additional_clauses')}
                  />
                </div>

                <div>
                  <label className="label-field">Fecha de firma</label>
                  <DateInput className="input-field" {...register('signed_at')} />
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input type="checkbox" id="conf" {...register('has_confidentiality')} className="w-4 h-4" />
                  <label htmlFor="conf" className="text-sm text-gray-700">Incluir cláusula de confidencialidad</label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); reset() }} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? 'Creando...' : 'Crear Contrato'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
