import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, MapPin, RefreshCcw, BadgeInfo } from 'lucide-react'
import { toast } from 'react-toastify'

import Pagination from '../../components/Pagination'
import CrudActionButtons from '../../components/CrudActionButtons'
import { OrderStatusBadge, OrderStatsCards } from '../../components/Order'
import { ShipmentStatusBadge } from '../../components/Shipment'
import shipmentApi from '../../apis/shipment.api'
import { useAuth } from '../../contexts/app.context'
import type { OrderStatus } from '../../types/order.type'
import type { ShipmentEntity, ShipmentStatus, ShipmentSummary } from '../../types/shipment.type'
import { formatCurrency, formatDateTime } from '../../utils/common'

type SortKey = 'createdAt' | 'updatedAt' | 'status' | 'expected_delivery_at' | 'assigned_at' | 'delivered_at'

const SHIPMENT_STATUS_OPTIONS: Array<'all' | ShipmentStatus> = [
  'all',
  'pending',
  'assigned',
  'in_transit',
  'delivered',
  'failed',
  'cancelled'
]

const SHIPPER_STATUS_OPTIONS: ShipmentStatus[] = ['in_transit', 'delivered', 'failed']
const ADMIN_STATUS_FLOW: Record<ShipmentStatus, ShipmentStatus[]> = {
  pending: ['assigned', 'cancelled'],
  assigned: ['in_transit', 'cancelled', 'failed'],
  in_transit: ['delivered', 'failed'],
  delivered: [],
  failed: ['in_transit'],
  cancelled: []
}

const DEFAULT_SHOP_LOCATION = 'Kho shop'
const MAP_COUNTRY_HINT = 'Việt Nam'

interface PresetOption {
  label: string
  value: string
}

function normalizeVietnamPlace(place: string) {
  const normalized = place.trim()

  if (!normalized) {
    return MAP_COUNTRY_HINT
  }

  const hasVietnamHint = /viet\s*nam|việt\s*nam|vietnam|\bvn\b/i.test(normalized)
  return hasVietnamHint ? normalized : `${normalized}, ${MAP_COUNTRY_HINT}`
}

function getBuyerName(shipment: ShipmentEntity) {
  const order = typeof shipment.order_id === 'object' && shipment.order_id ? shipment.order_id : null
  const buyer = order && typeof order.user_id === 'object' ? order.user_id : null
  return buyer?.username || 'N/A'
}

function getBuyerContact(shipment: ShipmentEntity) {
  const order = typeof shipment.order_id === 'object' && shipment.order_id ? shipment.order_id : null
  const buyer = order && typeof order.user_id === 'object' ? order.user_id : null
  return buyer?.email || buyer?.phone || 'N/A'
}

function getDeliveryAddress(shipment: ShipmentEntity) {
  const shipmentAddress =
    typeof shipment.delivery_address_id === 'object' && shipment.delivery_address_id
      ? shipment.delivery_address_id
      : null
  const order = typeof shipment.order_id === 'object' && shipment.order_id ? shipment.order_id : null
  const orderAddress = order && typeof order.address_id === 'object' ? order.address_id : null
  const address = shipmentAddress || orderAddress

  if (!address) {
    return {
      receiver: 'N/A',
      phone: 'N/A',
      location: 'N/A'
    }
  }

  const location = [address.detail, address.ward, address.district, address.province].filter(Boolean).join(', ')

  return {
    receiver: address.receiver_name || 'N/A',
    phone: address.phone || 'N/A',
    location: location || 'N/A'
  }
}

function getOrderId(shipment: ShipmentEntity) {
  return typeof shipment.order_id === 'object' && shipment.order_id ? shipment.order_id._id : shipment.order_id || 'N/A'
}

function getShipperName(shipment: ShipmentEntity) {
  const staff =
    typeof shipment.delivery_staff_id === 'object' && shipment.delivery_staff_id ? shipment.delivery_staff_id : null
  if (!staff) return 'Chưa gán'
  const staffUser = typeof staff.user_id === 'object' && staff.user_id ? staff.user_id : null
  return staff.name || staffUser?.username || 'N/A'
}

function getShipperContact(shipment: ShipmentEntity) {
  const staff =
    typeof shipment.delivery_staff_id === 'object' && shipment.delivery_staff_id ? shipment.delivery_staff_id : null
  if (!staff) return 'N/A'
  const staffUser = typeof staff.user_id === 'object' && staff.user_id ? staff.user_id : null
  return staff.email || staffUser?.email || staff.phone || staffUser?.phone || 'N/A'
}

