import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import orderApi from '../../apis/order.api'
import OrderStatsCards from '../../components/Order/OrderStatsCards'
import { formatCurrency } from '../../utils/common'

export default function RevenuePage() {
  const revenueQuery = useQuery({
    queryKey: ['revenue-page'],
    queryFn: async () => {
      const response = await orderApi.listAllAdmin({ page: 1, limit: 200, sortBy: 'createdAt', sortOrder: 'desc' })
      return response.data.data
    },
    placeholderData: (prev) => prev
  })

  const stats = useMemo(() => {
    const summary = revenueQuery.data?.summary
    const orders = revenueQuery.data?.orders || []
    const paidRevenue = orders
      .filter((item) => item.payment_status === 'paid')
      .reduce((sum, item) => sum + (item.final_price || 0), 0)

    return [
      {
        label: 'Tổng doanh thu',
        value: formatCurrency(summary?.totalRevenue || 0),
        tone: 'from-[#6f62cf] to-[#8a7bf2]'
      },
      { label: 'Doanh thu đã thanh toán', value: formatCurrency(paidRevenue), tone: 'from-[#2fb67a] to-[#5dd7a0]' },
      { label: 'Đơn hoàn thành', value: summary?.completedOrders || 0, tone: 'from-[#2f86d6] to-[#65b4ff]' },
      { label: 'Đơn hủy', value: summary?.cancelledOrders || 0, tone: 'from-[#f08c44] to-[#f7b36d]' }
    ]
  }, [revenueQuery.data])

  return (
    <section className='space-y-5 pb-4'>
      <div className='rounded-[30px] border border-[#eceaf8] bg-white p-6 shadow-[0_18px_50px_rgba(27,23,64,0.08)]'>
        <p className='text-sm font-semibold uppercase tracking-[0.24em] text-[#8a84ad]'>Revenue</p>
        <h1 className='mt-2 text-3xl font-black tracking-tight text-[#201f47]'>Revenue Overview</h1>
        <p className='mt-2 text-sm text-[#6d6a8a]'>Báo cáo doanh thu từ các đơn hàng của hệ thống.</p>
      </div>

      <OrderStatsCards items={stats} />
    </section>
  )
}
