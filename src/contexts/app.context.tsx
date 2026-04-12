import { createContext, useContext, useState, type ReactNode } from 'react'
import { decodeAccessToken } from '../utils/jwt'
import {
  getAccessTokenFromLS,
  setAccessTokenToLS,
  setRefreshTokenToLS,
  getProfileFromLS,
  setProfileToLS,
  clearLS
} from '../utils/auth'
import type { User, UserRole } from '../types/user.type'

interface AuthState {
  isAuthenticated: boolean
  role: UserRole | null
  email: string | null
  userId: string | null
  //profile
  profile: User | null
  setProfile: (profile: User) => void
  //
  setTokens: (accessToken: string, refreshToken: string) => void
  logout: () => void
}

export const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const initialPayload = decodeAccessToken(getAccessTokenFromLS())
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(initialPayload))
  const [role, setRole] = useState<UserRole | null>(initialPayload?.role ?? null)
  const [email, setEmail] = useState<string | null>(initialPayload?.email ?? null)
  const [userId, setUserId] = useState<string | null>(initialPayload?.id ?? null)
  //profile
  const [profile, _setProfile] = useState<User | null>(getProfileFromLS())
  const setProfile = (nextProfile: User) => {
    _setProfile(nextProfile)
    setProfileToLS(nextProfile)
  }

  const resetAuthState = () => {
    setIsAuthenticated(false)
    setRole(null)
    setEmail(null)
    setUserId(null)
    _setProfile(null)
  }

  const applyToken = (token: string) => {
    const payload = decodeAccessToken(token)

    if (!payload) {
      clearLS()
      resetAuthState()
      return
    }

    setIsAuthenticated(true)
    setRole(payload.role)
    setEmail(payload.email)
    setUserId(payload.id)
  }

  const setTokens = (accessToken: string, refreshToken: string) => {
    setAccessTokenToLS(accessToken)
    setRefreshTokenToLS(refreshToken)
    applyToken(accessToken)
  }

  const logout = () => {
    clearLS()
    resetAuthState()
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        role,
        email,
        userId,
        profile,
        setProfile,
        setTokens,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
