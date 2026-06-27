import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  HomeIcon,
  UsersIcon,
  CurrencyDollarIcon,
  ClockIcon,
  DocumentTextIcon,
  ScaleIcon,
  ArrowRightOnRectangleIcon,
  ExclamationTriangleIcon,
  DocumentCheckIcon,
  BuildingOfficeIcon,
  SunIcon,
  ClipboardDocumentListIcon,
  GlobeAltIcon,
  BuildingStorefrontIcon,
  CalculatorIcon,
  ChevronDownIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline'

interface NavItem {
  to: string
  label: string
  icon: React.ElementType
}

interface NavGroup {
  label: string
  icon: React.ElementType
  items: NavItem[]
}

const hrNavGroups: NavGroup[] = [
  {
    label: 'Remuneraciones',
    icon: CurrencyDollarIcon,
    items: [
      { to: '/payroll', label: 'Nóminas', icon: CurrencyDollarIcon },
      { to: '/attendance', label: 'Asistencia', icon: ClockIcon },
    ],
  },
  {
    label: 'Control de Personal',
    icon: UsersIcon,
    items: [
      { to: '/employees', label: 'Empleados', icon: UsersIcon },
      { to: '/contracts', label: 'Contratos', icon: ClipboardDocumentListIcon },
      { to: '/vacations', label: 'Vacaciones', icon: SunIcon },
      { to: '/warning-letters', label: 'Amonestaciones', icon: ExclamationTriangleIcon },
      { to: '/finiquito', label: 'Finiquito', icon: DocumentCheckIcon },
    ],
  },
  {
    label: 'Contabilidad',
    icon: CalculatorIcon,
    items: [
      { to: '/accounting', label: 'Asientos Contables', icon: CalculatorIcon },
    ],
  },
  {
    label: 'Reportes',
    icon: DocumentTextIcon,
    items: [
      { to: '/reports', label: 'Reportes', icon: DocumentTextIcon },
    ],
  },
  {
    label: 'Configuración',
    icon: BuildingOfficeIcon,
    items: [
      { to: '/calendar', label: 'Calendario', icon: CalendarDaysIcon },
      { to: '/legal', label: 'IA Legal', icon: ScaleIcon },
      { to: '/company-settings', label: 'Empresa', icon: BuildingOfficeIcon },
    ],
  },
]

const superNavItems: NavItem[] = [
  { to: '/super/dashboard', label: 'Dashboard Global', icon: GlobeAltIcon },
  { to: '/super/companies', label: 'Empresas', icon: BuildingStorefrontIcon },
  { to: '/dashboard', label: 'Dashboard Empresa', icon: HomeIcon },
  { to: '/legal', label: 'IA Legal', icon: ScaleIcon },
]

function NavGroup({ group, defaultOpen }: { group: NavGroup; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const location = useLocation()
  const isGroupActive = group.items.some(i => location.pathname.startsWith(i.to))
  const Icon = group.icon

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
          isGroupActive ? 'text-white' : 'text-blue-300 hover:text-white hover:bg-blue-800'
        }`}
      >
        <Icon className="w-5 h-5 shrink-0" />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="ml-4 mt-1 space-y-1 border-l border-blue-800 pl-3">
          {group.items.map(({ to, label, icon: ItemIcon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-white text-anima-blue'
                    : 'text-blue-200 hover:bg-blue-800 hover:text-white'
                }`
              }
            >
              <ItemIcon className="w-4 h-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

export function Sidebar() {
  const { user, logout, isSuperAdmin, companyName } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <aside className="w-64 h-screen sticky top-0 bg-anima-blue flex flex-col">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-blue-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center">
            <span className="text-anima-blue font-bold text-lg">A</span>
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-tight">ANIMA HR</h1>
            {isSuperAdmin() ? (
              <p className="text-yellow-300 text-xs font-semibold">Super Admin</p>
            ) : (
              <p className="text-blue-300 text-xs truncate">{companyName || 'Sistema de RRHH Chile'}</p>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {/* Dashboard siempre visible */}
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              isActive ? 'bg-white text-anima-blue' : 'text-blue-100 hover:bg-blue-800 hover:text-white'
            }`
          }
        >
          <HomeIcon className="w-5 h-5 shrink-0" />
          Dashboard
        </NavLink>

        {isSuperAdmin() ? (
          superNavItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive ? 'bg-white text-anima-blue' : 'text-blue-100 hover:bg-blue-800 hover:text-white'
                }`
              }
            >
              <Icon className="w-5 h-5 shrink-0" />
              {label}
            </NavLink>
          ))
        ) : (
          hrNavGroups.map(group => (
            <NavGroup
              key={group.label}
              group={group}
              defaultOpen={group.items.some(i => location.pathname.startsWith(i.to))}
            />
          ))
        )}
      </nav>

      {/* User info */}
      <div className="px-4 py-4 border-t border-blue-800 shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isSuperAdmin() ? 'bg-yellow-500' : 'bg-blue-600'}`}>
            <span className="text-white text-sm font-medium">
              {user?.full_name?.charAt(0) || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.full_name}</p>
            <p className="text-blue-300 text-xs capitalize">{user?.role?.replace(/_/g, ' ')}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 text-blue-200 hover:text-white hover:bg-blue-800 rounded-lg text-sm transition-colors"
        >
          <ArrowRightOnRectangleIcon className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
