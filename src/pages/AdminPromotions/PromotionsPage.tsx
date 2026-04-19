import { type FormEvent, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarRange, Plus, SlidersHorizontal, Sparkles, X } from 'lucide-react'
import { toast } from 'react-toastify'

import promotionApi from '../../apis/promotion.api'
import CrudActionButtons from '../../components/CrudActionButtons'
import OrderStatsCards from '../../components/Order/OrderStatsCards'
import { formatDateTime } from '../../utils/common'

type PromotionFormState = {
  name: string
  type: 'normal' | 'flash_sale'
  discount_type: 'percent' | 'fixed'
  discount_value: number
  priority: number
  start_date: string
  end_date: string
  status: 'active' | 'inactive'
}

const defaultFormState: PromotionFormState = {
  name: '',
  type: 'normal',
  discount_type: 'percent',
  discount_value: 10,
  priority: 1,
  start_date: '',
  end_date: '',
  status: 'active'
}

function toDateInputValue(value?: string | null) {
  if (!value) return ''
  return new Date(value).toISOString().slice(0, 10)
}

function getPromotionTone(status?: string) {
  if (status === 'active') return 'border-[#d8f0e2] bg-[#effaf4] text-[#2f8a57]'
  return 'border-[#f7d3d8] bg-[#fff2f4] text-[#c03747]'
}

