import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AXIOS_INSTANCE } from '@/lib/http/httpClient'
import { storage } from '@/lib/auth/storage'
import type { AuthUser, LoginCredentials, MfaCredentials, AuthContextType } from '@/lib/types/auth'

const AuthContext = createContext<AuthContextType | null>(null)

interface LoginApiResponse {
  accessToken: string
  refreshToken: string
  user: AuthUser
  requiresMfa?: boolean
}

interface MeApiResponse {
  id: string
  email: string
  name?: string
  roles?: string[]
  permissions?: string[]
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const queryClient = useQueryClient()

  const fetchUser = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const { data } = await AXIOS_INSTANCE.get<MeApiResponse>('/users/me')
      return {
        id: data.id,
        email: data.email,
        name: data.name,
        roles: data.roles,
        permissions: data.permissions,
      }
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      const token = storage.getToken()
      if (token) {
        const userData = await fetchUser()
        if (userData) {
          setUser(userData)
          setIsAuthenticated(true)
        } else {
          storage.clearAll()
          setIsAuthenticated(false)
        }
      } else {
        setIsAuthenticated(false)
      }
      setIsLoading(false)
    }
    init()
  }, [fetchUser])

  const login = useCallback(async (credentials: LoginCredentials): Promise<void> => {
    const response = await AXIOS_INSTANCE.post<LoginApiResponse>('/auth/login', {
      email: credentials.email,
      password: credentials.password,
    })

    if (response.data.requiresMfa) {
      throw { requiresMfa: true, ...response.data }
    }

    storage.setToken(response.data.accessToken)
    storage.setRefreshToken(response.data.refreshToken)

    setUser(response.data.user)
    setIsAuthenticated(true)
  }, [])

  const loginWithMfa = useCallback(async (credentials: MfaCredentials): Promise<void> => {
    const response = await AXIOS_INSTANCE.post<LoginApiResponse>('/auth/login', {
      email: credentials.email,
      password: credentials.password,
      mfaCode: credentials.mfaCode,
    })

    storage.setToken(response.data.accessToken)
    storage.setRefreshToken(response.data.refreshToken)

    setUser(response.data.user)
    setIsAuthenticated(true)
  }, [])

  const logout = useCallback(async (): Promise<void> => {
    try {
      const refreshToken = storage.getRefreshToken()
      if (refreshToken) {
        await AXIOS_INSTANCE.post('/auth/logout', { refreshToken })
      }
    } catch {
      // swallow
    } finally {
      storage.clearAll()
      setUser(null)
      setIsAuthenticated(false)
      queryClient.invalidateQueries()
    }
  }, [queryClient])

  const refreshToken = useCallback(async (): Promise<void> => {
    const currentRefreshToken = storage.getRefreshToken()
    if (!currentRefreshToken) {
      throw new Error('No refresh token available')
    }

    const { data } = await AXIOS_INSTANCE.post<{ accessToken: string; refreshToken: string }>(
      '/auth/refresh',
      { refreshToken: currentRefreshToken },
    )

    storage.setToken(data.accessToken)
    if (data.refreshToken) {
      storage.setRefreshToken(data.refreshToken)
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        loginWithMfa,
        logout,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
