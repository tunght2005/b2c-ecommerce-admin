import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Route, Clock3 } from 'lucide-react'

import { OrderStatusBadge, OrderStatsCards } from '../../components/Order'
import { ShipmentStatusBadge } from '../../components/Shipment'
import shipmentApi from '../../apis/shipment.api'
import { useAuth } from '../../contexts/app.context'
import type {
  ShipmentEntity,
  ShipmentTrackingLogEntity,
  ShipmentSummary,
  ShipmentStatus
} from '../../types/shipment.type'
import { formatDateTime, formatCurrency } from '../../utils/common'

const SHIPMENT_STATUS_OPTIONS: Array<'all' | ShipmentStatus> = [
  'all',
  'pending',
  'assigned',
  'in_transit',
  'delivered',
  'failed',
  'cancelled'
]

function getBuyer(shipment: ShipmentEntity) {
  const order = typeof shipment.order_id === 'object' && shipment.order_id ? shipment.order_id : null
  const buyer = order && typeof order.user_id === 'object' ? order.user_id : null
  return buyer?.username || buyer?.email || 'N/A'
}

function getShipper(shipment: ShipmentEntity) {
  const staff =
    typeof shipment.delivery_staff_id === 'object' && shipment.delivery_staff_id ? shipment.delivery_staff_id : null
  if (!staff) return 'Chưa gán'
  const staffUser = typeof staff.user_id === 'object' && staff.user_id ? staff.user_id : null
  return staff.name || staffUser?.username || 'N/A'
}

