export type ReturnStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED'
export type WarrantyStatus = 'ACTIVE' | 'EXPIRED' | 'CLAIMED'

export interface ReturnPolicyEntity {
  _id: string
  name: string
  description: string
  days_allowed: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ProductRef {
  _id: string
  name?: string
  status?: string
}

export interface PolicyProductLink {
  _id: string
  product_id: string | ProductRef
  policy_id: string | ReturnPolicyEntity
  created_at: string
  updated_at: string
}

export interface EligibleOrderItem {
  order_item_id: string
  order_id: string
  created_at: string
  quantity: number
  price: number
  customer?: {
    _id: string
    username?: string
    email?: string
  }
  variant?: {
    _id: string
    sku?: string
  }
  product?: {
    _id: string
    name?: string
    status?: string
  }
}

export interface ReturnRequestEntity {
  _id: string
  order_item_id: string
  policy_id: string | ReturnPolicyEntity
  reason: string
  status: ReturnStatus
  refund_amount: number
  evidence_image: string
  approved_at: string | null
  created_by?: {
    _id: string
    username?: string
    email?: string
    role?: string
  }
  created_at: string
  updated_at: string
}

export interface WarrantyEntity {
  _id: string
  order_item_id: string
  warranty_period: number
  start_date: string
  end_date: string
  status: WarrantyStatus
  claim_count: number
  description_issue: string
  created_at: string
  updated_at: string
}

export interface CommonPagination {
  page: number
  limit: number
  totalItems: number
  totalPages: number
}

export interface SimpleSuccessResponse<T> {
  success: boolean
  message?: string
  data: T
}

export type ReturnPoliciesResponse = SimpleSuccessResponse<ReturnPolicyEntity[]>
export type ReturnPolicyMutationResponse = SimpleSuccessResponse<ReturnPolicyEntity>

export type PolicyProductLinkResponse = SimpleSuccessResponse<PolicyProductLink[]>
export type PolicyProductLinkMutationResponse = SimpleSuccessResponse<PolicyProductLink>

export type ReturnsListResponse = SimpleSuccessResponse<{
  returns: ReturnRequestEntity[]
  pagination: CommonPagination
}>

export type ReturnDetailResponse = SimpleSuccessResponse<ReturnRequestEntity>
export type ReturnMutationResponse = SimpleSuccessResponse<ReturnRequestEntity>

export type EligibleOrderItemsResponse = SimpleSuccessResponse<{
  items: EligibleOrderItem[]
  pagination: CommonPagination
}>

export type WarrantyListResponse = SimpleSuccessResponse<{
  records: WarrantyEntity[]
  pagination: CommonPagination
}>

export type WarrantyMutationResponse = SimpleSuccessResponse<WarrantyEntity>
