import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import orderApi from '../../apis/order.api'
import shipmentApi from '../../apis/shipment.api'
import feedbackApi from '../../apis/feedback.api'
import OrderStatsCards from '../../components/Order/OrderStatsCards'

export default function DashboardStatsPage() {
  const statsQuery = useQuery({
    queryKey: ['dashboard-stats-page'],
    queryFn: async () => {
      const [orderResponse, shipmentResponse, feedbackResponse] = await Promise.all([
        orderApi.listAllAdmin({ page: 1, limit: 1, sortBy: 'createdAt', sortOrder: 'desc' }),
        shipmentApi.listAll({ page: 1, limit: 1, sortBy: 'createdAt', sortOrder: 'desc' }),
        feedbackApi.listAll({ page: 1, limit: 200, status: 'all', priority: 'all' }).catch(() => null)
      ])

      return {
        orderSummary: orderResponse.data.data?.summary,
        shipmentSummary: shipmentResponse.data.data?.summary,
        feedbackTotal: feedbackResponse?.data?.data?.pagination?.total || 0
      }
    },
    placeholderData: (prev) => prev
  })

  const payload = statsQuery.data

  const stats = useMemo(
    () => [
      { label: 'Tổng đơn hàng', value: payload?.orderSummary?.totalOrders || 0, tone: 'from-[#6f62cf] to-[#8a7bf2]' },
      { label: 'Đơn chờ xử lý', value: payload?.orderSummary?.pendingOrders || 0, tone: 'from-[#f08c44] to-[#f7b36d]' },
      {
        label: 'Shipment hoàn thành',
        value: payload?.shipmentSummary?.deliveredShipments || 0,
        tone: 'from-[#2fb67a] to-[#5dd7a0]'
      },
      { label: 'Feedback tickets', value: payload?.feedbackTotal || 0, tone: 'from-[#2f86d6] to-[#65b4ff]' }
    ],
    [payload]
  )

  return (
    <section className='space-y-5 pb-4'>
      <div className='rounded-[30px] border border-[#eceaf8] bg-white p-6 shadow-[0_18px_50px_rgba(27,23,64,0.08)]'>
        <p className='text-sm font-semibold uppercase tracking-[0.24em] text-[#8a84ad]'>Dashboard Stats</p>
        <h1 className='mt-2 text-3xl font-black tracking-tight text-[#201f47]'>Dashboard Statistics</h1>
        <p className='mt-2 text-sm text-[#6d6a8a]'>Tổng quan KPI vận hành theo thời gian thực.</p>
      </div>

      <OrderStatsCards items={stats} />
    </section>
  )
}
