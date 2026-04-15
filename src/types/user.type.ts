export type UserRole = 'admin' | 'customer' | 'shipper' | 'support'
export type UserStatus = 'active' | 'inactive'

export interface User {
  id?: string
  _id?: string
  username: string
  email: string
  phone: string | null
  avatar?: string | null
  role: UserRole
  status: UserStatus
  createdAt: string
  updatedAt: string
}
export interface UserUpdatePayload {
  username?: string
  email?: string
  phone?: string
  avatar?: string
}
