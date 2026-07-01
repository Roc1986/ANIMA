import { useState, useEffect } from 'react'
import { accountingApi } from '../api/client'

interface Account {
  id: number
  company_id: number
  code: string
  name: string
  account_type: string
  is_active: boolean
  created_at: string
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  activo: 'Activo',
  pasivo: 'Pasivo',
  patrimonio: 'Patrimonio',
  ingreso: 'Ingreso',
  gasto: 'Gasto',
}

export default function PlanCuentas() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editCode, setEditCode] = useState('')
  const [editName, setEditName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  useEffect(() => {
    loadAccounts()
  }, [])

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
      await accountingApi.updateAccount(id, { code: editCode, name: editName })
      setEditingId(null)
      await loadAccounts()
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Error al guardar cuenta')
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Plan de Cuentas</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

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
  )
}
