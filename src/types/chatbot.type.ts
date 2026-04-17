export type ChatMessageType = 'product_search' | 'greeting' | 'help' | 'other'

export interface ChatbotHistoryItem {
  _id: string
  user_id: string
  message: string
  response: string
  type: ChatMessageType
  keywords: string[]
  createdAt: string
  updatedAt: string
}

export interface ChatbotHistoryResponse {
  success: boolean
  count: number
  data: ChatbotHistoryItem[]
}

export interface ChatbotMessageResponse {
  success: boolean
  response: string
  type?: ChatMessageType
  keywords?: string[]
  products_count?: number
  products?: ChatbotProductItem[]
  created_at?: string
}

export interface ChatbotProductItem {
  id: string
  name: string
  description?: string
  price?: number
  brand?: string
  category?: string
  stock?: number
  rating?: number
}

export interface ChatbotSearchProductsPayload {
  keywords: string[]
}

export interface ChatbotSearchProductsResponse {
  success: boolean
  keywords: string[]
  products_count: number
  response: string
  data: ChatbotProductItem[]
}

export interface ChatbotConfigData {
  _id?: string
  configType?: string
  stopWords?: string[]
  responseTemplates?: {
    greeting?: string[]
    help?: string[]
    noProduct?: string[]
    foundProducts?: string[]
    productNotFound?: string[]
  }
  settings?: {
    minKeywordLength?: number
    maxProductResults?: number
    confidenceThreshold?: number
    rankingFactors?: {
      relevanceWeight?: number
      stockWeight?: number
      ratingWeight?: number
    }
  }
  updatedBy?: {
    _id?: string
    username?: string
    email?: string
  }
  isActive?: boolean
}

export interface ChatbotConfigResponse {
  success: boolean
  message?: string
  data: ChatbotConfigData
}

export interface ChatbotAnalyticsKeywordItem {
  _id: string
  count: number
}

export interface ChatbotAnalyticsTypeItem {
  _id: ChatMessageType
  count: number
}

export interface ChatbotAnalyticsResponse {
  success: boolean
  data: {
    topKeywords: ChatbotAnalyticsKeywordItem[]
    messageTypeDistribution: ChatbotAnalyticsTypeItem[]
    totalUsers: number
    totalMessages: number
  }
}

export interface ChatbotUnknownQueryItem {
  _id: {
    message: string
    keywords: string[]
  }
  count: number
  lastSeen: string
}

export interface ChatbotUnknownQueriesResponse {
  success: boolean
  count: number
  data: ChatbotUnknownQueryItem[]
}
