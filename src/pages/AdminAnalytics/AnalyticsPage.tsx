import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, Bot, ClipboardList, Truck } from 'lucide-react'

import orderApi from '../../apis/order.api'
import shipmentApi from '../../apis/shipment.api'
import feedbackApi from '../../apis/feedback.api'
import chatbotApi from '../../apis/chatbot.api'
import OrderStatsCards from '../../components/Order/OrderStatsCards'
import { formatCurrency } from '../../utils/common'

export default function AnalyticsPage() {
  const analyticsQuery = useQuery({
    queryKey: ['analytics-hub'],
    queryFn: async () => {
      const [orderResponse, shipmentResponse, feedbackResponse, chatbotResponse] = await Promise.all([
        orderApi.listAllAdmin({ page: 1, limit: 1, sortBy: 'createdAt', sortOrder: 'desc' }),
        shipmentApi.listAll({ page: 1, limit: 1, sortBy: 'createdAt', sortOrder: 'desc' }),
        feedbackApi.listAll({ page: 1, limit: 200, status: 'all', priority: 'all' }).catch(() => null),
        chatbotApi.getAnalytics({ limit: 10 }).catch(() => null)
      ])

      return {
        orderSummary: orderResponse.data.data?.summary,
        shipmentSummary: shipmentResponse.data.data?.summary,
        feedbackTotal: feedbackResponse?.data?.data?.pagination?.total || 0,
        chatbotData: chatbotResponse?.data?.data || null
      }
    },
    placeholderData: (prev) => prev
  })

  const payload = analyticsQuery.data

  const stats = useMemo(() => {
    return [
      { label: 'Tổng đơn hàng', value: payload?.orderSummary?.totalOrders || 0, tone: 'from-[#6f62cf] to-[#8a7bf2]' },
      {
        label: 'Doanh thu',
        value: formatCurrency(payload?.orderSummary?.totalRevenue || 0),
        tone: 'from-[#2fb67a] to-[#5dd7a0]'
      },
      {
        label: 'Shipment đang chạy',
        value: (payload?.shipmentSummary?.assignedShipments || 0) + (payload?.shipmentSummary?.inTransitShipments || 0),
        tone: 'from-[#2f86d6] to-[#65b4ff]'
      },
      { label: 'Feedback tổng', value: payload?.feedbackTotal || 0, tone: 'from-[#f08c44] to-[#f7b36d]' }
    ]
  }, [payload])

  return (
    <section className='space-y-5 pb-4'>
      <div className='rounded-[30px] border border-[#eceaf8] bg-white p-6 shadow-[0_18px_50px_rgba(27,23,64,0.08)]'>
        <p className='text-sm font-semibold uppercase tracking-[0.24em] text-[#8a84ad]'>Analytics</p>
        <h1 className='mt-2 text-3xl font-black tracking-tight text-[#201f47]'>Analytics Hub</h1>
        <p className='mt-2 text-sm text-[#6d6a8a]'>Trung tâm dữ liệu tổng hợp cho order, shipment, support và AI.</p>
      </div>

      <OrderStatsCards items={stats} />

      <div className='grid gap-4 xl:grid-cols-4'>
        <article className='rounded-3xl border border-[#eceaf8] bg-white p-5 shadow-[0_12px_36px_rgba(28,24,70,0.06)]'>
          <div className='flex items-center justify-between'>
            <p className='text-sm text-[#7a7697]'>Order</p>
            <ClipboardList className='h-5 w-5 text-[#6f62cf]' />
          </div>
          <p className='mt-2 text-3xl font-black text-[#212047]'>{payload?.orderSummary?.pendingOrders || 0}</p>
          <p className='mt-1 text-xs text-[#8f8aac]'>Pending orders</p>
        </article>

        <article className='rounded-3xl border border-[#eceaf8] bg-white p-5 shadow-[0_12px_36px_rgba(28,24,70,0.06)]'>
          <div className='flex items-center justify-between'>
            <p className='text-sm text-[#7a7697]'>Shipment</p>
            <Truck className='h-5 w-5 text-[#2f78d1]' />
          </div>
          <p className='mt-2 text-3xl font-black text-[#212047]'>{payload?.shipmentSummary?.deliveredShipments || 0}</p>
          <p className='mt-1 text-xs text-[#8f8aac]'>Delivered shipments</p>
        </article>

        <article className='rounded-3xl border border-[#eceaf8] bg-white p-5 shadow-[0_12px_36px_rgba(28,24,70,0.06)]'>
          <div className='flex items-center justify-between'>
            <p className='text-sm text-[#7a7697]'>AI Chatbot</p>
            <Bot className='h-5 w-5 text-[#6f62cf]' />
          </div>
          <p className='mt-2 text-3xl font-black text-[#212047]'>{payload?.chatbotData?.totalMessages || 0}</p>
          <p className='mt-1 text-xs text-[#8f8aac]'>Total AI messages</p>
        </article>

        <article className='rounded-3xl border border-[#eceaf8] bg-white p-5 shadow-[0_12px_36px_rgba(28,24,70,0.06)]'>
          <div className='flex items-center justify-between'>
            <p className='text-sm text-[#7a7697]'>Analytics Health</p>
            <BarChart3 className='h-5 w-5 text-[#2fb67a]' />
          </div>
          <p className='mt-2 text-3xl font-black text-[#212047]'>
            {analyticsQuery.isLoading && !payload ? '...' : 'OK'}
          </p>
          <p className='mt-1 text-xs text-[#8f8aac]'>Data sync status</p>
        </article>
      </div>
    </section>
  )
}
