'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  id: number
  username: string
  displayName: string
  role: 'GUEST' | 'MEMBER' | 'ADMIN' | 'SUPER_ADMIN'
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED'
  personId?: number | null
}

interface AuthContext {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<{ error?: string }>
  register: (username: string, displayName: string, password: string) => Promise<{ error?: string; message?: string }>
  logout: () => Promise<void>
  isAdmin: boolean
  isMember: boolean
}

const AuthCtx = createContext<AuthContext>({
  user: null,
  loading: true,
  login: async () => ({}),
  register: async () => ({}),
  logout: async () => {},
  isAdmin: false,
  isMember: false,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = async (username: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    const data = await res.json()
    if (!res.ok) return { error: data.error }
    setUser(data.user)
    return {}
  }

  const register = async (username: string, displayName: string, password: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, displayName, password }),
    })
    const data = await res.json()
    if (!res.ok) return { error: data.error }
    return { message: data.message }
  }

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    window.location.href = '/'
  }

  return (
    <AuthCtx.Provider value={{
      user,
      loading,
      login,
      register,
      logout,
      isAdmin: user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN',
      isMember: !!user && user.status === 'ACTIVE',
    }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)