function getShipmentSearchText(shipment: ShipmentEntity) {
  const order = typeof shipment.order_id === 'object' && shipment.order_id ? shipment.order_id : null
  const shipper =
    typeof shipment.delivery_staff_id === 'object' && shipment.delivery_staff_id ? shipment.delivery_staff_id : null
  const shipperUser = shipper && typeof shipper.user_id === 'object' ? shipper.user_id : null
  const buyer = order && typeof order.user_id === 'object' ? order.user_id : null

  return [
    shipment._id,
    getOrderId(shipment),
    shipment.status,
    order?.status,
    order?.payment_status,
    buyer?.username,
    buyer?.email,
    getDeliveryAddress(shipment).receiver,
    getDeliveryAddress(shipment).phone,
    getDeliveryAddress(shipment).location,
    shipper?.name,
    shipperUser?.username,
    shipperUser?.email
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function getAllowedStatuses(shipment: ShipmentEntity, isShipper: boolean) {
  if (isShipper) return SHIPPER_STATUS_OPTIONS
  return ADMIN_STATUS_FLOW[shipment.status] || []
}

function getLocationPresetsByStatus(status: ShipmentStatus, shipment: ShipmentEntity): PresetOption[] {
  const destination = getDeliveryAddress(shipment).location

  if (status === 'assigned') {
    return [
      { label: 'Đã nhận đơn tại kho shop 7Store', value: 'Đã nhận đơn tại kho shop 7Store' },
      { label: 'Chờ xuất kho', value: 'Chờ xuất kho' }
    ]
  }

  if (status === 'in_transit') {
    return [
      {
        label: 'Đang đi tới điểm giao hàng',
        value: `Đang vận chuyển từ ${DEFAULT_SHOP_LOCATION} đến ${destination}`
      },
      {
        label: 'Đang đến điểm giao',
        value: `Đang đến điểm giao: ${destination}`
      }
    ]
  }

  if (status === 'delivered') {
    return [
      {
        label: 'Đã giao thành công tại địa chỉ khách',
        value: `Đã giao thành công tại ${destination}`
      },
      {
        label: 'Đã giao và xác nhận người nhận',
        value: 'Đã giao và xác nhận với người nhận'
      }
    ]
  }

  if (status === 'failed') {
    return [
      {
        label: 'Không giao được tại địa chỉ hiện tại',
        value: `Không giao được tại ${destination}`
      },
      {
        label: 'Khách hẹn giao lại',
        value: 'Khách hẹn giao lại vào khung giờ khác'
      }
    ]
  }

  return []
}

function getNotePresetsByStatus(status: ShipmentStatus): PresetOption[] {
  if (status === 'assigned') {
    return [
      { label: 'Đã nhận shipment', value: 'Đã nhận shipment và sẵn sàng giao hàng' },
      { label: 'Đang chờ xuất kho', value: 'Đang chờ xuất kho theo lịch' }
    ]
  }

  if (status === 'in_transit') {
    return [
      { label: 'Đang vận chuyển', value: 'Đang vận chuyển đến địa chỉ khách' },
      { label: 'Sắp tới nơi', value: 'Shipper sắp tới điểm giao, vui lòng nghe máy' }
    ]
  }

  if (status === 'delivered') {
    return [
      { label: 'Giao thành công', value: 'Giao thành công và khách đã nhận hàng' },
      { label: 'Đã hoàn tất shipment', value: 'Đã hoàn tất shipment' }
    ]
  }

  if (status === 'failed') {
    return [
      { label: 'Khách không nghe máy', value: 'Khách không nghe máy, tạm hoãn giao' },
      { label: 'Khách hẹn lại', value: 'Khách hẹn lịch giao lại vào thời gian khác' }
    ]
  }

  return []
}

function buildMapRouteUrl(shipment: ShipmentEntity, originInput: string) {
  const destination = getDeliveryAddress(shipment).location

  if (!destination || destination === 'N/A') {
    return null
  }

  const origin = normalizeVietnamPlace(originInput.trim() || DEFAULT_SHOP_LOCATION)
  const destinationInVn = normalizeVietnamPlace(destination)
  const params = new URLSearchParams({
    api: '1',
    origin,
    destination: destinationInVn,
    travelmode: 'driving',
    hl: 'vi',
    gl: 'vn',
    region: 'vn'
  })

  return `https://www.google.com/maps/dir/?${params.toString()}`
}

function buildDestinationEmbedMapUrl(shipment: ShipmentEntity) {
  const destination = getDeliveryAddress(shipment).location

  if (!destination || destination === 'N/A') {
    return null
  }

  const destinationInVn = normalizeVietnamPlace(destination)
  const params = new URLSearchParams({
    q: destinationInVn,
    z: '15',
    output: 'embed',
    hl: 'vi',
    gl: 'vn'
  })

  return `https://maps.google.com/maps?${params.toString()}`
}

function buildRouteEmbedMapUrl(shipment: ShipmentEntity, originInput: string) {
  const destination = getDeliveryAddress(shipment).location

  if (!destination || destination === 'N/A') {
    return null
  }

  const origin = normalizeVietnamPlace(originInput.trim() || DEFAULT_SHOP_LOCATION)
  const destinationInVn = normalizeVietnamPlace(destination)
  const params = new URLSearchParams({
    saddr: origin,
    daddr: destinationInVn,
    output: 'embed',
    hl: 'vi',
    gl: 'vn'
  })

  return `https://maps.google.com/maps?${params.toString()}`
}

function openMapRoute(url: string | null) {
  if (!url) {
    toast.warn('Chưa có dữ liệu địa chỉ giao để mở bản đồ')
    return
  }

  window.open(url, '_blank', 'noopener,noreferrer')
}

export default function ShipmentsPage() {
  const queryClient = useQueryClient()
  const { role } = useAuth()
  const isAdmin = role === 'admin'
  const isShipper = role === 'shipper'
  const isSupport = role === 'support'
  const canViewAllShipments = isAdmin || isSupport
  const canUpdate = isAdmin || isShipper || isSupport

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ShipmentStatus>('all')
  const [sortKey, setSortKey] = useState<SortKey>('createdAt')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(8)
  const [detailShipment, setDetailShipment] = useState<ShipmentEntity | null>(null)
  const [showDetailMap, setShowDetailMap] = useState(false)
  const [updateTarget, setUpdateTarget] = useState<ShipmentEntity | null>(null)
  const [showRouteMap, setShowRouteMap] = useState(false)
  const [routeMapOrigin, setRouteMapOrigin] = useState('')
  const [updateStatus, setUpdateStatus] = useState<ShipmentStatus>('in_transit')
  const [updateLocation, setUpdateLocation] = useState('')
  const [updateNote, setUpdateNote] = useState('')

  const shipmentsQuery = useQuery({
    queryKey: ['shipments', role],
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

      const response = await shipmentApi.assignedOrders()
      return { shipments: response.data.data, summary: null }
    },
    placeholderData: (previousData) => previousData
  })

  const shipmentsData = shipmentsQuery.data?.shipments
  const shipments = useMemo(() => shipmentsData ?? [], [shipmentsData])
  const summary = shipmentsQuery.data?.summary

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      status,
      location,
      note
    }: {
      id: string
      status: ShipmentStatus
      location?: string
      note?: string
    }) =>
      shipmentApi.updateStatus(id, {
        status,
        location: location?.trim() || null,
        note: note?.trim() || null
      }),
    onSuccess: (response) => {
      toast.success(response.data.message || 'Cập nhật shipment thành công')
      queryClient.invalidateQueries({ queryKey: ['shipments'] })
      setUpdateTarget(null)
    }
  })

  const filteredShipments = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    const next = shipments.filter((shipment) => {
      if (statusFilter !== 'all' && shipment.status !== statusFilter) return false
      if (!normalizedSearch) return true
      return getShipmentSearchText(shipment).includes(normalizedSearch)
    })

    next.sort((a, b) => {
      if (sortKey === 'createdAt' || sortKey === 'updatedAt') {
        const aTime = new Date(a[sortKey]).getTime()
        const bTime = new Date(b[sortKey]).getTime()
        return bTime - aTime
      }

      const aValue = String(a[sortKey] || '').toLowerCase()
      const bValue = String(b[sortKey] || '').toLowerCase()
      if (aValue < bValue) return 1
      if (aValue > bValue) return -1
      return 0
    })

    return next
  }, [search, shipments, sortKey, statusFilter])

  const totalItems = filteredShipments.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedShipments = filteredShipments.slice((safePage - 1) * pageSize, safePage * pageSize)

  const stats = useMemo(() => {
    if (summary) {
      return [
        { label: 'Total Shipments', value: summary.totalShipments, tone: 'from-[#6f62cf] to-[#8a7bf2]' },
        { label: 'Assigned', value: summary.assignedShipments, tone: 'from-[#2f86d6] to-[#65b4ff]' },
        { label: 'In Transit', value: summary.inTransitShipments, tone: 'from-[#f08c44] to-[#f7b36d]' },
        { label: 'Delivered', value: summary.deliveredShipments, tone: 'from-[#2fb67a] to-[#5dd7a0]' }
      ]
    }

    const assigned = shipments.filter((item) => item.status === 'assigned').length
    const inTransit = shipments.filter((item) => item.status === 'in_transit').length
    const delivered = shipments.filter((item) => item.status === 'delivered').length

    return [
      { label: 'Total Shipments', value: shipments.length, tone: 'from-[#6f62cf] to-[#8a7bf2]' },
      { label: 'Assigned', value: assigned, tone: 'from-[#2f86d6] to-[#65b4ff]' },
      { label: 'In Transit', value: inTransit, tone: 'from-[#f08c44] to-[#f7b36d]' },
      { label: 'Delivered', value: delivered, tone: 'from-[#2fb67a] to-[#5dd7a0]' }
    ]
  }, [shipments, summary])

  const openUpdateModal = (shipment: ShipmentEntity) => {
    setUpdateTarget(shipment)
    setShowRouteMap(false)
    setRouteMapOrigin('')
    const availableStatuses = getAllowedStatuses(shipment, isShipper)
    setUpdateStatus(availableStatuses[0] || shipment.status)
    setUpdateLocation('')
    setUpdateNote('')
  }

  const openDetailModal = (shipment: ShipmentEntity) => {
    setDetailShipment(shipment)
    setShowDetailMap(false)
  }

  const activeFiltersCount = [Boolean(search.trim()), statusFilter !== 'all'].filter(Boolean).length

  const selectedShipment = detailShipment ?? null
  const locationPresets = updateTarget ? getLocationPresetsByStatus(updateStatus, updateTarget) : []
  const notePresets = getNotePresetsByStatus(updateStatus)
  const detailMapUrl = showDetailMap && selectedShipment ? buildDestinationEmbedMapUrl(selectedShipment) : null
  const routeMapUrl = showRouteMap && updateTarget ? buildRouteEmbedMapUrl(updateTarget, routeMapOrigin) : null

  return (
    <section className='space-y-5 pb-4'>
      <div className='flex flex-wrap items-end justify-between gap-3'>
        <div>
          <p className='text-sm font-semibold uppercase tracking-[0.24em] text-[#8a84ad]'>Shipment Management</p>
          <h1 className='mt-2 text-3xl font-black tracking-tight text-[#201f47]'>
            {canViewAllShipments ? 'All Shipments' : 'My Shipments'}
          </h1>
          <p className='mt-2 max-w-2xl text-sm leading-6 text-[#6d6a8a]'>
            {canViewAllShipments
              ? 'Theo dõi toàn bộ shipment, cập nhật trạng thái và kiểm soát quá trình giao hàng.'
              : 'Theo dõi các shipment được gán cho bạn và cập nhật trạng thái giao hàng.'}
          </p>
        </div>
      </div>

      <OrderStatsCards items={stats} />

      <div className='rounded-[30px] border border-[#eceaf8] bg-white p-5 shadow-[0_18px_50px_rgba(27,23,64,0.08)]'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <h2 className='text-xl font-bold text-[#212047]'>Shipment List</h2>
            <p className='mt-1 text-sm text-[#7a7697]'>
              {totalItems} shipment(s) found
              {activeFiltersCount > 0 ? ` • ${activeFiltersCount} filter(s) applied` : ''}
            </p>
          </div>

          <div className='flex flex-wrap items-center gap-3'>
            <div className='relative'>
              <Search className='pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#9d98bf]' />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setCurrentPage(1)
                }}
                type='text'
                placeholder='Search by shipment, order, buyer, shipper...'
                className='h-11 w-80 rounded-full border border-[#e5e1f3] bg-[#fbfaff] pr-4 pl-10 text-sm text-[#2d2950] outline-none transition focus:border-[#7a6ae0] focus:ring-2 focus:ring-[#b7abe6]/35'
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as 'all' | ShipmentStatus)
                setCurrentPage(1)
              }}
              className='h-11 rounded-full border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm text-[#2d2950] outline-none'
            >
              {SHIPMENT_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status === 'all' ? 'All shipment status' : status}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className='mt-5 overflow-hidden rounded-[26px] border border-[#eceaf8]'>
          <div className='overflow-x-auto'>
            <table className='min-w-full divide-y divide-[#eceaf8]'>
              <thead className='bg-[#faf9ff] text-left text-xs font-bold uppercase tracking-[0.18em] text-[#7f7a9e]'>
                <tr>
                  <th className='px-4 py-4'>Shipment</th>
                  <th className='px-4 py-4'>Order / Buyer</th>
                  <th className='px-4 py-4'>Shipper</th>
                  <th className='cursor-pointer px-4 py-4' onClick={() => setSortKey('status')}>
                    Status
                  </th>
                  <th className='cursor-pointer px-4 py-4' onClick={() => setSortKey('expected_delivery_at')}>
                    Expected Delivery
                  </th>
                  <th className='cursor-pointer px-4 py-4' onClick={() => setSortKey('updatedAt')}>
                    Updated
                  </th>
                  <th className='px-4 py-4 text-right'>Actions</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-[#f0edf8] bg-white dark:divide-slate-800 dark:bg-slate-900/70'>
                {shipmentsQuery.isLoading && !shipmentsQuery.data ? (
                  <tr>
                    <td colSpan={7} className='px-4 py-16 text-center text-sm text-[#7a7697] dark:text-slate-400'>
                      Loading shipments...
                    </td>
                  </tr>
                ) : paginatedShipments.length > 0 ? (
                  paginatedShipments.map((shipment) => {
                    const order = typeof shipment.order_id === 'object' && shipment.order_id ? shipment.order_id : null
                    return (
                      <tr key={shipment._id} className='transition hover:bg-[#fbfaff] dark:hover:bg-slate-800/70'>
                        <td className='px-4 py-4'>
                          <p className='font-semibold text-[#28244f] dark:text-slate-100'>
                            #{shipment._id.slice(-8).toUpperCase()}
                          </p>
                          <p className='mt-1 text-xs text-[#8f8aac] dark:text-slate-400'>{shipment._id}</p>
                        </td>
                        <td className='px-4 py-4'>
                          <p className='text-sm font-semibold text-[#2d2950] dark:text-slate-100'>
                            #{getOrderId(shipment).slice(-8).toUpperCase()}
                          </p>
                          <p className='mt-1 text-xs text-[#8f8aac] dark:text-slate-400'>
                            {getBuyerName(shipment)} • {getBuyerContact(shipment)}
                          </p>
                          <p className='mt-1 text-xs text-[#8f8aac] dark:text-slate-400'>
                            Address: {getDeliveryAddress(shipment).location}
                          </p>
                          {order ? (
                            <p className='mt-1 text-xs text-[#8f8aac] dark:text-slate-400'>
                              {formatCurrency(order.final_price)}
                            </p>
                          ) : null}
                        </td>
                        <td className='px-4 py-4'>
                          <p className='text-sm font-semibold text-[#2d2950] dark:text-slate-100'>
                            {getShipperName(shipment)}
                          </p>
                          <p className='mt-1 text-xs text-[#8f8aac] dark:text-slate-400'>
                            {getShipperContact(shipment)}
                          </p>
                        </td>
                        <td className='px-4 py-4'>
                          <ShipmentStatusBadge status={shipment.status} />
                        </td>
                        <td className='px-4 py-4 text-sm text-[#5f5a7a] dark:text-slate-300'>
                          {shipment.expected_delivery_at ? formatDateTime(shipment.expected_delivery_at) : 'N/A'}
                        </td>
                        <td className='px-4 py-4 text-sm text-[#5f5a7a] dark:text-slate-300'>
                          {formatDateTime(shipment.updatedAt)}
                        </td>
                        <td className='px-4 py-4'>
                          <div className='flex flex-wrap items-center justify-end gap-2'>
                            {canUpdate ? (
                              <button
                                type='button'
                                onClick={() => openUpdateModal(shipment)}
                                className='inline-flex h-9 items-center gap-1.5 rounded-full border border-[#d8edff] bg-[#eff8ff] px-3 text-xs font-semibold text-[#2f78d1] transition hover:bg-[#e2f2ff]'
                              >
                                <RefreshCcw className='h-4 w-4' /> Update
                              </button>
                            ) : null}
                            <CrudActionButtons onView={() => openDetailModal(shipment)} buttonSize='sm' />
                          </div>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className='px-4 py-16 text-center text-sm text-[#7a7697]'>
                      No shipments found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className='border-t border-[#eceaf8] p-4 dark:border-slate-700'>
            <Pagination
              totalItems={totalItems}
              currentPage={safePage}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size)
                setCurrentPage(1)
              }}
              itemLabel='shipments'
            />
          </div>
        </div>
      </div>

      {selectedShipment ? (
        <div className='fixed inset-0 z-40 flex items-center justify-center bg-[#191532]/45 px-4 py-6'>
          <article className='flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[30px] border border-[#eceaf8] bg-white shadow-[0_25px_65px_rgba(23,20,55,0.35)]'>
            <div className='border-b border-[#eceaf8] px-6 py-4'>
              <div className='flex flex-wrap items-center justify-between gap-3'>
                <div>
                  <h3 className='text-xl font-bold text-[#212047]'>Shipment Detail</h3>
                  <p className='mt-1 text-sm text-[#7a7697]'>{selectedShipment._id}</p>
                </div>
                <ShipmentStatusBadge status={selectedShipment.status} />
              </div>
            </div>

            <div className='space-y-4 overflow-y-auto px-6 py-5'>
              <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
                <article className='rounded-2xl border border-[#eceaf8] p-4'>
                  <p className='text-xs uppercase tracking-[0.15em] text-[#9b97b9]'>Shipment Status</p>
                  <div className='mt-2'>
                    <ShipmentStatusBadge status={selectedShipment.status} />
                  </div>
                </article>
                <article className='rounded-2xl border border-[#eceaf8] p-4'>
                  <p className='text-xs uppercase tracking-[0.15em] text-[#9b97b9]'>Order Status</p>
                  <div className='mt-2'>
                    {typeof selectedShipment.order_id === 'object' ? (
                      <OrderStatusBadge variant='order' status={selectedShipment.order_id.status as OrderStatus} />
                    ) : (
                      <span className='text-sm text-[#6d6a8a]'>N/A</span>
                    )}
                  </div>
                </article>
                <article className='rounded-2xl border border-[#eceaf8] p-4'>
                  <p className='text-xs uppercase tracking-[0.15em] text-[#9b97b9]'>Buyer</p>
                  <p className='mt-2 text-sm font-semibold text-[#2d2950]'>{getBuyerName(selectedShipment)}</p>
                  <p className='mt-1 text-xs text-[#7a7697]'>{getBuyerContact(selectedShipment)}</p>
                </article>
                <article className='rounded-2xl border border-[#eceaf8] p-4'>
                  <p className='text-xs uppercase tracking-[0.15em] text-[#9b97b9]'>Shipper</p>
                  <p className='mt-2 text-sm font-semibold text-[#2d2950]'>{getShipperName(selectedShipment)}</p>
                  <p className='mt-1 text-xs text-[#7a7697]'>{getShipperContact(selectedShipment)}</p>
                </article>
              </div>

              <div className='grid gap-4 lg:grid-cols-[1.4fr_1fr]'>
                <div className='rounded-2xl border border-[#eceaf8] p-4'>
                  <div className='flex items-center gap-2 text-[#6f62cf]'>
                    <BadgeInfo className='h-4 w-4' />
                    <p className='text-sm font-bold'>Order Information</p>
                  </div>
                  <div className='mt-4 grid gap-3 md:grid-cols-2'>
                    <div>
                      <p className='text-xs uppercase tracking-[0.15em] text-[#9b97b9]'>Order ID</p>
                      <p className='mt-1 text-sm font-semibold text-[#2d2950]'>{getOrderId(selectedShipment)}</p>
                    </div>
                    <div>
                      <p className='text-xs uppercase tracking-[0.15em] text-[#9b97b9]'>Payment</p>
                      <p className='mt-1 text-sm font-semibold text-[#2d2950]'>
                        {typeof selectedShipment.order_id === 'object'
                          ? selectedShipment.order_id.payment_status
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className='text-xs uppercase tracking-[0.15em] text-[#9b97b9]'>Total</p>
                      <p className='mt-1 text-sm font-semibold text-[#2f8a57]'>
                        {typeof selectedShipment.order_id === 'object'
                          ? formatCurrency(selectedShipment.order_id.final_price)
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className='text-xs uppercase tracking-[0.15em] text-[#9b97b9]'>Expected Delivery</p>
                      <p className='mt-1 text-sm font-semibold text-[#2d2950]'>
                        {selectedShipment.expected_delivery_at
                          ? formatDateTime(selectedShipment.expected_delivery_at)
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className='rounded-2xl border border-[#eceaf8] p-4'>
                  <div className='flex items-center gap-2 text-[#6f62cf]'>
                    <MapPin className='h-4 w-4' />
                    <p className='text-sm font-bold'>Delivery Address & Notes</p>
                  </div>
                  <div className='mt-4 rounded-xl border border-[#eceaf8] bg-[#fbfaff] p-3'>
                    <p className='text-sm font-semibold text-[#2d2950]'>
                      {getDeliveryAddress(selectedShipment).receiver}
                    </p>
                    <p className='mt-1 text-xs text-[#7a7697]'>{getDeliveryAddress(selectedShipment).phone}</p>
                    <p className='mt-1 text-xs text-[#7a7697]'>{getDeliveryAddress(selectedShipment).location}</p>
                  </div>
                  <div className='mt-3 flex flex-wrap gap-2'>
                    <button
                      type='button'
                      onClick={() => setShowDetailMap((prev) => !prev)}
                      className='inline-flex h-8 items-center rounded-full border border-[#d8edff] bg-[#eff8ff] px-3 text-xs font-semibold text-[#2f78d1] transition hover:bg-[#e2f2ff]'
                    >
                      {showDetailMap ? 'Hide map' : 'Show map'}
                    </button>
                  </div>
                  {detailMapUrl ? (
                    <div className='mt-3 overflow-hidden rounded-xl border border-[#eceaf8]'>
                      <iframe
                        title='delivery-destination-map'
                        src={detailMapUrl}
                        loading='lazy'
                        referrerPolicy='no-referrer-when-downgrade'
                        className='h-48 w-full border-0'
                      />
                    </div>
                  ) : null}
                  <p className='mt-4 text-sm leading-6 text-[#5f5a7a]'>
                    {selectedShipment.notes || 'No notes available.'}
                  </p>
                  <div className='mt-4 flex flex-wrap gap-2'>
                    <span className='rounded-full border border-[#eceaf8] px-3 py-1 text-xs text-[#7a7697]'>
                      Assigned: {selectedShipment.assigned_at ? formatDateTime(selectedShipment.assigned_at) : 'N/A'}
                    </span>
                    <span className='rounded-full border border-[#eceaf8] px-3 py-1 text-xs text-[#7a7697]'>
                      Delivered: {selectedShipment.delivered_at ? formatDateTime(selectedShipment.delivered_at) : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {typeof selectedShipment.order_id === 'object' && selectedShipment.order_id.items?.length ? (
                <div className='overflow-hidden rounded-2xl border border-[#eceaf8]'>
                  <table className='min-w-full divide-y divide-[#eceaf8]'>
                    <thead className='bg-[#faf9ff] text-left text-xs font-bold uppercase tracking-[0.18em] text-[#7f7a9e]'>
                      <tr>
                        <th className='px-4 py-3'>Variant</th>
                        <th className='px-4 py-3'>Qty</th>
                        <th className='px-4 py-3'>Unit Price</th>
                        <th className='px-4 py-3'>Line Total</th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-[#f0edf8] bg-white'>
                      {selectedShipment.order_id.items.map((item, index) => {
                        const variantId =
                          typeof item.variant_id === 'string'
                            ? item.variant_id
                            : item.variant_id?._id || `variant-${index + 1}`
                        const variantSku =
                          typeof item.variant_id === 'object' && item.variant_id ? item.variant_id.sku : ''
                        return (
                          <tr key={`${variantId}-${index}`}>
                            <td className='px-4 py-3 text-sm text-[#2d2950]'>
                              {variantSku || variantId}
                              {variantSku ? <p className='text-xs text-[#8f8aac]'>{variantId}</p> : null}
                            </td>
                            <td className='px-4 py-3 text-sm text-[#2d2950]'>{item.quantity}</td>
                            <td className='px-4 py-3 text-sm text-[#2d2950]'>{formatCurrency(item.price)}</td>
                            <td className='px-4 py-3 text-sm font-semibold text-[#2f8a57]'>
                              {formatCurrency(item.price * item.quantity)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>

            <div className='flex justify-end gap-3 border-t border-[#eceaf8] px-6 py-4'>
              <button
                type='button'
                onClick={() => {
                  setDetailShipment(null)
                  setShowDetailMap(false)
                }}
                className='inline-flex h-10 items-center rounded-full border border-[#d9d3ef] px-5 text-sm font-semibold text-[#5f5a7a] transition hover:bg-[#f0edf8]'
              >
                Close
              </button>
            </div>
          </article>
        </div>
      ) : null}

      {updateTarget ? (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-[#191532]/45 px-4 py-6'>
          <article className='w-full max-w-lg rounded-[28px] border border-[#eceaf8] bg-white p-6 shadow-[0_25px_65px_rgba(23,20,55,0.35)]'>
            <div className='flex items-center justify-between gap-3'>
              <div>
                <p className='text-lg font-bold text-[#212047]'>Update Shipment Status</p>
                <p className='mt-1 text-sm text-[#7a7697]'>{updateTarget._id}</p>
              </div>
              <ShipmentStatusBadge status={updateTarget.status} />
            </div>

            <div className='mt-5 space-y-4'>
              <label className='block'>
                <span className='text-sm font-semibold text-[#4a4666]'>Status</span>
                <select
                  value={updateStatus}
                  onChange={(event) => setUpdateStatus(event.target.value as ShipmentStatus)}
                  className='mt-2 h-11 w-full rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm text-[#2d2950] outline-none'
                >
                  {getAllowedStatuses(updateTarget, isShipper).map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              <label className='block'>
                <span className='text-sm font-semibold text-[#4a4666]'>Location</span>
                <select
                  defaultValue=''
                  onChange={(event) => {
                    if (event.target.value) {
                      setUpdateLocation(event.target.value)
                    }
                  }}
                  className='mt-2 h-11 w-full rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm text-[#2d2950] outline-none'
                >
                  <option value=''>Chọn mẫu location theo trạng thái</option>
                  {locationPresets.map((preset) => (
                    <option key={preset.label} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
                <input
                  value={updateLocation}
                  onChange={(event) => setUpdateLocation(event.target.value)}
                  className='mt-2 h-11 w-full rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm text-[#2d2950] outline-none'
                  placeholder='Nhập điểm xuất phát hoặc vị trí hiện tại'
                />
                <div className='mt-2 flex flex-wrap items-center gap-2'>
                  <button
                    type='button'
                    onClick={() => {
                      setRouteMapOrigin(updateLocation)
                      setShowRouteMap((prev) => !prev)
                    }}
                    className='inline-flex h-8 items-center rounded-full border border-[#d8edff] bg-[#eff8ff] px-3 text-xs font-semibold text-[#2f78d1] transition hover:bg-[#e2f2ff]'
                  >
                    {showRouteMap ? 'Hide inline map' : 'Show inline map'}
                  </button>
                  <button
                    type='button'
                    onClick={() => openMapRoute(updateTarget ? buildMapRouteUrl(updateTarget, updateLocation) : null)}
                    className='inline-flex h-8 items-center rounded-full border border-[#d8edff] bg-[#eff8ff] px-3 text-xs font-semibold text-[#2f78d1] transition hover:bg-[#e2f2ff]'
                  >
                    Open route map
                  </button>
                  <p className='text-xs text-[#8f8aac]'>Map sẽ dẫn đường từ location đến địa chỉ giao của khách.</p>
                </div>
                {routeMapUrl ? (
                  <div className='mt-3 overflow-hidden rounded-xl border border-[#eceaf8]'>
                    <iframe
                      title='shipment-route-map'
                      src={routeMapUrl}
                      loading='lazy'
                      referrerPolicy='no-referrer-when-downgrade'
                      className='h-56 w-full border-0'
                    />
                  </div>
                ) : null}
              </label>

              <label className='block'>
                <span className='text-sm font-semibold text-[#4a4666]'>Note</span>
                <select
                  defaultValue=''
                  onChange={(event) => {
                    if (event.target.value) {
                      setUpdateNote(event.target.value)
                    }
                  }}
                  className='mt-2 h-11 w-full rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm text-[#2d2950] outline-none'
                >
                  <option value=''>Chọn văn mẫu note</option>
                  {notePresets.map((preset) => (
                    <option key={preset.label} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
                <textarea
                  value={updateNote}
                  onChange={(event) => setUpdateNote(event.target.value)}
                  rows={4}
                  className='mt-2 w-full rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 py-3 text-sm text-[#2d2950] outline-none'
                  placeholder='Add a short status note...'
                />
              </label>
            </div>

            <div className='mt-6 flex justify-end gap-3'>
              <button
                type='button'
                onClick={() => {
                  setUpdateTarget(null)
                  setShowRouteMap(false)
                  setRouteMapOrigin('')
                }}
                className='inline-flex h-10 items-center rounded-full border border-[#d9d3ef] px-5 text-sm font-semibold text-[#5f5a7a] transition hover:bg-[#f0edf8]'
              >
                Cancel
              </button>
              <button
                type='button'
                disabled={!getAllowedStatuses(updateTarget, isShipper).length}
                onClick={() =>
                  updateMutation.mutate({
                    id: updateTarget._id,
                    status: updateStatus,
                    location: updateLocation,
                    note: updateNote
                  })
                }
                className='inline-flex h-10 items-center rounded-full bg-[#6f62cf] px-5 text-sm font-semibold text-white transition hover:bg-[#5e53bf] disabled:cursor-not-allowed disabled:opacity-60'
              >
                {updateMutation.isPending ? 'Updating...' : 'Save Changes'}
              </button>
            </div>
          </article>
        </div>
      ) : null}
    </section>
  )
}
