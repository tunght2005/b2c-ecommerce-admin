import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp, AlertTriangle, CircleCheckBig } from 'lucide-react'

import { OrderStatsCards } from '../../components/Order'
import feedbackApi from '../../apis/feedback.api'
import { useAuth } from '../../contexts/app.context'
import type { FeedbackEntity } from '../../types/feedback.type'

function calcRatio(numerator: number, denominator: number) {
  if (!denominator) return '0%'
  return `${Math.round((numerator / denominator) * 100)}%`
}

export default function FeedbackRatingsPage() {
  const { role } = useAuth()
  const canAccess = role === 'admin' || role === 'support'

  const ticketsQuery = useQuery({
    queryKey: ['feedback-rating-analysis', role],
    queryFn: async () => {
      if (!canAccess) return [] as FeedbackEntity[]

      const response = await feedbackApi.listAll({ page: 1, limit: 200 })
      return response.data.data.feedbacks
    },
    placeholderData: (previousData) => previousData
  })

  const tickets = useMemo(() => ticketsQuery.data ?? [], [ticketsQuery.data])

  const priorityBreakdown = useMemo(() => {
    return [
      { key: 'urgent', count: tickets.filter((item) => item.priority === 'urgent').length },
      { key: 'high', count: tickets.filter((item) => item.priority === 'high').length },
      { key: 'medium', count: tickets.filter((item) => item.priority === 'medium').length },
      { key: 'low', count: tickets.filter((item) => item.priority === 'low').length }
    ]
  }, [tickets])

  const statusBreakdown = useMemo(() => {
    return [
      { key: 'open', count: tickets.filter((item) => item.status === 'open').length },
      { key: 'in_progress', count: tickets.filter((item) => item.status === 'in_progress').length },
      { key: 'resolved', count: tickets.filter((item) => item.status === 'resolved').length },
      { key: 'closed', count: tickets.filter((item) => item.status === 'closed').length }
    ]
  }, [tickets])

  const resolvedCount = statusBreakdown.find((item) => item.key === 'resolved')?.count ?? 0
  const closedCount = statusBreakdown.find((item) => item.key === 'closed')?.count ?? 0
  const openCount = statusBreakdown.find((item) => item.key === 'open')?.count ?? 0
  const inProgressCount = statusBreakdown.find((item) => item.key === 'in_progress')?.count ?? 0
  const urgentCount = priorityBreakdown.find((item) => item.key === 'urgent')?.count ?? 0

  const stats = [
    { label: 'Ticket Volume', value: tickets.length, tone: 'from-[#6f62cf] to-[#8a7bf2]' },
    {
      label: 'Resolution Rate',
      value: calcRatio(resolvedCount + closedCount, tickets.length),
      tone: 'from-[#2fb67a] to-[#5dd7a0]'
    },
    {
      label: 'Backlog',
      value: openCount + inProgressCount,
      helper: `${urgentCount} urgent`,
      tone: 'from-[#f08c44] to-[#f7b36d]'
    },
    { label: 'Close Rate', value: calcRatio(closedCount, tickets.length), tone: 'from-[#2f86d6] to-[#65b4ff]' }
  ]

  if (!canAccess) {
    return (
      <section className='rounded-[30px] border border-[#eceaf8] bg-white p-6 shadow-[0_18px_50px_rgba(27,23,64,0.08)]'>
        <p className='text-lg font-bold text-[#201f47]'>Feedback Ratings</p>
        <p className='mt-2 text-sm text-[#6d6a8a]'>Trang này chỉ dành cho admin và support.</p>
      </section>
    )
  }

  return (
    <section className='space-y-5 pb-4'>
      <div>
        <p className='text-sm font-semibold uppercase tracking-[0.24em] text-[#8a84ad]'>Support System</p>
        <h1 className='mt-2 text-3xl font-black tracking-tight text-[#201f47]'>Feedback Ratings</h1>
        <p className='mt-2 max-w-2xl text-sm leading-6 text-[#6d6a8a]'>
          Dashboard đánh giá chất lượng xử lý phản hồi dựa trên pipeline ticket hiện có từ backend.
        </p>
      </div>

      <OrderStatsCards items={stats} />

      <div className='grid gap-5 xl:grid-cols-2'>
        <div className='rounded-[30px] border border-[#eceaf8] bg-white p-5 shadow-[0_18px_50px_rgba(27,23,64,0.08)]'>
          <div className='flex items-center gap-2 text-[#6f62cf]'>
            <TrendingUp className='h-4 w-4' />
            <h2 className='text-xl font-bold text-[#212047]'>Status Breakdown</h2>
          </div>
          <div className='mt-4 space-y-3'>
            {statusBreakdown.map((item) => (
              <div key={item.key} className='rounded-2xl border border-[#eceaf8] p-4'>
                <div className='flex items-center justify-between'>
                  <p className='text-sm font-semibold text-[#2d2950]'>{item.key}</p>
                  <p className='text-lg font-black text-[#201f47]'>{item.count}</p>
                </div>
                <p className='mt-1 text-xs text-[#8f8aac]'>Share: {calcRatio(item.count, tickets.length)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className='rounded-[30px] border border-[#eceaf8] bg-white p-5 shadow-[0_18px_50px_rgba(27,23,64,0.08)]'>
          <div className='flex items-center gap-2 text-[#6f62cf]'>
            <AlertTriangle className='h-4 w-4' />
            <h2 className='text-xl font-bold text-[#212047]'>Priority Heatmap</h2>
          </div>
          <div className='mt-4 space-y-3'>
            {priorityBreakdown.map((item) => (
              <div key={item.key} className='rounded-2xl border border-[#eceaf8] p-4'>
                <div className='flex items-center justify-between'>
                  <p className='text-sm font-semibold text-[#2d2950]'>{item.key}</p>
                  <p className='text-lg font-black text-[#201f47]'>{item.count}</p>
                </div>
                <p className='mt-1 text-xs text-[#8f8aac]'>Share: {calcRatio(item.count, tickets.length)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <article className='rounded-[30px] border border-[#eceaf8] bg-white p-5 text-sm leading-6 text-[#5f5a7a] shadow-[0_18px_50px_rgba(27,23,64,0.08)]'>
        <div className='flex items-center gap-2 text-[#2f8a57]'>
          <CircleCheckBig className='h-4 w-4' />
          <p className='font-bold'>Ghi chú dữ liệu</p>
        </div>
        <p className='mt-2'>
          Backend hiện chưa có endpoint tổng hợp rating riêng theo ticket. Trang này đang phân tích chất lượng xử lý từ
          trạng thái và mức ưu tiên ticket để đội support theo dõi hiệu suất vận hành một cách nhất quán.
        </p>
      </article>
    </section>
  )
}
