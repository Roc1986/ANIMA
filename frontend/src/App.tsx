import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { SuperAdminRoute } from './components/SuperAdminRoute'
import { Layout } from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Employees from './pages/Employees'
import EmployeeDetail from './pages/EmployeeDetail'
import Payroll from './pages/Payroll'
import Attendance from './pages/Attendance'
import Reports from './pages/Reports'
import LegalUpdates from './pages/LegalUpdates'
import WarningLetters from './pages/WarningLetters'
import Finiquito from './pages/Finiquito'
import CompanySettings from './pages/CompanySettings'
import Vacations from './pages/Vacations'
import Contracts from './pages/Contracts'
import SuperDashboard from './pages/SuperDashboard'
import CompanyList from './pages/CompanyList'
import Landing from './pages/Landing'
import Accounting from './pages/Accounting'
import Calendar from './pages/Calendar'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />

        {/* Protected app routes */}
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/employees/:id" element={<EmployeeDetail />} />
          <Route path="/payroll" element={<Payroll />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/legal" element={<LegalUpdates />} />
          <Route path="/vacations" element={<Vacations />} />
          <Route path="/contracts" element={<Contracts />} />
          <Route path="/warning-letters" element={<WarningLetters />} />
          <Route path="/finiquito" element={<Finiquito />} />
          <Route path="/company-settings" element={<CompanySettings />} />
          <Route path="/super/dashboard" element={<SuperDashboard />} />
          <Route path="/super/companies" element={<CompanyList />} />
          <Route path="/accounting" element={<Accounting />} />
          <Route path="/calendar" element={<Calendar />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
