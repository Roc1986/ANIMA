import { useEffect, useState } from 'react'
import { aiLegalApi } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import { ScaleIcon, SparklesIcon, PencilIcon, CheckIcon } from '@heroicons/react/24/outline'

interface LegalParam {
  id: number
  key: string
  value: number
  description: string
  unit: string
  source?: string
  effective_date: string
}

interface AIAnalysis {
  analysis?: string
  proposed_changes?: Array<{
    key: string
    current_value: number
    new_value: number
    reason: string
    source: string
    urgency: string
  }>
  recommendations?: string[]
  legal_references?: string[]
  error?: string
}

export default function LegalUpdates() {
  const { isAdmin, isHR } = useAuth()
  const [params, setParams] = useState<LegalParam[]>([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [query, setQuery] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchParams = async () => {
    setLoading(true)
    try {
      const res = await aiLegalApi.getParameters()
      setParams(res.data)
    } catch {
      toast.error('Error al cargar parámetros')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchParams() }, [])

  const handleSeed = async () => {
    setSeeding(true)
    try {
      await aiLegalApi.seedParameters()
      toast.success('Parámetros legales inicializados')
      fetchParams()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      toast.error(error.response?.data?.detail || 'Error al inicializar')
    } finally {
      setSeeding(false)
    }
  }

  const handleAnalyze = async () => {
    if (!query.trim()) return toast.error('Ingrese una consulta')
    setAnalyzing(true)
    setAnalysis(null)
    try {
      const res = await aiLegalApi.analyze(query)
      let data = res.data
      // If the response is a plain string or has a raw_response field, parse the JSON out of it
      if (typeof data === 'string' || data?.raw_response) {
        const raw: string = typeof data === 'string' ? data : data.raw_response
        const match = raw.match(/```json\s*([\s\S]*?)```/) || raw.match(/(\{[\s\S]*\})/)
        if (match) {
          try { data = JSON.parse(match[1]) } catch { /* use as-is */ }
        }
      }
      setAnalysis(data)
    } catch {
      toast.error('Error al analizar. Verifique que ANTHROPIC_API_KEY esté configurada.')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleSaveParam = async (key: string) => {
    setSaving(true)
    try {
      await aiLegalApi.updateParameter(key, { key, value: parseFloat(editValue) })
      toast.success('Parámetro actualizado')
      setEditingKey(null)
      fetchParams()
    } catch {
      toast.error('Error al actualizar')
    } finally {
      setSaving(false)
    }
  }

  const URGENCY_BADGE: Record<string, string> = {
    alta: 'badge-red',
    media: 'badge-yellow',
    baja: 'badge-green',
  }

  // Group params by category
  const paramGroups: { label: string; defaultOpen: boolean; params: LegalParam[] }[] = [
    { label: 'Valores Base', defaultOpen: true,  params: params.filter(p => ['IMM', 'UF', 'UTM'].includes(p.key)) },
    { label: 'AFP',          defaultOpen: false, params: params.filter(p => p.key.startsWith('AFP_')) },
    { label: 'Salud y Previsión', defaultOpen: false, params: params.filter(p => ['TASA_SALUD', 'TOPE_IMPONIBLE_AFP_UF', 'TOPE_IMPONIBLE_SALUD_UF', 'TOPE_IMPONIBLE_AFC_UF', 'SIS_EMPLEADOR'].includes(p.key)) },
    { label: 'Seguro Cesantía', defaultOpen: false, params: params.filter(p => p.key.startsWith('CESANTIA_')) },
    { label: 'Gratificación',   defaultOpen: false, params: params.filter(p => p.key.startsWith('GRATIFICACION_')) },
    { label: 'Jornada y HH.EE', defaultOpen: false, params: params.filter(p => p.key.startsWith('RECARGO_') || p.key.startsWith('JORNADA_')) },
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <ScaleIcon className="w-7 h-7 text-blue-900" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Parámetros Legales y IA</h1>
          <p className="text-gray-500 text-sm">Actualización asistida por IA de parámetros de legislación laboral chilena</p>
        </div>
      </div>

      {/* AI Analysis box */}
      <div className="card mb-6 border-purple-100 bg-gradient-to-br from-purple-50 to-white">
        <div className="flex items-center gap-2 mb-3">
          <SparklesIcon className="w-5 h-5 text-purple-600" />
          <h2 className="font-semibold text-purple-800">Asistente IA Legal (Claude)</h2>
        </div>
        <p className="text-sm text-purple-700 mb-3">
          Pregunta sobre cambios en la legislación laboral chilena y el asistente sugerirá actualizaciones a los parámetros del sistema.
        </p>
        <div className="flex gap-3">
          <input
            className="input flex-1"
            placeholder="Ej: ¿Cuál es el nuevo IMM 2025? ¿Hay cambios en las tasas AFP? ¿Cómo afecta la Ley 21.561?"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
          />
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="btn-primary bg-purple-700 hover:bg-purple-800"
          >
            {analyzing ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Analizando...
              </span>
            ) : (
              <>
                <SparklesIcon className="w-4 h-4" />
                Analizar
              </>
            )}
          </button>
        </div>

        {/* Analysis result */}
        {analysis && (
          <div className="mt-4 space-y-4">
            {analysis.error && (
              <div className="p-3 bg-red-50 rounded-lg text-sm text-red-700">{analysis.error}</div>
            )}

            {/* Main analysis text */}
            {analysis.analysis && (
              <div className="p-4 bg-white rounded-lg border border-purple-100">
                <h3 className="font-semibold text-purple-800 mb-3 flex items-center gap-2">
                  <SparklesIcon className="w-4 h-4" /> Análisis del Asistente IA
                </h3>
                <div className="text-sm text-gray-700 space-y-2">
                  {analysis.analysis.split('\n\n').filter(Boolean).map((paragraph, i) => (
                    <p key={i} className="leading-relaxed">{paragraph.replace(/\\n/g, ' ').trim()}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Proposed changes */}
            {analysis.proposed_changes && analysis.proposed_changes.filter(c => typeof c.new_value === 'number').length > 0 && (
              <div className="p-4 bg-white rounded-lg border border-orange-100">
                <h3 className="font-semibold text-orange-800 mb-3">⚡ Actualizaciones Recomendadas</h3>
                <div className="space-y-3">
                  {analysis.proposed_changes.filter(c => typeof c.new_value === 'number').map((change, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                      <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-semibold ${
                        change.urgency === 'alta' ? 'bg-red-100 text-red-700' :
                        change.urgency === 'media' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {change.urgency === 'alta' ? 'URGENTE' : change.urgency === 'media' ? 'MEDIO' : 'BAJO'}
                      </span>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800 text-sm">{change.key}</p>
                        <p className="text-sm text-gray-600 mt-0.5">
                          Valor actual: <span className="line-through text-red-500">{Number(change.current_value).toLocaleString('es-CL')}</span>
                          {' → '}
                          Nuevo valor: <strong className="text-green-700">{Number(change.new_value).toLocaleString('es-CL')}</strong>
                        </p>
                        <p className="text-xs text-gray-600 mt-1">{change.reason}</p>
                        <p className="text-xs text-blue-500 mt-0.5">Fuente: {change.source}</p>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => { setEditingKey(change.key); setEditValue(String(change.new_value)) }}
                          className="shrink-0 btn-primary text-xs px-3 py-1.5 bg-green-700 hover:bg-green-800"
                        >
                          Aplicar
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Items to verify (non-numeric new_value) */}
            {analysis.proposed_changes && analysis.proposed_changes.filter(c => typeof c.new_value !== 'number').length > 0 && (
              <div className="p-4 bg-white rounded-lg border border-gray-100">
                <h3 className="font-semibold text-gray-700 mb-3">🔍 Parámetros a Verificar</h3>
                <div className="space-y-2">
                  {analysis.proposed_changes.filter(c => typeof c.new_value !== 'number').map((change, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-yellow-500 shrink-0 mt-0.5">•</span>
                      <div>
                        <span className="font-mono font-medium text-gray-800">{change.key}:</span>{' '}
                        <span className="text-gray-600">{change.reason}</span>
                        <span className="text-blue-400 text-xs block">{change.source}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {analysis.recommendations && analysis.recommendations.length > 0 && (
              <details className="bg-blue-50 rounded-lg p-4">
                <summary className="font-semibold text-blue-800 cursor-pointer text-sm">
                  📋 Ver {analysis.recommendations.length} recomendaciones adicionales
                </summary>
                <ul className="mt-3 space-y-2">
                  {analysis.recommendations.map((r, i) => (
                    <li key={i} className="text-sm text-blue-700 flex gap-2">
                      <span className="shrink-0">{i + 1}.</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </div>

      {/* Seed button */}
      {params.length === 0 && (
        <div className="card mb-4 text-center py-8">
          <p className="text-gray-500 mb-4">No hay parámetros legales. ¿Desea inicializar con valores 2024-2025?</p>
          <button onClick={handleSeed} disabled={seeding} className="btn-primary">
            {seeding ? 'Inicializando...' : 'Inicializar Parámetros Legales 2024-2025'}
          </button>
        </div>
      )}

      {/* Parameters by group — accordion */}
      {paramGroups.map(({ label, defaultOpen, params: groupParams }) => {
        if (groupParams.length === 0) return null
        return (
          <details key={label} className="card mb-3 group" open={defaultOpen}>
            <summary className="flex items-center justify-between cursor-pointer select-none list-none">
              <h2 className="font-semibold text-gray-800">{label}</h2>
              <span className="text-xs text-gray-400 group-open:hidden">▶ {groupParams.length} parámetros</span>
              <span className="text-xs text-gray-400 hidden group-open:inline">▼ cerrar</span>
            </summary>
            <div className="mt-3 space-y-2">
              {groupParams.map(param => (
                <div key={param.key} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-gray-800 font-medium">{param.key}</span>
                      <span className="badge-gray text-xs">{param.unit}</span>
                    </div>
                    <p className="text-xs text-gray-400">{param.description}</p>
                    {param.source && <p className="text-xs text-blue-500">{param.source}</p>}
                  </div>

                  {editingKey === param.key ? (
                    <div className="flex items-center gap-2">
                      <input
                        className="input w-32 text-sm"
                        type="number"
                        step="any"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                      />
                      <button
                        onClick={() => handleSaveParam(param.key)}
                        disabled={saving}
                        className="text-green-600 hover:text-green-800"
                      >
                        <CheckIcon className="w-5 h-5" />
                      </button>
                      <button onClick={() => setEditingKey(null)} className="text-gray-400 hover:text-gray-600">
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-900 text-sm min-w-[80px] text-right">
                        {Number(param.value).toLocaleString('es-CL')}
                      </span>
                      {isAdmin && (
                        <button
                          onClick={() => { setEditingKey(param.key); setEditValue(String(param.value)) }}
                          className="text-gray-300 hover:text-gray-600 transition-colors"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </details>
        )
      })}

      {/* Legal disclaimer */}
      <div className="card bg-yellow-50 border-yellow-100 mt-4">
        <p className="text-xs text-yellow-800">
          <strong>Aviso Legal:</strong> Los parámetros legales deben ser verificados con fuentes oficiales antes de aplicar cambios.
          Consulte la Superintendencia de Pensiones (SP), el SII, y el Ministerio del Trabajo para confirmación.
          El asistente IA provee orientación referencial, no asesoría legal oficial.
        </p>
      </div>
    </div>
  )
}
