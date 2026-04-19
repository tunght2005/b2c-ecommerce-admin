import { useQuery } from '@tanstack/react-query'

import orderApi from '../../apis/order.api'
import OrderStatusBadge from '../../components/Order/OrderStatusBadge'
import { formatCurrency, formatDateTime } from '../../utils/common'

export default function OrdersReportPage() {
  const ordersQuery = useQuery({
    queryKey: ['orders-report-page'],
    queryFn: async () => {
      const response = await orderApi.listAllAdmin({ page: 1, limit: 25, sortBy: 'createdAt', sortOrder: 'desc' })
      return response.data.data?.orders || []
    },
    placeholderData: (prev) => prev
  })

  return (
    <section className='space-y-5 pb-4'>
      <div className='rounded-[30px] border border-[#eceaf8] bg-white p-6 shadow-[0_18px_50px_rgba(27,23,64,0.08)]'>
        <p className='text-sm font-semibold uppercase tracking-[0.24em] text-[#8a84ad]'>Orders Report</p>
        <h1 className='mt-2 text-3xl font-black tracking-tight text-[#201f47]'>Orders Report</h1>
        <p className='mt-2 text-sm text-[#6d6a8a]'>Danh sách đơn hàng gần nhất phục vụ kiểm tra vận hành.</p>
      </div>

      <article className='rounded-3xl border border-[#eceaf8] bg-white p-5 shadow-[0_12px_36px_rgba(28,24,70,0.06)]'>
        <div className='space-y-3'>
          {(ordersQuery.data || []).length > 0 ? (
            (ordersQuery.data || []).map((item) => (
              <div
                key={item._id}
                className='grid gap-3 rounded-2xl border border-[#eceaf8] px-4 py-3 md:grid-cols-[1.2fr_auto_auto_auto] md:items-center'
              >
                <div>
                  <p className='text-sm font-bold text-[#2a254b]'>Order #{item._id.slice(-8)}</p>
                  <p className='mt-1 text-xs text-[#8f8aac]'>{formatDateTime(item.createdAt)}</p>
                </div>
                <p className='text-xs font-semibold text-[#2f8a57]'>{formatCurrency(item.final_price || 0)}</p>
                <OrderStatusBadge variant='order' status={item.status} />
                <span className='rounded-full border border-[#e7dcff] bg-[#f4efff] px-3 py-1 text-xs font-semibold text-[#6a4cc2]'>
                  {item.payment_status}
                </span>
              </div>
            ))
          ) : (
            <p className='rounded-2xl border border-[#eceaf8] px-4 py-6 text-sm text-[#7a7697]'>
              Chưa có dữ liệu orders report.
            </p>
          )}
        </div>
      </article>
    </section>
  )
}
