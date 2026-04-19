import { type FormEvent, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BadgePercent, Plus, SlidersHorizontal, TicketPercent, X } from 'lucide-react'
import { toast } from 'react-toastify'

import voucherApi from '../../apis/voucher.api'
import orderApi from '../../apis/order.api'
import CrudActionButtons from '../../components/CrudActionButtons'
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

    const current = map.get(order.voucher_id.code)
    const next: VoucherUsageItem = {
      code: order.voucher_id.code,
      usedCount: (current?.usedCount || 0) + 1,
      totalDiscount: (current?.totalDiscount || 0) + (order.discount_price || 0),
      totalRevenue: (current?.totalRevenue || 0) + (order.final_price || 0),
      lastUsedAt:
        !current || new Date(order.updatedAt).getTime() > new Date(current.lastUsedAt).getTime()
          ? order.updatedAt
          : current.lastUsedAt
    }

    map.set(order.voucher_id.code, next)
  })

  return Array.from(map.values()).sort((a, b) => b.usedCount - a.usedCount)
}

export default function VouchersPage() {
  const queryClient = useQueryClient()
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [deleteVoucherId, setDeleteVoucherId] = useState('')

  const [code, setCode] = useState('')
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage')
  const [discountValue, setDiscountValue] = useState(10)
  const [minOrderValue, setMinOrderValue] = useState(0)
  const [maxDiscount, setMaxDiscount] = useState(0)
  const [quantity, setQuantity] = useState(100)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [editingId, setEditingId] = useState('')

  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'expired'>('all')
  const [discountTypeFilter, setDiscountTypeFilter] = useState<'all' | 'percentage' | 'fixed'>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const vouchersQuery = useQuery({
    queryKey: ['vouchers-admin-list'],
    queryFn: async () => {
      const response = await voucherApi.list({ page: 1, limit: 50, status: 'all' })
      return response.data.data.vouchers || []
    },
    placeholderData: (prev) => prev
  })

  const usageQuery = useQuery({
    queryKey: ['voucher-usage-orders'],
    queryFn: fetchOrdersForVoucherUsage,
    placeholderData: (prev) => prev
  })

  const createVoucherMutation = useMutation({
    mutationFn: () =>
      voucherApi.create({
        code: code.trim().toUpperCase(),
        discount_type: discountType,
        discount_value: Number(discountValue),
        min_order_value: Number(minOrderValue),
        max_discount: discountType === 'percentage' ? Number(maxDiscount || 0) : null,
        quantity: Number(quantity),
        start_date: startDate,
        end_date: endDate,
        status: 'active'
      }),
    onSuccess: (response) => {
      toast.success(response.data.message || 'Tạo voucher thành công')
      onCancelEdit()
      queryClient.invalidateQueries({ queryKey: ['voucher-usage-orders'] })
      queryClient.invalidateQueries({ queryKey: ['vouchers-admin-list'] })
    },
    onError: () => {
      toast.error('Không thể tạo voucher. Vui lòng kiểm tra dữ liệu nhập.')
    }
  })

  const updateVoucherMutation = useMutation({
    mutationFn: () =>
      voucherApi.update(editingId, {
        code: code.trim().toUpperCase(),
        discount_type: discountType,
        discount_value: Number(discountValue),
        min_order_value: Number(minOrderValue),
        max_discount: discountType === 'percentage' ? Number(maxDiscount || 0) : null,
        quantity: Number(quantity),
        start_date: startDate,
        end_date: endDate,
        status: 'active'
      }),
    onSuccess: (response) => {
      toast.success(response.data.message || 'Cập nhật voucher thành công')
      onCancelEdit()
      queryClient.invalidateQueries({ queryKey: ['vouchers-admin-list'] })
      queryClient.invalidateQueries({ queryKey: ['voucher-usage-orders'] })
    },
    onError: () => {
      toast.error('Không thể cập nhật voucher')
    }
  })

  const deleteVoucherMutation = useMutation({
    mutationFn: (id: string) => voucherApi.remove(id),
    onSuccess: (response) => {
      toast.success(response.data.message || 'Xóa voucher thành công')
      setDeleteVoucherId('')
      queryClient.invalidateQueries({ queryKey: ['vouchers-admin-list'] })
      queryClient.invalidateQueries({ queryKey: ['voucher-usage-orders'] })
    },
    onError: () => {
      toast.error('Không thể xóa voucher')
    }
  })

  const usageList = useMemo(() => buildVoucherUsage(usageQuery.data || []), [usageQuery.data])
  const vouchers = useMemo(() => vouchersQuery.data || [], [vouchersQuery.data])

  const filteredVouchers = useMemo(() => {
    return vouchers.filter((item) => {
      const keywordMatched = !keyword.trim() || (item.code || '').toLowerCase().includes(keyword.trim().toLowerCase())
      const statusMatched = statusFilter === 'all' || item.status === statusFilter
      const discountTypeMatched = discountTypeFilter === 'all' || item.discount_type === discountTypeFilter

      const createdAt = item.createdAt ? new Date(item.createdAt).getTime() : 0
      const fromMatched = !fromDate || createdAt >= new Date(`${fromDate}T00:00:00`).getTime()
      const toMatched = !toDate || createdAt <= new Date(`${toDate}T23:59:59`).getTime()

      return keywordMatched && statusMatched && discountTypeMatched && fromMatched && toMatched
    })
  }, [vouchers, keyword, statusFilter, discountTypeFilter, fromDate, toDate])

  const stats = useMemo(() => {
    const totalUsed = usageList.reduce((sum, item) => sum + item.usedCount, 0)
    const totalDiscount = usageList.reduce((sum, item) => sum + item.totalDiscount, 0)
    const totalRevenue = usageList.reduce((sum, item) => sum + item.totalRevenue, 0)

    return [
      { label: 'Voucher đã dùng', value: totalUsed, tone: 'from-[#6f62cf] to-[#8a7bf2]' },
      { label: 'Mã voucher khác nhau', value: usageList.length, tone: 'from-[#2f86d6] to-[#65b4ff]' },
      { label: 'Tổng tiền giảm', value: formatCurrency(totalDiscount), tone: 'from-[#f08c44] to-[#f7b36d]' },
      {
        label: 'Doanh thu từ đơn dùng voucher',
        value: formatCurrency(totalRevenue),
        tone: 'from-[#2fb67a] to-[#5dd7a0]'
      }
    ]
  }, [usageList])

  const onCreateVoucher = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!code.trim() || !startDate || !endDate) {
      toast.warn('Vui lòng nhập đầy đủ code, ngày bắt đầu và ngày kết thúc')
      return
    }

    if (editingId) {
      updateVoucherMutation.mutate()
      return
    }

    createVoucherMutation.mutate()
  }

  const onEditVoucher = (id: string) => {
    const voucher = vouchers.find((item) => item._id === id)
    if (!voucher) return

    setEditingId(id)
    setCode(voucher.code || '')
    setDiscountType(voucher.discount_type || 'percentage')
    setDiscountValue(Number(voucher.discount_value || 0))
    setMinOrderValue(Number(voucher.min_order_value || 0))
    setMaxDiscount(Number(voucher.max_discount || 0))
    setQuantity(Number(voucher.quantity || 0))
    setStartDate(new Date(voucher.start_date).toISOString().slice(0, 10))
    setEndDate(new Date(voucher.end_date).toISOString().slice(0, 10))
    setIsFormModalOpen(true)
  }

  const onDeleteVoucher = (id: string) => {
    const voucher = vouchers.find((item) => item._id === id)
    if (!voucher) return
    setDeleteVoucherId(id)
  }

  const onCancelEdit = () => {
    setEditingId('')
    setCode('')
    setDiscountType('percentage')
    setDiscountValue(10)
    setMinOrderValue(0)
    setMaxDiscount(0)
    setQuantity(100)
    setStartDate('')
    setEndDate('')
    setIsFormModalOpen(false)
  }

  const resetFilters = () => {
    setKeyword('')
    setStatusFilter('all')
    setDiscountTypeFilter('all')
    setFromDate('')
    setToDate('')
  }

  const confirmDeleteVoucher = () => {
    if (!deleteVoucherId) return
    deleteVoucherMutation.mutate(deleteVoucherId)
  }

  return (
    <section className='space-y-5 pb-4'>
      <div className='rounded-[30px] border border-[#eceaf8] bg-white p-6 shadow-[0_18px_50px_rgba(27,23,64,0.08)]'>
        <p className='text-sm font-semibold uppercase tracking-[0.24em] text-[#8a84ad]'>Voucher</p>
        <h1 className='mt-2 text-3xl font-black tracking-tight text-[#201f47]'>Voucher Center</h1>
        <p className='mt-2 text-sm text-[#6d6a8a]'>
          Quản lý mã voucher và theo dõi hiệu quả sử dụng qua dữ liệu đơn hàng.
        </p>
      </div>

      <OrderStatsCards items={stats} />

      <div className='grid gap-4 xl:grid-cols-[1.1fr_1.4fr]'>
        <article className='rounded-3xl border border-[#eceaf8] bg-white p-5 shadow-[0_12px_36px_rgba(28,24,70,0.06)]'>
          <div className='mb-4 flex items-center justify-between'>
            <h2 className='text-xl font-bold text-[#212047]'>Voucher Usage</h2>
            <TicketPercent className='h-5 w-5 text-[#2f78d1]' />
          </div>

          <div className='space-y-3'>
            {usageQuery.isLoading && !usageQuery.data ? (
              <p className='rounded-2xl border border-[#eceaf8] px-4 py-6 text-sm text-[#7a7697]'>Đang tải usage...</p>
            ) : usageList.length > 0 ? (
              usageList.slice(0, 10).map((item) => (
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

        <article className='rounded-3xl border border-[#eceaf8] bg-white p-5 shadow-[0_12px_36px_rgba(28,24,70,0.06)] xl:col-span-2'>
          <div className='mb-4 flex items-center justify-between'>
            <h2 className='text-xl font-bold text-[#212047]'>Danh sách Voucher ({filteredVouchers.length})</h2>
            <div className='flex items-center gap-2'>
              <button
                type='button'
                onClick={() => {
                  onCancelEdit()
                  setIsFormModalOpen(true)
                }}
                className='inline-flex h-8 items-center gap-2 rounded-full border border-[#d8edff] bg-[#eff8ff] px-3 text-xs font-semibold text-[#2f78d1] transition hover:bg-[#e2f2ff]'
              >
                <Plus className='h-3.5 w-3.5' />
                Tạo voucher
              </button>
              <button
                type='button'
                onClick={() => setIsFilterOpen((prev) => !prev)}
                className='inline-flex h-8 items-center gap-2 rounded-full border border-[#d9d3ef] bg-white px-3 text-xs font-semibold text-[#5f5a7a] transition hover:border-[#bfb5ea] hover:text-[#6f62cf]'
              >
                <SlidersHorizontal className='h-3.5 w-3.5' />
                Filter nâng cao
              </button>
              <BadgePercent className='h-5 w-5 text-[#6f62cf]' />
            </div>
          </div>

          {isFilterOpen ? (
            <div className='mb-4 rounded-2xl border border-[#eceaf8] bg-[#faf9ff] p-4'>
              <div className='grid gap-3 md:grid-cols-3'>
                <input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder='Tìm theo mã voucher'
                  className='h-10 rounded-xl border border-[#e5e1f3] bg-white px-3 text-sm outline-none'
                />
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as 'all' | 'active' | 'inactive' | 'expired')}
                  className='h-10 rounded-xl border border-[#e5e1f3] bg-white px-3 text-sm outline-none'
                >
                  <option value='all'>Status: Tất cả</option>
                  <option value='active'>Active</option>
                  <option value='inactive'>Inactive</option>
                  <option value='expired'>Expired</option>
                </select>
                <select
                  value={discountTypeFilter}
                  onChange={(event) => setDiscountTypeFilter(event.target.value as 'all' | 'percentage' | 'fixed')}
                  className='h-10 rounded-xl border border-[#e5e1f3] bg-white px-3 text-sm outline-none'
                >
                  <option value='all'>Loại giảm giá: Tất cả</option>
                  <option value='percentage'>Percentage</option>
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
                <p className='text-xs text-[#7a7697]'>Hiển thị {filteredVouchers.length} voucher</p>
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
            {vouchersQuery.isLoading && !vouchersQuery.data ? (
              <p className='rounded-2xl border border-[#eceaf8] px-4 py-6 text-sm text-[#7a7697]'>
                Đang tải vouchers...
              </p>
            ) : filteredVouchers.length > 0 ? (
              filteredVouchers.map((item) => (
                <div key={item._id} className='rounded-2xl border border-[#eceaf8] px-4 py-3'>
                  <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                    <div>
                      <p className='text-sm font-bold text-[#2a254b]'>{item.code}</p>
                      <p className='mt-1 text-xs text-[#8f8aac]'>
                        {item.discount_type === 'percentage'
                          ? `${item.discount_value}%`
                          : formatCurrency(item.discount_value)}{' '}
                        - Quantity: {item.quantity} - Used: {item.used_count}
                      </p>
                    </div>

                    <div className='flex flex-wrap items-center gap-3'>
                      <span className='rounded-full border border-[#e7dcff] bg-[#f4efff] px-3 py-1 text-xs font-semibold text-[#6a4cc2]'>
                        {item.status}
                      </span>
                      <CrudActionButtons
                        onEdit={() => onEditVoucher(item._id)}
                        onDelete={() => onDeleteVoucher(item._id)}
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className='rounded-2xl border border-[#eceaf8] px-4 py-6 text-sm text-[#7a7697]'>
                Không có voucher phù hợp bộ lọc.
              </p>
            )}
          </div>
        </article>
      </div>

      {isFormModalOpen ? (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-[#1f1b3f]/35 px-4'>
          <div className='w-full max-w-2xl rounded-3xl border border-[#eceaf8] bg-white p-6 shadow-[0_24px_64px_rgba(20,17,48,0.25)]'>
            <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
              <h2 className='text-xl font-bold text-[#212047]'>{editingId ? 'Cập nhật Voucher' : 'Tạo Voucher'}</h2>
              <button
                type='button'
                onClick={onCancelEdit}
                className='inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#eceaf8] text-[#6d688a] transition hover:border-[#d4cfea] hover:text-[#5f54bf]'
              >
                <X className='h-4 w-4' />
              </button>
            </div>

            <form className='space-y-3' onSubmit={onCreateVoucher}>
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder='CODE_VOUCHER'
                className='h-11 w-full rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm outline-none'
              />

              <div className='grid gap-3 md:grid-cols-2'>
                <select
                  value={discountType}
                  onChange={(event) => setDiscountType(event.target.value as 'percentage' | 'fixed')}
                  className='h-11 rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm outline-none'
                >
                  <option value='percentage'>Percentage</option>
                  <option value='fixed'>Fixed</option>
                </select>

                <input
                  type='number'
                  value={discountValue}
                  onChange={(event) => setDiscountValue(Number(event.target.value || 0))}
                  placeholder='Discount value'
                  className='h-11 rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm outline-none'
                />
              </div>

              <div className='grid gap-3 md:grid-cols-2'>
                <input
                  type='number'
                  value={minOrderValue}
                  onChange={(event) => setMinOrderValue(Number(event.target.value || 0))}
                  placeholder='Min order value'
                  className='h-11 rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm outline-none'
                />

                <input
                  type='number'
                  value={maxDiscount}
                  onChange={(event) => setMaxDiscount(Number(event.target.value || 0))}
                  placeholder='Max discount'
                  disabled={discountType !== 'percentage'}
                  className='h-11 rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm outline-none disabled:opacity-60'
                />
              </div>

              <input
                type='number'
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value || 0))}
                placeholder='Quantity'
                className='h-11 w-full rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm outline-none'
              />

              <div className='grid gap-3 md:grid-cols-2'>
                <input
                  type='date'
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className='h-11 rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm outline-none'
                />
                <input
                  type='date'
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className='h-11 rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm outline-none'
                />
              </div>

              <div className='flex justify-end gap-2 pt-1'>
                <button
                  type='button'
                  onClick={onCancelEdit}
                  className='inline-flex h-10 items-center rounded-full border border-[#e5e1f3] bg-white px-5 text-sm font-semibold text-[#4f4a71] transition hover:bg-[#f8f6ff]'
                >
                  Hủy
                </button>
                <button
                  type='submit'
                  className='inline-flex h-10 items-center rounded-full bg-[#6f62cf] px-5 text-sm font-semibold text-white transition hover:bg-[#5f54bf]'
                >
                  {createVoucherMutation.isPending || updateVoucherMutation.isPending
                    ? 'Đang lưu...'
                    : editingId
                      ? 'Cập nhật'
                      : 'Tạo Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deleteVoucherId ? (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-[#1f1b3f]/35 px-4'>
          <div className='w-full max-w-md rounded-3xl border border-[#eceaf8] bg-white p-6 shadow-[0_24px_64px_rgba(20,17,48,0.25)]'>
            <h2 className='text-lg font-bold text-[#212047]'>Xác nhận xoá voucher</h2>
            <p className='mt-2 text-sm text-[#6d688a]'>Bạn có chắc muốn xoá voucher này không?</p>

            <div className='mt-5 flex justify-end gap-2'>
              <button
                type='button'
                onClick={() => setDeleteVoucherId('')}
                className='inline-flex h-10 items-center rounded-full border border-[#e0dcf1] bg-white px-4 text-sm font-semibold text-[#6d688a] transition hover:border-[#bfb5ea] hover:text-[#6f62cf]'
              >
                Huỷ
              </button>
              <button
                type='button'
                onClick={confirmDeleteVoucher}
                disabled={deleteVoucherMutation.isPending}
                className='inline-flex h-10 items-center rounded-full bg-[#c03747] px-4 text-sm font-semibold text-white transition hover:bg-[#ae2f3f] disabled:opacity-60'
              >
                {deleteVoucherMutation.isPending ? 'Đang xoá...' : 'Xoá voucher'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
