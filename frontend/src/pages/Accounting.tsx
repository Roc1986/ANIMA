import { useState, useEffect } from 'react'
import api from '../services/api'

interface Account {
  id: number
  company_id: number
  code: string
  name: string
  account_type: string
  is_active: boolean
  created_at: string
}

interface JournalEntryLine {
  id: number
  journal_entry_id: number
  account_id: number
  glosa: string | null
  debe: number
  haber: number
  account: Account | null
}

interface JournalEntry {
  id: number
  company_id: number
  payroll_run_id: number | null
  entry_type: string
  period_year: number
  period_month: number
  description: string | null
  created_at: string
  created_by: number | null
  lines: JournalEntryLine[]
}

interface PayrollRun {
  id: number
  period_year: number
  period_month: number
  status: string
}

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  activo: 'Activo',
  pasivo: 'Pasivo',
  patrimonio: 'Patrimonio',
  ingreso: 'Ingreso',
  gasto: 'Gasto',
}

const ENTRY_TYPE_LABELS: Record<string, string> = {
  provision: 'Provisión',
  pago_cotizaciones: 'Pago Cotizaciones',
}

export default function Accounting() {
  const [activeTab, setActiveTab] = useState<'accounts' | 'journal'>('accounts')
  const [accounts, setAccounts] = useState<Account[]>([])
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([])
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null)
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editCode, setEditCode] = useState('')
  const [editName, setEditName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedRunId, setSelectedRunId] = useState<string>('')
  const [generating, setGenerating] = useState<string | null>(null)

  const loadAccounts = async () => {
    try {
      setLoading(true)
      const res = await api.get('/accounting/accounts')
      setAccounts(res.data)
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Error al cargar cuentas')
    } finally {
      setLoading(false)
    }
  }

  const loadJournal = async () => {
    try {
      setLoading(true)
      const res = await api.get('/accounting/journal')
      setJournalEntries(res.data)
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Error al cargar asientos')
    } finally {
      setLoading(false)
    }
  }

  const loadPayrollRuns = async () => {
    try {
      const res = await api.get('/payroll/')
      setPayrollRuns(res.data.filter((r: PayrollRun) => r.status === 'approved'))
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (activeTab === 'accounts') {
      loadAccounts()
    } else {
      loadJournal()
      loadPayrollRuns()
    }
    setError(null)
    setSelectedEntry(null)
  }, [activeTab])

  const startEdit = (account: Account) => {
    setEditingId(account.id)
    setEditCode(account.code)
    setEditName(account.name)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditCode('')
    setEditName('')
  }

  const saveEdit = async (id: number) => {
    try {
      await api.put(`/accounting/accounts/${id}`, { code: editCode, name: editName })
      setEditingId(null)
      await loadAccounts()
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Error al guardar cuenta')
    }
  }

  const loadEntryDetail = async (entry: JournalEntry) => {
    try {
      const res = await api.get(`/accounting/journal/${entry.id}`)
      setSelectedEntry(res.data)
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Error al cargar asiento')
    }
  }

  const generateProvision = async () => {
    if (!selectedRunId) return
    setGenerating('provision')
    setError(null)
    try {
      await api.post(`/accounting/journal/provision/${selectedRunId}`)
      await loadJournal()
      setSelectedRunId('')
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Error al generar asiento de provisión')
    } finally {
      setGenerating(null)
    }
  }

  const generatePagoCotizaciones = async () => {
    if (!selectedRunId) return
    setGenerating('pago')
    setError(null)
    try {
      await api.post(`/accounting/journal/pago-cotizaciones/${selectedRunId}`)
      await loadJournal()
      setSelectedRunId('')
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Error al generar asiento de pago cotizaciones')
    } finally {
      setGenerating(null)
    }
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Contabilidad</h1>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('accounts')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'accounts'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Plan de Cuentas
        </button>
        <button
          onClick={() => setActiveTab('journal')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'journal'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Asientos Contables
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Plan de Cuentas Tab */}
      {activeTab === 'accounts' && (
        <div>
          {loading ? (
            <p className="text-gray-500">Cargando cuentas...</p>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Código</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Nombre</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Tipo</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {accounts.map((account) => (
                    <tr key={account.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        {editingId === account.id ? (
                          <input
                            value={editCode}
                            onChange={(e) => setEditCode(e.target.value)}
                            className="border border-gray-300 rounded px-2 py-1 text-sm w-28"
                          />
                        ) : (
                          <span className="font-mono text-gray-800">{account.code}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {editingId === account.id ? (
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="border border-gray-300 rounded px-2 py-1 text-sm w-64"
                          />
                        ) : (
                          <span className="text-gray-800">{account.name}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          account.account_type === 'activo' ? 'bg-blue-100 text-blue-700' :
                          account.account_type === 'pasivo' ? 'bg-yellow-100 text-yellow-700' :
                          account.account_type === 'gasto' ? 'bg-red-100 text-red-700' :
                          account.account_type === 'ingreso' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {ACCOUNT_TYPE_LABELS[account.account_type] || account.account_type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {editingId === account.id ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveEdit(account.id)}
                              className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                            >
                              Guardar
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(account)}
                            className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200"
                          >
                            Editar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Asientos Contables Tab */}
      {activeTab === 'journal' && (
        <div className="space-y-6">
          {/* Generate buttons */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h2 className="font-semibold text-gray-700 mb-3">Generar Asientos</h2>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Nómina aprobada
                </label>
                <select
                  value={selectedRunId}
                  onChange={(e) => setSelectedRunId(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-1.5 text-sm w-56"
                >
                  <option value="">Seleccionar nómina...</option>
                  {payrollRuns.map((run) => (
                    <option key={run.id} value={run.id}>
                      {MONTHS[run.period_month - 1]} {run.period_year}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={generateProvision}
                disabled={!selectedRunId || generating !== null}
                className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating === 'provision' ? 'Generando...' : 'Generar Asiento Provisión'}
              </button>
              <button
                onClick={generatePagoCotizaciones}
                disabled={!selectedRunId || generating !== null}
                className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating === 'pago' ? 'Generando...' : 'Generar Pago Cotizaciones'}
              </button>
            </div>
          </div>

          {/* Journal list */}
          {loading ? (
            <p className="text-gray-500">Cargando asientos...</p>
          ) : (
            <div className="flex gap-4">
              {/* Left: list */}
              <div className="w-96 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden shrink-0">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                  <h3 className="font-semibold text-gray-700 text-sm">Asientos ({journalEntries.length})</h3>
                </div>
                {journalEntries.length === 0 ? (
                  <p className="p-4 text-sm text-gray-400">No hay asientos registrados.</p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {journalEntries.map((entry) => (
                      <li
                        key={entry.id}
                        onClick={() => loadEntryDetail(entry)}
                        className={`px-4 py-3 cursor-pointer hover:bg-gray-50 ${selectedEntry?.id === entry.id ? 'bg-blue-50 border-l-2 border-blue-500' : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            entry.entry_type === 'provision' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'
                          }`}>
                            {ENTRY_TYPE_LABELS[entry.entry_type] || entry.entry_type}
                          </span>
                          <span className="text-xs text-gray-400">
                            {MONTHS[entry.period_month - 1]} {entry.period_year}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1 truncate">{entry.description}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(entry.created_at).toLocaleDateString('es-CL')}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Right: detail */}
              {selectedEntry && (
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-semibold text-gray-700">{selectedEntry.description}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {ENTRY_TYPE_LABELS[selectedEntry.entry_type]} &middot; {MONTHS[selectedEntry.period_month - 1]} {selectedEntry.period_year} &middot; {new Date(selectedEntry.created_at).toLocaleDateString('es-CL')}
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-gray-600">Código</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-600">Cuenta</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-600">Glosa</th>
                          <th className="px-3 py-2 text-right font-semibold text-gray-600">Debe</th>
                          <th className="px-3 py-2 text-right font-semibold text-gray-600">Haber</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {selectedEntry.lines.map((line) => (
                          <tr key={line.id}>
                            <td className="px-3 py-2 font-mono text-gray-600 text-xs">{line.account?.code}</td>
                            <td className="px-3 py-2 text-gray-800">{line.account?.name}</td>
                            <td className="px-3 py-2 text-gray-600">{line.glosa}</td>
                            <td className="px-3 py-2 text-right text-gray-800">
                              {Number(line.debe) > 0 ? fmt(Number(line.debe)) : ''}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-800">
                              {Number(line.haber) > 0 ? fmt(Number(line.haber)) : ''}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 border-t-2 border-gray-200 font-semibold">
                        <tr>
                          <td colSpan={3} className="px-3 py-2 text-gray-700">Totales</td>
                          <td className="px-3 py-2 text-right text-gray-900">
                            {fmt(selectedEntry.lines.reduce((s, l) => s + Number(l.debe), 0))}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-900">
                            {fmt(selectedEntry.lines.reduce((s, l) => s + Number(l.haber), 0))}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
