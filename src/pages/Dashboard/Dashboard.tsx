import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, AlertTriangle, Bot, PackageCheck, Truck } from 'lucide-react'

import orderApi from '../../apis/order.api'
import shipmentApi from '../../apis/shipment.api'
import feedbackApi from '../../apis/feedback.api'
import chatbotApi from '../../apis/chatbot.api'
import { useAuth } from '../../contexts/app.context'
import OrderStatsCards from '../../components/Order/OrderStatsCards'
import OrderStatusBadge from '../../components/Order/OrderStatusBadge'
import ShipmentStatusBadge from '../../components/Shipment/ShipmentStatusBadge'
import type { OrderEntity, OrderSummary } from '../../types/order.type'
import type { ShipmentEntity, ShipmentSummary, ShipmentStatus } from '../../types/shipment.type'
import type { FeedbackEntity } from '../../types/feedback.type'
import type { ChatbotAnalyticsResponse } from '../../types/chatbot.type'
import { formatCurrency, formatDateTime } from '../../utils/common'

type StaffRole = 'admin' | 'support' | 'shipper'

interface DashboardData {
  role: StaffRole
  orderSummary: OrderSummary
  orders: OrderEntity[]
  shipments: ShipmentEntity[]
  shipmentSummary: ShipmentSummary
  feedbacks: FeedbackEntity[]
  chatbotAnalytics: ChatbotAnalyticsResponse['data'] | null
}

const EMPTY_ORDER_SUMMARY: OrderSummary = {
  totalOrders: 0,
  pendingOrders: 0,
  completedOrders: 0,
  cancelledOrders: 0,
  totalRevenue: 0
}

const EMPTY_SHIPMENT_SUMMARY: ShipmentSummary = {
  totalShipments: 0,
  pendingShipments: 0,
  assignedShipments: 0,
  inTransitShipments: 0,
  deliveredShipments: 0
}

const SHIPMENT_BAR_COLORS: Record<ShipmentStatus, string> = {
  pending: 'bg-[#f5b15f]',
  assigned: 'bg-[#52a8ff]',
  in_transit: 'bg-[#7b66df]',
  delivered: 'bg-[#31b07a]',
  failed: 'bg-[#dd6473]',
  cancelled: 'bg-[#dd6473]'
}

function isStaffRole(role: string | null): role is StaffRole {
  return role === 'admin' || role === 'support' || role === 'shipper'
}

function getShipmentAddress(shipment: ShipmentEntity) {
  const directAddress =
    typeof shipment.delivery_address_id === 'object' && shipment.delivery_address_id
      ? shipment.delivery_address_id
      : null
  const order = typeof shipment.order_id === 'object' && shipment.order_id ? shipment.order_id : null
  const orderAddress = order && typeof order.address_id === 'object' ? order.address_id : null
  const address = directAddress || orderAddress

  if (!address) return 'N/A'
  return [address.detail, address.ward, address.district, address.province].filter(Boolean).join(', ') || 'N/A'
}

function buildShipperShipmentSummary(shipments: ShipmentEntity[]): ShipmentSummary {
  return {
    totalShipments: shipments.length,
    pendingShipments: shipments.filter((s) => s.status === 'pending').length,
    assignedShipments: shipments.filter((s) => s.status === 'assigned').length,
    inTransitShipments: shipments.filter((s) => s.status === 'in_transit').length,
    deliveredShipments: shipments.filter((s) => s.status === 'delivered').length
  }
}

