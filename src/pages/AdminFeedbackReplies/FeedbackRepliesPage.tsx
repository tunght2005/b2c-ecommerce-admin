import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageSquareText, SendHorizonal, Shield } from 'lucide-react'
import { toast } from 'react-toastify'

import { OrderStatsCards } from '../../components/Order'
import feedbackApi from '../../apis/feedback.api'
import { useAuth } from '../../contexts/app.context'
import type { FeedbackEntity } from '../../types/feedback.type'
import { formatDateTime } from '../../utils/common'

function getReplyAuthorName(user: FeedbackEntity['user_id']) {
  return typeof user === 'object' && user ? user.username || user.email || 'N/A' : 'N/A'
}

function getRelatedProduct(ticket: FeedbackEntity) {
  if (!ticket.product_id) return null
  if (typeof ticket.product_id === 'object') {
    return {
      id: ticket.product_id._id,
      name: ticket.product_id.name || 'Sản phẩm không xác định'
    }
  }
  return {
    id: ticket.product_id,
    name: 'Sản phẩm chưa populate'
  }
}

function getRelatedOrder(ticket: FeedbackEntity) {
  if (!ticket.order_id) return null
  if (typeof ticket.order_id === 'object') {
    return {
      id: ticket.order_id._id,
      status: ticket.order_id.status || 'N/A'
    }
  }
  return {
    id: ticket.order_id,
    status: 'N/A'
  }
}

