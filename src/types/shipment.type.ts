import type { User } from './user.type'

export type ShipmentStatus = 'pending' | 'assigned' | 'in_transit' | 'delivered' | 'failed' | 'cancelled'

export interface ShipmentVariantRef {
  _id: string
  sku?: string
}

export interface ShipmentVoucherRef {
  _id: string
  code?: string
  discount_type?: string
  discount_value?: number
}

export interface ShipmentOrderItem {
  variant_id: string | ShipmentVariantRef | null
  price: number
  quantity: number
}

export interface ShipmentOrderRef {
  _id: string
  user_id: string | Pick<User, 'username' | 'email' | 'phone' | 'role'>
  status: string
  payment_status: string
  address_id?: string
  items?: ShipmentOrderItem[]
  total_price?: number
  discount_price?: number
  final_price: number
  voucher_id?: string | ShipmentVoucherRef | null
  createdAt: string
  updatedAt: string
}

export interface ShipmentStaffUserRef {
  _id: string
  username: string
  email: string
  phone: string | null
  role?: string
}

export interface ShipmentStaffRef {
  _id: string
  user_id?: string | ShipmentStaffUserRef
  name: string
  phone: string | null
  email: string | null
  status: 'active' | 'inactive'
  createdAt: string
  updatedAt: string
}

export interface ShipmentEntity {
  _id: string
  order_id: string | ShipmentOrderRef
  delivery_staff_id?: string | ShipmentStaffRef | null
  status: ShipmentStatus
  expected_delivery_at: string | null
  assigned_at: string | null
  delivered_at: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface ShipmentTrackingLogEntity {
  _id: string
  shipment_id: string
  status: string
  location: string | null
  note: string | null
  createdAt: string
  updatedAt: string
}

export interface ShipmentPagination {
  page: number
  limit: number
  totalItems: number
  totalPages: number
}

export interface ShipmentSummary {
  totalShipments: number
  pendingShipments: number
  assignedShipments: number
  inTransitShipments: number
  deliveredShipments: number
}

export interface ShipmentAdminListResponse {
  success: boolean
  data: {
    shipments: ShipmentEntity[]
    pagination: ShipmentPagination
    summary: ShipmentSummary
  }
}

export interface ShipmentListResponse {
  success: boolean
  data: ShipmentEntity[]
}

export interface ShipmentTrackingLogResponse {
  success: boolean
  data: ShipmentTrackingLogEntity[]
}

export interface ShipmentStaffListResponse {
  success: boolean
  data: ShipmentStaffRef[]
}

export interface ShipmentMutationResponse {
  success: boolean
  message?: string
  data: ShipmentEntity | ShipmentStaffRef
}

export interface ShipmentAssignPayload {
  order_id: string
  delivery_staff_id: string
  expected_delivery_at?: string | null
  note?: string | null
}

export interface ShipmentStatusUpdatePayload {
  status: ShipmentStatus
  location?: string | null
  note?: string | null
}

export interface ShipmentStaffCreatePayload {
  user_id: string
  name: string
  phone?: string | null
  email?: string | null
  status?: 'active' | 'inactive'
}
