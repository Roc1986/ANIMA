import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

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
  listUsers: () => api.get('/api/auth/users'),
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
  getLiquidacionPdf: (runId: number, entryId: number) =>
    api.get(`/api/payroll/${runId}/entry/${entryId}/pdf`, { responseType: 'blob' }),
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
