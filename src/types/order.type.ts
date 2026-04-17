export type OrderStatus = 'pending' | 'confirmed' | 'shipping' | 'completed' | 'cancelled'
export type PaymentStatus = 'unpaid' | 'paid' | 'failed'

export interface OrderVariantRef {
  _id: string
  sku?: string
}

export interface OrderVoucherRef {
  _id: string
  code?: string
  discount_type?: string
  discount_value?: number
}

export interface OrderUserRef {
  _id: string
  username?: string
  email?: string
  phone?: string | null
  role?: string
}

export interface OrderShipperRef {
  _id: string
  name?: string
  email?: string | null
  phone?: string | null
  user_id?: string | OrderUserRef
}

export interface OrderShipmentRef {
  _id: string
  order_id: string
  status?: string
  delivery_staff_id?: string | OrderShipperRef | null
}

export interface OrderItem {
  variant_id: string | OrderVariantRef | null
  price: number
  quantity: number
}

export interface OrderEntity {
  _id: string
  user_id: string | OrderUserRef
  address_id: string
  items: OrderItem[]
  total_price: number
  discount_price: number
  final_price: number
  status: OrderStatus
  payment_status: PaymentStatus
  voucher_id?: string | OrderVoucherRef | null
  shipment?: OrderShipmentRef | null
  createdAt: string
  updatedAt: string
}

export interface OrderListResponse {
  success: boolean
  data: OrderEntity[]
}

export interface OrderMutationResponse {
  success: boolean
  message: string
  data: OrderEntity
}

export interface OrderPagination {
  page: number
  limit: number
  totalItems: number
  totalPages: number
}

export interface OrderSummary {
  totalOrders: number
  pendingOrders: number
  completedOrders: number
  cancelledOrders: number
  totalRevenue: number
}

export interface OrderAdminListResponse {
  success: boolean
  data: {
    orders: OrderEntity[]
    pagination: OrderPagination
    summary: OrderSummary
  }
}
