import { useEffect, useState } from 'react'
import { reportsApi, aiLegalApi, formatCLP, MONTHS } from '../api/client'
import { Link } from 'react-router-dom'
import { UsersIcon, CurrencyDollarIcon, BuildingOfficeIcon, ChartBarIcon } from '@heroicons/react/24/outline'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

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

interface LegalParam {
  key: string
  value: number
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Borrador', cls: 'badge-gray' },
  calculated: { label: 'Calculada', cls: 'badge-blue' },
  approved: { label: 'Aprobada', cls: 'badge-green' },
  paid: { label: 'Pagada', cls: 'badge-green' },
  cancelled: { label: 'Cancelada', cls: 'badge-red' },
}

const PIE_COLORS = ['#1e3a5f', '#dc2626', '#16a34a', '#9333ea', '#0891b2']

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [params, setParams] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 8000) // safety timeout
    Promise.allSettled([
      reportsApi.dashboardStats(),
      aiLegalApi.getParameters(),
    ]).then(([statsRes, paramsRes]) => {
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data)
      if (paramsRes.status === 'fulfilled') {
        const map: Record<string, number> = {}
        ;(paramsRes.value.data as LegalParam[]).forEach(p => { map[p.key] = Number(p.value) })
        setParams(map)
      }
    }).finally(() => { clearTimeout(timeout); setLoading(false) })
    return () => clearTimeout(timeout)
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

  // Derived payroll figures from last nomina
  const totalLiquido = nomina?.total_liquido ?? 0
  const totalCosto = nomina?.total_costo_empresa ?? 0
  const aporteEmpleador = totalCosto - totalLiquido

  // Estimate breakdown (we don't have the split per category from the stats endpoint,
  // so we show what we do have plus employer contributions as one bucket)
  const pieData = nomina ? [
    { name: 'Líquido trabajadores', value: Math.round(totalLiquido) },
    { name: 'Aportes empleador', value: Math.round(aporteEmpleador) },
  ] : []

  // Legal params
  const imm = params['IMM_VALUE'] ?? params['IMM'] ?? 500000
  const uf = params['UF_VALUE'] ?? params['UF'] ?? 38500
  const utm = params['UTM_VALUE'] ?? params['UTM'] ?? 67294
  const topeAfp = params['TOPE_IMPONIBLE_AFP_UF'] ?? params['TOPE_AFP_UF'] ?? 81.6
  const topeAfc = params['TOPE_IMPONIBLE_AFC_UF'] ?? params['TOPE_AFC_UF'] ?? 126.6

  const indicators = [
    { label: 'Ingreso Mínimo Mensual (IMM)', value: formatCLP(imm), unit: 'CLP' },
    { label: 'Valor Unidad de Fomento (UF)', value: formatCLP(uf), unit: 'CLP' },
    { label: 'Tope Imponible AFP/Salud', value: topeAfp.toString(), unit: 'UF' },
    { label: 'Tope Imponible AFC', value: topeAfc.toString(), unit: 'UF' },
    { label: 'Valor Unidad Tributaria Mensual (UTM)', value: formatCLP(utm), unit: 'CLP' },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Resumen del sistema de RRHH y nóminas</p>
      </div>

      {/* Top KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
            <UsersIcon className="w-5 h-5 text-blue-700" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats?.total_empleados_activos ?? '—'}</p>
            <p className="text-xs text-gray-500">Dotación Activa</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
            <CurrencyDollarIcon className="w-5 h-5 text-green-700" />
          </div>
          <div>
            <p className="text-xl font-bold text-green-700">{nomina ? formatCLP(totalLiquido) : '—'}</p>
            <p className="text-xs text-gray-500">Total Líquidos Pagados</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
            <ChartBarIcon className="w-5 h-5 text-orange-700" />
          </div>
          <div>
            <p className="text-xl font-bold text-orange-700">{nomina ? formatCLP(totalCosto) : '—'}</p>
            <p className="text-xs text-gray-500">Total Haberes General</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center shrink-0">
            <BuildingOfficeIcon className="w-5 h-5 text-purple-700" />
          </div>
          <div>
            <p className="text-xl font-bold text-purple-700">{nomina ? formatCLP(aporteEmpleador) : '—'}</p>
            <p className="text-xs text-gray-500">Aportes Empleador</p>
          </div>
        </div>
      </div>

      {/* Main content: indicators + chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">

        {/* Indicadores previsionales */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4 text-sm uppercase tracking-wide">
            Indicadores / Parámetros Previsionales
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left pb-2 text-gray-500 font-medium">Indicador</th>
                <th className="text-right pb-2 text-gray-500 font-medium">Valor</th>
                <th className="text-right pb-2 text-gray-500 font-medium w-16">Unidad</th>
              </tr>
            </thead>
            <tbody>
              {indicators.map(({ label, value, unit }) => (
                <tr key={label} className="border-b border-gray-50 last:border-0">
                  <td className="py-2.5 text-gray-700">{label}</td>
                  <td className="py-2.5 text-right font-semibold text-gray-900">{value}</td>
                  <td className="py-2.5 text-right text-gray-400 text-xs">{unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-400 mt-3">
            Valores configurados en <Link to="/legal" className="text-blue-600 hover:underline">IA Legal → Parámetros</Link>
          </p>
        </div>

        {/* Resumen ejecutivo + gráfico */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4 text-sm uppercase tracking-wide">
            {nomina
              ? `Resumen Ejecutivo — ${MONTHS[nomina.period_month - 1]} ${nomina.period_year}`
              : 'Resumen Ejecutivo del Mes'}
          </h2>
          {nomina ? (
            <>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Total Líquidos Pagados</p>
                  <p className="text-lg font-bold text-blue-800">{formatCLP(totalLiquido)}</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Total Haberes General</p>
                  <p className="text-lg font-bold text-orange-700">{formatCLP(totalCosto)}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Aportes Empleador</p>
                  <p className="text-lg font-bold text-purple-700">{formatCLP(aporteEmpleador)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Dotación Activa</p>
                  <p className="text-lg font-bold text-gray-800">{nomina.num_empleados} <span className="text-xs font-normal text-gray-400">pers.</span></p>
                </div>
              </div>
              {/* Pie chart */}
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={65} dataKey="value">
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCLP(v)} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <p className="text-sm">Sin nóminas calculadas aún</p>
              <Link to="/payroll" className="btn-primary text-xs mt-3 inline-flex">Crear primera nómina</Link>
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { to: '/employees', label: 'Empleados', desc: 'Gestionar personal', icon: UsersIcon, color: 'blue' },
          { to: '/payroll', label: 'Nóminas', desc: 'Calcular liquidaciones', icon: CurrencyDollarIcon, color: 'green' },
          { to: '/reports', label: 'Reportes', desc: 'PDF, Excel, CSV SII', icon: ChartBarIcon, color: 'purple' },
          { to: '/legal', label: 'IA Legal', desc: 'Parámetros legales', icon: BuildingOfficeIcon, color: 'orange' },
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
