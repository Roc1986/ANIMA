import { useState, useEffect } from 'react'
import { accountingApi, payrollApi, formatCLP } from '../api/client'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { SearchableSelect } from '../components/SearchableSelect'

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
  apertura: 'Apertura Anual',
  movimientos_historicos: 'Movimientos Históricos',
}

const ENTRY_TYPE_COLORS: Record<string, string> = {
  provision: 'bg-blue-100 text-blue-700',
  pago_cotizaciones: 'bg-indigo-100 text-indigo-700',
  apertura: 'bg-emerald-100 text-emerald-700',
  movimientos_historicos: 'bg-amber-100 text-amber-700',
}

interface ManualLine {
  account_id: string
  glosa: string
  debe: string
  haber: string
}

export default function Accounting() {
  const [activeTab, setActiveTab] = useState<'journal' | 'manual'>('journal')
  const [accounts, setAccounts] = useState<Account[]>([])
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([])
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null)
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedRunId, setSelectedRunId] = useState<string>('')
  const [generating, setGenerating] = useState<string | null>(null)

  // Manual entry form state
  const currentYear = new Date().getFullYear()
  const [manualType, setManualType] = useState<'apertura' | 'movimientos_historicos'>('apertura')
  const [manualYear, setManualYear] = useState(currentYear)
  const [manualMonth, setManualMonth] = useState(1)
  const [manualDesc, setManualDesc] = useState('')
  const [manualLines, setManualLines] = useState<ManualLine[]>([
    { account_id: '', glosa: '', debe: '', haber: '' },
    { account_id: '', glosa: '', debe: '', haber: '' },
  ])
  const [savingManual, setSavingManual] = useState(false)
  const [manualEntries, setManualEntries] = useState<JournalEntry[]>([])
  const [expandedManual, setExpandedManual] = useState<number | null>(null)

  const loadAccounts = async () => {
    try {
      setLoading(true)
      const res = await accountingApi.listAccounts()
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
      const res = await accountingApi.listJournal()
      setJournalEntries(res.data)
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Error al cargar asientos')
    } finally {
      setLoading(false)
    }
  }

  const loadPayrollRuns = async () => {
    try {
      const res = await payrollApi.list()
      setPayrollRuns(res.data.filter((r: PayrollRun) => r.status === 'approved'))
    } catch {
      // ignore
    }
  }

  const loadManualEntries = async () => {
    try {
      const res = await accountingApi.listJournal()
      setManualEntries(res.data.filter((e: JournalEntry) =>
        e.entry_type === 'apertura' || e.entry_type === 'movimientos_historicos'
      ))
    } catch { /* ignore */ }
  }

  const deleteManualEntry = async (id: number) => {
    if (!confirm('¿Eliminar este asiento manual?')) return
    try {
      await accountingApi.deleteJournalEntry(id)
      await loadManualEntries()
      if (expandedManual === id) setExpandedManual(null)
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Error al eliminar asiento')
    }
  }

  const addManualLine = () =>
    setManualLines(l => [...l, { account_id: '', glosa: '', debe: '', haber: '' }])

  const removeManualLine = (i: number) =>
    setManualLines(l => l.filter((_, idx) => idx !== i))

  const updateManualLine = (i: number, field: keyof ManualLine, value: string) =>
    setManualLines(l => l.map((row, idx) => idx === i ? { ...row, [field]: value } : row))

  const totalDebe = manualLines.reduce((s, l) => s + (parseFloat(l.debe) || 0), 0)
  const totalHaber = manualLines.reduce((s, l) => s + (parseFloat(l.haber) || 0), 0)
  const diff = Math.abs(totalDebe - totalHaber)

  const submitManualEntry = async () => {
    if (diff > 1) return
    setSavingManual(true)
    setError(null)
    try {
      const lines = manualLines
        .filter(l => l.account_id)
        .map(l => ({
          account_id: Number(l.account_id),
          glosa: l.glosa || null,
          debe: parseFloat(l.debe) || 0,
          haber: parseFloat(l.haber) || 0,
        }))
      await accountingApi.createManualEntry({
        entry_type: manualType,
        period_year: manualYear,
        period_month: manualMonth,
        description: manualDesc || undefined,
        lines,
      })
      await loadManualEntries()
      setManualLines([
        { account_id: '', glosa: '', debe: '', haber: '' },
        { account_id: '', glosa: '', debe: '', haber: '' },
      ])
      setManualDesc('')
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Error al guardar asiento')
    } finally {
      setSavingManual(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'journal') {
      loadJournal()
      loadPayrollRuns()
    } else {
      loadAccounts()
      loadManualEntries()
    }
    setError(null)
    setSelectedEntry(null)
  }, [activeTab])

  const loadEntryDetail = async (entry: JournalEntry) => {
    try {
      const res = await accountingApi.getJournalEntry(entry.id)
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
      await accountingApi.generateProvision(Number(selectedRunId))
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
      await accountingApi.generatePagoCotizaciones(Number(selectedRunId))
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
          onClick={() => setActiveTab('journal')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'journal'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Asientos Contables
        </button>
        <button
          onClick={() => setActiveTab('manual')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'manual'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Asientos Manuales
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Asientos Manuales Tab */}
      {activeTab === 'manual' && (
        <div className="space-y-6">
          {/* Form */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-700 mb-4">Nuevo Asiento Manual</h2>

            {/* Type + Period */}
            <div className="flex flex-wrap gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de asiento</label>
                <div className="flex gap-2">
                  {(['apertura', 'movimientos_historicos'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setManualType(t)}
                      className={`px-3 py-1.5 text-sm rounded border transition-colors ${
                        manualType === t
                          ? t === 'apertura' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-amber-500 text-white border-amber-500'
                          : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {ENTRY_TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {manualType === 'apertura'
                    ? 'Saldos al 01/01 — arrastra cuentas de balance del cierre anterior'
                    : 'Acumulado remuneraciones ene–mes anterior al go-live del sistema'}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Año</label>
                <input type="number" value={manualYear} onChange={e => setManualYear(Number(e.target.value))}
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm w-24" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Mes</label>
                <SearchableSelect
                  value={manualMonth}
                  onChange={v => setManualMonth(Number(v))}
                  options={MONTHS.map((m, i) => ({ value: i + 1, label: m }))}
                />
              </div>
              <div className="flex-1 min-w-48">
                <label className="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
                <input type="text" value={manualDesc} onChange={e => setManualDesc(e.target.value)}
                  placeholder={`Ej: Apertura contable ${manualYear}`}
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full" />
              </div>
            </div>

            {/* Lines table */}
            <div className="overflow-x-auto mb-3">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border border-gray-200">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-600 w-64">Cuenta</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Glosa</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600 w-36">Debe (CLP)</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600 w-36">Haber (CLP)</th>
                    <th className="px-3 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 border border-gray-200 border-t-0">
                  {manualLines.map((line, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-2 py-1.5">
                        <SearchableSelect
                          value={line.account_id}
                          onChange={v => updateManualLine(i, 'account_id', String(v))}
                          options={[
                            { value: '', label: 'Seleccionar...' },
                            ...accounts.map(a => ({ value: a.id, label: `${a.code} — ${a.name}` })),
                          ]}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="text" value={line.glosa} onChange={e => updateManualLine(i, 'glosa', e.target.value)}
                          placeholder="Descripción línea"
                          className="border border-gray-300 rounded px-2 py-1 text-sm w-full" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" value={line.debe} onChange={e => updateManualLine(i, 'debe', e.target.value)}
                          min="0" placeholder="0"
                          className="border border-gray-300 rounded px-2 py-1 text-sm w-full text-right" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" value={line.haber} onChange={e => updateManualLine(i, 'haber', e.target.value)}
                          min="0" placeholder="0"
                          className="border border-gray-300 rounded px-2 py-1 text-sm w-full text-right" />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        {manualLines.length > 2 && (
                          <button onClick={() => removeManualLine(i)} className="text-red-400 hover:text-red-600">
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border border-gray-200 border-t-2">
                  <tr className={`font-semibold ${diff > 1 ? 'bg-red-50' : 'bg-green-50'}`}>
                    <td colSpan={2} className="px-3 py-2 text-gray-700 text-sm">
                      {diff > 1
                        ? <span className="text-red-600">⚠ Diferencia: {formatCLP(diff)} — el asiento no cuadra</span>
                        : <span className="text-green-600">✓ Asiento cuadrado</span>}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-900">{formatCLP(totalDebe)}</td>
                    <td className="px-3 py-2 text-right text-gray-900">{formatCLP(totalHaber)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={addManualLine}
                className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 text-gray-600">
                <PlusIcon className="w-4 h-4" /> Agregar línea
              </button>
              <button
                onClick={submitManualEntry}
                disabled={savingManual || diff > 1 || manualLines.filter(l => l.account_id).length < 2}
                className="px-4 py-1.5 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingManual ? 'Guardando...' : 'Guardar Asiento'}
              </button>
            </div>
          </div>

          {/* Existing manual entries */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <h3 className="font-semibold text-gray-700 text-sm">Asientos manuales registrados ({manualEntries.length})</h3>
            </div>
            {manualEntries.length === 0 ? (
              <p className="p-4 text-sm text-gray-400">No hay asientos manuales registrados.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {manualEntries.map(entry => (
                  <div key={entry.id}>
                    <div
                      className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                      onClick={() => setExpandedManual(expandedManual === entry.id ? null : entry.id)}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${ENTRY_TYPE_COLORS[entry.entry_type] || 'bg-gray-100 text-gray-700'}`}>
                          {ENTRY_TYPE_LABELS[entry.entry_type]}
                        </span>
                        <span className="text-sm text-gray-700">{entry.description}</span>
                        <span className="text-xs text-gray-400">{MONTHS[entry.period_month - 1]} {entry.period_year}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{new Date(entry.created_at).toLocaleDateString('es-CL')}</span>
                        <button
                          onClick={e => { e.stopPropagation(); deleteManualEntry(entry.id) }}
                          className="p-1 text-red-400 hover:text-red-600"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {expandedManual === entry.id && (
                      <div className="px-4 pb-3 bg-gray-50">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-gray-500">
                              <th className="text-left py-1 font-medium">Cuenta</th>
                              <th className="text-left py-1 font-medium">Glosa</th>
                              <th className="text-right py-1 font-medium">Debe</th>
                              <th className="text-right py-1 font-medium">Haber</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {entry.lines.map(line => (
                              <tr key={line.id}>
                                <td className="py-1 font-mono text-gray-600">{line.account?.code} — {line.account?.name}</td>
                                <td className="py-1 text-gray-500">{line.glosa}</td>
                                <td className="py-1 text-right">{Number(line.debe) > 0 ? formatCLP(Number(line.debe)) : ''}</td>
                                <td className="py-1 text-right">{Number(line.haber) > 0 ? formatCLP(Number(line.haber)) : ''}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="border-t border-gray-300 font-semibold">
                            <tr>
                              <td colSpan={2} className="py-1 text-gray-600">Total</td>
                              <td className="py-1 text-right">{formatCLP(entry.lines.reduce((s, l) => s + Number(l.debe), 0))}</td>
                              <td className="py-1 text-right">{formatCLP(entry.lines.reduce((s, l) => s + Number(l.haber), 0))}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
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
                <SearchableSelect
                  value={selectedRunId}
                  onChange={v => setSelectedRunId(String(v))}
                  options={[
                    { value: '', label: 'Seleccionar nómina...' },
                    ...payrollRuns.map(run => ({ value: run.id, label: `${MONTHS[run.period_month - 1]} ${run.period_year}` })),
                  ]}
                />
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
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${ENTRY_TYPE_COLORS[entry.entry_type] || 'bg-gray-100 text-gray-700'}`}>
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
