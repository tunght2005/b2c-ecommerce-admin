import http from '../utils/axios.http'

interface ReviewUserRef {
  _id: string
  username?: string
  email?: string
  role?: string
}

interface ReviewProductRef {
  _id: string
  name?: string
  slug?: string
}

interface ReviewReply {
  content?: string
  user_id?: string | ReviewUserRef
  role?: 'admin' | 'support'
  createdAt?: string
  updatedAt?: string
}

export interface ReviewEntity {
  _id: string
  user_id: string | ReviewUserRef
  product_id: string | ReviewProductRef
  rating: number
  content: string
  admin_reply?: ReviewReply
  createdAt: string
  updatedAt: string
}

interface ProductReviewSummary {
  averageRating: number
  totalReviews: number
}

interface ProductReviewPagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface ProductReviewsPayload {
  reviews: ReviewEntity[]
  pagination: ProductReviewPagination
  summary: ProductReviewSummary
}

interface ProductReviewsResponse {
  success: boolean
  data: ProductReviewsPayload
}

interface AdminReviewsResponse {
  success: boolean
  data: {
    reviews: ReviewEntity[]
    pagination: ProductReviewPagination
  }
}

const REVIEW_BASE_URL = 'reviews'

const reviewApi = {
  listByProduct(productId: string, params?: { page?: number; limit?: number }) {
    return http.get<ProductReviewsResponse>(`${REVIEW_BASE_URL}/product/${productId}`, { params })
  },

  listAdmin(params?: { page?: number; limit?: number; product_id?: string; user_id?: string; rating?: number }) {
    return http.get<AdminReviewsResponse>(`${REVIEW_BASE_URL}/admin/all`, { params })
  },

  removeByAdmin(id: string) {
    return http.delete<{ success: boolean; message: string }>(`${REVIEW_BASE_URL}/admin/${id}`)
  },

  replyByAdmin(id: string, payload: { content: string }) {
    return http.put<{ success: boolean; message: string; data: ReviewEntity }>(
      `${REVIEW_BASE_URL}/admin/${id}/reply`,
      payload
    )
  }
}

export default reviewApi
