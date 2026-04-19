import type { PaymentStatus, OrderStatus } from '../../types/order.type'
import { orderStatusTone, paymentStatusTone } from '../../utils/common'

type BadgeVariant = 'order' | 'payment'

interface OrderStatusBadgeProps {
  variant: BadgeVariant
  status: OrderStatus | PaymentStatus
  className?: string
}

function toLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export default function OrderStatusBadge({ variant, status, className = '' }: OrderStatusBadgeProps) {
  const tone = variant === 'order' ? orderStatusTone(status as OrderStatus) : paymentStatusTone(status as PaymentStatus)

  return (
    <span
      className={`inline-flex h-7 items-center rounded-full border px-3 text-xs font-semibold tracking-wide ${tone} ${className}`.trim()}
    >
      {toLabel(status)}
    </span>
  )
}
