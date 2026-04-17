import type { User } from './user.type'

export type FeedbackStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type FeedbackPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface FeedbackUserRef {
  _id: string
  username?: string
  email?: string
  role?: User['role']
}

export interface FeedbackOrderRef {
  _id: string
  final_price?: number
  status?: string
  payment_status?: string
}

export interface FeedbackProductRef {
  _id: string
  name?: string
  status?: string
}

export interface FeedbackEntity {
  _id: string
  user_id: string | FeedbackUserRef
  order_id?: string | FeedbackOrderRef | null
  product_id?: string | FeedbackProductRef | null
  title: string
  content: string
  status: FeedbackStatus
  priority: FeedbackPriority
  assigned_to?: string | FeedbackUserRef | null
  createdAt: string
  updatedAt: string
}

export interface FeedbackReplyEntity {
  _id: string
  feedback_id: string
  user_id: string | FeedbackUserRef
  content: string
  is_internal: boolean
  createdAt: string
  updatedAt: string
}

export interface FeedbackListPagination {
  page: number
  limit: number
  total: number
  pages: number
}

export interface FeedbackListResponse {
  success: boolean
  data: {
    feedbacks: FeedbackEntity[]
    pagination: FeedbackListPagination
  }
}

export interface FeedbackDetailResponse {
  success: boolean
  data: FeedbackEntity
}

export interface FeedbackRepliesResponse {
  success: boolean
  data: FeedbackReplyEntity[]
}

export interface FeedbackMutationResponse {
  success: boolean
  message?: string
  data: FeedbackEntity | FeedbackReplyEntity
}

export interface EligibleFeedbackOrder {
  _id: string
  final_price?: number
  status?: string
  payment_status?: string
  createdAt?: string
  updatedAt?: string
}

export interface EligibleFeedbackOrdersResponse {
  success: boolean
  data: EligibleFeedbackOrder[]
}
