import http from '../utils/axios.http'

export interface VoucherEntity {
  _id: string
  code: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  min_order_value: number
  max_discount?: number | null
  quantity: number
  used_count: number
  start_date: string
  end_date: string
  status: 'active' | 'expired' | 'inactive'
  createdAt?: string
  updatedAt?: string
}

export interface VoucherCreatePayload {
  code: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  min_order_value: number
  max_discount?: number | null
  quantity: number
  start_date: string
  end_date: string
  status?: 'active' | 'expired' | 'inactive'
}

interface VoucherApplyPayload {
  code: string
  cart_total: number
}

interface VoucherMutationResponse {
  success: boolean
  message: string
  data: VoucherEntity
}

interface VoucherListResponse {
  success: boolean
  message: string
  data: {
    vouchers: VoucherEntity[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }
}

interface VoucherApplyResponse {
  success: boolean
  message: string
  data: {
    discount_amount: number
    final_total: number
    voucher: VoucherEntity
  }
}

const VOUCHER_BASE_URL = 'vouchers'

const voucherApi = {
  list(params?: { page?: number; limit?: number; status?: 'active' | 'expired' | 'inactive' | 'all'; code?: string }) {
    return http.get<VoucherListResponse>(VOUCHER_BASE_URL, { params })
  },

  create(payload: VoucherCreatePayload) {
    return http.post<VoucherMutationResponse>(`${VOUCHER_BASE_URL}/create`, payload)
  },

  update(id: string, payload: Partial<VoucherCreatePayload>) {
    return http.put<VoucherMutationResponse>(`${VOUCHER_BASE_URL}/${id}`, payload)
  },

  remove(id: string) {
    return http.delete<{ success: boolean; message: string; data: { id: string } }>(`${VOUCHER_BASE_URL}/${id}`)
  },

  apply(payload: VoucherApplyPayload) {
    return http.post<VoucherApplyResponse>(`${VOUCHER_BASE_URL}/apply`, payload)
  }
}

export default voucherApi
