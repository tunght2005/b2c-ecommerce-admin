export type UserRole = 'admin' | 'customer' | 'shipper' | 'support'

export interface User {
  id: string
  username: string
  email: string
  phone: string | null
  role: UserRole
  status: string
  createdAt: string
  updatedAt: string
}
export interface UserUpdatePayload {
  fullName?: string
  phone?: string
  avatar?: string
}
