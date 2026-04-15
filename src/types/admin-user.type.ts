import type { User, UserRole, UserStatus } from './user.type'
export type UserSortField = 'createdAt' | 'updatedAt' | 'username' | 'email' | 'role' | 'status'
export type UserSortOrder = 'asc' | 'desc'

export interface AdminUserFormPayload {
  username: string
  email: string
  password?: string
  phone?: string | null
  avatar?: string | null
  role: UserRole
  status: UserStatus
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface AdminUserUpdatePayload extends Partial<AdminUserFormPayload> {}

export interface AdminUserListQuery {
  search?: string
  role?: UserRole | 'all'
  status?: UserStatus | 'all'
  page?: number
  limit?: number
  sortBy?: UserSortField
  sortOrder?: UserSortOrder
}

export interface AdminUserPagination {
  page: number
  limit: number
  totalItems: number
  totalPages: number
}

export interface AdminUserSummary {
  totalUsers: number
  activeUsers: number
  adminUsers: number
  supportUsers: number
  shipperUsers: number
  adminSupportUsers: number
  customers: number
}

export interface AdminUserListResponse {
  users: User[]
  pagination: AdminUserPagination
  summary: AdminUserSummary
}

export interface AdminUserDetailResponse {
  user: User
}

export interface AdminUserMutationResponse {
  message: string
  user: User
}
