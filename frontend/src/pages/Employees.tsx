import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { employeesApi, formatCLP } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { PlusIcon, MagnifyingGlassIcon, UserIcon } from '@heroicons/react/24/outline'
import DateInput from '../components/DateInput'

interface Employee {
  id: number
  rut: string
  first_name: string
  last_name: string
  second_last_name?: string
  position: string
  department?: string
  base_salary: number
  afp: string
  health_system: string
  isapre_amount_type?: string
  hire_date: string
  is_active: boolean
}

const AFP_OPTIONS = ['Habitat', 'Provida', 'Capital', 'Cuprum', 'Planvital', 'Model', 'Uno']

function formatRUT(raw: string): string {
  const clean = raw.replace(/[^0-9kK]/g, '').toUpperCase()
  if (clean.length < 2) return clean
  const body = clean.slice(0, -1)
  const dv = clean.slice(-1)
  const bodyFormatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${bodyFormatted}-${dv}`
}

function formatDateCL(iso: string): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export default function Employees() {
  const { isHR } = useAuth()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active')
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [rutDisplay, setRutDisplay] = useState('')
  const [healthSystem, setHealthSystem] = useState('FONASA')
  const [isapreAmountType, setIsapreAmountType] = useState('pesos')

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm()

  const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatRUT(e.target.value)
    setRutDisplay(formatted)
    setValue('rut', formatted)
  }

  const fetchEmployees = async () => {
    setLoading(true)
    try {
      const res = await employeesApi.list({ search: search || undefined })
      setEmployees(Array.isArray(res.data) ? res.data : [])
    } catch {
      toast.error('Error al cargar empleados')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchEmployees() }, [search])

  const filteredEmployees = employees.filter(emp => {
    if (statusFilter === 'active') return emp.is_active
    if (statusFilter === 'inactive') return !emp.is_active
    return true
  })

  const onSubmit = async (data: Record<string, unknown>) => {
    setSubmitting(true)
    const payload = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== '' && v !== null && v !== undefined)
    )
    payload.base_salary = Number(payload.base_salary)
    if (payload.isapre_monthly_amount) payload.isapre_monthly_amount = Number(payload.isapre_monthly_amount)
    try {
      await employeesApi.create(payload)
      toast.success('Empleado creado exitosamente')
      setShowModal(false)
      reset()
      setRutDisplay('')
      setHealthSystem('FONASA')
      setIsapreAmountType('pesos')
      fetchEmployees()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      toast.error(error.response?.data?.detail || 'Error al crear empleado')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empleados</h1>
          <p className="text-gray-500 text-sm mt-1">{filteredEmployees.length} de {employees.length} empleados</p>
        </div>
        {isHR && (
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <PlusIcon className="w-4 h-4" />
            Nuevo Empleado
          </button>
        )}
      </div>

      {/* Search + filter */}
      <div className="card mb-4 py-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="input pl-9"
              placeholder="Buscar por nombre, RUT o email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm font-medium">
            {([['all', 'Todos'], ['active', 'Activos'], ['inactive', 'Inactivos']] as const).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setStatusFilter(val)}
                className={`px-4 py-2 transition-colors ${
                  statusFilter === val
                    ? val === 'inactive'
                      ? 'bg-red-600 text-white'
                      : val === 'active'
                      ? 'bg-green-600 text-white'
                      : 'bg-blue-900 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="table-header">Empleado</th>
                <th className="table-header">RUT</th>
                <th className="table-header">Cargo / Área</th>
                <th className="table-header">AFP / Salud</th>
                <th className="table-header">Sueldo Base</th>
                <th className="table-header">Ingreso</th>
                <th className="table-header">Estado</th>
                <th className="table-header"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={8} className="table-cell text-center py-8 text-gray-400">Cargando...</td></tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="table-cell text-center py-12">
                    <UserIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-400">Sin empleados registrados</p>
                  </td>
                </tr>
              ) : filteredEmployees.map(emp => (
                <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                        <span className="text-blue-700 text-sm font-medium">
                          {emp.first_name.charAt(0)}{emp.last_name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {emp.first_name} {emp.last_name} {emp.second_last_name || ''}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell text-gray-500 font-mono text-xs">{formatRUT(emp.rut)}</td>
                  <td className="table-cell">
                    <p className="text-sm">{emp.position}</p>
                    {emp.department && <p className="text-xs text-gray-400">{emp.department}</p>}
                  </td>
                  <td className="table-cell">
                    <p className="text-xs">{emp.afp}</p>
                    <p className="text-xs text-gray-400">{emp.health_system}</p>
                  </td>
                  <td className="table-cell font-medium">{formatCLP(Number(emp.base_salary))}</td>
                  <td className="table-cell text-gray-500 text-xs">{formatDateCL(String(emp.hire_date))}</td>
                  <td className="table-cell">
                    <span className={emp.is_active ? 'badge-green' : 'badge-red'}>
                      {emp.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="table-cell">
                    <Link to={`/employees/${emp.id}`} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                      Ver →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">Nuevo Empleado</h2>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">RUT *</label>
                  <input
                    className={`input font-mono ${errors.rut ? 'border-red-400' : ''}`}
                    placeholder="12.345.678-9"
                    value={rutDisplay}
                    onChange={handleRutChange}
                  />
                  <input type="hidden" {...register('rut', { required: true })} />
                  {errors.rut && <p className="text-xs text-red-500 mt-1">RUT requerido</p>}
                </div>
                <div>
                  <label className="label">Nombres *</label>
                  <input className="input" {...register('first_name', { required: true })} />
                </div>
                <div>
                  <label className="label">Apellido Paterno *</label>
                  <input className="input" {...register('last_name', { required: true })} />
                </div>
                <div>
                  <label className="label">Apellido Materno</label>
                  <input className="input" {...register('second_last_name')} />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input className="input" type="email" {...register('email')} />
                </div>
                <div>
                  <label className="label">Teléfono</label>
                  <input className="input" placeholder="+56 9 1234 5678" {...register('phone')} />
                </div>
                <div>
                  <label className="label">Tipo de Contrato *</label>
                  <select className="input" {...register('contract_type', { required: true })}>
                    <option value="indefinido">Indefinido</option>
                    <option value="plazo_fijo">Plazo Fijo</option>
                    <option value="obra_faena">Obra o Faena</option>
                    <option value="part_time">Part Time</option>
                  </select>
                </div>
                <div>
                  <label className="label">Gratificación</label>
                  <select className="input" {...register('gratificacion_type')}>
                    <option value="legal">Legal (anual, Art. 47)</option>
                    <option value="garantizada">Garantizada (anual, Art. 50)</option>
                    <option value="mensual">Incluida en sueldo mensual</option>
                  </select>
                </div>
                <div>
                  <label className="label">Cargo *</label>
                  <input className="input" {...register('position', { required: true })} />
                </div>
                <div>
                  <label className="label">Departamento</label>
                  <input className="input" {...register('department')} />
                </div>
                <div>
                  <label className="label">Fecha de Ingreso *</label>
                  <DateInput className="input" {...register('hire_date', { required: true })} />
                </div>
                <div>
                  <label className="label">Sueldo Base *</label>
                  <input className="input" type="number" min="500000"
                    {...register('base_salary', { required: true, min: 500000 })} />
                </div>
                <div>
                  <label className="label">AFP *</label>
                  <select className="input" {...register('afp', { required: true })}>
                    {AFP_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Sistema Salud *</label>
                  <select className="input" {...register('health_system', { required: true })}
                    onChange={e => setHealthSystem(e.target.value)}>
                    <option value="FONASA">FONASA</option>
                    <option value="ISAPRE">ISAPRE</option>
                  </select>
                </div>
                {healthSystem === 'ISAPRE' && (
                  <>
                    <div>
                      <label className="label">Nombre ISAPRE</label>
                      <input className="input" placeholder="Cruz Blanca, Banmédica..." {...register('isapre_name')} />
                    </div>
                    <div>
                      <label className="label">Tipo monto ISAPRE</label>
                      <select className="input" {...register('isapre_amount_type')}
                        onChange={e => setIsapreAmountType(e.target.value)}>
                        <option value="pesos">Pesos ($)</option>
                        <option value="uf">UF</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Monto plan mensual ({isapreAmountType === 'uf' ? 'UF' : '$'})</label>
                      <input className="input" type="number" min={0}
                        placeholder={isapreAmountType === 'uf' ? 'Ej: 1.5' : 'Ej: 45000'}
                        step={isapreAmountType === 'uf' ? '0.01' : '1'}
                        {...register('isapre_monthly_amount')} />
                      <p className="text-[10px] text-gray-400 mt-1">Se descuenta vs 7% imponible (el mayor)</p>
                    </div>
                  </>
                )}
                <div>
                  <label className="label">Banco</label>
                  <input className="input" placeholder="BancoEstado, Santander..." {...register('bank_name')} />
                </div>
                <div>
                  <label className="label">N° Cuenta</label>
                  <input className="input" {...register('bank_account_number')} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); reset(); setRutDisplay(''); setHealthSystem('FONASA'); setIsapreAmountType('pesos') }} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? 'Guardando...' : 'Crear Empleado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
