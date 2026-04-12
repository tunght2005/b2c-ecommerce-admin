import { type User } from './user.type'
// import { type SuccessResponse } from './utils.type'

export interface AuthResponse {
  message: string
  accessToken: string
  refreshToken: string
  user: User
}

export interface RefreshTokenResponse {
  accessToken: string
}

// Backward-compat alias for older imports.
export type RefreshTokenReponse = RefreshTokenResponse
