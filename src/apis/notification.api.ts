import http from '../utils/axios.http'

export interface NotificationEntity {
  _id: string
  user_id?: string | null
  type?: 'personal' | 'global'
  category?: 'system' | 'marketing'
  created_by?: string | null
  title: string
  content?: string | null
  is_read: boolean
  createdAt: string
  updatedAt: string
}

interface NotificationListResponse {
  notifications: NotificationEntity[]
}

interface NotificationCreatePayload {
  title: string
  content?: string
}

interface BroadcastCustomersResponse {
  message: string
  total: number
}

const NOTIFICATION_BASE_URL = 'notification'

const notificationApi = {
  create(payload: NotificationCreatePayload) {
    return http.post<{ message: string; notification: NotificationEntity }>(NOTIFICATION_BASE_URL, payload)
  },

  listMine() {
    return http.get<NotificationListResponse>(NOTIFICATION_BASE_URL)
  },

  markRead(id: string) {
    return http.patch<{ message: string; notification: NotificationEntity }>(`${NOTIFICATION_BASE_URL}/${id}/read`)
  },

  markAllRead() {
    return http.patch<{ message: string }>(`${NOTIFICATION_BASE_URL}/read-all`)
  },

  broadcastToAllUsers(payload: NotificationCreatePayload) {
    return http.post<BroadcastCustomersResponse>(`${NOTIFICATION_BASE_URL}/broadcast/all-users`, payload)
  }
}

export default notificationApi
