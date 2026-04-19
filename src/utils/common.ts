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
    ? 'border-[#bdeed5] bg-[#eefaf3] text-[#14804a] dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-300'
    : 'border-[#f7d3d8] bg-[#fff2f4] text-[#c03747] dark:border-rose-900/60 dark:bg-rose-950/35 dark:text-rose-300'
}

export function roleTone(role: UserRole) {
  switch (role) {
    case 'admin':
      return 'border-[#e7dcff] bg-[#f4efff] text-[#6a4cc2] dark:border-violet-900/60 dark:bg-violet-950/35 dark:text-violet-300'
    case 'support':
      return 'border-[#d8edff] bg-[#eff8ff] text-[#2f78d1] dark:border-sky-900/60 dark:bg-sky-950/35 dark:text-sky-300'
    case 'shipper':
      return 'border-[#ffe5c7] bg-[#fff6eb] text-[#c67818] dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-300'
    default:
      return 'border-[#d8f0e2] bg-[#effaf4] text-[#2f8a57] dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-300'
  }
}

export function orderStatusTone(status: OrderStatus) {
  switch (status) {
    case 'pending':
      return 'border-[#ffe5c7] bg-[#fff6eb] text-[#c67818] dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-300'
    case 'confirmed':
      return 'border-[#d8edff] bg-[#eff8ff] text-[#2f78d1] dark:border-sky-900/60 dark:bg-sky-950/35 dark:text-sky-300'
    case 'shipping':
      return 'border-[#e7dcff] bg-[#f4efff] text-[#6a4cc2] dark:border-violet-900/60 dark:bg-violet-950/35 dark:text-violet-300'
    case 'completed':
      return 'border-[#d8f0e2] bg-[#effaf4] text-[#2f8a57] dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-300'
    case 'cancelled':
      return 'border-[#f7d3d8] bg-[#fff2f4] text-[#c03747] dark:border-rose-900/60 dark:bg-rose-950/35 dark:text-rose-300'
    default:
      return 'border-[#eceaf8] bg-[#f7f5ff] text-[#5f5a7a] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
  }
}

export function paymentStatusTone(status: PaymentStatus) {
  switch (status) {
    case 'paid':
      return 'border-[#d8f0e2] bg-[#effaf4] text-[#2f8a57] dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-300'
    case 'unpaid':
      return 'border-[#ffe5c7] bg-[#fff6eb] text-[#c67818] dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-300'
    case 'failed':
      return 'border-[#f7d3d8] bg-[#fff2f4] text-[#c03747] dark:border-rose-900/60 dark:bg-rose-950/35 dark:text-rose-300'
    default:
      return 'border-[#eceaf8] bg-[#f7f5ff] text-[#5f5a7a] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
  }
}

export function shipmentStatusTone(status: ShipmentStatus) {
  switch (status) {
    case 'pending':
      return 'border-[#ffe5c7] bg-[#fff6eb] text-[#c67818] dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-300'
    case 'assigned':
      return 'border-[#d8edff] bg-[#eff8ff] text-[#2f78d1] dark:border-sky-900/60 dark:bg-sky-950/35 dark:text-sky-300'
    case 'in_transit':
      return 'border-[#e7dcff] bg-[#f4efff] text-[#6a4cc2] dark:border-violet-900/60 dark:bg-violet-950/35 dark:text-violet-300'
    case 'delivered':
      return 'border-[#d8f0e2] bg-[#effaf4] text-[#2f8a57] dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-300'
    case 'failed':
      return 'border-[#f7d3d8] bg-[#fff2f4] text-[#c03747] dark:border-rose-900/60 dark:bg-rose-950/35 dark:text-rose-300'
    case 'cancelled':
      return 'border-[#f7d3d8] bg-[#fff2f4] text-[#c03747] dark:border-rose-900/60 dark:bg-rose-950/35 dark:text-rose-300'
    default:
      return 'border-[#eceaf8] bg-[#f7f5ff] text-[#5f5a7a] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
  }
}
