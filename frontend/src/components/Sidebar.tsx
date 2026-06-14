import { NavLink, useNavigate } from 'react-router-dom'
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
} from '@heroicons/react/24/outline'

const hrNavItems = [
  { to: '/dashboard', label: 'Dashboard', icon: HomeIcon },
  { to: '/employees', label: 'Empleados', icon: UsersIcon },
  { to: '/payroll', label: 'Remuneraciones', icon: CurrencyDollarIcon },
  { to: '/attendance', label: 'Asistencia', icon: ClockIcon },
  { to: '/vacations', label: 'Vacaciones', icon: SunIcon },
  { to: '/contracts', label: 'Contratos', icon: ClipboardDocumentListIcon },
  { to: '/reports', label: 'Reportes', icon: DocumentTextIcon },
  { to: '/warning-letters', label: 'Amonestaciones', icon: ExclamationTriangleIcon },
  { to: '/finiquito', label: 'Finiquito', icon: DocumentCheckIcon },
  { to: '/legal', label: 'IA Legal', icon: ScaleIcon },
  { to: '/company-settings', label: 'Empresa', icon: BuildingOfficeIcon },
]

const superNavItems = [
  { to: '/super/dashboard', label: 'Dashboard Global', icon: GlobeAltIcon },
  { to: '/super/companies', label: 'Empresas', icon: BuildingStorefrontIcon },
  { to: '/dashboard', label: 'Dashboard Empresa', icon: HomeIcon },
  { to: '/legal', label: 'IA Legal', icon: ScaleIcon },
]

export function Sidebar() {
  const { user, logout, isSuperAdmin, companyName } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navItems = isSuperAdmin() ? superNavItems : hrNavItems

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
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-white text-anima-blue'
                  : 'text-blue-100 hover:bg-blue-800 hover:text-white'
              }`
            }
          >
            <Icon className="w-5 h-5 shrink-0" />
            {label}
          </NavLink>
        ))}
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
