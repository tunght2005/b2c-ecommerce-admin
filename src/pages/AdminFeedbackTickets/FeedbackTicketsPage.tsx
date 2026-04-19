import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, TicketCheck, RefreshCcw } from 'lucide-react'
import { toast } from 'react-toastify'

import Pagination from '../../components/Pagination'
import CrudActionButtons from '../../components/CrudActionButtons'
import { OrderStatsCards } from '../../components/Order'
import feedbackApi from '../../apis/feedback.api'
import { useAuth } from '../../contexts/app.context'
import type { FeedbackEntity, FeedbackPriority, FeedbackStatus } from '../../types/feedback.type'
import { formatDateTime } from '../../utils/common'

const STATUS_OPTIONS: Array<'all' | FeedbackStatus> = ['all', 'open', 'in_progress', 'resolved', 'closed']
const PRIORITY_OPTIONS: Array<'all' | FeedbackPriority> = ['all', 'low', 'medium', 'high', 'urgent']

function getReporter(feedback: FeedbackEntity) {
  if (typeof feedback.user_id === 'object' && feedback.user_id) {
    return {
      name: feedback.user_id.username || 'N/A',
      email: feedback.user_id.email || 'N/A'
    }
  }

  return {
    name: 'N/A',
    email: 'N/A'
  }
}

function getProductInfo(feedback: FeedbackEntity) {
  if (!feedback.product_id) {
    return {
      id: 'N/A',
      name: 'Không có sản phẩm đính kèm',
      status: 'N/A'
    }
  }

  if (typeof feedback.product_id === 'object') {
    return {
      id: feedback.product_id._id,
      name: feedback.product_id.name || 'N/A',
      status: feedback.product_id.status || 'N/A'
    }
  }

  return {
    id: feedback.product_id,
    name: 'Sản phẩm chưa populate',
    status: 'N/A'
  }
}

function getOrderInfo(feedback: FeedbackEntity) {
  if (!feedback.order_id) {
    return {
      id: 'N/A',
      status: 'N/A',
      paymentStatus: 'N/A',
      finalPrice: null as number | null
    }
  }

  if (typeof feedback.order_id === 'object') {
    return {
      id: feedback.order_id._id,
      status: feedback.order_id.status || 'N/A',
      paymentStatus: feedback.order_id.payment_status || 'N/A',
      finalPrice: typeof feedback.order_id.final_price === 'number' ? feedback.order_id.final_price : null
    }
  }

  return {
    id: feedback.order_id,
    status: 'N/A',
    paymentStatus: 'N/A',
    finalPrice: null as number | null
  }
}

