import { useEffect, useState } from 'react'
import { attendanceApi, employeesApi } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { PlusIcon, ClockIcon } from '@heroicons/react/24/outline'

interface AttendanceRecord {
  id: number
  employee_id: number
  date: string
  attendance_type: string
  regular_hours: number
  overtime_weekday_hours: number
  overtime_sunday_hours: number
  notes?: string
}

interface Employee {
  id: number
  first_name: string
  last_name: string
  rut: string
}

const ATTENDANCE_TYPES: Record<string, string> = {
  regular: 'Regular',
  overtime_weekday: 'HH.EE Hábil',
  overtime_sunday: 'HH.EE Dom/Fest',
  absence: 'Ausencia',
  vacation: 'Vacaciones',
  sick_leave: 'Licencia Médica',
  legal_license: 'Licencia Legal',
  administrative_permit: 'Permiso Admin.',
}

const TYPE_BADGE: Record<string, string> = {
  regular: 'badge-green',
  overtime_weekday: 'badge-blue',
  overtime_sunday: 'badge-blue',
  absence: 'badge-red',
  vacation: 'badge-yellow',
  sick_leave: 'badge-yellow',
  legal_license: 'badge-yellow',
  administrative_permit: 'badge-gray',
}

export default function Attendance() {
  const { isHR } = useAuth()
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filterEmp, setFilterEmp] = useState('')
  const [filterDate, setFilterDate] = useState('')

  const { register, handleSubmit, reset } = useForm()

  const fetchRecords = async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = {}
      if (filterEmp) params.employee_id = filterEmp
      if (filterDate) {
        params.date_from = filterDate
        params.date_to = filterDate
      }
      const res = await attendanceApi.list(params)
      setRecords(res.data)
    } catch {
      toast.error('Error al cargar asistencia')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    employeesApi.list({ is_active: true }).then(r => setEmployees(r.data))
  }, [])

  useEffect(() => { fetchRecords() }, [filterEmp, filterDate])

  const onSubmit = async (data: unknown) => {
    try {
      await attendanceApi.create(data)
      toast.success('Registro creado')
      setShowModal(false)
      reset()
      fetchRecords()
    } catch {
      toast.error('Error al crear registro')
    }
  }

  const getEmpName = (id: number) => {
    const emp = employees.find(e => e.id === id)
    return emp ? `${emp.first_name} ${emp.last_name}` : `#${id}`
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Asistencia</h1>
          <p className="text-gray-500 text-sm mt-1">Registro de asistencia y horas trabajadas</p>
        </div>
        {isHR && (
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <PlusIcon className="w-4 h-4" /> Nuevo Registro
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card mb-4 py-3">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="label text-xs">Empleado</label>
            <select className="input" value={filterEmp} onChange={e => setFilterEmp(e.target.value)}>
              <option value="">Todos</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label text-xs">Fecha</label>
            <input className="input" type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
          </div>
          <div className="flex items-end">
            <button onClick={() => { setFilterEmp(''); setFilterDate('') }} className="btn-secondary text-sm">
              Limpiar
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="table-header">Empleado</th>
                <th className="table-header">Fecha</th>
                <th className="table-header">Tipo</th>
                <th className="table-header">Horas Regular</th>
                <th className="table-header">HH.EE Hábil</th>
                <th className="table-header">HH.EE Dom/Fest</th>
                <th className="table-header">Notas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="table-cell text-center py-8 text-gray-400">Cargando...</td></tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="table-cell text-center py-12">
                    <ClockIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-400">Sin registros</p>
                  </td>
                </tr>
              ) : records.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="table-cell text-sm">{getEmpName(r.employee_id)}</td>
                  <td className="table-cell text-sm">{r.date}</td>
                  <td className="table-cell">
                    <span className={TYPE_BADGE[r.attendance_type] || 'badge-gray'}>
                      {ATTENDANCE_TYPES[r.attendance_type] || r.attendance_type}
                    </span>
                  </td>
                  <td className="table-cell text-sm">{Number(r.regular_hours).toFixed(1)}h</td>
                  <td className="table-cell text-sm">{Number(r.overtime_weekday_hours).toFixed(1)}h</td>
                  <td className="table-cell text-sm">{Number(r.overtime_sunday_hours).toFixed(1)}h</td>
                  <td className="table-cell text-xs text-gray-500">{r.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">Nuevo Registro de Asistencia</h2>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div>
                <label className="label">Empleado *</label>
                <select className="input" {...register('employee_id', { required: true, valueAsNumber: true })}>
                  <option value="">Seleccionar...</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.rut})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Fecha *</label>
                <input className="input" type="date" {...register('date', { required: true })} />
              </div>
              <div>
                <label className="label">Tipo de Registro</label>
                <select className="input" {...register('attendance_type')}>
                  {Object.entries(ATTENDANCE_TYPES).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">Horas Regular</label>
                  <input className="input" type="number" step="0.5" defaultValue={8}
                    {...register('regular_hours', { valueAsNumber: true })} />
                </div>
                <div>
                  <label className="label">HH.EE Hábil</label>
                  <input className="input" type="number" step="0.5" defaultValue={0}
                    {...register('overtime_weekday_hours', { valueAsNumber: true })} />
                </div>
                <div>
                  <label className="label">HH.EE Dom</label>
                  <input className="input" type="number" step="0.5" defaultValue={0}
                    {...register('overtime_sunday_hours', { valueAsNumber: true })} />
                </div>
              </div>
              <div>
                <label className="label">Notas</label>
                <input className="input" {...register('notes')} />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => { setShowModal(false); reset() }} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
