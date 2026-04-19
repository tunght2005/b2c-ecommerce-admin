import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, Megaphone } from 'lucide-react'
import { toast } from 'react-toastify'

import promotionApi from '../../apis/promotion.api'
import notificationApi from '../../apis/notification.api'
import OrderStatsCards from '../../components/Order/OrderStatsCards'
import { formatDateTime } from '../../utils/common'

export default function MarketingPage() {
  const queryClient = useQueryClient()

  const promotionsQuery = useQuery({
    queryKey: ['marketing-promotions'],
    queryFn: async () => {
      const response = await promotionApi.list()
      return response.data.data || []
    },
    placeholderData: (prev) => prev
  })

  const notificationsQuery = useQuery({
    queryKey: ['marketing-notifications'],
    queryFn: async () => {
      const response = await notificationApi.listMine()
      return response.data.notifications || []
    },
    placeholderData: (prev) => prev
  })

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: () => {
      toast.success('Đã đánh dấu tất cả thông báo đã đọc')
      queryClient.invalidateQueries({ queryKey: ['marketing-notifications'] })
    }
  })

  const promotions = useMemo(() => promotionsQuery.data ?? [], [promotionsQuery.data])
  const notifications = useMemo(() => notificationsQuery.data ?? [], [notificationsQuery.data])

  const stats = useMemo(() => {
    const activeCampaigns = promotions.filter((item) => item.status === 'active').length
    const flashCampaigns = promotions.filter((item) => item.type === 'flash_sale').length
    const unreadNotifications = notifications.filter((item) => !item.is_read).length

    return [
      { label: 'Campaign tổng', value: promotions.length, tone: 'from-[#6f62cf] to-[#8a7bf2]' },
      { label: 'Campaign active', value: activeCampaigns, tone: 'from-[#2fb67a] to-[#5dd7a0]' },
      { label: 'Flash sale', value: flashCampaigns, tone: 'from-[#f08c44] to-[#f7b36d]' },
      { label: 'Thông báo chưa đọc', value: unreadNotifications, tone: 'from-[#2f86d6] to-[#65b4ff]' }
    ]
  }, [notifications, promotions])

  return (
    <section className='space-y-5 pb-4'>
      <div className='rounded-[30px] border border-[#eceaf8] bg-white p-6 shadow-[0_18px_50px_rgba(27,23,64,0.08)]'>
        <p className='text-sm font-semibold uppercase tracking-[0.24em] text-[#8a84ad]'>Marketing</p>
        <h1 className='mt-2 text-3xl font-black tracking-tight text-[#201f47]'>Marketing & Communication</h1>
        <p className='mt-2 text-sm text-[#6d6a8a]'>Theo dõi chiến dịch khuyến mãi và thông báo vận hành nội bộ.</p>
      </div>

      <OrderStatsCards items={stats} />

      <div className='grid gap-4 xl:grid-cols-[1.2fr_1fr]'>
        <article className='rounded-3xl border border-[#eceaf8] bg-white p-5 shadow-[0_12px_36px_rgba(28,24,70,0.06)]'>
          <div className='mb-4 flex items-center justify-between'>
            <h2 className='text-xl font-bold text-[#212047]'>Campaign gần nhất</h2>
            <Megaphone className='h-5 w-5 text-[#6f62cf]' />
          </div>

          <div className='space-y-3'>
            {promotions.length > 0 ? (
              promotions.slice(0, 8).map((item) => (
                <div key={item._id} className='rounded-2xl border border-[#eceaf8] px-4 py-3'>
                  <div className='flex items-center justify-between'>
                    <p className='text-sm font-bold text-[#2a254b]'>{item.name || 'Promotion không tên'}</p>
                    <span
                      className={`inline-flex h-7 items-center rounded-full border px-3 text-xs font-semibold ${
                        item.status === 'active'
                          ? 'border-[#d8f0e2] bg-[#effaf4] text-[#2f8a57]'
                          : 'border-[#f7d3d8] bg-[#fff2f4] text-[#c03747]'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <p className='mt-1 text-xs text-[#8f8aac]'>
                    {item.type === 'flash_sale' ? 'Flash Sale' : 'Normal'} - {item.discount_type || 'N/A'}
                  </p>
                </div>
              ))
            ) : (
              <p className='rounded-2xl border border-[#eceaf8] px-4 py-6 text-sm text-[#7a7697]'>
                Chưa có campaign marketing.
              </p>
            )}
          </div>
        </article>

        <article className='rounded-3xl border border-[#eceaf8] bg-white p-5 shadow-[0_12px_36px_rgba(28,24,70,0.06)]'>
          <div className='mb-4 flex items-center justify-between'>
            <h2 className='text-xl font-bold text-[#212047]'>Notifications</h2>
            <div className='flex items-center gap-2'>
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

          <div className='space-y-3'>
            {notifications.length > 0 ? (
              notifications.slice(0, 10).map((item) => (
                <div
                  key={item._id}
                  className={`rounded-2xl border px-4 py-3 ${
                    item.is_read ? 'border-[#eceaf8] bg-white' : 'border-[#d8edff] bg-[#f4faff]'
                  }`}
                >
                  <p className='text-sm font-semibold text-[#2a254b]'>{item.title}</p>
                  <p className='mt-1 text-xs text-[#6d688a]'>{item.content || 'Không có nội dung chi tiết'}</p>
                  <p className='mt-2 text-xs text-[#8f8aac]'>{formatDateTime(item.createdAt)}</p>
                </div>
              ))
            ) : (
              <p className='rounded-2xl border border-[#eceaf8] px-4 py-6 text-sm text-[#7a7697]'>
                Chưa có notification marketing.
              </p>
            )}
          </div>
        </article>
      </div>
    </section>
  )
}
