import { type User } from '../types/user.type'

export const LocalStorageEventTarget = new EventTarget()

export const setAccessTokenToLS = (token: string) => localStorage.setItem('access_token', token)

export const getAccessTokenFromLS = () => localStorage.getItem('access_token') || ''

export const setRefreshTokenToLS = (token: string) => localStorage.setItem('refresh_token', token)

export const getRefreshTokenFromLS = () => localStorage.getItem('refresh_token') || ''

export const setProfileToLS = (profile: User) => {
  localStorage.setItem('profile', JSON.stringify(profile))
}

export const getProfileFromLS = () => {
  const data = localStorage.getItem('profile')
  return data ? JSON.parse(data) : null
}

export const clearLS = () => {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('profile')

  LocalStorageEventTarget.dispatchEvent(new Event('clearLS'))
}
