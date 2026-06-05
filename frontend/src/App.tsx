import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
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

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="employees" element={<Employees />} />
          <Route path="employees/:id" element={<EmployeeDetail />} />
          <Route path="payroll" element={<Payroll />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="reports" element={<Reports />} />
          <Route path="legal" element={<LegalUpdates />} />
          <Route path="vacations" element={<Vacations />} />
          <Route path="contracts" element={<Contracts />} />
          <Route path="warning-letters" element={<WarningLetters />} />
          <Route path="finiquito" element={<Finiquito />} />
          <Route path="company-settings" element={<CompanySettings />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  )
}
