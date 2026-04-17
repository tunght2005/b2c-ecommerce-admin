import http from '../utils/axios.http'
import type { OrderAdminListResponse, OrderListResponse, OrderMutationResponse } from '../types/order.type'

const ORDER_BASE_URL = 'order'

interface OrderListQueryParams {
  search?: string
  status?: 'all' | string
  payment_status?: 'all' | string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

const orderApi = {
  listMine() {
    return http.get<OrderListResponse>(ORDER_BASE_URL)
  },

  listAllAdmin(params?: OrderListQueryParams) {
    return http.get<OrderAdminListResponse>(`${ORDER_BASE_URL}/admin/list`, { params })
  },

  confirm(id: string) {
    return http.patch<OrderMutationResponse>(`${ORDER_BASE_URL}/${id}/confirm`)
  },

  cancel(id: string) {
    return http.put<OrderMutationResponse>(`${ORDER_BASE_URL}/cancel/${id}`)
  },

  remove(id: string) {
    return http.delete<OrderMutationResponse>(`${ORDER_BASE_URL}/${id}`)
  }
}

export default orderApi
