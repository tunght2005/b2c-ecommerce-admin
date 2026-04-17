import http from '../utils/axios.http'
import type {
  EligibleOrderItemsResponse,
  PolicyProductLinkMutationResponse,
  PolicyProductLinkResponse,
  ReturnDetailResponse,
  ReturnMutationResponse,
  ReturnPoliciesResponse,
  ReturnPolicyMutationResponse,
  ReturnsListResponse,
  WarrantyListResponse,
  WarrantyMutationResponse,
  ReturnStatus,
  WarrantyStatus
} from '../types/after-sales.type'

const AFTER_SALES_BASE_URL = 'after-sales'

const afterSalesApi = {
  // Return policies
  listPolicies(isActive?: boolean) {
    return http.get<ReturnPoliciesResponse>(`${AFTER_SALES_BASE_URL}/return-policies`, {
      params: { is_active: isActive }
    })
  },

  createPolicy(payload: { name: string; description?: string; days_allowed: number; is_active?: boolean }) {
    return http.post<ReturnPolicyMutationResponse>(`${AFTER_SALES_BASE_URL}/return-policies`, payload)
  },

  updatePolicy(
    id: string,
    payload: Partial<{ name: string; description: string; days_allowed: number; is_active: boolean }>
  ) {
    return http.put<ReturnPolicyMutationResponse>(`${AFTER_SALES_BASE_URL}/return-policies/${id}`, payload)
  },

  listPolicyProductLinks() {
    return http.get<PolicyProductLinkResponse>(`${AFTER_SALES_BASE_URL}/return-policies/product-links`)
  },

  assignPolicyToProduct(payload: { product_id: string; policy_id: string }) {
    return http.post<PolicyProductLinkMutationResponse>(
      `${AFTER_SALES_BASE_URL}/return-policies/product-links`,
      payload
    )
  },

  // Returns
  listReturns(params?: { status?: ReturnStatus | 'all'; page?: number; limit?: number }) {
    return http.get<ReturnsListResponse>(`${AFTER_SALES_BASE_URL}/returns`, { params })
  },

  getReturnDetail(id: string) {
    return http.get<ReturnDetailResponse>(`${AFTER_SALES_BASE_URL}/returns/${id}`)
  },

  createReturn(payload: {
    order_item_id: string
    policy_id: string
    reason: string
    refund_amount?: number
    evidence_image?: string
  }) {
    return http.post<ReturnMutationResponse>(`${AFTER_SALES_BASE_URL}/returns`, payload)
  },

  updateReturnStatus(id: string, status: ReturnStatus) {
    return http.put<ReturnMutationResponse>(`${AFTER_SALES_BASE_URL}/returns/${id}/status`, { status })
  },

  listEligibleOrderItems(params?: { search?: string; page?: number; limit?: number }) {
    return http.get<EligibleOrderItemsResponse>(`${AFTER_SALES_BASE_URL}/returns/eligible-items`, { params })
  },

  // Warranty
  listWarranty(params?: { status?: WarrantyStatus | 'all'; page?: number; limit?: number }) {
    return http.get<WarrantyListResponse>(`${AFTER_SALES_BASE_URL}/warranty`, { params })
  },

  createWarranty(payload: {
    order_item_id: string
    warranty_period?: number
    start_date?: string
    description_issue?: string
  }) {
    return http.post<WarrantyMutationResponse>(`${AFTER_SALES_BASE_URL}/warranty`, payload)
  },

  updateWarrantyStatus(id: string, status: WarrantyStatus) {
    return http.put<WarrantyMutationResponse>(`${AFTER_SALES_BASE_URL}/warranty/${id}/status`, { status })
  },

  claimWarranty(id: string, description_issue: string) {
    return http.post<WarrantyMutationResponse>(`${AFTER_SALES_BASE_URL}/warranty/${id}/claim`, { description_issue })
  }
}

export default afterSalesApi