function getShipmentSearchText(shipment: ShipmentEntity) {
  const order = typeof shipment.order_id === 'object' && shipment.order_id ? shipment.order_id : null
  const buyer = order && typeof order.user_id === 'object' ? order.user_id : null
  const shipper =
    typeof shipment.delivery_staff_id === 'object' && shipment.delivery_staff_id ? shipment.delivery_staff_id : null
  const shipperUser = shipper && typeof shipper.user_id === 'object' ? shipper.user_id : null

  return [
    shipment._id,
    order?._id,
    order?.status,
    buyer?.username,
    buyer?.email,
    shipper?.name,
    shipperUser?.username,
    shipperUser?.email
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export default function TrackingLogsPage() {
  const { role } = useAuth()
  const isAdmin = role === 'admin'
  const isSupport = role === 'support'
  const isShipper = role === 'shipper'
  const canViewAllShipments = isAdmin || isSupport

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ShipmentStatus>('all')
  const [selectedShipmentId, setSelectedShipmentId] = useState<string>('')

  const shipmentsQuery = useQuery({
    queryKey: ['tracking-shipments', role],
    queryFn: async () => {
      if (canViewAllShipments) {
        const pageSizeForFetch = 100
        let page = 1
        let totalPages = 1
        let summary: ShipmentSummary | null = null
        const shipments: ShipmentEntity[] = []

        do {
          const response = await shipmentApi.listAll({
            page,
            limit: pageSizeForFetch,
            sortBy: 'createdAt',
            sortOrder: 'desc'
          })
          const payload = response.data.data
          shipments.push(...payload.shipments)
          summary = payload.summary
          totalPages = payload.pagination.totalPages
          page += 1
        } while (page <= totalPages)

        return { shipments, summary }
      }

      if (isShipper) {
        const response = await shipmentApi.assignedOrders()
        return { shipments: response.data.data, summary: null }
      }

      return { shipments: [] as ShipmentEntity[], summary: null }
    },
    placeholderData: (previousData) => previousData
  })

  const shipments = shipmentsQuery.data?.shipments ?? []

  const filteredShipments = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return shipments.filter((shipment) => {
      if (statusFilter !== 'all' && shipment.status !== statusFilter) return false
      if (!normalizedSearch) return true
      return getShipmentSearchText(shipment).includes(normalizedSearch)
    })
  }, [search, shipments, statusFilter])

  const selectedShipment =
    filteredShipments.find((shipment) => shipment._id === selectedShipmentId) ?? filteredShipments[0] ?? null

  const logsQuery = useQuery({
    queryKey: ['tracking-logs', selectedShipment?._id],
    queryFn: async () => {
      if (!selectedShipment?._id) return [] as ShipmentTrackingLogEntity[]
      const response = await shipmentApi.getTrackingLogs(selectedShipment._id)
      return response.data.data
    },
    enabled: Boolean(selectedShipment?._id),
    placeholderData: (previousData) => previousData
  })

  const stats = shipmentsQuery.data?.summary
    ? [
        {
          label: 'Total Shipments',
          value: shipmentsQuery.data.summary.totalShipments,
          tone: 'from-[#6f62cf] to-[#8a7bf2]'
        },
        {
          label: 'Assigned',
          value: shipmentsQuery.data.summary.assignedShipments,
          tone: 'from-[#2f86d6] to-[#65b4ff]'
        },
        {
          label: 'In Transit',
          value: shipmentsQuery.data.summary.inTransitShipments,
          tone: 'from-[#f08c44] to-[#f7b36d]'
        },
        {
          label: 'Delivered',
          value: shipmentsQuery.data.summary.deliveredShipments,
          tone: 'from-[#2fb67a] to-[#5dd7a0]'
        }
      ]
    : [
        { label: 'Total Shipments', value: shipments.length, tone: 'from-[#6f62cf] to-[#8a7bf2]' },
        {
          label: 'Assigned',
          value: shipments.filter((item) => item.status === 'assigned').length,
          tone: 'from-[#2f86d6] to-[#65b4ff]'
        },
        {
          label: 'In Transit',
          value: shipments.filter((item) => item.status === 'in_transit').length,
          tone: 'from-[#f08c44] to-[#f7b36d]'
        },
        {
          label: 'Delivered',
          value: shipments.filter((item) => item.status === 'delivered').length,
          tone: 'from-[#2fb67a] to-[#5dd7a0]'
        }
      ]

  if (!canViewAllShipments && !isShipper) {
    return (
      <section className='rounded-[30px] border border-[#eceaf8] bg-white p-6 shadow-[0_18px_50px_rgba(27,23,64,0.08)]'>
        <p className='text-lg font-bold text-[#201f47]'>Tracking Logs</p>
        <p className='mt-2 text-sm text-[#6d6a8a]'>Trang này chỉ dành cho admin, support và shipper.</p>
      </section>
    )
  }

  return (
    <section className='space-y-5 pb-4'>
      <div className='flex flex-wrap items-end justify-between gap-3'>
        <div>
          <p className='text-sm font-semibold uppercase tracking-[0.24em] text-[#8a84ad]'>Shipment Management</p>
          <h1 className='mt-2 text-3xl font-black tracking-tight text-[#201f47]'>Tracking Logs</h1>
          <p className='mt-2 max-w-2xl text-sm leading-6 text-[#6d6a8a]'>
            Theo dõi lịch sử trạng thái shipment theo timeline vận hành.
          </p>
        </div>
      </div>

      <OrderStatsCards items={stats} />

      <div className='grid gap-5 xl:grid-cols-[1.1fr_1.4fr]'>
        <div className='rounded-[30px] border border-[#eceaf8] bg-white p-5 shadow-[0_18px_50px_rgba(27,23,64,0.08)]'>
          <div className='flex items-center justify-between gap-3'>
            <div>
              <h2 className='text-xl font-bold text-[#212047]'>Shipments</h2>
              <p className='mt-1 text-sm text-[#7a7697]'>{filteredShipments.length} found</p>
            </div>
            <div className='relative'>
              <Search className='pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#9d98bf]' />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className='h-11 w-64 rounded-full border border-[#e5e1f3] bg-[#fbfaff] pr-4 pl-10 text-sm text-[#2d2950] outline-none'
                placeholder='Search shipment / order / buyer...'
              />
            </div>
          </div>

          <div className='mt-4'>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | ShipmentStatus)}
              className='h-11 w-full rounded-full border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm text-[#2d2950] outline-none'
            >
              {SHIPMENT_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status === 'all' ? 'All statuses' : status}
                </option>
              ))}
            </select>
          </div>

          <div className='mt-4 max-h-[640px] overflow-auto space-y-2 pr-1'>
            {filteredShipments.length > 0 ? (
              filteredShipments.map((shipment) => (
                <button
                  key={shipment._id}
                  type='button'
                  onClick={() => setSelectedShipmentId(shipment._id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    selectedShipment?._id === shipment._id
                      ? 'border-[#bcb3ea] bg-[#f7f5ff]'
                      : 'border-[#eceaf8] bg-white hover:bg-[#fbfaff]'
                  }`}
                >
                  <div className='flex items-start justify-between gap-3'>
                    <div>
                      <p className='text-sm font-bold text-[#28244f]'>#{shipment._id.slice(-8).toUpperCase()}</p>
                      <p className='mt-1 text-xs text-[#8f8aac]'>
                        Order:{' '}
                        {typeof shipment.order_id === 'object' && shipment.order_id
                          ? shipment.order_id._id.slice(-8).toUpperCase()
                          : String(shipment.order_id || 'N/A')
                              .slice(-8)
                              .toUpperCase()}
                      </p>
                      <p className='mt-1 text-xs text-[#8f8aac]'>Buyer: {getBuyer(shipment)}</p>
                    </div>
                    <ShipmentStatusBadge status={shipment.status} />
                  </div>
                  <div className='mt-3 flex items-center justify-between text-xs text-[#7a7697]'>
                    <span>Shipper: {getShipper(shipment)}</span>
                    <span>
                      <Clock3 className='inline h-3.5 w-3.5' /> {formatDateTime(shipment.updatedAt)}
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <div className='rounded-2xl border border-dashed border-[#e5e1f3] p-8 text-center text-sm text-[#7a7697]'>
                No shipments match your filters.
              </div>
            )}
          </div>
        </div>

        <div className='rounded-[30px] border border-[#eceaf8] bg-white p-5 shadow-[0_18px_50px_rgba(27,23,64,0.08)]'>
          {selectedShipment ? (
            <>
              <div className='flex flex-wrap items-start justify-between gap-3'>
                <div>
                  <p className='text-sm font-semibold uppercase tracking-[0.24em] text-[#8a84ad]'>Selected Shipment</p>
                  <h2 className='mt-2 text-2xl font-black tracking-tight text-[#201f47]'>{selectedShipment._id}</h2>
                  <p className='mt-1 text-sm text-[#7a7697]'>
                    Order{' '}
                    {typeof selectedShipment.order_id === 'object' && selectedShipment.order_id
                      ? selectedShipment.order_id._id
                      : selectedShipment.order_id || 'N/A'}
                  </p>
                </div>
                <ShipmentStatusBadge status={selectedShipment.status} />
              </div>

              <div className='mt-5 grid gap-3 md:grid-cols-3'>
                <article className='rounded-2xl border border-[#eceaf8] p-4'>
                  <p className='text-xs uppercase tracking-[0.15em] text-[#9b97b9]'>Buyer</p>
                  <p className='mt-2 text-sm font-semibold text-[#2d2950]'>{getBuyer(selectedShipment)}</p>
                  <p className='mt-1 text-xs text-[#7a7697]'>
                    {typeof selectedShipment.order_id === 'object' && selectedShipment.order_id
                      ? selectedShipment.order_id.user_id && typeof selectedShipment.order_id.user_id === 'object'
                        ? selectedShipment.order_id.user_id.email || 'N/A'
                        : 'N/A'
                      : 'N/A'}
                  </p>
                </article>
                <article className='rounded-2xl border border-[#eceaf8] p-4'>
                  <p className='text-xs uppercase tracking-[0.15em] text-[#9b97b9]'>Shipper</p>
                  <p className='mt-2 text-sm font-semibold text-[#2d2950]'>{getShipper(selectedShipment)}</p>
                  <p className='mt-1 text-xs text-[#7a7697]'>
                    {typeof selectedShipment.delivery_staff_id === 'object' && selectedShipment.delivery_staff_id
                      ? selectedShipment.delivery_staff_id.email || 'N/A'
                      : 'N/A'}
                  </p>
                </article>
                <article className='rounded-2xl border border-[#eceaf8] p-4'>
                  <p className='text-xs uppercase tracking-[0.15em] text-[#9b97b9]'>Order Total</p>
                  <p className='mt-2 text-lg font-bold text-[#2f8a57]'>
                    {typeof selectedShipment.order_id === 'object' && selectedShipment.order_id
                      ? formatCurrency(selectedShipment.order_id.final_price)
                      : 'N/A'}
                  </p>
                </article>
              </div>

              {typeof selectedShipment.order_id === 'object' && selectedShipment.order_id ? (
                <div className='mt-4 rounded-2xl border border-[#eceaf8] p-4'>
                  <p className='text-xs uppercase tracking-[0.15em] text-[#9b97b9]'>Order Status</p>
                  <div className='mt-2'>
                    <OrderStatusBadge variant='order' status={selectedShipment.order_id.status as any} />
                  </div>
                </div>
              ) : null}

              <div className='mt-5 overflow-hidden rounded-[26px] border border-[#eceaf8]'>
                <table className='min-w-full divide-y divide-[#eceaf8]'>
                  <thead className='bg-[#faf9ff] text-left text-xs font-bold uppercase tracking-[0.18em] text-[#7f7a9e]'>
                    <tr>
                      <th className='px-4 py-3'>Status</th>
                      <th className='px-4 py-3'>Location</th>
                      <th className='px-4 py-3'>Note</th>
                      <th className='px-4 py-3'>Created</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-[#f0edf8] bg-white'>
                    {(logsQuery.data ?? []).length > 0 ? (
                      (logsQuery.data ?? []).map((log) => (
                        <tr key={log._id}>
                          <td className='px-4 py-3'>
                            <ShipmentStatusBadge status={log.status as ShipmentStatus} />
                          </td>
                          <td className='px-4 py-3 text-sm text-[#2d2950]'>{log.location || 'N/A'}</td>
                          <td className='px-4 py-3 text-sm text-[#5f5a7a]'>{log.note || 'No note'}</td>
                          <td className='px-4 py-3 text-sm text-[#5f5a7a]'>{formatDateTime(log.createdAt)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className='px-4 py-10 text-center text-sm text-[#7a7697]'>
                          No tracking logs available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className='mt-4 rounded-2xl border border-[#eceaf8] p-4'>
                <div className='flex items-center gap-2 text-[#6f62cf]'>
                  <Route className='h-4 w-4' />
                  <p className='text-sm font-bold'>Current Shipment Notes</p>
                </div>
                <p className='mt-2 text-sm leading-6 text-[#5f5a7a]'>
                  {selectedShipment.notes || 'No notes available.'}
                </p>
              </div>
            </>
          ) : (
            <div className='flex h-full min-h-[540px] items-center justify-center rounded-3xl border border-dashed border-[#e5e1f3] bg-[#fbfaff] p-8 text-center text-sm text-[#7a7697]'>
              Select a shipment to view tracking logs.
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
