import type { PaymentStatus, OrderStatus } from '../types/order.type'
import type { ShipmentStatus } from '../types/shipment.type'
import type { UserRole, UserStatus } from '../types/user.type'

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

export function formatCurrency(value: number) {
  return `${value.toLocaleString('vi-VN')} VND`
}

export function resolveAssetUrl(path: string | null | undefined) {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path

  const apiBase = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') || ''
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  return `${apiBase}${normalizedPath}`
}

export function statusTone(status: UserStatus) {
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

export function orderStatusTone(status: OrderStatus) {
  switch (status) {
    case 'pending':
      return 'border-[#ffe5c7] bg-[#fff6eb] text-[#c67818]'
    case 'confirmed':
      return 'border-[#d8edff] bg-[#eff8ff] text-[#2f78d1]'
    case 'shipping':
      return 'border-[#e7dcff] bg-[#f4efff] text-[#6a4cc2]'
    case 'completed':
      return 'border-[#d8f0e2] bg-[#effaf4] text-[#2f8a57]'
    case 'cancelled':
      return 'border-[#f7d3d8] bg-[#fff2f4] text-[#c03747]'
    default:
      return 'border-[#eceaf8] bg-[#f7f5ff] text-[#5f5a7a]'
  }
}

export function paymentStatusTone(status: PaymentStatus) {
  switch (status) {
    case 'paid':
      return 'border-[#d8f0e2] bg-[#effaf4] text-[#2f8a57]'
    case 'unpaid':
      return 'border-[#ffe5c7] bg-[#fff6eb] text-[#c67818]'
    case 'failed':
      return 'border-[#f7d3d8] bg-[#fff2f4] text-[#c03747]'
    default:
      return 'border-[#eceaf8] bg-[#f7f5ff] text-[#5f5a7a]'
  }
}

export function shipmentStatusTone(status: ShipmentStatus) {
  switch (status) {
    case 'pending':
      return 'border-[#ffe5c7] bg-[#fff6eb] text-[#c67818]'
    case 'assigned':
      return 'border-[#d8edff] bg-[#eff8ff] text-[#2f78d1]'
    case 'in_transit':
      return 'border-[#e7dcff] bg-[#f4efff] text-[#6a4cc2]'
    case 'delivered':
      return 'border-[#d8f0e2] bg-[#effaf4] text-[#2f8a57]'
    case 'failed':
      return 'border-[#f7d3d8] bg-[#fff2f4] text-[#c03747]'
    case 'cancelled':
      return 'border-[#f7d3d8] bg-[#fff2f4] text-[#c03747]'
    default:
      return 'border-[#eceaf8] bg-[#f7f5ff] text-[#5f5a7a]'
  }
}
