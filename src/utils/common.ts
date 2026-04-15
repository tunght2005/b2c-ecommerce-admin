import type { UserRole } from '../types/user.type'

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric'
})

const dateTimeFormat = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})

export function getInitials(username: string) {
  return username
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export function normalize(value: string) {
  return value.toLowerCase().trim()
}

export function formatDate(value: string) {
  return dateFormat.format(new Date(value))
}

export function formatDateTime(value: string) {
  return dateTimeFormat.format(new Date(value))
}

export function statusTone(status: string) {
  return status === 'active'
    ? 'border-[#bdeed5] bg-[#eefaf3] text-[#14804a]'
    : 'border-[#f7d3d8] bg-[#fff2f4] text-[#c03747]'
}

export function roleTone(role: UserRole) {
  switch (role) {
    case 'admin':
      return 'border-[#e7dcff] bg-[#f4efff] text-[#6a4cc2]'
    case 'support':
      return 'border-[#d8edff] bg-[#eff8ff] text-[#2f78d1]'
    case 'shipper':
      return 'border-[#ffe5c7] bg-[#fff6eb] text-[#c67818]'
    default:
      return 'border-[#d8f0e2] bg-[#effaf4] text-[#2f8a57]'
  }
}