import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, token } from './api'
import type { User } from './types'

interface AuthState {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<User>
  register: (data: { email: string; password: string; full_name: string; role: 'teacher' | 'parent' }) => Promise<User>
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(() => !!token.get())

  useEffect(() => {
    if (!token.get()) return
    api.me().then(setUser).catch(() => token.clear()).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const onLogout = () => setUser(null)
    window.addEventListener('lexora:logout', onLogout)
    return () => window.removeEventListener('lexora:logout', onLogout)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password)
    token.set(res.access_token)
    setUser(res.user)
    return res.user
  }, [])

  const register = useCallback(async (data: { email: string; password: string; full_name: string; role: 'teacher' | 'parent' }) => {
    const res = await api.register(data)
    token.set(res.access_token)
    setUser(res.user)
    return res.user
  }, [])

  const logout = useCallback(() => { token.clear(); setUser(null) }, [])

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading, login, register, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

export const homeFor = (role: User['role']) =>
  role === 'teacher' ? '/teacher/dashboard' : role === 'parent' ? '/parent/dashboard' : '/child/home'
