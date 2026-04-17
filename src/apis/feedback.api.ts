import http from '../utils/axios.http'
import type {
  EligibleFeedbackOrdersResponse,
  FeedbackDetailResponse,
  FeedbackListResponse,
  FeedbackMutationResponse,
  FeedbackRepliesResponse,
  FeedbackPriority,
  FeedbackStatus
} from '../types/feedback.type'

const FEEDBACK_BASE_URL = 'feedback'

interface FeedbackListQuery {
  status?: FeedbackStatus | 'all'
  priority?: FeedbackPriority | 'all'
  page?: number
  limit?: number
}

interface FeedbackUpdatePayload {
  status?: FeedbackStatus
  priority?: FeedbackPriority
  assigned_to?: string | null
}

interface FeedbackReplyPayload {
  content: string
  is_internal?: boolean
}

const feedbackApi = {
  listAll(params?: FeedbackListQuery) {
    const normalizedParams = {
      ...params,
      status: params?.status === 'all' ? undefined : params?.status,
      priority: params?.priority === 'all' ? undefined : params?.priority
    }
    return http.get<FeedbackListResponse>(FEEDBACK_BASE_URL, { params: normalizedParams })
  },

  getDetail(id: string) {
    return http.get<FeedbackDetailResponse>(`${FEEDBACK_BASE_URL}/${id}`)
  },

  update(id: string, payload: FeedbackUpdatePayload) {
    return http.put<FeedbackMutationResponse>(`${FEEDBACK_BASE_URL}/${id}`, payload)
  },

  listReplies(id: string) {
    return http.get<FeedbackRepliesResponse>(`${FEEDBACK_BASE_URL}/${id}/replies`)
  },

  getEligibleOrders() {
    return http.get<EligibleFeedbackOrdersResponse>(`${FEEDBACK_BASE_URL}/eligible-orders`)
  },

  reply(id: string, payload: FeedbackReplyPayload) {
    return http.post<FeedbackMutationResponse>(`${FEEDBACK_BASE_URL}/${id}/reply`, payload)
  }
}

export default feedbackApi
