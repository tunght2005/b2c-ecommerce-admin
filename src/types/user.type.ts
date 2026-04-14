export type UserRole = 'admin' | 'customer' | 'shipper' | 'support'

export interface User {
  id?: string
  _id?: string
  username: string
  email: string
  phone: string | null
  avatar?: string | null
  role: UserRole
  status: string
  createdAt: string
  updatedAt: string
}
export interface UserUpdatePayload {
  username?: string
  email?: string
  phone?: string
  avatar?: string
}
