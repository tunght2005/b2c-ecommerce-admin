import http from '../utils/axios.http'
import type {
  ChatbotAnalyticsResponse,
  ChatbotConfigResponse,
  ChatbotHistoryResponse,
  ChatbotMessageResponse,
  ChatbotSearchProductsPayload,
  ChatbotSearchProductsResponse,
  ChatbotUnknownQueriesResponse
} from '../types/chatbot.type'

const CHATBOT_BASE_URL = 'chatbot'

const chatbotApi = {
  getHistory(limit = 100) {
    return http.get<ChatbotHistoryResponse>(`${CHATBOT_BASE_URL}/history`, {
      params: { limit }
    })
  },

  sendMessage(message: string) {
    return http.post<ChatbotMessageResponse>(`${CHATBOT_BASE_URL}/message`, { message })
  },

  searchProducts(payload: ChatbotSearchProductsPayload) {
    return http.post<ChatbotSearchProductsResponse>(`${CHATBOT_BASE_URL}/search-products`, payload)
  },

  getConfig() {
    return http.get<ChatbotConfigResponse>(`${CHATBOT_BASE_URL}/admin/config`)
  },

  updateStopWords(stopWords: string[]) {
    return http.post<ChatbotConfigResponse>(`${CHATBOT_BASE_URL}/admin/config/stop-words`, { stopWords })
  },

  getAnalytics(params?: { startDate?: string; endDate?: string; limit?: number }) {
    return http.get<ChatbotAnalyticsResponse>(`${CHATBOT_BASE_URL}/admin/analytics`, { params })
  },

  getUnknownQueries(params?: { page?: number; limit?: number }) {
    return http.get<ChatbotUnknownQueriesResponse>(`${CHATBOT_BASE_URL}/admin/unknown-queries`, { params })
  }
}

export default chatbotApi