export default function PromotionsPage() {
  const queryClient = useQueryClient()
  const [formState, setFormState] = useState<PromotionFormState>(defaultFormState)
  const [editingId, setEditingId] = useState('')
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [deletePromotionId, setDeletePromotionId] = useState('')

  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'normal' | 'flash_sale'>('all')
  const [discountTypeFilter, setDiscountTypeFilter] = useState<'all' | 'percent' | 'fixed'>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const promotionsQuery = useQuery({
    queryKey: ['promotions'],
    queryFn: async () => {
      const response = await promotionApi.list()
      return response.data.data || []
    },
    placeholderData: (prev) => prev
  })

  const promotions = useMemo(() => promotionsQuery.data ?? [], [promotionsQuery.data])

  const filteredPromotions = useMemo(() => {
    return promotions.filter((item) => {
      const keywordMatched = !keyword.trim() || (item.name || '').toLowerCase().includes(keyword.trim().toLowerCase())

      const statusMatched = statusFilter === 'all' || item.status === statusFilter
      const typeMatched = typeFilter === 'all' || item.type === typeFilter
      const discountTypeMatched = discountTypeFilter === 'all' || item.discount_type === discountTypeFilter

      const createdAt = item.createdAt ? new Date(item.createdAt).getTime() : 0
      const fromMatched = !fromDate || createdAt >= new Date(`${fromDate}T00:00:00`).getTime()
      const toMatched = !toDate || createdAt <= new Date(`${toDate}T23:59:59`).getTime()

      return keywordMatched && statusMatched && typeMatched && discountTypeMatched && fromMatched && toMatched
    })
  }, [promotions, keyword, statusFilter, typeFilter, discountTypeFilter, fromDate, toDate])

  const createMutation = useMutation({
    mutationFn: () =>
      promotionApi.create({
        ...formState,
        name: formState.name.trim(),
        discount_value: Number(formState.discount_value),
        priority: Number(formState.priority),
        start_date: formState.start_date,
        end_date: formState.end_date
      }),
    onSuccess: (response) => {
      toast.success(response.data.message || 'Tạo promotion thành công')
      setFormState(defaultFormState)
      setIsFormModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['promotions'] })
    },
    onError: () => toast.error('Không thể tạo promotion')
  })

  const updateMutation = useMutation({
    mutationFn: () =>
      promotionApi.update(editingId, {
        ...formState,
        name: formState.name.trim(),
        discount_value: Number(formState.discount_value),
        priority: Number(formState.priority),
        start_date: formState.start_date,
        end_date: formState.end_date
      }),
    onSuccess: (response) => {
      toast.success(response.data.message || 'Cập nhật promotion thành công')
      setEditingId('')
      setFormState(defaultFormState)
      setIsFormModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['promotions'] })
    },
    onError: () => toast.error('Không thể cập nhật promotion')
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => promotionApi.remove(id),
    onSuccess: (response) => {
      toast.success(response.data.message || 'Đã xóa promotion')
      setDeletePromotionId('')
      queryClient.invalidateQueries({ queryKey: ['promotions'] })
    },
    onError: () => toast.error('Không thể xóa promotion')
  })

  const stats = useMemo(() => {
    const active = promotions.filter((item) => item.status === 'active').length
    const flashSale = promotions.filter((item) => item.type === 'flash_sale').length
    const inactive = promotions.filter((item) => item.status === 'inactive').length

    const upcoming7Days = promotions.filter((item) => {
      if (!item.end_date) return false
      const end = new Date(item.end_date).getTime()
      const now = new Date().getTime()
      const sevenDays = 7 * 24 * 60 * 60 * 1000
      return end > now && end - now <= sevenDays
    }).length

    return [
      { label: 'Tổng Promotion', value: promotions.length, tone: 'from-[#6f62cf] to-[#8a7bf2]' },
      { label: 'Đang Active', value: active, helper: `${inactive} inactive`, tone: 'from-[#2fb67a] to-[#5dd7a0]' },
      { label: 'Flash Sale', value: flashSale, tone: 'from-[#f08c44] to-[#f7b36d]' },
      { label: 'Sắp hết hạn (7 ngày)', value: upcoming7Days, tone: 'from-[#2f86d6] to-[#65b4ff]' }
    ]
  }, [promotions])

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!formState.name.trim()) {
      toast.warn('Vui lòng nhập tên promotion')
      return
    }

    if (!formState.start_date || !formState.end_date) {
      toast.warn('Vui lòng nhập ngày bắt đầu và kết thúc')
      return
    }

    if (new Date(formState.end_date).getTime() < new Date(formState.start_date).getTime()) {
      toast.warn('Ngày kết thúc phải lớn hơn ngày bắt đầu')
      return
    }

    if (editingId) {
      updateMutation.mutate()
      return
    }

    createMutation.mutate()
  }

  const onEdit = (id: string) => {
    const target = promotions.find((item) => item._id === id)
    if (!target) return

    setEditingId(id)
    setFormState({
      name: target.name || '',
      type: target.type || 'normal',
      discount_type: target.discount_type || 'percent',
      discount_value: Number(target.discount_value || 0),
      priority: Number(target.priority || 1),
      start_date: toDateInputValue(target.start_date),
      end_date: toDateInputValue(target.end_date),
      status: target.status || 'inactive'
    })
    setIsFormModalOpen(true)
  }

  const onDelete = (id: string) => {
    const target = promotions.find((item) => item._id === id)
    if (!target) return
    setDeletePromotionId(id)
  }

  const resetForm = () => {
    setEditingId('')
    setFormState(defaultFormState)
    setIsFormModalOpen(false)
  }

  const resetFilters = () => {
    setKeyword('')
    setStatusFilter('all')
    setTypeFilter('all')
    setDiscountTypeFilter('all')
    setFromDate('')
    setToDate('')
  }

  const confirmDelete = () => {
    if (!deletePromotionId) return
    deleteMutation.mutate(deletePromotionId)
  }

  return (
    <section className='space-y-5 pb-4'>
      <div className='rounded-[30px] border border-[#eceaf8] bg-white p-6 shadow-[0_18px_50px_rgba(27,23,64,0.08)]'>
        <p className='text-sm font-semibold uppercase tracking-[0.24em] text-[#8a84ad]'>Promotion</p>
        <h1 className='mt-2 text-3xl font-black tracking-tight text-[#201f47]'>All Promotions</h1>
        <p className='mt-2 text-sm text-[#6d6a8a]'>Theo dõi toàn bộ chiến dịch khuyến mãi và trạng thái hiệu lực.</p>
      </div>

      <OrderStatsCards items={stats} />

      <article className='rounded-3xl border border-[#eceaf8] bg-white p-5 shadow-[0_12px_36px_rgba(28,24,70,0.06)]'>
        <div className='mb-4 flex items-center justify-between'>
          <h2 className='text-xl font-bold text-[#212047]'>Danh sách Promotion ({filteredPromotions.length})</h2>
          <div className='flex items-center gap-2'>
            <button
              type='button'
              onClick={() => {
                resetForm()
                setIsFormModalOpen(true)
              }}
              className='inline-flex h-8 items-center gap-2 rounded-full border border-[#d8edff] bg-[#eff8ff] px-3 text-xs font-semibold text-[#2f78d1] transition hover:bg-[#e2f2ff]'
            >
              <Plus className='h-3.5 w-3.5' />
              Tạo promotion
            </button>
            <button
              type='button'
              onClick={() => setIsFilterOpen((prev) => !prev)}
              className='inline-flex h-8 items-center gap-2 rounded-full border border-[#d9d3ef] bg-white px-3 text-xs font-semibold text-[#5f5a7a] transition hover:border-[#bfb5ea] hover:text-[#6f62cf]'
            >
              <SlidersHorizontal className='h-3.5 w-3.5' />
              Filter nâng cao
            </button>
            <Sparkles className='h-5 w-5 text-[#6f62cf]' />
          </div>
        </div>

        {isFilterOpen ? (
          <div className='mb-4 rounded-2xl border border-[#eceaf8] bg-[#faf9ff] p-4'>
            <div className='grid gap-3 md:grid-cols-3'>
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder='Tìm theo tên promotion'
                className='h-10 rounded-xl border border-[#e5e1f3] bg-white px-3 text-sm outline-none'
              />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as 'all' | 'active' | 'inactive')}
                className='h-10 rounded-xl border border-[#e5e1f3] bg-white px-3 text-sm outline-none'
              >
                <option value='all'>Status: Tất cả</option>
                <option value='active'>Active</option>
                <option value='inactive'>Inactive</option>
              </select>
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as 'all' | 'normal' | 'flash_sale')}
                className='h-10 rounded-xl border border-[#e5e1f3] bg-white px-3 text-sm outline-none'
              >
                <option value='all'>Type: Tất cả</option>
                <option value='normal'>Normal</option>
                <option value='flash_sale'>Flash Sale</option>
              </select>
              <select
                value={discountTypeFilter}
                onChange={(event) => setDiscountTypeFilter(event.target.value as 'all' | 'percent' | 'fixed')}
                className='h-10 rounded-xl border border-[#e5e1f3] bg-white px-3 text-sm outline-none'
              >
                <option value='all'>Discount type: Tất cả</option>
                <option value='percent'>Percent</option>
                <option value='fixed'>Fixed</option>
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
              <p className='text-xs text-[#7a7697]'>Hiển thị {filteredPromotions.length} promotion</p>
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
          {promotionsQuery.isLoading && !promotionsQuery.data ? (
            <p className='rounded-2xl border border-[#eceaf8] px-4 py-6 text-sm text-[#7a7697]'>
              Đang tải promotion...
            </p>
          ) : filteredPromotions.length > 0 ? (
            filteredPromotions.map((item) => (
              <div
                key={item._id}
                className='grid gap-3 rounded-2xl border border-[#eceaf8] px-4 py-3 md:grid-cols-[1.4fr_auto_auto_1fr] md:items-center'
              >
                <div>
                  <p className='text-sm font-bold text-[#2a254b]'>{item.name || 'Promotion không tên'}</p>
                  <p className='mt-1 text-xs text-[#8f8aac]'>ID: {item._id}</p>
                </div>

                <span className='text-xs font-semibold text-[#5f5a7a]'>
                  {item.discount_type === 'percent'
                    ? `${item.discount_value || 0}%`
                    : `${(item.discount_value || 0).toLocaleString('vi-VN')} VND`}
                </span>

                <span className='inline-flex h-7 items-center rounded-full border border-[#e7dcff] bg-[#f4efff] px-3 text-xs font-semibold tracking-wide text-[#6a4cc2]'>
                  {item.type === 'flash_sale' ? 'Flash Sale' : 'Normal'}
                </span>

                <div className='justify-self-start md:justify-self-end'>
                  <span
                    className={`inline-flex h-7 items-center rounded-full border px-3 text-xs font-semibold tracking-wide ${getPromotionTone(item.status)}`}
                  >
                    {item.status || 'inactive'}
                  </span>
                </div>

                <div className='md:col-span-4'>
                  <p className='flex items-center gap-2 text-xs text-[#8f8aac]'>
                    <CalendarRange className='h-4 w-4' />
                    {item.start_date ? formatDateTime(item.start_date) : 'N/A'} -{' '}
                    {item.end_date ? formatDateTime(item.end_date) : 'N/A'}
                  </p>
                </div>

                <div className='md:col-span-4'>
                  <CrudActionButtons onEdit={() => onEdit(item._id)} onDelete={() => onDelete(item._id)} />
                </div>
              </div>
            ))
          ) : (
            <p className='rounded-2xl border border-[#eceaf8] px-4 py-6 text-sm text-[#7a7697]'>
              Không có promotion phù hợp bộ lọc.
            </p>
          )}
        </div>
      </article>

      {isFormModalOpen ? (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-[#1f1b3f]/35 px-4'>
          <div className='w-full max-w-4xl rounded-3xl border border-[#eceaf8] bg-white p-6 shadow-[0_24px_64px_rgba(20,17,48,0.25)]'>
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-xl font-bold text-[#212047]'>{editingId ? 'Cập nhật Promotion' : 'Tạo Promotion'}</h2>
              <button
                type='button'
                onClick={resetForm}
                className='inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#eceaf8] text-[#6d688a] transition hover:border-[#d4cfea] hover:text-[#5f54bf]'
              >
                <X className='h-4 w-4' />
              </button>
            </div>

            <form className='mt-2 grid gap-3 md:grid-cols-4' onSubmit={onSubmit}>
              <input
                value={formState.name}
                onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                placeholder='Tên promotion'
                className='h-11 rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm outline-none md:col-span-2'
              />

              <select
                value={formState.type}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, type: event.target.value as 'normal' | 'flash_sale' }))
                }
                className='h-11 rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm outline-none'
              >
                <option value='normal'>Normal</option>
                <option value='flash_sale'>Flash sale</option>
              </select>

              <select
                value={formState.status}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, status: event.target.value as 'active' | 'inactive' }))
                }
                className='h-11 rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm outline-none'
              >
                <option value='active'>Active</option>
                <option value='inactive'>Inactive</option>
              </select>

              <select
                value={formState.discount_type}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, discount_type: event.target.value as 'percent' | 'fixed' }))
                }
                className='h-11 rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm outline-none'
              >
                <option value='percent'>Percent</option>
                <option value='fixed'>Fixed</option>
              </select>

              <input
                type='number'
                value={formState.discount_value}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, discount_value: Number(event.target.value || 0) }))
                }
                placeholder='Discount value'
                className='h-11 rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm outline-none'
              />

              <input
                type='number'
                value={formState.priority}
                onChange={(event) => setFormState((prev) => ({ ...prev, priority: Number(event.target.value || 1) }))}
                placeholder='Priority'
                className='h-11 rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm outline-none'
              />

              <input
                type='date'
                value={formState.start_date}
                onChange={(event) => setFormState((prev) => ({ ...prev, start_date: event.target.value }))}
                className='h-11 rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm outline-none'
              />

              <input
                type='date'
                value={formState.end_date}
                onChange={(event) => setFormState((prev) => ({ ...prev, end_date: event.target.value }))}
                className='h-11 rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm outline-none'
              />

              <div className='md:col-span-4 flex justify-end items-center gap-2'>
                <button
                  type='button'
                  onClick={resetForm}
                  className='inline-flex h-10 items-center rounded-full border border-[#e5e1f3] bg-white px-5 text-sm font-semibold text-[#4f4a71] transition hover:bg-[#f8f6ff]'
                >
                  Hủy
                </button>
                <button
                  type='submit'
                  className='inline-flex h-10 items-center rounded-full bg-[#6f62cf] px-5 text-sm font-semibold text-white transition hover:bg-[#5f54bf]'
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Đang lưu...'
                    : editingId
                      ? 'Cập nhật'
                      : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deletePromotionId ? (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-[#1f1b3f]/35 px-4'>
          <div className='w-full max-w-md rounded-3xl border border-[#eceaf8] bg-white p-6 shadow-[0_24px_64px_rgba(20,17,48,0.25)]'>
            <h2 className='text-lg font-bold text-[#212047]'>Xác nhận xoá promotion</h2>
            <p className='mt-2 text-sm text-[#6d688a]'>Bạn có chắc muốn xoá promotion này không?</p>

            <div className='mt-5 flex justify-end gap-2'>
              <button
                type='button'
                onClick={() => setDeletePromotionId('')}
                className='inline-flex h-10 items-center rounded-full border border-[#e0dcf1] bg-white px-4 text-sm font-semibold text-[#6d688a] transition hover:border-[#bfb5ea] hover:text-[#6f62cf]'
              >
                Huỷ
              </button>
              <button
                type='button'
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
                className='inline-flex h-10 items-center rounded-full bg-[#c03747] px-4 text-sm font-semibold text-white transition hover:bg-[#ae2f3f] disabled:opacity-60'
              >
                {deleteMutation.isPending ? 'Đang xoá...' : 'Xoá promotion'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
