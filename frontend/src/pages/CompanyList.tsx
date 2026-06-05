import { useEffect, useState } from 'react'
import { superAdminApi } from '../api/client'
import {
  PlusIcon,
  PencilSquareIcon,
  XCircleIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline'

interface Company {
  id: number
  name: string
  rut: string | null
  address: string | null
  city: string | null
  phone: string | null
  email: string | null
  plan: string
  max_employees: number
  is_active: boolean
  owner_name: string | null
  owner_phone: string | null
  employee_count: number
  last_payroll_date: string | null
}

const PLAN_OPTIONS = ['basic', 'pro', 'enterprise']

const PLAN_BADGE: Record<string, string> = {
  basic: 'bg-gray-100 text-gray-700',
  pro: 'bg-blue-100 text-blue-700',
  enterprise: 'bg-purple-100 text-purple-700',
}

const emptyCompanyForm = {
  name: '',
  rut: '',
  address: '',
  city: '',
  phone: '',
  email: '',
  plan: 'basic',
  max_employees: 50,
  owner_name: '',
  owner_phone: '',
}

const emptyAdminForm = { email: '', password: '', full_name: '' }

export default function CompanyList() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [showCompanyModal, setShowCompanyModal] = useState(false)
  const [editCompany, setEditCompany] = useState<Company | null>(null)
  const [companyForm, setCompanyForm] = useState({ ...emptyCompanyForm })
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [adminTargetId, setAdminTargetId] = useState<number | null>(null)
  const [adminForm, setAdminForm] = useState({ ...emptyAdminForm })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    superAdminApi.listCompanies()
      .then(r => setCompanies(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openCreateModal = () => {
    setEditCompany(null)
    setCompanyForm({ ...emptyCompanyForm })
    setError(null)
    setShowCompanyModal(true)
  }

  const openEditModal = (c: Company) => {
    setEditCompany(c)
    setCompanyForm({
      name: c.name,
      rut: c.rut || '',
      address: c.address || '',
      city: c.city || '',
      phone: c.phone || '',
      email: c.email || '',
      plan: c.plan,
      max_employees: c.max_employees,
      owner_name: c.owner_name || '',
      owner_phone: c.owner_phone || '',
    })
    setError(null)
    setShowCompanyModal(true)
  }

  const saveCompany = async () => {
    setSaving(true)
    setError(null)
    try {
      if (editCompany) {
        await superAdminApi.updateCompany(editCompany.id, companyForm)
      } else {
        await superAdminApi.createCompany(companyForm)
      }
      setShowCompanyModal(false)
      load()
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const deactivate = async (id: number) => {
    if (!confirm('¿Desactivar esta empresa?')) return
    await superAdminApi.deactivateCompany(id)
    load()
  }

  const openAdminModal = (companyId: number) => {
    setAdminTargetId(companyId)
    setAdminForm({ ...emptyAdminForm })
    setError(null)
    setShowAdminModal(true)
  }

  const saveAdmin = async () => {
    if (!adminTargetId) return
    setSaving(true)
    setError(null)
    try {
      await superAdminApi.createCompanyAdmin(adminTargetId, adminForm)
      setShowAdminModal(false)
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Error al crear administrador')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Empresas</h1>
          <p className="text-gray-500 text-sm mt-1">Administra todas las empresas de la plataforma</p>
        </div>
        <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-4 h-4" /> Crear Empresa
        </button>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-200 rounded-xl" />)}
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-3 font-medium">Empresa</th>
                <th className="pb-3 font-medium">RUT</th>
                <th className="pb-3 font-medium">Plan</th>
                <th className="pb-3 font-medium text-center">Empleados</th>
                <th className="pb-3 font-medium">Última Nómina</th>
                <th className="pb-3 font-medium">Estado</th>
                <th className="pb-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {companies.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="py-3">
                    <p className="font-medium text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.city || ''}</p>
                  </td>
                  <td className="py-3 text-gray-600">{c.rut || '—'}</td>
                  <td className="py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${PLAN_BADGE[c.plan] || ''}`}>
                      {c.plan}
                    </span>
                  </td>
                  <td className="py-3 text-center text-gray-600">
                    {c.employee_count} / {c.max_employees}
                  </td>
                  <td className="py-3 text-gray-600">{c.last_payroll_date || '—'}</td>
                  <td className="py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {c.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(c)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                        title="Editar"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openAdminModal(c.id)}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                        title="Crear Administrador"
                      >
                        <UserPlusIcon className="w-4 h-4" />
                      </button>
                      {c.is_active && (
                        <button
                          onClick={() => deactivate(c.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                          title="Desactivar"
                        >
                          <XCircleIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {companies.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-gray-400">
                    No hay empresas registradas. Crea la primera.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Company Modal */}
      {showCompanyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-lg font-bold text-gray-900">
                {editCompany ? 'Editar Empresa' : 'Nueva Empresa'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
              {[
                { label: 'Nombre *', key: 'name', type: 'text' },
                { label: 'RUT Empresa', key: 'rut', type: 'text' },
                { label: 'Dirección', key: 'address', type: 'text' },
                { label: 'Ciudad', key: 'city', type: 'text' },
                { label: 'Teléfono', key: 'phone', type: 'text' },
                { label: 'Email', key: 'email', type: 'email' },
                { label: 'Nombre Contacto', key: 'owner_name', type: 'text' },
                { label: 'Teléfono Contacto', key: 'owner_phone', type: 'text' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input
                    type={type}
                    className="input w-full"
                    value={(companyForm as any)[key]}
                    onChange={e => setCompanyForm(f => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                <select
                  className="input w-full"
                  value={companyForm.plan}
                  onChange={e => setCompanyForm(f => ({ ...f, plan: e.target.value }))}
                >
                  {PLAN_OPTIONS.map(p => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Máx. Empleados</label>
                <input
                  type="number"
                  className="input w-full"
                  value={companyForm.max_employees}
                  onChange={e => setCompanyForm(f => ({ ...f, max_employees: parseInt(e.target.value) || 50 }))}
                />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button onClick={() => setShowCompanyModal(false)} className="btn-secondary">Cancelar</button>
              <button onClick={saveCompany} disabled={saving} className="btn-primary">
                {saving ? 'Guardando...' : (editCompany ? 'Actualizar' : 'Crear Empresa')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-lg font-bold text-gray-900">Crear Administrador de Empresa</h2>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
                <input
                  type="text"
                  className="input w-full"
                  value={adminForm.full_name}
                  onChange={e => setAdminForm(f => ({ ...f, full_name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  className="input w-full"
                  value={adminForm.email}
                  onChange={e => setAdminForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña temporal</label>
                <input
                  type="password"
                  className="input w-full"
                  value={adminForm.password}
                  onChange={e => setAdminForm(f => ({ ...f, password: e.target.value }))}
                />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button onClick={() => setShowAdminModal(false)} className="btn-secondary">Cancelar</button>
              <button onClick={saveAdmin} disabled={saving} className="btn-primary">
                {saving ? 'Creando...' : 'Crear Administrador'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
