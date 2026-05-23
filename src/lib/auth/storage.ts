const AUTH_TOKEN_KEY = 'auth_token'
const REFRESH_TOKEN_KEY = 'refresh_token'

export const storage = {
  getToken(): string | null {
    return localStorage.getItem(AUTH_TOKEN_KEY)
  },
  setToken(token: string): void {
    localStorage.setItem(AUTH_TOKEN_KEY, token)
  },
  clearToken(): void {
    localStorage.removeItem(AUTH_TOKEN_KEY)
  },
  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  },
  setRefreshToken(token: string): void {
    localStorage.setItem(REFRESH_TOKEN_KEY, token)
  },
  clearRefreshToken(): void {
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  },
  clearAll(): void {
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem('tenant_code')
  },
}
