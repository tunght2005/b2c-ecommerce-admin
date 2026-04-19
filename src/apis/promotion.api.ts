import http from '../utils/axios.http'

export type PromotionType = 'normal' | 'flash_sale'
export type PromotionStatus = 'active' | 'inactive'

export interface PromotionEntity {
  _id: string
  name?: string
  type: PromotionType
  discount_type?: 'percent' | 'fixed'
  discount_value?: number
  priority?: number
  start_date?: string | null
  end_date?: string | null
  status: PromotionStatus
  createdAt?: string
  updatedAt?: string
}

export interface PromotionAssignmentEntity {
  _id: string
  promotion_id: PromotionEntity | string
  product_id:
    | {
        _id: string
        name?: string
        slug?: string
      }
    | string
  createdAt?: string
  updatedAt?: string
}

interface PromotionListQuery {
  type?: PromotionType
  status?: PromotionStatus
}

interface PromotionCreatePayload {
  name: string
  type: PromotionType
  discount_type: 'percent' | 'fixed'
  discount_value: number
  priority?: number
  start_date?: string
  end_date?: string
  status?: PromotionStatus
}

interface PromotionListResponse {
  message: string
  data: PromotionEntity[]
}

interface PromotionMutationResponse {
  message: string
  data: PromotionEntity
}

interface PromotionAssignmentListResponse {
  message: string
  data: PromotionAssignmentEntity[]
}

interface PromotionAssignmentMutationResponse {
  message: string
  data: PromotionAssignmentEntity[] | { deletedCount?: number }
}

const PROMOTION_BASE_URL = 'promotions'

const promotionApi = {
  list(params?: PromotionListQuery) {
    return http.get<PromotionListResponse>(PROMOTION_BASE_URL, { params })
  },

  create(payload: PromotionCreatePayload) {
    return http.post<PromotionMutationResponse>(PROMOTION_BASE_URL, payload)
  },

  update(id: string, payload: Partial<PromotionCreatePayload>) {
    return http.put<PromotionMutationResponse>(`${PROMOTION_BASE_URL}/${id}`, payload)
  },

  remove(id: string) {
    return http.delete<{ message: string }>(`${PROMOTION_BASE_URL}/${id}`)
  },

  assign(payload: { promotion_id: string; product_ids: string[] }) {
    return http.post<PromotionAssignmentMutationResponse>(`${PROMOTION_BASE_URL}/assign`, payload)
  },

  removeFromProduct(payload: { promotion_id: string; product_id: string }) {
    return http.post<PromotionAssignmentMutationResponse>(`${PROMOTION_BASE_URL}/remove`, payload)
  },

  listAssignments(params?: { promotion_id?: string; product_id?: string }) {
    return http.get<PromotionAssignmentListResponse>(`${PROMOTION_BASE_URL}/assignments`, { params })
  }
}

export default promotionApi
