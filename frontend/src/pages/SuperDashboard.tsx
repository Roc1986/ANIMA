import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { superAdminApi } from '../api/client'
import {
  BuildingStorefrontIcon,
  UsersIcon,
  CurrencyDollarIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline'

interface DashboardStats {
  total_companies: number
  active_companies: number
  inactive_companies: number
  total_employees: number
  plan_counts: Record<string, number>
  revenue_estimate_clp: number
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

export default function SuperDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([superAdminApi.dashboard(), superAdminApi.listCompanies()])
      .then(([statsRes, companiesRes]) => {
        setStats(statsRes.data)
        setCompanies(companiesRes.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

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
                </tr>
              ))}
              {companies.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">No hay empresas registradas</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