export default function FeedbackTicketsPage() {
  const { role } = useAuth()
  const canAccess = role === 'admin' || role === 'support'
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | FeedbackStatus>('all')
  const [priorityFilter, setPriorityFilter] = useState<'all' | FeedbackPriority>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(8)
  const [detailTicket, setDetailTicket] = useState<FeedbackEntity | null>(null)
  const [editTicket, setEditTicket] = useState<FeedbackEntity | null>(null)
  const [nextStatus, setNextStatus] = useState<FeedbackStatus>('in_progress')
  const [nextPriority, setNextPriority] = useState<FeedbackPriority>('medium')

  const ticketsQuery = useQuery({
    queryKey: ['feedback-tickets', role],
    queryFn: async () => {
      if (!canAccess) return [] as FeedbackEntity[]

      const batchSize = 100
      let page = 1
      let totalPages = 1
      const allTickets: FeedbackEntity[] = []

      do {
        const response = await feedbackApi.listAll({
          page,
          limit: batchSize
        })

        const payload = response.data.data
        allTickets.push(...payload.feedbacks)
        totalPages = payload.pagination.pages
        page += 1
      } while (page <= totalPages)

      return allTickets
    },
    placeholderData: (previousData) => previousData
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, status, priority }: { id: string; status: FeedbackStatus; priority: FeedbackPriority }) =>
      feedbackApi.update(id, { status, priority }),
    onSuccess: (response) => {
      toast.success(response.data.message || 'Cập nhật ticket thành công')
      queryClient.invalidateQueries({ queryKey: ['feedback-tickets'] })
      setEditTicket(null)
    }
  })

  const tickets = useMemo(() => ticketsQuery.data ?? [], [ticketsQuery.data])

  const filteredTickets = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return tickets.filter((ticket) => {
      if (statusFilter !== 'all' && ticket.status !== statusFilter) return false
      if (priorityFilter !== 'all' && ticket.priority !== priorityFilter) return false

      if (!normalizedSearch) return true

      const reporter = getReporter(ticket)
      const text = [
        ticket._id,
        typeof ticket.order_id === 'object' && ticket.order_id ? ticket.order_id._id : ticket.order_id,
        ticket.title,
        ticket.content,
        reporter.name,
        reporter.email,
        ticket.status,
        ticket.priority
      ]
        .join(' ')
        .toLowerCase()

      return text.includes(normalizedSearch)
    })
  }, [tickets, search, statusFilter, priorityFilter])

  const totalItems = filteredTickets.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedTickets = filteredTickets.slice((safePage - 1) * pageSize, safePage * pageSize)

  const stats = useMemo(() => {
    const open = tickets.filter((item) => item.status === 'open').length
    const inProgress = tickets.filter((item) => item.status === 'in_progress').length
    const resolved = tickets.filter((item) => item.status === 'resolved' || item.status === 'closed').length
    const urgent = tickets.filter((item) => item.priority === 'urgent').length

    return [
      { label: 'Total Tickets', value: tickets.length, tone: 'from-[#6f62cf] to-[#8a7bf2]' },
      { label: 'Open', value: open, tone: 'from-[#2f86d6] to-[#65b4ff]' },
      { label: 'In Progress', value: inProgress, tone: 'from-[#f08c44] to-[#f7b36d]' },
      { label: 'Resolved', value: resolved, helper: `${urgent} urgent`, tone: 'from-[#2fb67a] to-[#5dd7a0]' }
    ]
  }, [tickets])

  if (!canAccess) {
    return (
      <section className='rounded-[30px] border border-[#eceaf8] bg-white p-6 shadow-[0_18px_50px_rgba(27,23,64,0.08)]'>
        <p className='text-lg font-bold text-[#201f47]'>Feedback Tickets</p>
        <p className='mt-2 text-sm text-[#6d6a8a]'>Trang này chỉ dành cho admin và support.</p>
      </section>
    )
  }

  return (
    <section className='space-y-5 pb-4'>
      <div>
        <p className='text-sm font-semibold uppercase tracking-[0.24em] text-[#8a84ad]'>Support System</p>
        <h1 className='mt-2 text-3xl font-black tracking-tight text-[#201f47]'>Feedback Tickets</h1>
        <p className='mt-2 max-w-2xl text-sm leading-6 text-[#6d6a8a]'>
          Quản lý toàn bộ ticket phản hồi từ khách hàng, phân luồng ưu tiên và xử lý theo SLA.
        </p>
      </div>

      <OrderStatsCards items={stats} />

      <div className='rounded-[30px] border border-[#eceaf8] bg-white p-5 shadow-[0_18px_50px_rgba(27,23,64,0.08)]'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <h2 className='text-xl font-bold text-[#212047]'>Ticket Queue</h2>
            <p className='mt-1 text-sm text-[#7a7697]'>{totalItems} ticket(s) found</p>
          </div>

          <div className='flex flex-wrap items-center gap-3'>
            <div className='relative'>
              <Search className='pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#9d98bf]' />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setCurrentPage(1)
                }}
                type='text'
                placeholder='Search ticket, reporter...'
                className='h-11 w-72 rounded-full border border-[#e5e1f3] bg-[#fbfaff] pr-4 pl-10 text-sm text-[#2d2950] outline-none'
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as 'all' | FeedbackStatus)
                setCurrentPage(1)
              }}
              className='h-11 rounded-full border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm text-[#2d2950] outline-none'
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status === 'all' ? 'All status' : status}
                </option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(event) => {
                setPriorityFilter(event.target.value as 'all' | FeedbackPriority)
                setCurrentPage(1)
              }}
              className='h-11 rounded-full border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm text-[#2d2950] outline-none'
            >
              {PRIORITY_OPTIONS.map((priority) => (
                <option key={priority} value={priority}>
                  {priority === 'all' ? 'All priority' : priority}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className='mt-5 overflow-hidden rounded-[26px] border border-[#eceaf8]'>
          <div className='overflow-x-auto'>
            <table className='min-w-full divide-y divide-[#eceaf8]'>
              <thead className='bg-[#faf9ff] text-left text-xs font-bold uppercase tracking-[0.18em] text-[#7f7a9e]'>
                <tr>
                  <th className='px-4 py-4'>Ticket</th>
                  <th className='px-4 py-4'>Reporter</th>
                  <th className='px-4 py-4'>Status</th>
                  <th className='px-4 py-4'>Priority</th>
                  <th className='px-4 py-4'>Created</th>
                  <th className='px-4 py-4 text-right'>Actions</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-[#f0edf8] bg-white'>
                {ticketsQuery.isLoading && !ticketsQuery.data ? (
                  <tr>
                    <td colSpan={6} className='px-4 py-16 text-center text-sm text-[#7a7697]'>
                      Loading feedback tickets...
                    </td>
                  </tr>
                ) : paginatedTickets.length > 0 ? (
                  paginatedTickets.map((ticket) => {
                    const reporter = getReporter(ticket)
                    return (
                      <tr key={ticket._id} className='transition hover:bg-[#fbfaff]'>
                        <td className='px-4 py-4'>
                          <p className='font-semibold text-[#28244f]'>#{ticket._id.slice(-8).toUpperCase()}</p>
                          <p className='mt-1 text-sm text-[#2d2950]'>{ticket.title}</p>
                        </td>
                        <td className='px-4 py-4'>
                          <p className='text-sm font-semibold text-[#2d2950]'>{reporter.name}</p>
                          <p className='text-xs text-[#8f8aac]'>{reporter.email}</p>
                        </td>
                        <td className='px-4 py-4 text-sm font-semibold text-[#4c4871]'>{ticket.status}</td>
                        <td className='px-4 py-4 text-sm font-semibold text-[#4c4871]'>{ticket.priority}</td>
                        <td className='px-4 py-4 text-sm text-[#5f5a7a]'>{formatDateTime(ticket.createdAt)}</td>
                        <td className='px-4 py-4'>
                          <div className='flex items-center justify-end gap-2'>
                            <button
                              type='button'
                              onClick={() => {
                                setEditTicket(ticket)
                                setNextStatus(ticket.status)
                                setNextPriority(ticket.priority)
                              }}
                              className='inline-flex h-9 items-center gap-1.5 rounded-full border border-[#d8edff] bg-[#eff8ff] px-3 text-xs font-semibold text-[#2f78d1] transition hover:bg-[#e2f2ff]'
                            >
                              <RefreshCcw className='h-4 w-4' /> Update
                            </button>
                            <CrudActionButtons onView={() => setDetailTicket(ticket)} buttonSize='sm' />
                          </div>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className='px-4 py-16 text-center text-sm text-[#7a7697]'>
                      No feedback tickets found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className='border-t border-[#eceaf8] p-4'>
            <Pagination
              totalItems={totalItems}
              currentPage={safePage}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size)
                setCurrentPage(1)
              }}
              itemLabel='tickets'
            />
          </div>
        </div>
      </div>

      {detailTicket ? (
        <div className='fixed inset-0 z-40 flex items-center justify-center bg-[#191532]/45 px-4 py-6'>
          <article className='w-full max-w-2xl rounded-[28px] border border-[#eceaf8] bg-white p-6 shadow-[0_25px_65px_rgba(23,20,55,0.35)]'>
            {(() => {
              const product = getProductInfo(detailTicket)
              const order = getOrderInfo(detailTicket)
              return (
                <>
                  <div className='flex items-center gap-2 text-[#6f62cf]'>
                    <TicketCheck className='h-5 w-5' />
                    <p className='text-lg font-bold text-[#212047]'>Ticket Detail</p>
                  </div>
                  <p className='mt-1 text-sm text-[#7a7697]'>{detailTicket._id}</p>
                  <h3 className='mt-4 text-lg font-bold text-[#201f47]'>{detailTicket.title}</h3>
                  <p className='mt-3 whitespace-pre-line text-sm leading-6 text-[#5f5a7a]'>{detailTicket.content}</p>

                  <div className='mt-4 rounded-2xl border border-[#eceaf8] p-4'>
                    <p className='text-xs uppercase tracking-[0.15em] text-[#9b97b9]'>Order</p>
                    <p className='mt-2 text-sm font-semibold text-[#2d2950]'>ID: {order.id}</p>
                    <p className='mt-1 text-xs text-[#7a7697]'>Status: {order.status}</p>
                    <p className='mt-1 text-xs text-[#7a7697]'>Payment: {order.paymentStatus}</p>
                    <p className='mt-1 text-xs text-[#7a7697]'>
                      Total: {order.finalPrice !== null ? order.finalPrice.toLocaleString('vi-VN') + ' VND' : 'N/A'}
                    </p>
                  </div>

                  <div className='mt-4 rounded-2xl border border-[#eceaf8] p-4'>
                    <p className='text-xs uppercase tracking-[0.15em] text-[#9b97b9]'>Product</p>
                    <p className='mt-2 text-sm font-semibold text-[#2d2950]'>{product.name}</p>
                    <p className='mt-1 text-xs text-[#7a7697]'>ID: {product.id}</p>
                    <p className='mt-1 text-xs text-[#7a7697]'>Status: {product.status}</p>
                  </div>

                  <div className='mt-5 flex flex-wrap gap-2 text-xs text-[#7a7697]'>
                    <span className='rounded-full border border-[#eceaf8] px-3 py-1'>
                      Status: {detailTicket.status}
                    </span>
                    <span className='rounded-full border border-[#eceaf8] px-3 py-1'>
                      Priority: {detailTicket.priority}
                    </span>
                    <span className='rounded-full border border-[#eceaf8] px-3 py-1'>
                      Created: {formatDateTime(detailTicket.createdAt)}
                    </span>
                  </div>
                  <div className='mt-6 flex justify-end'>
                    <button
                      type='button'
                      onClick={() => setDetailTicket(null)}
                      className='inline-flex h-10 items-center rounded-full border border-[#d9d3ef] px-5 text-sm font-semibold text-[#5f5a7a] transition hover:bg-[#f0edf8]'
                    >
                      Close
                    </button>
                  </div>
                </>
              )
            })()}
          </article>
        </div>
      ) : null}

      {editTicket ? (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-[#191532]/45 px-4 py-6'>
          <article className='w-full max-w-lg rounded-[28px] border border-[#eceaf8] bg-white p-6 shadow-[0_25px_65px_rgba(23,20,55,0.35)]'>
            <p className='text-lg font-bold text-[#212047]'>Update Ticket</p>
            <p className='mt-1 text-sm text-[#7a7697]'>{editTicket._id}</p>

            <div className='mt-5 space-y-4'>
              <label className='block'>
                <span className='text-sm font-semibold text-[#4a4666]'>Status</span>
                <select
                  value={nextStatus}
                  onChange={(event) => setNextStatus(event.target.value as FeedbackStatus)}
                  className='mt-2 h-11 w-full rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm text-[#2d2950] outline-none'
                >
                  {STATUS_OPTIONS.filter((status) => status !== 'all').map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              <label className='block'>
                <span className='text-sm font-semibold text-[#4a4666]'>Priority</span>
                <select
                  value={nextPriority}
                  onChange={(event) => setNextPriority(event.target.value as FeedbackPriority)}
                  className='mt-2 h-11 w-full rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm text-[#2d2950] outline-none'
                >
                  {PRIORITY_OPTIONS.filter((priority) => priority !== 'all').map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className='mt-6 flex justify-end gap-3'>
              <button
                type='button'
                onClick={() => setEditTicket(null)}
                className='inline-flex h-10 items-center rounded-full border border-[#d9d3ef] px-5 text-sm font-semibold text-[#5f5a7a] transition hover:bg-[#f0edf8]'
              >
                Cancel
              </button>
              <button
                type='button'
                onClick={() =>
                  updateMutation.mutate({
                    id: editTicket._id,
                    status: nextStatus,
                    priority: nextPriority
                  })
                }
                className='inline-flex h-10 items-center rounded-full bg-[#6f62cf] px-5 text-sm font-semibold text-white transition hover:bg-[#5e53bf]'
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </article>
        </div>
      ) : null}
    </section>
  )
}
