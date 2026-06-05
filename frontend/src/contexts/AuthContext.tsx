import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authApi } from '../api/client'

interface User {
  id: number
  email: string
  full_name: string
  role: string
  is_active: boolean
  company_id: number | null
}

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isAdmin: boolean
  isHR: boolean
  isSuperAdmin: () => boolean
  companyId: number | null
  companyName: string | null
}

const AuthContext = createContext<AuthContextType | null>(null)

function parseCompanyNameFromToken(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.company_name || null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const logout = useCallback(() => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    setUser(null)
    setToken(null)
    setCompanyName(null)
  }, [])

  useEffect(() => {
    const savedToken = localStorage.getItem('access_token')
    const savedUser = localStorage.getItem('user')
    if (savedToken && savedUser) {
      setToken(savedToken)
      setCompanyName(parseCompanyNameFromToken(savedToken))
      try {
        setUser(JSON.parse(savedUser))
      } catch {
        logout()
      }
    }
    setLoading(false)
  }, [logout])

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password)
    const { access_token, user: userData } = res.data
    localStorage.setItem('access_token', access_token)
    localStorage.setItem('user', JSON.stringify(userData))
    setToken(access_token)
    setUser(userData)
    setCompanyName(parseCompanyNameFromToken(access_token))
  }

  const isAdmin = user?.role === 'admin' || user?.role === 'company_admin' || user?.role === 'super_admin'
  const isHR = isAdmin || user?.role === 'hr_manager'
  const isSuperAdmin = () => user?.role === 'super_admin'
  const companyId = user?.company_id ?? null

  return (
    <AuthContext.Provider value={{
      user, token, loading, login, logout,
      isAdmin, isHR, isSuperAdmin, companyId, companyName
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