async function fetchDashboardData(role: StaffRole): Promise<DashboardData> {
  if (role === 'shipper') {
    const [orderResponse, shipmentResponse] = await Promise.all([
      orderApi.listAllAdmin({ page: 1, limit: 6, sortBy: 'createdAt', sortOrder: 'desc' }),
      shipmentApi.assignedOrders()
    ])

    const orderPayload = orderResponse.data.data
    const shipments = shipmentResponse.data.data ?? []

    return {
      role,
      orderSummary: orderPayload?.summary ?? EMPTY_ORDER_SUMMARY,
      orders: orderPayload?.orders ?? [],
      shipments,
      shipmentSummary: buildShipperShipmentSummary(shipments),
      feedbacks: [],
      chatbotAnalytics: null
    }
  }

  const [orderResponse, shipmentResponse, feedbackResult, chatbotResult] = await Promise.all([
    orderApi.listAllAdmin({ page: 1, limit: 6, sortBy: 'createdAt', sortOrder: 'desc' }),
    shipmentApi.listAll({ page: 1, limit: 6, sortBy: 'updatedAt', sortOrder: 'desc' }),
    feedbackApi.listAll({ page: 1, limit: 20, status: 'all', priority: 'all' }).catch(() => null),
    chatbotApi.getAnalytics({ limit: 10 }).catch(() => null)
  ])

  const orderPayload = orderResponse.data.data
  const shipmentPayload = shipmentResponse.data.data

  return {
    role,
    orderSummary: orderPayload?.summary ?? EMPTY_ORDER_SUMMARY,
    orders: orderPayload?.orders ?? [],
    shipments: shipmentPayload?.shipments ?? [],
    shipmentSummary: shipmentPayload?.summary ?? EMPTY_SHIPMENT_SUMMARY,
    feedbacks: feedbackResult?.data?.data?.feedbacks ?? [],
    chatbotAnalytics: chatbotResult?.data?.data ?? null
  }
}

