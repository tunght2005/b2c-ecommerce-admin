import http from '../utils/axios.http'
import type {
  AdminUserDetailResponse,
  AdminUserFormPayload,
  AdminUserListQuery,
  AdminUserListResponse,
  AdminUserMutationResponse,
  AdminUserUpdatePayload
} from '../types/admin-user.type'

const ADMIN_USER_BASE_URL = 'admin/users'

const adminUserApi = {
  list(params: AdminUserListQuery) {
    return http.get<AdminUserListResponse>(ADMIN_USER_BASE_URL, { params })
  },

  detail(id: string) {
    return http.get<AdminUserDetailResponse>(`${ADMIN_USER_BASE_URL}/${id}`)
  },

  create(payload: AdminUserFormPayload) {
    return http.post<AdminUserMutationResponse>(ADMIN_USER_BASE_URL, payload)
  },

  update(id: string, payload: AdminUserUpdatePayload) {
    return http.put<AdminUserMutationResponse>(`${ADMIN_USER_BASE_URL}/${id}`, payload)
  },

  remove(id: string) {
    return http.delete<{ message: string }>(`${ADMIN_USER_BASE_URL}/${id}`)
  }
}

export default adminUserApi
