import http from '../utils/axios.http'
import type { User, UserUpdatePayload } from '../types/user.type'

interface ProfileResponse {
  user: User
}

interface UpdateProfileResponse {
  message: string
  user: User
}

interface ChangePasswordPayload {
  oldPassword: string
  newPassword: string
}

interface ChangePasswordResponse {
  message: string
}

const userApi = {
  getProfile() {
    return http.get<ProfileResponse>('user/profile')
  },
  updateProfile(payload: UserUpdatePayload) {
    return http.put<UpdateProfileResponse>('user/profile', payload)
  },
  changePassword(payload: ChangePasswordPayload) {
    return http.put<ChangePasswordResponse>('user/change-password', payload)
  }
}

export default userApi
