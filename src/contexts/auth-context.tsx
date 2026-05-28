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
      const { data } = await AXIOS_INSTANCE.get<{ success: boolean; data: MeApiResponse }>('/users/me')
      const userData = data.data
      return {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        roles: userData.roles,
        permissions: userData.permissions,
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
    const response = await AXIOS_INSTANCE.post<{ success: boolean; data: LoginApiResponse }>('/auth/login', {
      email: credentials.email,
      password: credentials.password,
    })

    const loginData = response.data.data

    if (loginData.requiresMfa) {
      throw { requiresMfa: true, ...loginData }
    }

    storage.setToken(loginData.accessToken)
    storage.setRefreshToken(loginData.refreshToken)

    setUser(loginData.user)
    setIsAuthenticated(true)
  }, [])

  const loginWithMfa = useCallback(async (credentials: MfaCredentials): Promise<void> => {
    const response = await AXIOS_INSTANCE.post<{ success: boolean; data: LoginApiResponse }>('/auth/login', {
      email: credentials.email,
      password: credentials.password,
      mfaCode: credentials.mfaCode,
    })

    const loginData = response.data.data

    storage.setToken(loginData.accessToken)
    storage.setRefreshToken(loginData.refreshToken)

    setUser(loginData.user)
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

    const { data } = await AXIOS_INSTANCE.post<{ success: boolean; data: { accessToken: string; refreshToken: string } }>(
      '/auth/refresh',
      { refreshToken: currentRefreshToken },
    )

    const tokenData = data.data
    storage.setToken(tokenData.accessToken)
    if (tokenData.refreshToken) {
      storage.setRefreshToken(tokenData.refreshToken)
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
