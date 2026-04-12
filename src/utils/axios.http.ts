import axios, { type AxiosInstance, AxiosError, type InternalAxiosRequestConfig } from 'axios'
import HttpStatusCode from '../constants/httpStatusCode.enum'
import path from '../constants/path'
import { toast } from 'react-toastify'
import { getAccessTokenFromLS, getRefreshTokenFromLS, setAccessTokenToLS, clearLS } from '../utils/auth'

let refreshPromise: Promise<string> | null = null

export class Http {
  instance: AxiosInstance

  constructor() {
    this.instance = axios.create({
      baseURL: import.meta.env.VITE_API_URL,
      withCredentials: false,
      timeout: 15000
    })

    // Attach accessToken
    this.instance.interceptors.request.use(
      (config) => {
        const token = getAccessTokenFromLS()
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Auto refresh
    this.instance.interceptors.response.use(
      (response) => response,

      async (error: AxiosError) => {
        const status = error.response?.status
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
        const requestUrl = originalRequest?.url || ''
        const isAuthEndpoint = ['auth/login', 'auth/refresh-token', 'auth/logout'].some((endpoint) =>
          requestUrl.includes(endpoint)
        )
        const hasRefreshToken = Boolean(getRefreshTokenFromLS())

        // 401 => refresh token
        if (status === HttpStatusCode.Unauthorized && !originalRequest._retry && !isAuthEndpoint && hasRefreshToken) {
          originalRequest._retry = true

          try {
            if (!refreshPromise) refreshPromise = this.refreshAccessToken()

            const newToken = await refreshPromise
            refreshPromise = null

            setAccessTokenToLS(newToken)

            originalRequest.headers.Authorization = `Bearer ${newToken}`
            return this.instance(originalRequest)
          } catch (err) {
            refreshPromise = null
            clearLS()
            window.location.href = path.login
            return Promise.reject(err)
          }
        }

        if (status === HttpStatusCode.Unauthorized && (!hasRefreshToken || isAuthEndpoint)) {
          return Promise.reject(error)
        }

        // 400 => không toast
        if (status === HttpStatusCode.BadRequest) {
          return Promise.reject(error)
        }

        // Các lỗi khác
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: any = error.response?.data
        const errData = data?.message || data?.error || 'Đã xảy ra lỗi!'

        if (typeof errData === 'string') toast.error(errData)
        else if (typeof errData === 'object') {
          Object.values(errData).forEach((msg) => toast.error(String(msg)))
        }

        return Promise.reject(error)
      }
    )
  }

  private async refreshAccessToken(): Promise<string> {
    const refreshToken = getRefreshTokenFromLS()
    if (!refreshToken) throw new Error('Missing refresh token')

    const res = await axios.post<{ accessToken: string }>(
      `${import.meta.env.VITE_API_URL}/auth/refresh-token`,
      { refreshToken },
      { withCredentials: false }
    )

    const { accessToken } = res.data

    return accessToken
  }
}

const http = new Http().instance
export default http
