import { jwtDecode } from 'jwt-decode'
import type { UserRole } from '../types/user.type'

export interface AccessTokenPayload {
  id: string
  email: string
  username?: string
  phone?: string | null
  role: UserRole
  status?: string
  exp?: number
  iat?: number
}

export function decodeAccessToken(token: string): AccessTokenPayload | null {
  if (!token || token === 'undefined' || token === 'null') {
    console.error('Token rỗng hoặc không hợp lệ:', token)
    return null
  }

  try {
    const decoded = jwtDecode<AccessTokenPayload>(token)

    if (!decoded.id || !decoded.email || !decoded.role) {
      console.error('Payload thiếu field quan trọng:', decoded)
      return null
    }

    return decoded
  } catch (err) {
    console.error('Decode token thất bại:', err)
    return null
  }
}
