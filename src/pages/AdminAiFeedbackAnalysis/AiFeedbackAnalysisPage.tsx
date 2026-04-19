import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Brain, Sparkles, MessageSquareWarning } from 'lucide-react'

import { OrderStatsCards } from '../../components/Order'
import chatbotApi from '../../apis/chatbot.api'
import { useAuth } from '../../contexts/app.context'

export default function AiFeedbackAnalysisPage() {
  const { role } = useAuth()
  const canAccess = role === 'admin' || role === 'support'

  const analyticsQuery = useQuery({
    queryKey: ['ai-feedback-analytics', role],
    queryFn: async () => {
      if (!canAccess) return null
      const response = await chatbotApi.getAnalytics({ limit: 20 })
      return response.data.data
    },
    placeholderData: (previousData) => previousData
  })

  const unknownQuery = useQuery({
    queryKey: ['ai-feedback-unknown', role],
    queryFn: async () => {
      if (!canAccess) return []
      const response = await chatbotApi.getUnknownQueries({ page: 1, limit: 20 })
      return response.data.data
    },
    placeholderData: (previousData) => previousData
  })

  const analytics = analyticsQuery.data
  const unknownQueries = unknownQuery.data ?? []
  const topKeywords = analytics?.topKeywords ?? []

  const stats = useMemo(() => {
    const distribution = analytics?.messageTypeDistribution || []
    const productSearchCount = distribution.find((item) => item._id === 'product_search')?.count || 0
    const greetingCount = distribution.find((item) => item._id === 'greeting')?.count || 0
    const helpCount = distribution.find((item) => item._id === 'help')?.count || 0

    return [
      { label: 'Total Messages', value: analytics?.totalMessages || 0, tone: 'from-[#6f62cf] to-[#8a7bf2]' },
      { label: 'Product Search', value: productSearchCount, tone: 'from-[#2f86d6] to-[#65b4ff]' },
      { label: 'Greeting', value: greetingCount, tone: 'from-[#2fb67a] to-[#5dd7a0]' },
      { label: 'Help', value: helpCount, tone: 'from-[#f08c44] to-[#f7b36d]' }
    ]
  }, [analytics])

  if (!canAccess) {
    return (
      <section className='rounded-[30px] border border-[#eceaf8] bg-white p-6 shadow-[0_18px_50px_rgba(27,23,64,0.08)]'>
        <p className='text-lg font-bold text-[#201f47]'>AI Feedback Analysis</p>
        <p className='mt-2 text-sm text-[#6d6a8a]'>Trang này chỉ dành cho admin và support.</p>
      </section>
    )
  }

  return (
    <section className='space-y-5 pb-4'>
      <div>
        <p className='text-sm font-semibold uppercase tracking-[0.24em] text-[#8a84ad]'>AI System</p>
        <h1 className='mt-2 text-3xl font-black tracking-tight text-[#201f47]'>AI Feedback Analysis</h1>
        <p className='mt-2 max-w-2xl text-sm leading-6 text-[#6d6a8a]'>
          Tổng hợp insight từ analytics chatbot và unknown queries để hỗ trợ tối ưu dữ liệu AI.
        </p>
      </div>

      <OrderStatsCards items={stats} />

      <div className='grid gap-5 xl:grid-cols-2'>
        <article className='rounded-[30px] border border-[#eceaf8] bg-white p-5 shadow-[0_18px_50px_rgba(27,23,64,0.08)]'>
          <div className='flex items-center gap-2 text-[#6f62cf]'>
            <Brain className='h-4 w-4' />
            <h2 className='text-xl font-bold text-[#212047]'>Top Feedback Keywords</h2>
          </div>

          <div className='mt-4 space-y-3'>
            {topKeywords.length > 0 ? (
              topKeywords.map((item) => (
                <div
                  key={item._id}
                  className='flex items-center justify-between rounded-2xl border border-[#eceaf8] px-4 py-3'
                >
                  <p className='text-sm font-semibold text-[#2d2950]'>{item._id}</p>
                  <span className='rounded-full border border-[#e5e1f3] bg-[#faf9ff] px-2.5 py-1 text-xs font-semibold text-[#635d89]'>
                    {item.count}
                  </span>
                </div>
              ))
            ) : (
              <div className='rounded-2xl border border-dashed border-[#e5e1f3] p-8 text-center text-sm text-[#7a7697]'>
                Chưa có dữ liệu để phân tích từ khóa.
              </div>
            )}
          </div>
        </article>

        <article className='rounded-[30px] border border-[#eceaf8] bg-white p-5 shadow-[0_18px_50px_rgba(27,23,64,0.08)]'>
          <div className='flex items-center gap-2 text-[#6f62cf]'>
            <Sparkles className='h-4 w-4' />
            <h2 className='text-xl font-bold text-[#212047]'>AI Opportunity Signals</h2>
          </div>

          <div className='mt-4 space-y-3 text-sm text-[#5f5a7a]'>
            <div className='rounded-2xl border border-[#eceaf8] p-4'>
              <p className='font-semibold text-[#2d2950]'>Ticket backlog signal</p>
              <p className='mt-1'>Unknown queries phản ánh các nhu cầu người dùng chưa được AI xử lý hiệu quả.</p>
            </div>
            <div className='rounded-2xl border border-[#eceaf8] p-4'>
              <p className='font-semibold text-[#2d2950]'>Chat intent signal</p>
              <p className='mt-1'>
                Lượng product_search cao cho thấy chatbot đang đóng vai trò lớn trong khâu tư vấn đầu phễu bán hàng.
              </p>
            </div>
            <div className='rounded-2xl border border-[#eceaf8] p-4'>
              <p className='font-semibold text-[#2d2950]'>Escalation recommendation</p>
              <p className='mt-1'>Keyword xuất hiện dày đặc nên ưu tiên đưa vào stop words hoặc mapping category.</p>
            </div>
          </div>
        </article>
      </div>

      <article className='rounded-[30px] border border-[#eceaf8] bg-white p-5 shadow-[0_18px_50px_rgba(27,23,64,0.08)]'>
        <h2 className='text-xl font-bold text-[#212047]'>Unknown Queries Snapshot</h2>
        <p className='mt-1 text-sm text-[#7a7697]'>Top truy vấn chưa match sản phẩm.</p>

        <div className='mt-4 space-y-2'>
          {unknownQueries.length > 0 ? (
            unknownQueries.slice(0, 10).map((item) => (
              <div key={`${item._id.message}-${item.lastSeen}`} className='rounded-2xl border border-[#eceaf8] p-3'>
                <p className='text-sm font-semibold text-[#2d2950]'>{item._id.message}</p>
                <p className='mt-1 text-xs text-[#7a7697]'>
                  Keywords: {item._id.keywords.join(', ')} | Count: {item.count}
                </p>
              </div>
            ))
          ) : (
            <div className='rounded-2xl border border-dashed border-[#e5e1f3] p-8 text-center text-sm text-[#7a7697]'>
              Chưa có dữ liệu unknown queries.
            </div>
          )}
        </div>
      </article>

      <article className='rounded-[30px] border border-[#f3dfc9] bg-[#fff8ef] p-5 shadow-[0_18px_50px_rgba(27,23,64,0.08)]'>
        <div className='flex items-center gap-2 text-[#b0732e]'>
          <MessageSquareWarning className='h-4 w-4' />
          <p className='text-lg font-bold text-[#7e5120]'>Data Scope Note</p>
        </div>
        <p className='mt-2 text-sm leading-6 text-[#7e5f3f]'>
          Backend hiện cung cấp analytics và unknown queries theo vai trò admin/support để tối ưu AI chatbot theo dữ
          liệu thực tế.
        </p>
      </article>
    </section>
  )
}
