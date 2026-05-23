export interface AuthUser {
  id: string
  email: string
  name?: string
  roles?: string[]
  permissions?: string[]
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: AuthUser
  requiresMfa?: boolean
}

export interface MfaCredentials {
  email: string
  password: string
  mfaCode: string
}

export interface AuthContextType {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  loginWithMfa: (credentials: MfaCredentials) => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<void>
}
