import type { ShipmentStatus } from '../../types/shipment.type'
import { shipmentStatusTone } from '../../utils/common'

interface ShipmentStatusBadgeProps {
  status: ShipmentStatus
  className?: string
}

function toLabel(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export default function ShipmentStatusBadge({ status, className = '' }: ShipmentStatusBadgeProps) {
  return (
    <span
      className={`inline-flex h-7 items-center rounded-full border px-3 text-xs font-semibold tracking-wide ${shipmentStatusTone(status)} ${className}`.trim()}
    >
      {toLabel(status)}
    </span>
  )
}
