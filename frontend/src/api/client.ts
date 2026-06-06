import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || ''

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Attach token from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 - redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// --- Auth ---
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }),
  me: () => api.get('/api/auth/me'),
  seedAdmin: () => api.post('/api/auth/seed-admin'),
  seedSuperAdmin: () => api.post('/api/auth/seed-superadmin'),
  listUsers: () => api.get('/api/auth/users'),
}

// --- Super Admin ---
export const superAdminApi = {
  dashboard: () => api.get('/api/super/dashboard'),
  listCompanies: () => api.get('/api/super/companies'),
  createCompany: (data: unknown) => api.post('/api/super/companies', data),
  updateCompany: (id: number, data: unknown) => api.put(`/api/super/companies/${id}`, data),
  deactivateCompany: (id: number) => api.delete(`/api/super/companies/${id}`),
  companyStats: (id: number) => api.get(`/api/super/companies/${id}/stats`),
  createCompanyAdmin: (companyId: number, data: unknown) =>
    api.post(`/api/super/companies/${companyId}/admin`, data),
}

// --- Employees ---
export const employeesApi = {
  list: (params?: Record<string, unknown>) =>
    api.get('/api/employees/', { params }),
  get: (id: number) => api.get(`/api/employees/${id}`),
  create: (data: unknown) => api.post('/api/employees/', data),
  update: (id: number, data: unknown) => api.put(`/api/employees/${id}`, data),
  deactivate: (id: number) => api.delete(`/api/employees/${id}`),
  contracts: (id: number) => api.get(`/api/employees/${id}/contracts`),
}

// --- Payroll ---
export const payrollApi = {
  list: () => api.get('/api/payroll/'),
  create: (data: unknown) => api.post('/api/payroll/', data),
  get: (id: number) => api.get(`/api/payroll/${id}`),
  calculate: (id: number) => api.post(`/api/payroll/${id}/calculate`),
  addEntry: (id: number, data: unknown) => api.post(`/api/payroll/${id}/entry`, data),
  approve: (id: number) => api.post(`/api/payroll/${id}/approve`),
  reopen: (id: number) => api.post(`/api/payroll/${id}/reopen`),
  getLiquidacionPdf: (runId: number, entryId: number) =>
    api.get(`/api/payroll/${runId}/entry/${entryId}/pdf`, { responseType: 'blob' }),
  reverseCalculate: (data: {
    liquido_deseado: number
    afp: string
    health_system: string
    contract_type: string
    isapre_monthly_amount: number
  }) => api.post('/api/payroll/reverse-calculate', data),
}

// --- Attendance ---
export const attendanceApi = {
  list: (params?: Record<string, unknown>) =>
    api.get('/api/attendance/', { params }),
  create: (data: unknown) => api.post('/api/attendance/', data),
  bulkCreate: (records: unknown[]) =>
    api.post('/api/attendance/bulk', { records }),
  update: (id: number, data: unknown) => api.put(`/api/attendance/${id}`, data),
  delete: (id: number) => api.delete(`/api/attendance/${id}`),
  summary: (employeeId: number, year: number, month: number) =>
    api.get(`/api/attendance/summary/${employeeId}`, { params: { year, month } }),
}

// --- Documents ---
export const documentsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get('/api/documents/', { params }),
  download: (id: number) =>
    api.get(`/api/documents/${id}/download`, { responseType: 'blob' }),
  delete: (id: number) => api.delete(`/api/documents/${id}`),
}

// --- Reports ---
export const reportsApi = {
  dashboardStats: () => api.get('/api/reports/dashboard/stats'),
  libroPdf: (runId: number) =>
    api.get(`/api/reports/libro-remuneraciones/${runId}/pdf`, { responseType: 'blob' }),
  previredExcel: (runId: number) =>
    api.get(`/api/reports/previred/${runId}/excel`, { responseType: 'blob' }),
  previredTxt: (runId: number) =>
    api.get(`/api/reports/previred/${runId}/txt`, { responseType: 'blob' }),
  dj1887Excel: (year: number) =>
    api.get(`/api/reports/dj1887/${year}/excel`, { responseType: 'blob' }),
}

// --- AI Legal ---
export const aiLegalApi = {
  getParameters: () => api.get('/api/ai-legal/parameters'),
  seedParameters: () => api.post('/api/ai-legal/parameters/seed'),
  updateParameter: (key: string, data: unknown) =>
    api.put(`/api/ai-legal/parameters/${key}`, data),
  analyze: (query: string) =>
    api.post('/api/ai-legal/analyze', null, { params: { query } }),
  getAuditLog: () => api.get('/api/ai-legal/audit-log'),
  getLegalSummary: () => api.get('/api/ai-legal/analyze', { params: { query: 'resumen cambios 2024-2025' } }),
}

// --- Warning Letters ---
export const warningLettersApi = {
  list: (params?: Record<string, unknown>) =>
    api.get('/api/warning-letters/', { params }),
  get: (id: number) => api.get(`/api/warning-letters/${id}`),
  create: (data: unknown) => api.post('/api/warning-letters/', data),
  delete: (id: number) => api.delete(`/api/warning-letters/${id}`),
  downloadPdf: (id: number) =>
    api.get(`/api/warning-letters/${id}/pdf`, { responseType: 'blob' }),
}

// --- Finiquito ---
export const finiquitoApi = {
  calculate: (data: unknown) => api.post('/api/finiquito/calculate', data),
  generatePdf: (data: unknown) =>
    api.post('/api/finiquito/generate-pdf', data, { responseType: 'blob' }),
}

// --- Company ---
export const companyApi = {
  get: () => api.get('/api/company/'),
  update: (data: unknown) => api.put('/api/company/', data),
  uploadLogo: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/api/company/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  getLogo: () => api.get('/api/company/logo', { responseType: 'blob' }),
}

// --- Vacations ---
export const vacationsApi = {
  list: () => api.get('/api/vacations/'),
  getEmployee: (employeeId: number) => api.get(`/api/vacations/${employeeId}`),
  getBalance: (employeeId: number) => api.get(`/api/vacations/${employeeId}/balance`),
  listRequests: (params?: Record<string, unknown>) => api.get('/api/vacations/requests', { params }),
  createRequest: (data: unknown) => api.post('/api/vacations/requests', data),
  approveRequest: (id: number, data?: unknown) => api.put(`/api/vacations/requests/${id}/approve`, data || {}),
  rejectRequest: (id: number, data: unknown) => api.put(`/api/vacations/requests/${id}/reject`, data),
  getCertificatePdf: (employeeId: number) =>
    api.get(`/api/vacations/${employeeId}/pdf`, { responseType: 'blob' }),
}

// --- Contracts ---
export const contractsApi = {
  list: (params?: Record<string, unknown>) => api.get('/api/contracts/', { params }),
  get: (id: number) => api.get(`/api/contracts/${id}`),
  create: (data: unknown) => api.post('/api/contracts/', data),
  update: (id: number, data: unknown) => api.put(`/api/contracts/${id}`, data),
  delete: (id: number) => api.delete(`/api/contracts/${id}`),
  downloadPdf: (id: number) =>
    api.get(`/api/contracts/${id}/pdf`, { responseType: 'blob' }),
  expiringSoon: (days?: number) =>
    api.get('/api/contracts/expiring-soon', { params: { days: days ?? 30 } }),
}

// Helper to download blob
export function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  window.URL.revokeObjectURL(url)
}

// Format CLP
export function formatCLP(value: number | string): string {
  const n = typeof value === 'string' ? parseFloat(value) : value
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(n)
}

export const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]
