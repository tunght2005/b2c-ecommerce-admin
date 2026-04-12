import { type AuthResponse } from '../types/auth.type'
import http from '../utils/axios.http'

export const URL_LOGIN = 'auth/login'
export const URL_LOGOUT = 'auth/logout'
export const URL_REFRESH_TOKEN = 'auth/refresh-token'

const authApi = {
  login(body: { email: string; password: string }) {
    return http.post<AuthResponse>(URL_LOGIN, body)
  },
  logout() {
    return http.post(URL_LOGOUT)
  }
}

export default authApi
