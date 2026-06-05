import { useEffect, useState } from 'react'
import { reportsApi, formatCLP, MONTHS } from '../api/client'
import { Link } from 'react-router-dom'
import {
  UsersIcon, CurrencyDollarIcon, BuildingOfficeIcon, ChartBarIcon
} from '@heroicons/react/24/outline'

interface Stats {
  total_empleados_activos: number
  total_empleados: number
  ultima_nomina: {
    id: number
    period_year: number
    period_month: number
    status: string
    total_liquido: number
    total_costo_empresa: number
    num_empleados: number
  } | null
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Borrador', cls: 'badge-gray' },
  calculated: { label: 'Calculada', cls: 'badge-blue' },
  approved: { label: 'Aprobada', cls: 'badge-green' },
  paid: { label: 'Pagada', cls: 'badge-green' },
  cancelled: { label: 'Cancelada', cls: 'badge-red' },
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    reportsApi.dashboardStats()
      .then(r => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>)}
          </div>
        </div>
      </div>
    )
  }

  const nomina = stats?.ultima_nomina
  const statusInfo = nomina ? STATUS_LABELS[nomina.status] || { label: nomina.status, cls: 'badge-gray' } : null

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Resumen del sistema de RRHH y nóminas</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
            <UsersIcon className="w-6 h-6 text-blue-700" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats?.total_empleados_activos ?? '—'}</p>
            <p className="text-sm text-gray-500">Empleados activos</p>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center shrink-0">
            <BuildingOfficeIcon className="w-6 h-6 text-purple-700" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats?.total_empleados ?? '—'}</p>
            <p className="text-sm text-gray-500">Total empleados (histórico)</p>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
            <CurrencyDollarIcon className="w-6 h-6 text-green-700" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {nomina ? formatCLP(nomina.total_liquido) : '—'}
            </p>
            <p className="text-sm text-gray-500">Líquido última nómina</p>
          </div>
        </div>
      </div>

      {/* Last payroll */}
      {nomina && (
        <div className="card mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-800">Última Nómina</h2>
              <p className="text-sm text-gray-500">
                {MONTHS[nomina.period_month - 1]} {nomina.period_year}
              </p>
            </div>
            {statusInfo && <span className={statusInfo.cls}>{statusInfo.label}</span>}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-lg font-bold text-gray-900">{nomina.num_empleados}</p>
              <p className="text-xs text-gray-500">Empleados</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-lg font-bold text-blue-900">{formatCLP(nomina.total_liquido)}</p>
              <p className="text-xs text-gray-500">Total Líquido</p>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <p className="text-lg font-bold text-orange-700">{formatCLP(nomina.total_costo_empresa)}</p>
              <p className="text-xs text-gray-500">Costo Empresa</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-lg font-bold text-green-700">
                {formatCLP(nomina.total_costo_empresa - nomina.total_liquido)}
              </p>
              <p className="text-xs text-gray-500">Aportes Empleador</p>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Link to="/payroll" className="btn-primary text-xs px-3 py-1.5">
              Ver Nóminas
            </Link>
            <Link to="/reports" className="btn-secondary text-xs px-3 py-1.5">
              Generar Reportes
            </Link>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { to: '/employees', label: 'Empleados', desc: 'Gestionar personal', icon: UsersIcon, color: 'blue' },
          { to: '/payroll', label: 'Nóminas', desc: 'Calcular liquidaciones', icon: CurrencyDollarIcon, color: 'green' },
          { to: '/attendance', label: 'Asistencia', desc: 'Registrar asistencia', icon: ChartBarIcon, color: 'purple' },
          { to: '/legal', label: 'IA Legal', desc: 'Actualizar parámetros', icon: BuildingOfficeIcon, color: 'orange' },
        ].map(({ to, label, desc, icon: Icon, color }) => (
          <Link
            key={to}
            to={to}
            className={`card flex flex-col gap-2 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-${color}-500`}
          >
            <Icon className={`w-6 h-6 text-${color}-600`} />
            <div>
              <p className="font-semibold text-gray-800 text-sm">{label}</p>
              <p className="text-xs text-gray-500">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