export default function Dashboard() {
  const { role } = useAuth()
  const canRenderDashboard = isStaffRole(role)

  const dashboardQuery = useQuery({
    queryKey: ['dashboard', role],
    queryFn: () => fetchDashboardData(role as StaffRole),
    enabled: canRenderDashboard,
    placeholderData: (previousData) => previousData
  })

  const data = dashboardQuery.data

  const stats = useMemo(() => {
    if (!data) return []

    const orderSummary = data.orderSummary
    const shipmentSummary = data.shipmentSummary
    const unresolvedFeedback = data.feedbacks.filter((item) => item.status === 'open' || item.status === 'in_progress')

    if (data.role === 'shipper') {
      return [
        { label: 'Đơn phụ trách', value: orderSummary.totalOrders, tone: 'from-[#6f62cf] to-[#8a7bf2]' },
        {
          label: 'Đang giao',
          value: shipmentSummary.inTransitShipments,
          helper: `${shipmentSummary.assignedShipments} assigned`,
          tone: 'from-[#2f86d6] to-[#65b4ff]'
        },
        {
          label: 'Đã giao',
          value: shipmentSummary.deliveredShipments,
          tone: 'from-[#2fb67a] to-[#5dd7a0]'
        },
        {
          label: 'Giá trị đơn',
          value: formatCurrency(orderSummary.totalRevenue),
          tone: 'from-[#f08c44] to-[#f7b36d]'
        }
      ]
    }

    return [
      {
        label: 'Tổng đơn hàng',
        value: orderSummary.totalOrders,
        helper: `${orderSummary.pendingOrders} pending`,
        tone: 'from-[#6f62cf] to-[#8a7bf2]'
      },
      {
        label: 'Doanh thu',
        value: formatCurrency(orderSummary.totalRevenue),
        tone: 'from-[#2fb67a] to-[#5dd7a0]'
      },
      {
        label: 'Shipment hoạt động',
        value: shipmentSummary.assignedShipments + shipmentSummary.inTransitShipments,
        helper: `${shipmentSummary.deliveredShipments} delivered`,
        tone: 'from-[#2f86d6] to-[#65b4ff]'
      },
      {
        label: 'Feedback chưa xử lý',
        value: unresolvedFeedback.length,
        helper: `${data.feedbacks.length} total feedback`,
        tone: 'from-[#f08c44] to-[#f7b36d]'
      }
    ]
  }, [data])

  const shipmentStatusRows = useMemo(() => {
    if (!data) return []

    const summary = data.shipmentSummary
    const rows = [
      { label: 'Pending', value: summary.pendingShipments, status: 'pending' as ShipmentStatus },
      { label: 'Assigned', value: summary.assignedShipments, status: 'assigned' as ShipmentStatus },
      { label: 'In Transit', value: summary.inTransitShipments, status: 'in_transit' as ShipmentStatus },
      { label: 'Delivered', value: summary.deliveredShipments, status: 'delivered' as ShipmentStatus }
    ]

    const maxValue = Math.max(1, ...rows.map((row) => row.value))

    return rows.map((row) => ({
      ...row,
      width: `${Math.max(8, Math.round((row.value / maxValue) * 100))}%`
    }))
  }, [data])

  if (!canRenderDashboard) {
    return (
      <section className='rounded-3xl border border-[#eceaf8] bg-white p-6'>
        <h1 className='text-2xl font-black text-[#201f47]'>Dashboard</h1>
        <p className='mt-2 text-sm text-[#7a7697]'>Bạn không có quyền truy cập dashboard nội bộ.</p>
      </section>
    )
  }

  return (
    <section className='space-y-5 pb-4'>
      <div className='rounded-[30px] border border-[#eceaf8] bg-white p-6 shadow-[0_18px_50px_rgba(27,23,64,0.08)]'>
        <p className='text-sm font-semibold uppercase tracking-[0.24em] text-[#8a84ad]'>Dashboard</p>
        <h1 className='mt-2 text-3xl font-black tracking-tight text-[#201f47]'>
          {role === 'admin' ? 'Admin Overview' : role === 'support' ? 'Support Overview' : 'Shipper Overview'}
        </h1>
        <p className='mt-2 text-sm text-[#6d6a8a]'>
          Theo dõi nhanh vận hành đơn hàng, shipment và các chỉ số quan trọng theo quyền hiện tại.
        </p>
      </div>

      {dashboardQuery.isLoading && !data ? (
        <div className='rounded-3xl border border-[#eceaf8] bg-white px-6 py-16 text-center text-sm text-[#7a7697]'>
          Đang tải dữ liệu dashboard...
        </div>
      ) : null}

      {dashboardQuery.isError ? (
        <div className='rounded-3xl border border-[#f3d5db] bg-[#fff3f5] px-6 py-5 text-sm text-[#b13a4c]'>
          Không thể tải dashboard. Vui lòng thử lại sau.
        </div>
      ) : null}

      {data ? <OrderStatsCards items={stats} /> : null}

      {data ? (
        <div className='grid gap-4 xl:grid-cols-[1.35fr_1fr]'>
          <article className='rounded-3xl border border-[#eceaf8] bg-white p-5 shadow-[0_12px_36px_rgba(28,24,70,0.06)]'>
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-xl font-bold text-[#212047]'>Đơn hàng gần đây</h2>
              <span className='text-xs font-semibold uppercase tracking-[0.14em] text-[#8f8aac]'>
                {data.orders.length} records
              </span>
            </div>

            <div className='space-y-3'>
              {data.orders.length > 0 ? (
                data.orders.slice(0, 6).map((order) => (
                  <div
                    key={order._id}
                    className='grid gap-3 rounded-2xl border border-[#eceaf8] px-4 py-3 md:grid-cols-[1.4fr_1fr_auto_auto] md:items-center'
                  >
                    <div>
                      <p className='text-sm font-bold text-[#2a254b]'>#{order._id.slice(-8).toUpperCase()}</p>
                      <p className='mt-1 text-xs text-[#8f8aac]'>{formatDateTime(order.createdAt)}</p>
                    </div>
                    <p className='text-sm font-semibold text-[#2f8a57]'>{formatCurrency(order.final_price)}</p>
                    <OrderStatusBadge variant='order' status={order.status} />
                    <OrderStatusBadge variant='payment' status={order.payment_status} />
                  </div>
                ))
              ) : (
                <p className='rounded-2xl border border-[#eceaf8] px-4 py-6 text-sm text-[#7a7697]'>
                  Chưa có dữ liệu đơn hàng.
                </p>
              )}
            </div>
          </article>

          <article className='rounded-3xl border border-[#eceaf8] bg-white p-5 shadow-[0_12px_36px_rgba(28,24,70,0.06)]'>
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-xl font-bold text-[#212047]'>Shipment Pulse</h2>
              <Activity className='h-5 w-5 text-[#7465d7]' />
            </div>

            <div className='space-y-3'>
              {shipmentStatusRows.map((row) => (
                <div key={row.label} className='space-y-1'>
                  <div className='flex items-center justify-between text-sm'>
                    <span className='font-semibold text-[#4d486c]'>{row.label}</span>
                    <span className='font-bold text-[#212047]'>{row.value}</span>
                  </div>
                  <div className='h-2 rounded-full bg-[#f2f0fb]'>
                    <div
                      className={`h-2 rounded-full ${SHIPMENT_BAR_COLORS[row.status]}`}
                      style={{ width: row.width }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className='mt-5 space-y-2 rounded-2xl border border-[#eceaf8] bg-[#fbfaff] p-4'>
              <div className='flex items-center justify-between text-sm'>
                <span className='text-[#6d688a]'>Tổng shipment</span>
                <span className='font-bold text-[#212047]'>{data.shipmentSummary.totalShipments}</span>
              </div>
              <div className='flex items-center justify-between text-sm'>
                <span className='text-[#6d688a]'>Đang hoạt động</span>
                <span className='font-bold text-[#212047]'>
                  {data.shipmentSummary.assignedShipments + data.shipmentSummary.inTransitShipments}
                </span>
              </div>
            </div>
          </article>
        </div>
      ) : null}

      {data ? (
        <div className='grid gap-4 xl:grid-cols-[1.35fr_1fr]'>
          <article className='rounded-3xl border border-[#eceaf8] bg-white p-5 shadow-[0_12px_36px_rgba(28,24,70,0.06)]'>
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-xl font-bold text-[#212047]'>Shipment gần nhất</h2>
              <Truck className='h-5 w-5 text-[#2f78d1]' />
            </div>

            <div className='space-y-3'>
              {data.shipments.length > 0 ? (
                data.shipments.slice(0, 6).map((shipment) => (
                  <div
                    key={shipment._id}
                    className='grid gap-3 rounded-2xl border border-[#eceaf8] px-4 py-3 md:grid-cols-[1fr_1.2fr_auto] md:items-center'
                  >
                    <div>
                      <p className='text-sm font-bold text-[#2a254b]'>#{shipment._id.slice(-8).toUpperCase()}</p>
                      <p className='mt-1 text-xs text-[#8f8aac]'>{formatDateTime(shipment.updatedAt)}</p>
                    </div>
                    <p className='line-clamp-2 text-sm text-[#5c5878]'>{getShipmentAddress(shipment)}</p>
                    <ShipmentStatusBadge status={shipment.status} />
                  </div>
                ))
              ) : (
                <p className='rounded-2xl border border-[#eceaf8] px-4 py-6 text-sm text-[#7a7697]'>
                  Chưa có dữ liệu shipment.
                </p>
              )}
            </div>
          </article>

          <article className='rounded-3xl border border-[#eceaf8] bg-white p-5 shadow-[0_12px_36px_rgba(28,24,70,0.06)]'>
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-xl font-bold text-[#212047]'>Operational Insights</h2>
              <PackageCheck className='h-5 w-5 text-[#6f62cf]' />
            </div>

            {data.role === 'shipper' ? (
              <div className='space-y-3'>
                <div className='rounded-2xl border border-[#eceaf8] bg-[#fbfaff] p-4'>
                  <p className='text-sm text-[#7a7697]'>Tỷ lệ giao thành công</p>
                  <p className='mt-2 text-3xl font-black text-[#212047]'>
                    {data.shipmentSummary.totalShipments > 0
                      ? `${Math.round((data.shipmentSummary.deliveredShipments / data.shipmentSummary.totalShipments) * 100)}%`
                      : '0%'}
                  </p>
                </div>
                <div className='rounded-2xl border border-[#eceaf8] bg-[#fbfaff] p-4'>
                  <p className='text-sm text-[#7a7697]'>Đơn đang xử lý</p>
                  <p className='mt-2 text-3xl font-black text-[#212047]'>
                    {data.shipmentSummary.assignedShipments + data.shipmentSummary.inTransitShipments}
                  </p>
                </div>
              </div>
            ) : (
              <div className='space-y-3'>
                <div className='rounded-2xl border border-[#eceaf8] bg-[#fbfaff] p-4'>
                  <div className='flex items-center justify-between'>
                    <p className='text-sm text-[#7a7697]'>Feedback chưa xử lý</p>
                    <AlertTriangle className='h-4 w-4 text-[#d07a1f]' />
                  </div>
                  <p className='mt-2 text-3xl font-black text-[#212047]'>
                    {data.feedbacks.filter((item) => item.status === 'open' || item.status === 'in_progress').length}
                  </p>
                </div>

                <div className='rounded-2xl border border-[#eceaf8] bg-[#fbfaff] p-4'>
                  <div className='flex items-center justify-between'>
                    <p className='text-sm text-[#7a7697]'>AI Messages</p>
                    <Bot className='h-4 w-4 text-[#6f62cf]' />
                  </div>
                  <p className='mt-2 text-3xl font-black text-[#212047]'>{data.chatbotAnalytics?.totalMessages ?? 0}</p>
                  <p className='mt-1 text-xs text-[#8f8aac]'>Users: {data.chatbotAnalytics?.totalUsers ?? 0}</p>
                </div>
              </div>
            )}
          </article>
        </div>
      ) : null}
    </section>
  )
}
