import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  PlusIcon,
  DocumentTextIcon,
  TrashIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline'
import { api, employeesApi, downloadBlob } from '../api/client'
import DateInput from '../components/DateInput'
import { useAuth } from '../contexts/AuthContext'

interface Employee {
  id: number
  rut: string
  first_name: string
  last_name: string
  position: string
}

interface WarningLetter {
  id: number
  employee_id: number
  date: string
  type: 'verbal' | 'escrita' | 'grave'
  reason: string
  description: string
  signature_required: boolean
  created_at?: string
}

const TYPE_LABELS: Record<string, string> = {
  verbal: 'Verbal',
  escrita: 'Escrita',
  grave: 'Grave',
}

const TYPE_COLORS: Record<string, string> = {
  verbal: 'bg-yellow-100 text-yellow-800',
  escrita: 'bg-orange-100 text-orange-800',
  grave: 'bg-red-100 text-red-800',
}

export default function WarningLetters() {
  const { isHR } = useAuth()
  const [letters, setLetters] = useState<WarningLetter[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [filterEmployee, setFilterEmployee] = useState<number | undefined>(undefined)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  const fetchLetters = async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = {}
      if (filterEmployee) params.employee_id = filterEmployee
      const res = await api.get('/api/warning-letters/', { params })
      setLetters(res.data)
    } catch {
      toast.error('Error al cargar cartas de amonestación')
    } finally {
      setLoading(false)
    }
  }

  const fetchEmployees = async () => {
    try {
      const res = await employeesApi.list({ is_active: true })
      setEmployees(res.data)
    } catch {
      // silently fail
    }
  }

  useEffect(() => {
    fetchEmployees()
  }, [])

  useEffect(() => {
    fetchLetters()
  }, [filterEmployee])

  const getEmployeeName = (id: number) => {
    const emp = employees.find((e) => e.id === id)
    return emp ? `${emp.first_name} ${emp.last_name}` : `Empleado #${id}`
  }

  const onSubmit = async (data: unknown) => {
    setSubmitting(true)
    try {
      await api.post('/api/warning-letters/', data)
      toast.success('Carta de amonestación creada')
      setShowModal(false)
      reset()
      fetchLetters()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      toast.error(error.response?.data?.detail || 'Error al crear carta')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDownload = async (letter: WarningLetter) => {
    setDownloadingId(letter.id)
    try {
      const res = await api.get(`/api/warning-letters/${letter.id}/pdf`, { responseType: 'blob' })
      downloadBlob(res.data, `amonestacion_${letter.id}.pdf`)
      toast.success('PDF descargado')
    } catch {
      toast.error('Error al generar PDF')
    } finally {
      setDownloadingId(null)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta carta de amonestación?')) return
    try {
      await api.delete(`/api/warning-letters/${id}`)
      toast.success('Carta eliminada')
      fetchLetters()
    } catch {
      toast.error('Error al eliminar carta')
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cartas de Amonestación</h1>
          <p className="text-gray-500 text-sm mt-1">Gestión de amonestaciones laborales</p>
        </div>
        {isHR && (
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <PlusIcon className="w-4 h-4" />
            Nueva Amonestación
          </button>
        )}
      </div>

      {/* Filter */}
      <div className="mb-4 flex gap-3 items-center">
        <label className="text-sm font-medium text-gray-700">Filtrar por empleado:</label>
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
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-500">Cargando...</div>
        ) : letters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <DocumentTextIcon className="w-10 h-10 mb-2" />
            <p>No hay cartas de amonestación registradas</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Empleado</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Motivo</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {letters.map((letter) => (
                <tr key={letter.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{getEmployeeName(letter.employee_id)}</td>
                  <td className="px-4 py-3 text-gray-600">{letter.date}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[letter.type]}`}>
                      {TYPE_LABELS[letter.type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{letter.reason}</td>
                  <td className="px-4 py-3 text-right flex justify-end gap-2">
                    <button
                      onClick={() => handleDownload(letter)}
                      disabled={downloadingId === letter.id}
                      className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                      title="Descargar PDF"
                    >
                      <ArrowDownTrayIcon className="w-4 h-4" />
                      {downloadingId === letter.id ? 'Generando...' : 'PDF'}
                    </button>
                    {isHR && (
                      <button
                        onClick={() => handleDelete(letter.id)}
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100"
                        title="Eliminar"
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

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold text-gray-900">Nueva Carta de Amonestación</h2>
              <button onClick={() => { setShowModal(false); reset() }} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
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

                <div>
                  <label className="label-field">Fecha *</label>
                  <DateInput className="input-field" {...register('date', { required: true })} />
                  {errors.date && <p className="error-text">Fecha requerida</p>}
                </div>

                <div>
                  <label className="label-field">Tipo de Amonestación *</label>
                  <select className="input-field" {...register('type', { required: true })}>
                    <option value="">Seleccionar tipo...</option>
                    <option value="verbal">Verbal</option>
                    <option value="escrita">Escrita</option>
                    <option value="grave">Grave</option>
                  </select>
                  {errors.type && <p className="error-text">Tipo requerido</p>}
                </div>

                <div className="col-span-2">
                  <label className="label-field">Motivo *</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Ej: Inasistencia injustificada, incumplimiento de funciones..."
                    {...register('reason', { required: true })}
                  />
                  {errors.reason && <p className="error-text">Motivo requerido</p>}
                </div>

                <div className="col-span-2">
                  <label className="label-field">Descripción detallada de los hechos *</label>
                  <textarea
                    className="input-field h-28"
                    placeholder="Describa detalladamente los hechos que motivan la amonestación..."
                    {...register('description', { required: true })}
                  />
                  {errors.description && <p className="error-text">Descripción requerida</p>}
                </div>

                <div className="col-span-2 flex items-center gap-2">
                  <input type="checkbox" id="sig_req" defaultChecked {...register('signature_required')} className="w-4 h-4" />
                  <label htmlFor="sig_req" className="text-sm text-gray-700">Requiere firma del trabajador</label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); reset() }} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? 'Guardando...' : 'Crear Carta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
