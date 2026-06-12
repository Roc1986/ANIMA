import { useEffect, useState } from 'react'
import { payrollApi, reportsApi, formatCLP, MONTHS, downloadBlob } from '../api/client'
import toast from 'react-hot-toast'
import { DocumentArrowDownIcon, ChartBarIcon } from '@heroicons/react/24/outline'

interface PayrollRun {
  id: number
  period_year: number
  period_month: number
  status: string
}

export default function Reports() {
  const [runs, setRuns] = useState<PayrollRun[]>([])
  const [selectedRun, setSelectedRun] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()))
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    payrollApi.list().then(r => setRuns(r.data)).catch(() => {})
  }, [])

  const handle = async (fn: () => Promise<{ data: Blob }>, filename: string) => {
    setLoading(true)
    try {
      const res = await fn()
      downloadBlob(res.data, filename)
      toast.success('Reporte generado')
    } catch {
      toast.error('Error al generar reporte')
    } finally {
      setLoading(false)
    }
  }

  const availableYears = [...new Set(runs.map(r => r.period_year))].sort((a, b) => b - a)
  const selectedRunObj = runs.find(r => String(r.id) === selectedRun)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
        <p className="text-gray-500 text-sm mt-1">Generación de documentos oficiales y reportes de nóminas</p>
      </div>

      {/* Run selector */}
      <div className="card mb-6">
        <h2 className="font-semibold text-gray-800 mb-3">Seleccionar Nómina</h2>
        <select
          className="input max-w-xs"
          value={selectedRun}
          onChange={e => setSelectedRun(e.target.value)}
        >
          <option value="">Seleccionar período...</option>
          {runs.map(r => (
            <option key={r.id} value={r.id}>
              {MONTHS[r.period_month - 1]} {r.period_year} — {r.status}
            </option>
          ))}
        </select>
      </div>

      {/* Reports per run */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-1">Libro de Remuneraciones</h3>
          <p className="text-sm text-gray-500 mb-4">
            PDF del libro de remuneraciones mensual con todos los empleados.
          </p>
          <button
            disabled={!selectedRun || loading}
            onClick={() => {
              if (!selectedRunObj) return
              handle(
                () => reportsApi.libroPdf(selectedRunObj.id),
                `libro_rem_${selectedRunObj.period_year}_${String(selectedRunObj.period_month).padStart(2,'0')}.pdf`
              )
            }}
            className="btn-primary text-sm"
          >
            <DocumentArrowDownIcon className="w-4 h-4" />
            Descargar PDF
          </button>
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-1">Archivo Previred</h3>
          <p className="text-sm text-gray-500 mb-4">
            Excel para carga masiva en Previred (AFP, Salud, Cesantía).
          </p>
          <button
            disabled={!selectedRun || loading}
            onClick={() => {
              if (!selectedRunObj) return
              handle(
                () => reportsApi.previredExcel(selectedRunObj.id),
                `previred_${selectedRunObj.period_year}_${String(selectedRunObj.period_month).padStart(2,'0')}.xlsx`
              )
            }}
            className="btn-primary text-sm bg-green-700 hover:bg-green-800"
          >
            <DocumentArrowDownIcon className="w-4 h-4" />
            Descargar Excel
          </button>
        </div>
      </div>

      {/* Annual reports */}
      <div className="card mb-6">
        <h2 className="font-semibold text-gray-800 mb-3">Reportes Anuales</h2>
        <div className="flex items-end gap-4">
          <div>
            <label className="label">Año Tributario</label>
            <select className="input" value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
              {availableYears.length > 0 ? availableYears.map(y => (
                <option key={y} value={y}>{y}</option>
              )) : <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>}
            </select>
          </div>
          <button
            disabled={loading}
            onClick={() => handle(
              () => reportsApi.dj1887Excel(Number(selectedYear)),
              `DJ1887_${selectedYear}.xlsx`
            )}
            className="btn-secondary text-sm"
          >
            <DocumentArrowDownIcon className="w-4 h-4" />
            DJ1887 Excel
          </button>
          <button
            disabled={loading}
            onClick={() => handle(
              () => reportsApi.dj1887Csv(Number(selectedYear)),
              `DJ1887_${selectedYear}.csv`
            )}
            className="btn-primary text-sm bg-purple-700 hover:bg-purple-800"
          >
            <DocumentArrowDownIcon className="w-4 h-4" />
            DJ1887 CSV (SII)
          </button>
          <button
            disabled={loading}
            onClick={() => handle(
              () => reportsApi.lreExcel(Number(selectedYear)),
              `LRE_${selectedYear}.xlsx`
            )}
            className="btn-primary text-sm bg-green-700 hover:bg-green-800"
          >
            <DocumentArrowDownIcon className="w-4 h-4" />
            LRE Excel
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Declaración Jurada Anual F1887 — El CSV es el formato para cargar al SII (datos desde línea 6, separador ;).
          LRE: Libro de Remuneraciones Electrónico — 1 fila por trabajador por mes.
        </p>
      </div>

      {/* Help info */}
      <div className="card bg-blue-50 border-blue-100">
        <div className="flex gap-3">
          <ChartBarIcon className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-800 text-sm mb-2">Información sobre reportes</h3>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• <strong>Libro de Remuneraciones:</strong> Documento exigido por el Código del Trabajo Art. 62</li>
              <li>• <strong>Previred:</strong> Plataforma de declaración y pago de cotizaciones previsionales</li>
              <li>• <strong>DJ1887:</strong> Declaración Jurada de sueldos y retenciones para el SII (Art. 101 LIR)</li>
              <li>• Los reportes solo se generan para nóminas en estado "Calculada" o superior</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