export default function FeedbackRepliesPage() {
  const { role } = useAuth()
  const canAccess = role === 'admin' || role === 'support'
  const queryClient = useQueryClient()

  const [selectedTicketId, setSelectedTicketId] = useState('')
  const [replyContent, setReplyContent] = useState('')
  const [isInternal, setIsInternal] = useState(false)

  const ticketsQuery = useQuery({
    queryKey: ['feedback-reply-tickets', role],
    queryFn: async () => {
      if (!canAccess) return [] as FeedbackEntity[]
      const response = await feedbackApi.listAll({ page: 1, limit: 100 })
      return response.data.data.feedbacks
    },
    placeholderData: (previousData) => previousData
  })

  const selectedTicket = (ticketsQuery.data ?? []).find((item) => item._id === selectedTicketId) ?? null

  const repliesQuery = useQuery({
    queryKey: ['feedback-replies', selectedTicketId],
    queryFn: async () => {
      if (!selectedTicketId) return []
      const response = await feedbackApi.listReplies(selectedTicketId)
      return response.data.data
    },
    enabled: Boolean(selectedTicketId),
    placeholderData: (previousData) => previousData
  })

  const replyMutation = useMutation({
    mutationFn: () =>
      feedbackApi.reply(selectedTicketId, {
        content: replyContent.trim(),
        is_internal: isInternal
      }),
    onSuccess: (response) => {
      toast.success(response.data.message || 'Đã gửi phản hồi')
      queryClient.invalidateQueries({ queryKey: ['feedback-replies', selectedTicketId] })
      setReplyContent('')
      setIsInternal(false)
    }
  })

  const replies = useMemo(() => repliesQuery.data ?? [], [repliesQuery.data])

  const stats = useMemo(() => {
    const internalReplies = replies.filter((item) => item.is_internal).length
    const externalReplies = replies.length - internalReplies

    return [
      { label: 'Selected Ticket', value: selectedTicket ? '1' : '0', tone: 'from-[#6f62cf] to-[#8a7bf2]' },
      { label: 'Total Replies', value: replies.length, tone: 'from-[#2f86d6] to-[#65b4ff]' },
      { label: 'Internal Notes', value: internalReplies, tone: 'from-[#f08c44] to-[#f7b36d]' },
      { label: 'Customer Replies', value: externalReplies, tone: 'from-[#2fb67a] to-[#5dd7a0]' }
    ]
  }, [replies, selectedTicket])

  if (!canAccess) {
    return (
      <section className='rounded-[30px] border border-[#eceaf8] bg-white p-6 shadow-[0_18px_50px_rgba(27,23,64,0.08)]'>
        <p className='text-lg font-bold text-[#201f47]'>Feedback Replies</p>
        <p className='mt-2 text-sm text-[#6d6a8a]'>Trang này chỉ dành cho admin và support.</p>
      </section>
    )
  }

  return (
    <section className='space-y-5 pb-4'>
      <div>
        <p className='text-sm font-semibold uppercase tracking-[0.24em] text-[#8a84ad]'>Support System</p>
        <h1 className='mt-2 text-3xl font-black tracking-tight text-[#201f47]'>Feedback Replies</h1>
        <p className='mt-2 max-w-2xl text-sm leading-6 text-[#6d6a8a]'>
          Theo dõi lịch sử trao đổi và gửi phản hồi mới cho ticket theo quy trình hỗ trợ khách hàng.
        </p>
      </div>

      <OrderStatsCards items={stats} />

      <div className='grid gap-5 xl:grid-cols-[1fr_1.4fr]'>
        <div className='rounded-[30px] border border-[#eceaf8] bg-white p-5 shadow-[0_18px_50px_rgba(27,23,64,0.08)]'>
          <h2 className='text-xl font-bold text-[#212047]'>Select Ticket</h2>
          <p className='mt-1 text-sm text-[#7a7697]'>{(ticketsQuery.data ?? []).length} ticket(s) available</p>

          <select
            value={selectedTicketId}
            onChange={(event) => setSelectedTicketId(event.target.value)}
            className='mt-4 h-11 w-full rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm text-[#2d2950] outline-none'
          >
            <option value=''>Choose a ticket</option>
            {(ticketsQuery.data ?? []).map((ticket) => (
              <option key={ticket._id} value={ticket._id}>
                {ticket.title} ({ticket.status}){ticket.product_id ? ' | Product' : ''}
                {ticket.order_id ? ' | Order' : ''}
              </option>
            ))}
          </select>

          {selectedTicket ? (
            <div className='mt-4 rounded-2xl border border-[#eceaf8] p-4'>
              {(() => {
                const relatedProduct = getRelatedProduct(selectedTicket)
                const relatedOrder = getRelatedOrder(selectedTicket)
                return (
                  <>
                    <p className='text-sm font-bold text-[#28244f]'>{selectedTicket.title}</p>
                    <p className='mt-2 text-xs text-[#7a7697]'>#{selectedTicket._id.slice(-8).toUpperCase()}</p>
                    <p className='mt-2 text-xs text-[#7a7697]'>Status: {selectedTicket.status}</p>
                    <p className='mt-1 text-xs text-[#7a7697]'>Priority: {selectedTicket.priority}</p>
                    {relatedProduct ? (
                      <div className='mt-3 rounded-xl border border-[#eceaf8] bg-[#faf9ff] p-3'>
                        <p className='text-[11px] uppercase tracking-[0.15em] text-[#9b97b9]'>Sản phẩm phản hồi</p>
                        <p className='mt-1 text-sm font-semibold text-[#2d2950]'>{relatedProduct.name}</p>
                        <p className='mt-1 text-xs text-[#7a7697]'>ID: {relatedProduct.id}</p>
                      </div>
                    ) : null}
                    {relatedOrder ? (
                      <div className='mt-3 rounded-xl border border-[#eceaf8] bg-[#faf9ff] p-3'>
                        <p className='text-[11px] uppercase tracking-[0.15em] text-[#9b97b9]'>Đơn hàng phản hồi</p>
                        <p className='mt-1 text-sm font-semibold text-[#2d2950]'>
                          #{relatedOrder.id.slice(-8).toUpperCase()}
                        </p>
                        <p className='mt-1 text-xs text-[#7a7697]'>Trạng thái: {relatedOrder.status}</p>
                      </div>
                    ) : null}
                  </>
                )
              })()}
            </div>
          ) : null}

          <div className='mt-5 space-y-3'>
            <label className='block'>
              <span className='text-sm font-semibold text-[#4a4666]'>Reply Content</span>
              <textarea
                value={replyContent}
                onChange={(event) => setReplyContent(event.target.value)}
                rows={5}
                placeholder='Type your response...'
                className='mt-2 w-full rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 py-3 text-sm text-[#2d2950] outline-none'
              />
            </label>

            <label className='inline-flex items-center gap-2 text-sm text-[#4a4666]'>
              <input
                type='checkbox'
                checked={isInternal}
                onChange={(event) => setIsInternal(event.target.checked)}
                className='h-4 w-4 rounded border-[#d9d3ef]'
              />
              Internal note (chỉ staff thấy)
            </label>

            <button
              type='button'
              disabled={!selectedTicketId || !replyContent.trim()}
              onClick={() => replyMutation.mutate()}
              className='inline-flex h-10 items-center gap-2 rounded-full bg-[#6f62cf] px-5 text-sm font-semibold text-white transition hover:bg-[#5e53bf] disabled:cursor-not-allowed disabled:opacity-60'
            >
              <SendHorizonal className='h-4 w-4' /> {replyMutation.isPending ? 'Sending...' : 'Send Reply'}
            </button>
          </div>
        </div>

        <div className='rounded-[30px] border border-[#eceaf8] bg-white p-5 shadow-[0_18px_50px_rgba(27,23,64,0.08)]'>
          <h2 className='text-xl font-bold text-[#212047]'>Reply Timeline</h2>
          <p className='mt-1 text-sm text-[#7a7697]'>{replies.length} message(s)</p>

          <div className='mt-4 max-h-155 space-y-3 overflow-auto pr-1'>
            {selectedTicketId ? (
              replies.length > 0 ? (
                replies.map((reply) => (
                  <article key={reply._id} className='rounded-2xl border border-[#eceaf8] bg-white p-4'>
                    <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                      <p className='text-sm font-bold text-[#28244f]'>
                        {getReplyAuthorName(reply.user_id as FeedbackEntity['user_id'])}
                      </p>
                      <div className='flex flex-wrap items-center gap-2'>
                        {reply.is_internal ? (
                          <span className='inline-flex items-center gap-1 rounded-full border border-[#f1ddc8] bg-[#fff5ea] px-2.5 py-1 text-xs font-semibold text-[#b0732e]'>
                            <Shield className='h-3.5 w-3.5' /> Internal
                          </span>
                        ) : (
                          <span className='inline-flex items-center gap-1 rounded-full border border-[#d8edff] bg-[#eff8ff] px-2.5 py-1 text-xs font-semibold text-[#2f78d1]'>
                            <MessageSquareText className='h-3.5 w-3.5' /> Public
                          </span>
                        )}
                      </div>
                    </div>
                    <p className='mt-3 whitespace-pre-line text-sm leading-6 text-[#5f5a7a]'>{reply.content}</p>
                    <p className='mt-3 text-xs text-[#8f8aac]'>{formatDateTime(reply.createdAt)}</p>
                  </article>
                ))
              ) : (
                <div className='rounded-2xl border border-dashed border-[#e5e1f3] p-8 text-center text-sm text-[#7a7697]'>
                  No replies yet for this ticket.
                </div>
              )
            ) : (
              <div className='rounded-2xl border border-dashed border-[#e5e1f3] p-8 text-center text-sm text-[#7a7697]'>
                Select a ticket to view replies.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
