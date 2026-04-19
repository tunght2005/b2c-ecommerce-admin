import http from '../utils/axios.http'
import type {
  ShipmentAdminListResponse,
  ShipmentAssignPayload,
  ShipmentListResponse,
  ShipmentMutationResponse,
  ShipmentStaffCreatePayload,
  ShipmentStaffListResponse,
  ShipmentStatusUpdatePayload,
  ShipmentTrackingLogResponse
} from '../types/shipment.type'

const SHIPMENT_BASE_URL = 'shipment'

interface ShipmentAdminListQuery {
  status?: 'all' | string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

const shipmentApi = {
  listAll(params?: ShipmentAdminListQuery) {
    return http.get<ShipmentAdminListResponse>(`${SHIPMENT_BASE_URL}/admin/list`, { params })
  },

  assignedOrders() {
    return http.get<ShipmentListResponse>(`${SHIPMENT_BASE_URL}/assigned-orders`)
  },

  getTrackingLogs(id: string) {
    return http.get<ShipmentTrackingLogResponse>(`${SHIPMENT_BASE_URL}/${id}/logs`)
  },

  updateStatus(id: string, payload: ShipmentStatusUpdatePayload) {
    return http.patch<ShipmentMutationResponse>(`${SHIPMENT_BASE_URL}/${id}/status`, payload)
  },

  assign(payload: ShipmentAssignPayload) {
    return http.post<ShipmentMutationResponse>(`${SHIPMENT_BASE_URL}/assign`, payload)
  },

  autoAssign(payload: { order_id: string; expected_delivery_at?: string | null; note?: string | null }) {
    return http.post<ShipmentMutationResponse>(`${SHIPMENT_BASE_URL}/auto-assign`, payload)
  },

  listDeliveryStaff() {
    return http.get<ShipmentStaffListResponse>(`${SHIPMENT_BASE_URL}/delivery-staff`)
  },

  createDeliveryStaff(payload: ShipmentStaffCreatePayload) {
    return http.post<ShipmentMutationResponse>(`${SHIPMENT_BASE_URL}/delivery-staff`, payload)
  }
}

export default shipmentApi
