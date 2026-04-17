import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BarChart3, Bot, MessageSquareWarning, Search, SendHorizonal, Settings2 } from 'lucide-react'

import { OrderStatsCards } from '../../components/Order'
import chatbotApi from '../../apis/chatbot.api'
import { useAuth } from '../../contexts/app.context'
import type { ChatbotHistoryItem, ChatbotUnknownQueryItem } from '../../types/chatbot.type'
import { formatDateTime } from '../../utils/common'

export default function AiConversationsPage() {
  const { role } = useAuth()
  const canAccess = role === 'admin' || role === 'support'
  const canUpdateConfig = role === 'admin'
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [messageInput, setMessageInput] = useState('')
  const [stopWordsInput, setStopWordsInput] = useState<string | null>(null)

  const historyQuery = useQuery({
    queryKey: ['ai-conversations', role],
    queryFn: async () => {
      if (!canAccess) return [] as ChatbotHistoryItem[]
      const response = await chatbotApi.getHistory(200)
      return response.data.data
    },
    placeholderData: (previousData) => previousData
  })

  const analyticsQuery = useQuery({
    queryKey: ['ai-analytics', role],
    queryFn: async () => {
      if (!canAccess) {
        return null
      }

      const response = await chatbotApi.getAnalytics({ limit: 10 })
      return response.data.data
    },
    enabled: canAccess,
    placeholderData: (previousData) => previousData
  })

  const unknownQueries = useQuery({
    queryKey: ['ai-unknown-queries', role],
    queryFn: async () => {
      if (!canAccess) {
        return [] as ChatbotUnknownQueryItem[]
      }

      const response = await chatbotApi.getUnknownQueries({ page: 1, limit: 10 })
      return response.data.data
    },
    enabled: canAccess,
    placeholderData: (previousData) => previousData
  })

  const configQuery = useQuery({
    queryKey: ['ai-chatbot-config', role],
    queryFn: async () => {
      if (!canUpdateConfig) {
        return null
      }

      const response = await chatbotApi.getConfig()
      return response.data.data
    },
    enabled: canUpdateConfig,
    placeholderData: (previousData) => previousData
  })

  const sendMutation = useMutation({
    mutationFn: () => chatbotApi.sendMessage(messageInput.trim()),
    onSuccess: () => {
      setMessageInput('')
      queryClient.invalidateQueries({ queryKey: ['ai-conversations'] })
    }
  })

  const updateStopWordsMutation = useMutation({
    mutationFn: async () => {
      const source = stopWordsInput ?? (configQuery.data?.stopWords || []).join(', ')
      const stopWords = source
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)

      return chatbotApi.updateStopWords([...new Set(stopWords)])
    },
    onSuccess: () => {
      setStopWordsInput(null)
      queryClient.invalidateQueries({ queryKey: ['ai-chatbot-config'] })
    }
  })

  const history = useMemo(() => historyQuery.data ?? [], [historyQuery.data])
  const analytics = analyticsQuery.data
  const unknownQueryItems = unknownQueries.data ?? []
  const stopWordsValue = stopWordsInput ?? (configQuery.data?.stopWords || []).join(', ')

  const filteredHistory = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    if (!normalizedSearch) return history

    return history.filter((item) =>
      [item.message, item.response, item.type, item.keywords.join(' ')]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch)
    )
  }, [history, search])

  const stats = useMemo(() => {
    const distribution = analytics?.messageTypeDistribution || []
    const productSearchCount = distribution.find((item) => item._id === 'product_search')?.count || 0
    const greetingCount = distribution.find((item) => item._id === 'greeting')?.count || 0
    const helpCount = distribution.find((item) => item._id === 'help')?.count || 0

    return [
      {
        label: 'Conversation Logs',
        value: analytics?.totalMessages || history.length,
        tone: 'from-[#6f62cf] to-[#8a7bf2]'
      },
      { label: 'Product Search', value: productSearchCount, tone: 'from-[#2f86d6] to-[#65b4ff]' },
      { label: 'Greeting', value: greetingCount, tone: 'from-[#2fb67a] to-[#5dd7a0]' },
      { label: 'Help', value: helpCount, tone: 'from-[#f08c44] to-[#f7b36d]' }
    ]
  }, [analytics, history.length])

  if (!canAccess) {
    return (
      <section className='rounded-[30px] border border-[#eceaf8] bg-white p-6 shadow-[0_18px_50px_rgba(27,23,64,0.08)]'>
        <p className='text-lg font-bold text-[#201f47]'>AI Conversations</p>
        <p className='mt-2 text-sm text-[#6d6a8a]'>Trang này chỉ dành cho admin và support.</p>
      </section>
    )
  }

  return (
    <section className='space-y-5 pb-4'>
      <div>
        <p className='text-sm font-semibold uppercase tracking-[0.24em] text-[#8a84ad]'>AI System</p>
        <h1 className='mt-2 text-3xl font-black tracking-tight text-[#201f47]'>AI Conversations</h1>
        <p className='mt-2 max-w-2xl text-sm leading-6 text-[#6d6a8a]'>
          Theo dõi lịch sử hội thoại chatbot và thử phản hồi nhanh để kiểm tra chất lượng nội dung AI.
        </p>
      </div>

      <OrderStatsCards items={stats} />

      <div className='grid gap-5 xl:grid-cols-[1fr_1.4fr]'>
        <div className='rounded-[30px] border border-[#eceaf8] bg-white p-5 shadow-[0_18px_50px_rgba(27,23,64,0.08)]'>
          <h2 className='text-xl font-bold text-[#212047]'>Send Test Message</h2>
          <p className='mt-1 text-sm text-[#7a7697]'>Gửi câu hỏi để kiểm tra phản hồi chatbot.</p>

          <textarea
            value={messageInput}
            onChange={(event) => setMessageInput(event.target.value)}
            rows={5}
            placeholder='Ví dụ: Tôi muốn mua tai nghe gaming dưới 2 triệu...'
            className='mt-4 w-full rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 py-3 text-sm text-[#2d2950] outline-none'
          />

          <button
            type='button'
            disabled={!messageInput.trim()}
            onClick={() => sendMutation.mutate()}
            className='mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-[#6f62cf] px-5 text-sm font-semibold text-white transition hover:bg-[#5e53bf] disabled:cursor-not-allowed disabled:opacity-60'
          >
            <SendHorizonal className='h-4 w-4' /> {sendMutation.isPending ? 'Sending...' : 'Send to AI'}
          </button>

          <div className='mt-6 rounded-2xl border border-[#eceaf8] p-4'>
            <p className='text-sm font-semibold text-[#2d2950]'>Top Keywords (Analytics)</p>
            <div className='mt-3 space-y-2'>
              {analyticsQuery.isLoading ? (
                <p className='text-sm text-[#7a7697]'>Đang tải analytics...</p>
              ) : analytics?.topKeywords?.length ? (
                analytics.topKeywords.slice(0, 6).map((item) => (
                  <div
                    key={item._id}
                    className='flex items-center justify-between rounded-xl border border-[#eceaf8] px-3 py-2'
                  >
                    <span className='text-sm text-[#4d4970]'>{item._id}</span>
                    <span className='text-xs font-semibold text-[#6d6891]'>{item.count}</span>
                  </div>
                ))
              ) : (
                <p className='text-sm text-[#7a7697]'>Chưa có dữ liệu keyword.</p>
              )}
            </div>
          </div>
        </div>

        <div className='rounded-[30px] border border-[#eceaf8] bg-white p-5 shadow-[0_18px_50px_rgba(27,23,64,0.08)]'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div>
              <h2 className='text-xl font-bold text-[#212047]'>Conversation History</h2>
              <p className='mt-1 text-sm text-[#7a7697]'>{filteredHistory.length} record(s)</p>
            </div>

            <div className='relative'>
              <Search className='pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#9d98bf]' />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                type='text'
                placeholder='Search message...'
                className='h-11 w-72 rounded-full border border-[#e5e1f3] bg-[#fbfaff] pr-4 pl-10 text-sm text-[#2d2950] outline-none'
              />
            </div>
          </div>

          <div className='mt-4 max-h-155 space-y-3 overflow-auto pr-1'>
            {historyQuery.isLoading && !historyQuery.data ? (
              <div className='rounded-2xl border border-dashed border-[#e5e1f3] p-8 text-center text-sm text-[#7a7697]'>
                Loading conversation history...
              </div>
            ) : filteredHistory.length > 0 ? (
              filteredHistory.map((item) => (
                <article key={item._id} className='rounded-2xl border border-[#eceaf8] p-4'>
                  <div className='flex items-center justify-between gap-2'>
                    <span className='inline-flex items-center gap-1 rounded-full border border-[#e5e1f3] bg-[#f9f8ff] px-3 py-1 text-xs font-semibold text-[#5a5487]'>
                      <Bot className='h-3.5 w-3.5' /> {item.type}
                    </span>
                    <span className='text-xs text-[#8f8aac]'>{formatDateTime(item.createdAt)}</span>
                  </div>

                  <p className='mt-3 text-sm font-semibold text-[#2d2950]'>User</p>
                  <p className='mt-1 text-sm leading-6 text-[#5f5a7a]'>{item.message}</p>

                  <p className='mt-3 text-sm font-semibold text-[#2d2950]'>AI</p>
                  <p className='mt-1 whitespace-pre-line text-sm leading-6 text-[#5f5a7a]'>{item.response}</p>
                </article>
              ))
            ) : (
              <div className='rounded-2xl border border-dashed border-[#e5e1f3] p-8 text-center text-sm text-[#7a7697]'>
                No AI conversation history found.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className='grid gap-5 xl:grid-cols-2'>
        <article className='rounded-[30px] border border-[#eceaf8] bg-white p-5 shadow-[0_18px_50px_rgba(27,23,64,0.08)]'>
          <div className='flex items-center gap-2'>
            <MessageSquareWarning className='h-4 w-4 text-[#6f62cf]' />
            <h2 className='text-xl font-bold text-[#212047]'>Unknown Queries</h2>
          </div>

          <p className='mt-1 text-sm text-[#7a7697]'>Những truy vấn chưa tìm thấy sản phẩm.</p>

          <div className='mt-4 space-y-2'>
            {unknownQueries.isLoading ? (
              <p className='text-sm text-[#7a7697]'>Đang tải unknown queries...</p>
            ) : unknownQueryItems.length > 0 ? (
              unknownQueryItems.map((item) => (
                <div key={`${item._id.message}-${item.lastSeen}`} className='rounded-2xl border border-[#eceaf8] p-3'>
                  <p className='text-sm font-semibold text-[#2d2950]'>{item._id.message}</p>
                  <p className='mt-1 text-xs text-[#7a7697]'>
                    Keywords: {item._id.keywords.join(', ')} | Count: {item.count}
                  </p>
                  <p className='mt-1 text-xs text-[#8f8aac]'>Last seen: {formatDateTime(item.lastSeen)}</p>
                </div>
              ))
            ) : (
              <p className='text-sm text-[#7a7697]'>Không có unknown queries.</p>
            )}
          </div>
        </article>

        <article className='rounded-[30px] border border-[#eceaf8] bg-white p-5 shadow-[0_18px_50px_rgba(27,23,64,0.08)]'>
          <div className='flex items-center gap-2'>
            <Settings2 className='h-4 w-4 text-[#6f62cf]' />
            <h2 className='text-xl font-bold text-[#212047]'>Stop Words Config</h2>
          </div>

          {!canUpdateConfig ? (
            <p className='mt-3 text-sm text-[#7a7697]'>Support chỉ có quyền xem analytics và unknown queries.</p>
          ) : (
            <>
              <p className='mt-1 text-sm text-[#7a7697]'>Admin có thể cập nhật danh sách stop words cho chatbot.</p>

              <textarea
                value={stopWordsValue}
                onChange={(event) => setStopWordsInput(event.target.value)}
                rows={6}
                placeholder='là, có, để, và, ...'
                className='mt-4 w-full rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 py-3 text-sm text-[#2d2950] outline-none'
              />

              <button
                type='button'
                onClick={() => updateStopWordsMutation.mutate()}
                disabled={!stopWordsValue.trim()}
                className='mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-[#201f47] px-5 text-sm font-semibold text-white transition hover:bg-[#161538] disabled:cursor-not-allowed disabled:opacity-60'
              >
                <BarChart3 className='h-4 w-4' />
                {updateStopWordsMutation.isPending ? 'Updating...' : 'Update Stop Words'}
              </button>
            </>
          )}
        </article>
      </div>
    </section>
  )
}
