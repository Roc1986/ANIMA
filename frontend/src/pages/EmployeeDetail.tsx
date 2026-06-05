import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { employeesApi, formatCLP } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { ArrowLeftIcon, PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface Employee {
  id: number
  rut: string
  first_name: string
  last_name: string
  second_last_name?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  birth_date?: string
  nationality: string
  afp: string
  health_system: string
  isapre_name?: string
  hire_date: string
  position: string
  department?: string
  base_salary: number
  bank_name?: string
  bank_account_type?: string
  bank_account_number?: string
  is_active: boolean
  termination_date?: string
  termination_reason?: string
}

export default function EmployeeDetail() {
  const { id } = useParams<{ id: string }>()
  const { isHR } = useAuth()
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, reset } = useForm()

  const fetchEmployee = async () => {
    try {
      const res = await employeesApi.get(Number(id))
      setEmployee(res.data)
      reset(res.data)
    } catch {
      toast.error('Error al cargar empleado')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchEmployee() }, [id])

  const onSave = async (data: unknown) => {
    setSaving(true)
    try {
      await employeesApi.update(Number(id), data)
      toast.success('Empleado actualizado')
      setEditing(false)
      fetchEmployee()
    } catch {
      toast.error('Error al actualizar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-gray-400">Cargando...</div>
  if (!employee) return <div className="p-8 text-gray-400">Empleado no encontrado</div>

  const fullName = `${employee.first_name} ${employee.last_name}${employee.second_last_name ? ' ' + employee.second_last_name : ''}`

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/employees" className="text-gray-400 hover:text-gray-600">
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{fullName}</h1>
          <p className="text-gray-500 text-sm">{employee.position} {employee.department ? `· ${employee.department}` : ''}</p>
        </div>
        <span className={employee.is_active ? 'badge-green' : 'badge-red'}>
          {employee.is_active ? 'Activo' : 'Inactivo'}
        </span>
        {isHR && !editing && (
          <button onClick={() => setEditing(true)} className="btn-secondary">
            <PencilIcon className="w-4 h-4" />
            Editar
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit(onSave)}>
        {/* Personal Info */}
        <div className="card mb-4">
          <h2 className="font-semibold text-gray-800 mb-4">Información Personal</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'RUT', key: 'rut', value: employee.rut, disabled: true },
              { label: 'Nombres', key: 'first_name', value: employee.first_name },
              { label: 'Apellido Paterno', key: 'last_name', value: employee.last_name },
              { label: 'Apellido Materno', key: 'second_last_name', value: employee.second_last_name },
              { label: 'Email', key: 'email', value: employee.email, type: 'email' },
              { label: 'Teléfono', key: 'phone', value: employee.phone },
              { label: 'Fecha Nacimiento', key: 'birth_date', value: employee.birth_date, type: 'date' },
              { label: 'Nacionalidad', key: 'nationality', value: employee.nationality },
              { label: 'Dirección', key: 'address', value: employee.address },
            ].map(({ label, key, value, disabled, type }) => (
              <div key={key}>
                <label className="label">{label}</label>
                {editing && !disabled ? (
                  <input className="input" type={type || 'text'} defaultValue={value || ''} {...register(key)} />
                ) : (
                  <p className="text-sm text-gray-800 py-2">{value || '—'}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Labor Info */}
        <div className="card mb-4">
          <h2 className="font-semibold text-gray-800 mb-4">Información Laboral</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Sueldo Base</label>
              {editing ? (
                <input className="input" type="number" {...register('base_salary')} />
              ) : (
                <p className="text-sm font-semibold text-green-700 py-2">{formatCLP(employee.base_salary)}</p>
              )}
            </div>
            <div>
              <label className="label">Fecha Ingreso</label>
              <p className="text-sm text-gray-800 py-2">{employee.hire_date}</p>
            </div>
            <div>
              <label className="label">Cargo</label>
              {editing ? (
                <input className="input" {...register('position')} />
              ) : (
                <p className="text-sm text-gray-800 py-2">{employee.position}</p>
              )}
            </div>
            <div>
              <label className="label">Departamento</label>
              {editing ? (
                <input className="input" {...register('department')} />
              ) : (
                <p className="text-sm text-gray-800 py-2">{employee.department || '—'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Previsión */}
        <div className="card mb-4">
          <h2 className="font-semibold text-gray-800 mb-4">Previsión Social</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="label">AFP</label>
              {editing ? (
                <select className="input" {...register('afp')}>
                  {['Habitat','Provida','Capital','Cuprum','Planvital','Model','Uno'].map(a =>
                    <option key={a} value={a}>{a}</option>)}
                </select>
              ) : (
                <p className="text-sm text-gray-800 py-2">{employee.afp}</p>
              )}
            </div>
            <div>
              <label className="label">Sistema Salud</label>
              {editing ? (
                <select className="input" {...register('health_system')}>
                  <option value="FONASA">FONASA</option>
                  <option value="ISAPRE">ISAPRE</option>
                </select>
              ) : (
                <p className="text-sm text-gray-800 py-2">{employee.health_system}</p>
              )}
            </div>
            {employee.health_system === 'ISAPRE' && (
              <div>
                <label className="label">Nombre ISAPRE</label>
                {editing ? (
                  <input className="input" {...register('isapre_name')} />
                ) : (
                  <p className="text-sm text-gray-800 py-2">{employee.isapre_name || '—'}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bank */}
        <div className="card mb-4">
          <h2 className="font-semibold text-gray-800 mb-4">Datos Bancarios</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Banco', key: 'bank_name', value: employee.bank_name },
              { label: 'Tipo Cuenta', key: 'bank_account_type', value: employee.bank_account_type },
              { label: 'N° Cuenta', key: 'bank_account_number', value: employee.bank_account_number },
            ].map(({ label, key, value }) => (
              <div key={key}>
                <label className="label">{label}</label>
                {editing ? (
                  <input className="input" {...register(key)} />
                ) : (
                  <p className="text-sm text-gray-800 py-2">{value || '—'}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {editing && (
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => { setEditing(false); reset(employee) }} className="btn-secondary">
              <XMarkIcon className="w-4 h-4" /> Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              <CheckIcon className="w-4 h-4" />
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        )}
      </form>
    </div>
  )
}
