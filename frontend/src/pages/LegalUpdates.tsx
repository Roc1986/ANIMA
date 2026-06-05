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
      setAnalysis(res.data)
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
  const paramGroups: Record<string, LegalParam[]> = {
    'Valores Base': params.filter(p => ['IMM', 'UF', 'UTM'].includes(p.key)),
    'AFP': params.filter(p => p.key.startsWith('AFP_')),
    'Salud y Previsión': params.filter(p => ['TASA_SALUD', 'TOPE_IMPONIBLE_AFP_UF', 'TOPE_IMPONIBLE_SALUD_UF', 'SIS_EMPLEADOR'].includes(p.key)),
    'Seguro Cesantía': params.filter(p => p.key.startsWith('CESANTIA_')),
    'Gratificación': params.filter(p => p.key.startsWith('GRATIFICACION_')),
    'Jornada y HH.EE': params.filter(p => p.key.startsWith('RECARGO_') || p.key.startsWith('JORNADA_')),
  }

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
            {analysis.analysis && (
              <div className="p-4 bg-white rounded-lg border border-purple-100">
                <h3 className="font-medium text-gray-800 mb-2 text-sm">Análisis</h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{analysis.analysis}</p>
              </div>
            )}
            {analysis.proposed_changes && analysis.proposed_changes.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-800 mb-2 text-sm">Cambios Propuestos</h3>
                <div className="space-y-2">
                  {analysis.proposed_changes.map((change, i) => (
                    <div key={i} className="p-3 bg-white rounded-lg border border-purple-100 flex items-start gap-3">
                      <span className={URGENCY_BADGE[change.urgency] || 'badge-gray'}>
                        {change.urgency || 'media'}
                      </span>
                      <div className="flex-1">
                        <p className="font-mono text-sm font-medium text-gray-800">{change.key}</p>
                        <p className="text-xs text-gray-500">
                          {change.current_value} → <strong className="text-green-700">{change.new_value}</strong>
                        </p>
                        <p className="text-xs text-gray-600 mt-0.5">{change.reason}</p>
                        <p className="text-xs text-gray-400">{change.source}</p>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => {
                            setEditingKey(change.key)
                            setEditValue(String(change.new_value))
                          }}
                          className="btn-secondary text-xs px-2 py-1"
                        >
                          Aplicar
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {analysis.recommendations && analysis.recommendations.length > 0 && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-800 text-sm mb-1">Recomendaciones</h3>
                <ul className="text-xs text-blue-700 space-y-1">
                  {analysis.recommendations.map((r, i) => <li key={i}>• {r}</li>)}
                </ul>
              </div>
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

      {/* Parameters by group */}
      {Object.entries(paramGroups).map(([group, groupParams]) => {
        if (groupParams.length === 0) return null
        return (
          <div key={group} className="card mb-4">
            <h2 className="font-semibold text-gray-800 mb-3">{group}</h2>
            <div className="space-y-2">
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
          </div>
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
