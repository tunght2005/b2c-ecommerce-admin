import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TicketPercent } from 'lucide-react'

import orderApi from '../../apis/order.api'
import OrderStatsCards from '../../components/Order/OrderStatsCards'
import type { OrderEntity } from '../../types/order.type'
import { formatCurrency, formatDateTime } from '../../utils/common'

interface VoucherUsageItem {
  code: string
  usedCount: number
  totalDiscount: number
  totalRevenue: number
  lastUsedAt: string
}

async function fetchOrdersForVoucherUsage() {
  const limit = 100
  let page = 1
  let totalPages = 1
  const allOrders: OrderEntity[] = []

  do {
    const response = await orderApi.listAllAdmin({ page, limit, sortBy: 'updatedAt', sortOrder: 'desc' })
    const payload = response.data.data
    allOrders.push(...(payload?.orders || []))
    totalPages = payload?.pagination?.totalPages || 1
    page += 1
  } while (page <= totalPages)

  return allOrders
}

function buildVoucherUsage(orders: OrderEntity[]): VoucherUsageItem[] {
  const map = new Map<string, VoucherUsageItem>()

  orders.forEach((order) => {
    if (typeof order.voucher_id !== 'object' || !order.voucher_id?.code) return

    const code = order.voucher_id.code
    const current = map.get(code)

    map.set(code, {
      code,
      usedCount: (current?.usedCount || 0) + 1,
      totalDiscount: (current?.totalDiscount || 0) + (order.discount_price || 0),
      totalRevenue: (current?.totalRevenue || 0) + (order.final_price || 0),
      lastUsedAt:
        !current || new Date(order.updatedAt).getTime() > new Date(current.lastUsedAt).getTime()
          ? order.updatedAt
          : current.lastUsedAt
    })
  })

  return Array.from(map.values()).sort((a, b) => b.usedCount - a.usedCount)
}

export default function VoucherUsagesPage() {
  const usageQuery = useQuery({
    queryKey: ['voucher-usage-page-orders'],
    queryFn: fetchOrdersForVoucherUsage,
    placeholderData: (prev) => prev
  })

  const usageList = useMemo(() => buildVoucherUsage(usageQuery.data || []), [usageQuery.data])

  const stats = useMemo(() => {
    const totalUsed = usageList.reduce((sum, item) => sum + item.usedCount, 0)
    const totalDiscount = usageList.reduce((sum, item) => sum + item.totalDiscount, 0)
    const totalRevenue = usageList.reduce((sum, item) => sum + item.totalRevenue, 0)

    return [
      { label: 'Tổng lượt dùng voucher', value: totalUsed, tone: 'from-[#6f62cf] to-[#8a7bf2]' },
      { label: 'Số mã đã dùng', value: usageList.length, tone: 'from-[#2f86d6] to-[#65b4ff]' },
      { label: 'Tổng tiền giảm', value: formatCurrency(totalDiscount), tone: 'from-[#f08c44] to-[#f7b36d]' },
      { label: 'Doanh thu liên quan', value: formatCurrency(totalRevenue), tone: 'from-[#2fb67a] to-[#5dd7a0]' }
    ]
  }, [usageList])

  return (
    <section className='space-y-5 pb-4'>
      <div className='rounded-[30px] border border-[#eceaf8] bg-white p-6 shadow-[0_18px_50px_rgba(27,23,64,0.08)]'>
        <p className='text-sm font-semibold uppercase tracking-[0.24em] text-[#8a84ad]'>Voucher Usages</p>
        <h1 className='mt-2 text-3xl font-black tracking-tight text-[#201f47]'>Voucher Usage Report</h1>
        <p className='mt-2 text-sm text-[#6d6a8a]'>
          Theo dõi tần suất và hiệu quả sử dụng voucher theo dữ liệu đơn hàng.
        </p>
      </div>

      <OrderStatsCards items={stats} />

      <article className='rounded-3xl border border-[#eceaf8] bg-white p-5 shadow-[0_12px_36px_rgba(28,24,70,0.06)]'>
        <div className='mb-4 flex items-center justify-between'>
          <h2 className='text-xl font-bold text-[#212047]'>Top voucher usages</h2>
          <TicketPercent className='h-5 w-5 text-[#2f78d1]' />
        </div>

        <div className='space-y-3'>
          {usageQuery.isLoading && !usageQuery.data ? (
            <p className='rounded-2xl border border-[#eceaf8] px-4 py-6 text-sm text-[#7a7697]'>Đang tải usage...</p>
          ) : usageList.length > 0 ? (
            usageList.map((item) => (
              <div
                key={item.code}
                className='grid gap-2 rounded-2xl border border-[#eceaf8] px-4 py-3 md:grid-cols-[1fr_auto_auto] md:items-center'
              >
                <div>
                  <p className='text-sm font-bold text-[#2a254b]'>{item.code}</p>
                  <p className='mt-1 text-xs text-[#8f8aac]'>Last used: {formatDateTime(item.lastUsedAt)}</p>
                </div>
                <p className='text-xs font-semibold text-[#5f5a7a]'>Used {item.usedCount} times</p>
                <p className='text-xs font-semibold text-[#2f8a57]'>{formatCurrency(item.totalDiscount)}</p>
              </div>
            ))
          ) : (
            <p className='rounded-2xl border border-[#eceaf8] px-4 py-6 text-sm text-[#7a7697]'>
              Chưa có dữ liệu usage voucher từ đơn hàng.
            </p>
          )}
        </div>
      </article>
    </section>
  )
}
