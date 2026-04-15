import type { UserRole } from '../types/user.type'

export type SidebarRole = Exclude<UserRole, 'customer'>

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  customer: 'Customer',
  shipper: 'Shipper',
  support: 'Support'
}

export const USER_ROLE_OPTIONS: UserRole[] = ['admin', 'customer', 'shipper', 'support']

const ROLES = {
  admin: 'admin',
  shipper: 'shipper',
  support: 'support'
} as const

export const ROLE_GROUPS: Record<string, SidebarRole[]> = {
  ADMIN_ONLY: [ROLES.admin],
  SHIPPER_ONLY: [ROLES.shipper],
  SUPPORT_ONLY: [ROLES.support],
  ADMIN_SHIPPER: [ROLES.admin, ROLES.shipper],
  ADMIN_SUPPORT: [ROLES.admin, ROLES.support],
  ALL_STAFF: [ROLES.admin, ROLES.shipper, ROLES.support]
}
