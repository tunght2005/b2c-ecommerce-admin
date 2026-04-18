import http from '../utils/axios.http'

export interface BannerEntity {
  _id: string
  title: string
  image: string
  link?: string | null
  position: 'top' | 'middle' | 'bottom'
  is_active: boolean
  createdAt?: string
  updatedAt?: string
}

export interface BannerCreatePayload {
  title: string
  image: File | string
  link?: string
  position?: 'top' | 'middle' | 'bottom'
}

export interface BannerUpdatePayload {
  title?: string
  image?: File | string
  link?: string
  position?: 'top' | 'middle' | 'bottom'
  is_active?: boolean
}

interface BannerListResponse {
  success: boolean
  message: string
  data: {
    banners: BannerEntity[]
    pagination: {
      page: number
      limit: number
      total: number
      pages: number
    }
  }
}

interface BannerDetailResponse {
  success: boolean
  message: string
  data: BannerEntity
}

interface BannerMutationResponse {
  success: boolean
  message: string
  data: BannerEntity
}

interface BannerDeleteResponse {
  success: boolean
  message: string
}

const BANNER_BASE_URL = 'banners'

const bannerApi = {
  list(params?: { page?: number; limit?: number; position?: string; is_active?: boolean }) {
    return http.get<BannerListResponse>(BANNER_BASE_URL, { params })
  },

  getById(id: string) {
    return http.get<BannerDetailResponse>(`${BANNER_BASE_URL}/${id}`)
  },

  create(payload: BannerCreatePayload) {
    const formData = new FormData()
    formData.append('title', payload.title)
    if (payload.image instanceof File) {
      formData.append('image', payload.image)
    } else {
      formData.append('image', payload.image)
    }
    if (payload.link) formData.append('link', payload.link)
    if (payload.position) formData.append('position', payload.position)

    return http.post<BannerMutationResponse>(BANNER_BASE_URL, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  update(id: string, payload: BannerUpdatePayload) {
    const formData = new FormData()
    if (payload.title) formData.append('title', payload.title)
    if (payload.image instanceof File) {
      formData.append('image', payload.image)
    } else if (payload.image) {
      formData.append('image', payload.image)
    }
    if (payload.link !== undefined) formData.append('link', payload.link || '')
    if (payload.position) formData.append('position', payload.position)
    if (payload.is_active !== undefined) formData.append('is_active', String(payload.is_active))

    return http.put<BannerMutationResponse>(`${BANNER_BASE_URL}/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  remove(id: string) {
    return http.delete<BannerDeleteResponse>(`${BANNER_BASE_URL}/${id}`)
  }
}

export default bannerApi
