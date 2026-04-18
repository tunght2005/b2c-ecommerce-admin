import { type FormEvent, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, Plus, SlidersHorizontal, X } from 'lucide-react'
import { toast } from 'react-toastify'

import notificationApi from '../../apis/notification.api'
import CrudActionButtons from '../../components/CrudActionButtons'
import OrderStatsCards from '../../components/Order/OrderStatsCards'
import { formatDateTime } from '../../utils/common'

export default function NotificationsPage() {
  const queryClient = useQueryClient()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [broadcastTitle, setBroadcastTitle] = useState('')
  const [broadcastContent, setBroadcastContent] = useState('')
  const [keyword, setKeyword] = useState('')
  const [readStatus, setReadStatus] = useState<'all' | 'read' | 'unread'>('all')
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'system' | 'marketing'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'personal' | 'global'>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const notificationsQuery = useQuery({
    queryKey: ['admin-notifications-page'],
    queryFn: async () => {
      const response = await notificationApi.listMine()
      return response.data.notifications || []
    },
    placeholderData: (prev) => prev
  })

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationApi.markRead(id),
    onSuccess: () => {
      toast.success('Đã đánh dấu đã đọc')
      queryClient.invalidateQueries({ queryKey: ['admin-notifications-page'] })
    },
    onError: () => toast.error('Không thể cập nhật trạng thái thông báo')
  })

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: () => {
      toast.success('Đã đánh dấu tất cả thông báo đã đọc')
      queryClient.invalidateQueries({ queryKey: ['admin-notifications-page'] })
    },
    onError: () => toast.error('Không thể cập nhật trạng thái thông báo')
  })

  const broadcastMutation = useMutation({
    mutationFn: () =>
      notificationApi.broadcastToAllUsers({
        title: broadcastTitle.trim(),
        content: broadcastContent.trim()
      }),
    onSuccess: (response) => {
      toast.success(`${response.data.message} (${response.data.total} users)`)
      setBroadcastTitle('')
      setBroadcastContent('')
      setIsCreateModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['admin-notifications-page'] })
    },
    onError: () => toast.error('Không thể gửi thông báo đến toàn bộ user')
  })

  const handleBroadcast = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!broadcastTitle.trim()) {
      toast.warn('Vui lòng nhập tiêu đề thông báo')
      return
    }

    broadcastMutation.mutate()
  }

  const notifications = useMemo(() => notificationsQuery.data || [], [notificationsQuery.data])

  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      const text = `${item.title || ''} ${item.content || ''}`.toLowerCase()
      const keywordMatched = !keyword.trim() || text.includes(keyword.trim().toLowerCase())

      const readMatched =
        readStatus === 'all' || (readStatus === 'read' && item.is_read) || (readStatus === 'unread' && !item.is_read)

      const categoryMatched = categoryFilter === 'all' || (item.category || 'system') === categoryFilter
      const typeMatched = typeFilter === 'all' || (item.type || 'personal') === typeFilter

      const createdTime = item.createdAt ? new Date(item.createdAt).getTime() : 0
      const fromMatched = !fromDate || createdTime >= new Date(`${fromDate}T00:00:00`).getTime()
      const toMatched = !toDate || createdTime <= new Date(`${toDate}T23:59:59`).getTime()

      return keywordMatched && readMatched && categoryMatched && typeMatched && fromMatched && toMatched
    })
  }, [notifications, keyword, readStatus, categoryFilter, typeFilter, fromDate, toDate])

  const resetFilters = () => {
    setKeyword('')
    setReadStatus('all')
    setCategoryFilter('all')
    setTypeFilter('all')
    setFromDate('')
    setToDate('')
  }

  const stats = useMemo(() => {
    const unread = notifications.filter((item) => !item.is_read).length

    return [
      { label: 'Tổng notifications', value: notifications.length, tone: 'from-[#6f62cf] to-[#8a7bf2]' },
      { label: 'Chưa đọc', value: unread, tone: 'from-[#f08c44] to-[#f7b36d]' },
      { label: 'Đã đọc', value: notifications.length - unread, tone: 'from-[#2fb67a] to-[#5dd7a0]' },
      {
        label: 'Tỷ lệ đã đọc',
        value: notifications.length
          ? `${Math.round(((notifications.length - unread) / notifications.length) * 100)}%`
          : '0%',
        tone: 'from-[#2f86d6] to-[#65b4ff]'
      }
    ]
  }, [notifications])

  return (
    <section className='space-y-5 pb-4'>
      <div className='rounded-[30px] border border-[#eceaf8] bg-white p-6 shadow-[0_18px_50px_rgba(27,23,64,0.08)]'>
        <p className='text-sm font-semibold uppercase tracking-[0.24em] text-[#8a84ad]'>Notifications</p>
        <h1 className='mt-2 text-3xl font-black tracking-tight text-[#201f47]'>Notification Center</h1>
        <p className='mt-2 text-sm text-[#6d6a8a]'>Quản trị thông báo vận hành và trạng thái đọc.</p>
      </div>

      <OrderStatsCards items={stats} />

      <article className='rounded-3xl border border-[#eceaf8] bg-white p-5 shadow-[0_12px_36px_rgba(28,24,70,0.06)]'>
        <div className='mb-4 flex items-center justify-between'>
          <h2 className='text-xl font-bold text-[#212047]'>Danh sách thông báo</h2>
          <div className='flex items-center gap-2'>
            <button
              type='button'
              onClick={() => setIsCreateModalOpen(true)}
              className='inline-flex h-8 items-center gap-2 rounded-full border border-[#d8edff] bg-[#eff8ff] px-3 text-xs font-semibold text-[#2f78d1] transition hover:bg-[#e2f2ff]'
            >
              <Plus className='h-3.5 w-3.5' />
              Tạo thông báo
            </button>
            <button
              type='button'
              onClick={() => setIsFilterOpen((prev) => !prev)}
              className='inline-flex h-8 items-center gap-2 rounded-full border border-[#d9d3ef] bg-white px-3 text-xs font-semibold text-[#5f5a7a] transition hover:border-[#bfb5ea] hover:text-[#6f62cf]'
            >
              <SlidersHorizontal className='h-3.5 w-3.5' />
              Filter nâng cao
            </button>
            <button
              type='button'
              onClick={() => markAllReadMutation.mutate()}
              className='inline-flex h-8 items-center rounded-full border border-[#d8edff] bg-[#eff8ff] px-3 text-xs font-semibold text-[#2f78d1] transition hover:bg-[#e2f2ff]'
            >
              Mark all read
            </button>
            <Bell className='h-5 w-5 text-[#2f78d1]' />
          </div>
        </div>

        {isFilterOpen ? (
          <div className='mb-4 rounded-2xl border border-[#eceaf8] bg-[#faf9ff] p-4'>
            <div className='grid gap-3 md:grid-cols-3'>
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder='Tìm theo tiêu đề hoặc nội dung'
                className='h-10 rounded-xl border border-[#e5e1f3] bg-white px-3 text-sm outline-none'
              />
              <select
                value={readStatus}
                onChange={(event) => setReadStatus(event.target.value as 'all' | 'read' | 'unread')}
                className='h-10 rounded-xl border border-[#e5e1f3] bg-white px-3 text-sm outline-none'
              >
                <option value='all'>Trạng thái đọc: Tất cả</option>
                <option value='read'>Đã đọc</option>
                <option value='unread'>Chưa đọc</option>
              </select>
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value as 'all' | 'system' | 'marketing')}
                className='h-10 rounded-xl border border-[#e5e1f3] bg-white px-3 text-sm outline-none'
              >
                <option value='all'>Phân loại: Tất cả</option>
                <option value='marketing'>Marketing</option>
                <option value='system'>System</option>
              </select>
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as 'all' | 'personal' | 'global')}
                className='h-10 rounded-xl border border-[#e5e1f3] bg-white px-3 text-sm outline-none'
              >
                <option value='all'>Phạm vi: Tất cả</option>
                <option value='global'>Global</option>
                <option value='personal'>Personal</option>
              </select>
              <input
                type='date'
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                className='h-10 rounded-xl border border-[#e5e1f3] bg-white px-3 text-sm outline-none'
              />
              <input
                type='date'
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                className='h-10 rounded-xl border border-[#e5e1f3] bg-white px-3 text-sm outline-none'
              />
            </div>

            <div className='mt-3 flex items-center justify-between'>
              <p className='text-xs text-[#7a7697]'>Hiển thị {filteredNotifications.length} thông báo</p>
              <button
                type='button'
                onClick={resetFilters}
                className='inline-flex h-8 items-center rounded-full border border-[#e0dcf1] bg-white px-3 text-xs font-semibold text-[#6d688a] transition hover:border-[#bfb5ea] hover:text-[#6f62cf]'
              >
                Reset filter
              </button>
            </div>
          </div>
        ) : null}

        <div className='space-y-3'>
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((item) => (
              <div
                key={item._id}
                className={`rounded-2xl border px-4 py-3 ${
                  item.is_read ? 'border-[#eceaf8] bg-white' : 'border-[#d8edff] bg-[#f4faff]'
                }`}
              >
                <div className='flex flex-wrap items-center justify-between gap-3'>
                  <div className='flex items-center gap-2'>
                    <p className='text-sm font-semibold text-[#2a254b]'>{item.title}</p>
                    <span className='inline-flex h-6 items-center rounded-full border border-[#e6defa] bg-[#f6f2ff] px-2 text-[10px] font-semibold uppercase text-[#6f62cf]'>
                      {item.category || 'system'}
                    </span>
                    <span className='inline-flex h-6 items-center rounded-full border border-[#d8edff] bg-[#eff8ff] px-2 text-[10px] font-semibold uppercase text-[#2f78d1]'>
                      {item.type || 'personal'}
                    </span>
                  </div>
                  {!item.is_read ? <CrudActionButtons onEdit={() => markReadMutation.mutate(item._id)} /> : null}
                </div>
                <p className='mt-1 text-xs text-[#6d688a]'>{item.content || 'Không có nội dung chi tiết'}</p>
                <p className='mt-2 text-xs text-[#8f8aac]'>{formatDateTime(item.createdAt)}</p>
              </div>
            ))
          ) : (
            <p className='rounded-2xl border border-[#eceaf8] px-4 py-6 text-sm text-[#7a7697]'>
              Không có notification phù hợp bộ lọc.
            </p>
          )}
        </div>
      </article>

      {isCreateModalOpen ? (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-[#1f1b3f]/35 px-4'>
          <div className='w-full max-w-2xl rounded-3xl border border-[#eceaf8] bg-white p-6 shadow-[0_24px_64px_rgba(20,17,48,0.25)]'>
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-xl font-bold text-[#212047]'>Tạo thông báo marketing</h2>
              <button
                type='button'
                onClick={() => setIsCreateModalOpen(false)}
                className='inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#eceaf8] text-[#6d688a] transition hover:border-[#d4cfea] hover:text-[#5f54bf]'
              >
                <X className='h-4 w-4' />
              </button>
            </div>

            <form className='space-y-3' onSubmit={handleBroadcast}>
              <input
                value={broadcastTitle}
                onChange={(event) => setBroadcastTitle(event.target.value)}
                placeholder='Tiêu đề thông báo'
                className='h-11 w-full rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm outline-none'
              />
              <textarea
                value={broadcastContent}
                onChange={(event) => setBroadcastContent(event.target.value)}
                placeholder='Nội dung thông báo (không bắt buộc)'
                className='min-h-32 w-full rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 py-3 text-sm outline-none'
              />

              <div className='flex justify-end gap-2 pt-1'>
                <button
                  type='button'
                  onClick={() => setIsCreateModalOpen(false)}
                  className='inline-flex h-10 items-center rounded-full border border-[#e0dcf1] bg-white px-4 text-sm font-semibold text-[#6d688a] transition hover:border-[#bfb5ea] hover:text-[#6f62cf]'
                >
                  Huỷ
                </button>
                <button
                  type='submit'
                  disabled={broadcastMutation.isPending}
                  className='inline-flex h-10 items-center rounded-full bg-[#2f78d1] px-4 text-sm font-semibold text-white transition hover:bg-[#2569bb] disabled:cursor-not-allowed disabled:opacity-70'
                >
                  {broadcastMutation.isPending ? 'Đang gửi...' : 'Gửi đến toàn bộ user'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  )
}
