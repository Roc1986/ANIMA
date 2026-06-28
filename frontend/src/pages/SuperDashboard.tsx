import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { superAdminApi, payrollApi } from '../api/client'
import toast from 'react-hot-toast'
import {
  BuildingStorefrontIcon,
  UsersIcon,
  CurrencyDollarIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'

interface DashboardStats {
  total_companies: number
  active_companies: number
  inactive_companies: number
  total_employees: number
  plan_counts: Record<string, number>
  revenue_estimate_clp: number
}

interface GlobalParam {
  key: string
  value: number
  description: string
  unit: string
  source: string | null
  effective_date: string | null
}

interface Company {
  id: number
  name: string
  rut: string | null
  plan: string
  is_active: boolean
  employee_count: number
  last_payroll_date: string | null
  city: string | null
}

const PLAN_BADGE: Record<string, string> = {
  basic: 'bg-gray-100 text-gray-700',
  pro: 'bg-blue-100 text-blue-700',
  enterprise: 'bg-purple-100 text-purple-700',
}

function formatCLP(value: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(value)
}

const KEY_LABELS: Record<string, string> = {
  IMM: 'Ingreso Mínimo Mensual (IMM)',
  UF: 'Unidad de Fomento (UF)',
  UTM: 'Unidad Tributaria Mensual (UTM)',
  TOPE_IMPONIBLE_AFP_UF: 'Tope Imponible AFP/Salud (UF)',
  TOPE_IMPONIBLE_SALUD_UF: 'Tope Imponible Salud (UF)',
}

const HIGHLIGHT_KEYS = ['IMM', 'UF', 'UTM', 'TOPE_IMPONIBLE_AFP_UF', 'TOPE_IMPONIBLE_SALUD_UF']

interface IuscRow {
  tramo: number
  desde_utm: number
  hasta_utm: number | null
  desde_clp: number
  hasta_clp: number | null
  tasa: number
  tasa_pct: string
  cantidad_rebajar_utm: number
  cantidad_rebajar_clp: number
}

export default function SuperDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [globalParams, setGlobalParams] = useState<GlobalParam[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [editKey, setEditKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [iuscRows, setIuscRows] = useState<IuscRow[]>([])
  const [iuscUtm, setIuscUtm] = useState<number>(70588)
  const [iuscLoading, setIuscLoading] = useState(false)

  const loadParams = () =>
    superAdminApi.listGlobalParams().then(r => setGlobalParams(r.data)).catch(() => {})

  const loadIuscTable = async (utm: number) => {
    setIuscLoading(true)
    try {
      const res = await payrollApi.iuscTable(utm)
      setIuscRows(res.data.tabla)
      setIuscUtm(res.data.utm_value)
    } catch {
      toast.error('Error al cargar tabla IUSC')
    } finally {
      setIuscLoading(false)
    }
  }

  useEffect(() => {
    Promise.all([superAdminApi.dashboard(), superAdminApi.listCompanies(), superAdminApi.listGlobalParams()])
      .then(([statsRes, companiesRes, paramsRes]) => {
        setStats(statsRes.data)
        setCompanies(companiesRes.data)
        const params: GlobalParam[] = paramsRes.data
        setGlobalParams(params)
        const utmParam = params.find(p => p.key === 'UTM')
        const utm = utmParam ? Number(utmParam.value) : 70588
        setIuscUtm(utm)
        loadIuscTable(utm)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSync = async () => {
    setSyncing(true)
    try {
      await superAdminApi.syncIndicators()
      toast.success('UF y UTM sincronizados correctamente')
      await loadParams()
    } catch {
      toast.error('Error al sincronizar indicadores')
    } finally {
      setSyncing(false)
    }
  }

  const handleDeletePayrollData = async (company: Company) => {
    if (!window.confirm(`¿Eliminar TODAS las nóminas de "${company.name}"? Esta acción no se puede deshacer.`)) return
    try {
      const r = await superAdminApi.deletePayrollData(company.id)
      toast.success(r.data.message || 'Nóminas eliminadas')
    } catch {
      toast.error('Error al eliminar nóminas')
    }
  }

  const handleSaveParam = async (key: string) => {
    const val = parseFloat(editValue)
    if (isNaN(val)) return toast.error('Valor inválido')
    try {
      await superAdminApi.updateGlobalParam(key, { value: val })
      toast.success('Parámetro actualizado')
      setEditKey(null)
      await loadParams()
    } catch {
      toast.error('Error al actualizar')
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-gray-200 rounded-xl"></div>)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Global</h1>
        <p className="text-gray-500 text-sm mt-1">Vista general de todas las empresas en la plataforma</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
            <BuildingStorefrontIcon className="w-6 h-6 text-blue-700" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats?.active_companies ?? '—'}</p>
            <p className="text-sm text-gray-500">Empresas Activas</p>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
            <UsersIcon className="w-6 h-6 text-green-700" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats?.total_employees ?? '—'}</p>
            <p className="text-sm text-gray-500">Total Trabajadores</p>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
            <ExclamationCircleIcon className="w-6 h-6 text-red-700" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats?.inactive_companies ?? '—'}</p>
            <p className="text-sm text-gray-500">Empresas Inactivas</p>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center shrink-0">
            <CurrencyDollarIcon className="w-6 h-6 text-yellow-700" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{stats ? formatCLP(stats.revenue_estimate_clp) : '—'}</p>
            <p className="text-sm text-gray-500">Ingresos Estimados</p>
          </div>
        </div>
      </div>

      {/* Plan breakdown */}
      {stats && (
        <div className="card mb-8">
          <h2 className="font-semibold text-gray-800 mb-4">Empresas por Plan</h2>
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(stats.plan_counts).map(([plan, count]) => (
              <div key={plan} className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{count}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${PLAN_BADGE[plan] || 'bg-gray-100 text-gray-700'}`}>
                  {plan}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Global Legal Parameters */}
      <div className="card mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-gray-800">Parámetros Legales Globales</h2>
            <p className="text-xs text-gray-400 mt-0.5">UF y UTM se actualizan automáticamente. IMM requiere actualización manual cuando cambia por ley.</p>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            <ArrowPathIcon className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Sincronizando...' : 'Sincronizar UF / UTM'}
          </button>
        </div>

        {/* Highlight params */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          {globalParams.filter(p => HIGHLIGHT_KEYS.includes(p.key)).map(p => (
            <div key={p.key} className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">{KEY_LABELS[p.key] || p.key}</p>
              <p className="font-bold text-gray-900 text-sm">
                {p.unit === 'CLP'
                  ? new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(p.value)
                  : `${p.value} ${p.unit}`}
              </p>
              {p.effective_date && <p className="text-xs text-gray-400 mt-0.5">{p.effective_date}</p>}
            </div>
          ))}
        </div>

        {/* All params table */}
        <details className="text-sm">
          <summary className="cursor-pointer text-blue-600 hover:text-blue-800 text-xs">Ver / editar todos los parámetros</summary>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 font-medium">Clave</th>
                  <th className="pb-2 font-medium">Descripción</th>
                  <th className="pb-2 font-medium text-right">Valor</th>
                  <th className="pb-2 font-medium w-16 text-right">Unidad</th>
                  <th className="pb-2 font-medium">Fuente</th>
                  <th className="pb-2 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {globalParams.map(p => (
                  <tr key={p.key}>
                    <td className="py-2 font-mono text-xs text-gray-600">{p.key}</td>
                    <td className="py-2 text-gray-700 text-xs">{p.description}</td>
                    <td className="py-2 text-right font-semibold">
                      {editKey === p.key ? (
                        <input
                          type="number"
                          className="input text-right w-28 text-xs py-1"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          autoFocus
                        />
                      ) : p.value}
                    </td>
                    <td className="py-2 text-right text-gray-400 text-xs">{p.unit}</td>
                    <td className="py-2 text-gray-400 text-xs">{p.source || '—'}</td>
                    <td className="py-2 text-right">
                      {editKey === p.key ? (
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => handleSaveParam(p.key)} className="text-xs text-green-600 hover:text-green-800 font-medium">Guardar</button>
                          <button onClick={() => setEditKey(null)} className="text-xs text-gray-400 hover:text-gray-600">Cancelar</button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditKey(p.key); setEditValue(String(p.value)) }} className="text-xs text-blue-500 hover:text-blue-700">Editar</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>

      {/* IUSC Table */}
      <div className="card mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-gray-800">Tabla IUSC — Art. 43 N°1 LIR</h2>
            <p className="text-xs text-gray-400 mt-0.5">Impuesto Único de Segunda Categoría. Se actualiza con el UTM del período.</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600 font-medium">UTM (CLP):</label>
            <input
              type="number"
              value={iuscUtm}
              onChange={e => setIuscUtm(Number(e.target.value))}
              className="input w-28 text-right text-sm py-1"
              step="1"
            />
            <button
              onClick={() => loadIuscTable(iuscUtm)}
              disabled={iuscLoading}
              className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1"
            >
              <ArrowPathIcon className={`w-3.5 h-3.5 ${iuscLoading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-500 text-xs">
                <th className="px-3 py-2 font-medium">Tramo</th>
                <th className="px-3 py-2 font-medium text-right">Desde (UTM)</th>
                <th className="px-3 py-2 font-medium text-right">Hasta (UTM)</th>
                <th className="px-3 py-2 font-medium text-right">Desde (CLP)</th>
                <th className="px-3 py-2 font-medium text-right">Hasta (CLP)</th>
                <th className="px-3 py-2 font-medium text-right">Factor</th>
                <th className="px-3 py-2 font-medium text-right">Rebaja (UTM)</th>
                <th className="px-3 py-2 font-medium text-right">Rebaja (CLP)</th>
                <th className="px-3 py-2 font-medium text-right">Tasa Ef. Máx.</th>
              </tr>
            </thead>
            <tbody>
              {iuscRows.map(row => (
                <tr key={row.tramo} className={`border-t text-sm ${row.tasa === 0 ? 'bg-green-50' : row.tramo % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                  <td className="px-3 py-2 font-medium text-gray-700">{row.tramo}</td>
                  <td className="px-3 py-2 text-right text-gray-500">{row.desde_utm === 0 ? '—' : row.desde_utm.toFixed(1)}</td>
                  <td className="px-3 py-2 text-right text-gray-500">{row.hasta_utm === null ? 'Y más' : row.hasta_utm.toFixed(1)}</td>
                  <td className="px-3 py-2 text-right text-gray-600">{row.desde_clp === 0 ? '—' : formatCLP(row.desde_clp)}</td>
                  <td className="px-3 py-2 text-right text-gray-600">{row.hasta_clp === null ? 'Y más' : formatCLP(row.hasta_clp)}</td>
                  <td className="px-3 py-2 text-right font-semibold text-blue-700">{row.tasa === 0 ? 'Exento' : row.tasa.toFixed(3)}</td>
                  <td className="px-3 py-2 text-right text-gray-500">{row.cantidad_rebajar_utm === 0 ? '—' : row.cantidad_rebajar_utm.toFixed(3)}</td>
                  <td className="px-3 py-2 text-right text-gray-600">{row.cantidad_rebajar_clp === 0 ? '—' : formatCLP(row.cantidad_rebajar_clp)}</td>
                  <td className="px-3 py-2 text-right font-medium text-emerald-700">{row.tasa === 0 ? 'Exento' : row.tasa_pct}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Fórmula: IUSC = (Renta en UTM × Factor − Rebaja en UTM) × UTM · Renta tributable = Imponible − AFP − Salud − Cesantía trabajador
        </p>
      </div>

      {/* Company table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">Todas las Empresas</h2>
          <Link to="/super/companies" className="btn-primary text-xs px-3 py-1.5">
            Gestionar Empresas
          </Link>
        </div>
        <div className="overflow-x-auto">
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
                  <td className="py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="py-3 text-gray-600">{c.rut || '—'}</td>
                  <td className="py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${PLAN_BADGE[c.plan] || ''}`}>
                      {c.plan}
                    </span>
                  </td>
                  <td className="py-3 text-center text-gray-600">{c.employee_count}</td>
                  <td className="py-3 text-gray-600">{c.last_payroll_date || '—'}</td>
                  <td className="py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {c.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="py-3">
                    <button
                      onClick={() => handleDeletePayrollData(c)}
                      className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 font-medium"
                      title="Borrar todas las nóminas de esta empresa"
                    >
                      Borrar nóminas
                    </button>
                  </td>
                </tr>
              ))}
              {companies.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">No hay empresas registradas</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
