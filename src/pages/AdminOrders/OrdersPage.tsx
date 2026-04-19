import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, CheckCircle2, Trash2 } from 'lucide-react'
import { AxiosError } from 'axios'
import { toast } from 'react-toastify'

import Pagination from '../../components/Pagination'
import CrudActionButtons from '../../components/CrudActionButtons'
import { OrderStatusBadge, OrderStatsCards } from '../../components/Order'
import orderApi from '../../apis/order.api'
import { useAuth } from '../../contexts/app.context'
import type { OrderEntity, OrderStatus, PaymentStatus } from '../../types/order.type'
import { formatCurrency, formatDateTime } from '../../utils/common'

type SortKey = 'createdAt' | 'final_price' | 'status' | 'payment_status'
type SortDirection = 'asc' | 'desc'

const ORDER_STATUS_OPTIONS: Array<'all' | OrderStatus> = [
  'all',
  'pending',
  'confirmed',
  'shipping',
  'completed',
  'cancelled'
]
const PAYMENT_STATUS_OPTIONS: Array<'all' | PaymentStatus> = ['all', 'unpaid', 'paid', 'failed']

function extractOrderId(order: OrderEntity) {
  return order._id
}

function buildRoleError(error: unknown) {
  if (error instanceof AxiosError && error.response?.status === 403) {
    return 'Bạn không có quyền truy cập danh sách order này.'
  }

  return 'Không thể tải danh sách đơn hàng.'
}

function getBuyerInfo(order: OrderEntity) {
  if (typeof order.user_id === 'object' && order.user_id) {
    return {
      name: order.user_id.username || 'N/A',
      email: order.user_id.email || 'N/A',
      phone: order.user_id.phone || 'N/A'
    }
  }

  return {
    name: 'N/A',
    email: 'N/A',
    phone: 'N/A'
  }
}

function getAddressInfo(order: OrderEntity) {
  if (typeof order.address_id === 'object' && order.address_id) {
    const address = order.address_id
    const location = [address.detail, address.ward, address.district, address.province].filter(Boolean).join(', ')

    return {
      receiver: address.receiver_name || 'N/A',
      phone: address.phone || 'N/A',
      location: location || 'N/A'
    }
  }

  return {
    receiver: 'N/A',
    phone: 'N/A',
    location: 'N/A'
  }
}

function getShipperInfo(order: OrderEntity) {
  const staff =
    typeof order.shipment?.delivery_staff_id === 'object' && order.shipment?.delivery_staff_id
      ? order.shipment.delivery_staff_id
      : null

  if (!staff) {
    return {
      name: 'Chưa gán shipper',
      email: 'N/A',
      phone: 'N/A',
      status: order.shipment?.status || 'pending'
    }
  }

  const staffUser = typeof staff.user_id === 'object' && staff.user_id ? staff.user_id : null

  return {
    name: staff.name || staffUser?.username || 'N/A',
    email: staff.email || staffUser?.email || 'N/A',
    phone: staff.phone || staffUser?.phone || 'N/A',
    status: order.shipment?.status || 'assigned'
  }
}

export default function OrdersPage() {
  const queryClient = useQueryClient()
  const { role } = useAuth()

  const canConfirm = role === 'admin' || role === 'support'
  const canDelete = role === 'admin'
  const canViewAllOrders = role === 'admin' || role === 'support'
  const isShipper = role === 'shipper'
  const isStaffOrderView = canViewAllOrders || isShipper

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all')
  const [paymentFilter, setPaymentFilter] = useState<'all' | PaymentStatus>('all')
  const [sortKey, setSortKey] = useState<SortKey>('createdAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(8)
  const [detailOrder, setDetailOrder] = useState<OrderEntity | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<OrderEntity | null>(null)

  const ordersQuery = useQuery({
    queryKey: ['orders', role],
    queryFn: async () => {
      if (isStaffOrderView) {
        const pageSizeForFetch = 100
        let page = 1
        let totalPages = 1
        const allOrders: OrderEntity[] = []

        do {
          const response = await orderApi.listAllAdmin({
            page,
            limit: pageSizeForFetch,
            sortBy: 'createdAt',
            sortOrder: 'desc'
          })

          const payload = response.data?.data
          const pageOrders = payload?.orders ?? []
          allOrders.push(...pageOrders)

          totalPages = payload?.pagination?.totalPages ?? 1
          page += 1
        } while (page <= totalPages)

        return {
          orders: allOrders,
          pagination: null,
          summary: null
        }
      }

      const response = await orderApi.listMine()
      return {
        orders: response.data.data ?? [],
        pagination: null,
        summary: null
      }
    },
    placeholderData: (prev) => prev
  })

  const queryOrders = useMemo(() => ordersQuery.data?.orders ?? [], [ordersQuery.data?.orders])

  const confirmMutation = useMutation({
    mutationFn: (orderId: string) => orderApi.confirm(orderId),
    onSuccess: (response) => {
      toast.success(response.data.message || 'Xác nhận đơn hàng thành công')
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (orderId: string) => orderApi.remove(orderId),
    onSuccess: (response) => {
      toast.success(response.data.message || 'Xóa đơn hàng thành công')
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      setDeleteTarget(null)
    }
  })

  const filteredOrders = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    const next = queryOrders.filter((order: OrderEntity) => {
      if (statusFilter !== 'all' && order.status !== statusFilter) return false
      if (paymentFilter !== 'all' && order.payment_status !== paymentFilter) return false
      if (!normalizedSearch) return true

      const buyer = typeof order.user_id === 'object' && order.user_id ? order.user_id.username || '' : ''
      const buyerEmail = typeof order.user_id === 'object' && order.user_id ? order.user_id.email || '' : ''
      const shipperName =
        typeof order.shipment?.delivery_staff_id === 'object' && order.shipment?.delivery_staff_id
          ? order.shipment.delivery_staff_id.name ||
            (typeof order.shipment.delivery_staff_id.user_id === 'object' && order.shipment.delivery_staff_id.user_id
              ? order.shipment.delivery_staff_id.user_id.username || ''
              : '')
          : ''
      const voucherCode =
        typeof order.voucher_id === 'object' && order.voucher_id !== null && 'code' in order.voucher_id
          ? order.voucher_id.code || ''
          : ''
      const address = getAddressInfo(order)

      const text = [
        extractOrderId(order),
        order.status,
        order.payment_status,
        buyer,
        buyerEmail,
        address.receiver,
        address.phone,
        address.location,
        shipperName,
        voucherCode
      ]
        .join(' ')
        .toLowerCase()

      return text.includes(normalizedSearch)
    })

    next.sort((a: OrderEntity, b: OrderEntity) => {
      if (sortKey === 'createdAt') {
        const aTime = new Date(a.createdAt).getTime()
        const bTime = new Date(b.createdAt).getTime()
        return sortDirection === 'asc' ? aTime - bTime : bTime - aTime
      }

      if (sortKey === 'final_price') {
        return sortDirection === 'asc' ? a.final_price - b.final_price : b.final_price - a.final_price
      }

      const aValue = String(a[sortKey]).toLowerCase()
      const bValue = String(b[sortKey]).toLowerCase()
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return next
  }, [queryOrders, paymentFilter, search, sortDirection, sortKey, statusFilter])

  const totalItems = filteredOrders.length
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize))
  const safePage = Math.min(currentPage, Math.max(1, totalPages))
  const paginatedOrders = filteredOrders.slice((safePage - 1) * pageSize, safePage * pageSize)

  const stats = useMemo(() => {
    const pending = queryOrders.filter((order: OrderEntity) => order.status === 'pending').length
    const completed = queryOrders.filter((order: OrderEntity) => order.status === 'completed').length
    const cancelled = queryOrders.filter((order: OrderEntity) => order.status === 'cancelled').length
    const revenue = queryOrders.reduce((acc: number, order: OrderEntity) => acc + order.final_price, 0)

    return [
      { label: 'Total Orders', value: queryOrders.length, tone: 'from-[#6f62cf] to-[#8a7bf2]' },
      { label: 'Pending', value: pending, tone: 'from-[#f3a347] to-[#f7c16b]' },
      { label: 'Completed', value: completed, helper: `${cancelled} cancelled`, tone: 'from-[#2fb67a] to-[#5dd7a0]' },
      { label: 'Revenue', value: formatCurrency(revenue), tone: 'from-[#2f86d6] to-[#65b4ff]' }
    ]
  }, [queryOrders])

  const toggleSort = (nextSortKey: SortKey) => {
    if (sortKey === nextSortKey) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      return
    }

    setSortKey(nextSortKey)
    setSortDirection(nextSortKey === 'createdAt' ? 'desc' : 'asc')
    setCurrentPage(1)
  }

  const activeFiltersCount = [Boolean(search.trim()), statusFilter !== 'all', paymentFilter !== 'all'].filter(
    Boolean
  ).length

  const roleErrorMessage = ordersQuery.isError ? buildRoleError(ordersQuery.error) : ''

  return (
    <section className='space-y-5 pb-4'>
      <div className='flex flex-wrap items-end justify-between gap-3'>
        <div>
          <p className='text-sm font-semibold uppercase tracking-[0.24em] text-[#8a84ad]'>Order Management</p>
          <h1 className='mt-3 text-3xl font-black tracking-tight text-[#201f47]'>
            {canViewAllOrders ? 'All Orders' : isShipper ? 'My Assigned Orders' : 'My Orders'}
          </h1>
          <p className='mt-2 max-w-2xl text-sm leading-6 text-[#6d6a8a]'>
            {canViewAllOrders
              ? 'Quản trị toàn bộ đơn hàng hệ thống, xác nhận, xóa theo quyền hạn.'
              : isShipper
                ? 'Theo dõi các đơn hàng thuộc shipment được gán cho bạn.'
                : 'Theo dõi các đơn hàng của bạn, trạng thái thanh toán và giao hàng.'}
          </p>
        </div>
      </div>

      <OrderStatsCards items={stats} />

      <div className='rounded-[30px] border border-[#eceaf8] bg-white p-5 shadow-[0_18px_50px_rgba(27,23,64,0.08)]'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <h2 className='text-xl font-bold text-[#212047]'>Orders List</h2>
            <p className='mt-1 text-sm text-[#7a7697]'>
              {totalItems} order(s) found
              {activeFiltersCount > 0 ? ` • ${activeFiltersCount} filter(s) applied` : ''}
            </p>
          </div>

          <div className='grid w-full gap-3 md:flex md:w-auto md:flex-wrap md:items-center'>
            <div className='relative w-full md:w-auto'>
              <Search className='pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#9d98bf]' />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setCurrentPage(1)
                }}
                type='text'
                placeholder='Search by order id...'
                className='h-11 w-full rounded-full border border-[#e5e1f3] bg-[#fbfaff] pr-4 pl-10 text-sm text-[#2d2950] outline-none transition focus:border-[#7a6ae0] focus:ring-2 focus:ring-[#b7abe6]/35 md:w-64'
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as 'all' | OrderStatus)
                setCurrentPage(1)
              }}
              className='h-11 w-full rounded-full border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm text-[#2d2950] outline-none md:w-auto'
            >
              {ORDER_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status === 'all' ? 'All order status' : status}
                </option>
              ))}
            </select>

            <select
              value={paymentFilter}
              onChange={(event) => {
                setPaymentFilter(event.target.value as 'all' | PaymentStatus)
                setCurrentPage(1)
              }}
              className='h-11 w-full rounded-full border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm text-[#2d2950] outline-none md:w-auto'
            >
              {PAYMENT_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status === 'all' ? 'All payment status' : status}
                </option>
              ))}
            </select>
          </div>
        </div>

        {roleErrorMessage ? (
          <div className='mt-4 rounded-2xl border border-[#ffe0b8] bg-[#fff8ef] px-4 py-3 text-sm text-[#925d1f]'>
            {roleErrorMessage}
          </div>
        ) : null}

        <div className='mt-5 overflow-hidden rounded-[26px] border border-[#eceaf8]'>
          <div className='overflow-x-auto'>
            <table className='min-w-[980px] divide-y divide-[#eceaf8] md:min-w-full'>
              <thead className='bg-[#faf9ff] text-left text-xs font-bold uppercase tracking-[0.18em] text-[#7f7a9e]'>
                <tr>
                  <th className='px-4 py-4'>Order ID</th>
                  <th className='px-4 py-4'>Items</th>
                  <th className='cursor-pointer px-4 py-4' onClick={() => toggleSort('final_price')}>
                    Final Price {sortKey === 'final_price' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className='cursor-pointer px-4 py-4' onClick={() => toggleSort('payment_status')}>
                    Payment {sortKey === 'payment_status' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className='cursor-pointer px-4 py-4' onClick={() => toggleSort('status')}>
                    Status {sortKey === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className='cursor-pointer px-4 py-4' onClick={() => toggleSort('createdAt')}>
                    Created At {sortKey === 'createdAt' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className='px-4 py-4'>Delivery Address</th>
                  <th className='px-4 py-4 text-right'>Actions</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-[#f0edf8] bg-white'>
                {ordersQuery.isLoading && !ordersQuery.data ? (
                  <tr>
                    <td colSpan={8} className='px-4 py-16 text-center text-sm text-[#7a7697]'>
                      Loading orders...
                    </td>
                  </tr>
                ) : paginatedOrders.length > 0 ? (
                  paginatedOrders.map((order: OrderEntity) => {
                    const canConfirmOrder = canConfirm && order.status === 'pending'
                    const canDeleteOrder = canDelete
                    const address = getAddressInfo(order)
                    return (
                      <tr key={extractOrderId(order)} className='transition hover:bg-[#fbfaff]'>
                        <td className='px-4 py-4'>
                          <p className='font-semibold text-[#28244f]'>
                            #{extractOrderId(order).slice(-8).toUpperCase()}
                          </p>
                          <p className='mt-1 text-xs text-[#8f8aac]'>{extractOrderId(order)}</p>
                        </td>
                        <td className='px-4 py-4 text-sm text-[#3f3b62]'>{order.items.length} item(s)</td>
                        <td className='px-4 py-4 text-sm font-semibold text-[#2f8a57]'>
                          {formatCurrency(order.final_price)}
                        </td>
                        <td className='px-4 py-4'>
                          <OrderStatusBadge variant='payment' status={order.payment_status} />
                        </td>
                        <td className='px-4 py-4'>
                          <OrderStatusBadge variant='order' status={order.status} />
                        </td>
                        <td className='px-4 py-4 text-sm text-[#5f5a7a]'>{formatDateTime(order.createdAt)}</td>
                        <td className='px-4 py-4 text-xs text-[#8f8aac]'>
                          <p>{address.receiver}</p>
                          <p>{address.phone}</p>
                          <p className='line-clamp-2'>{address.location}</p>
                        </td>
                        <td className='px-4 py-4'>
                          <div className='flex flex-wrap items-center justify-end gap-2'>
                            {canConfirmOrder ? (
                              <button
                                type='button'
                                onClick={() => confirmMutation.mutate(extractOrderId(order))}
                                className='inline-flex h-9 items-center gap-1.5 rounded-full border border-[#d8f0e2] bg-[#effaf4] px-3 text-xs font-semibold text-[#2f8a57] transition hover:bg-[#e0f5ea]'
                              >
                                <CheckCircle2 className='h-4 w-4' /> Confirm
                              </button>
                            ) : null}
                            {canDeleteOrder ? (
                              <button
                                type='button'
                                onClick={() => setDeleteTarget(order)}
                                className='inline-flex h-9 items-center gap-1.5 rounded-full border border-[#f3ccd2] px-3 text-xs font-semibold text-[#c84455] transition hover:bg-[#ffe0e6] dark:border-rose-900/60 dark:text-rose-300 dark:hover:bg-rose-950/40'
                              >
                                <Trash2 className='h-4 w-4' /> Delete
                              </button>
                            ) : null}
                            <CrudActionButtons onView={() => setDetailOrder(order)} buttonSize='sm' />
                          </div>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className='px-4 py-16 text-center text-sm text-[#7a7697] dark:text-slate-400'>
                      No orders found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className='border-t border-[#eceaf8] p-4 dark:border-slate-700'>
            <Pagination
              totalItems={totalItems}
              currentPage={safePage}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size)
                setCurrentPage(1)
              }}
              itemLabel='orders'
            />
          </div>
        </div>
      </div>

      {detailOrder ? (
        <div className='fixed inset-0 z-40 flex items-center justify-center bg-[#191532]/45 px-4 py-6'>
          <article className='flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[30px] border border-[#eceaf8] bg-white shadow-[0_25px_65px_rgba(23,20,55,0.35)] dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_25px_65px_rgba(0,0,0,0.35)]'>
            <div className='border-b border-[#eceaf8] px-6 py-4 dark:border-slate-700'>
              <h3 className='text-xl font-bold text-[#212047] dark:text-slate-100'>Order Detail</h3>
              <p className='mt-1 text-sm text-[#7a7697] dark:text-slate-400'>{extractOrderId(detailOrder)}</p>
            </div>

            <div className='space-y-4 overflow-y-auto px-6 py-5'>
              <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-6'>
                <article className='rounded-2xl border border-[#eceaf8] p-4 dark:border-slate-700'>
                  <p className='text-xs uppercase tracking-[0.15em] text-[#9b97b9] dark:text-slate-400'>Order Status</p>
                  <div className='mt-2'>
                    <OrderStatusBadge variant='order' status={detailOrder.status} />
                  </div>
                </article>
                <article className='rounded-2xl border border-[#eceaf8] p-4 dark:border-slate-700'>
                  <p className='text-xs uppercase tracking-[0.15em] text-[#9b97b9] dark:text-slate-400'>
                    Payment Status
                  </p>
                  <div className='mt-2'>
                    <OrderStatusBadge variant='payment' status={detailOrder.payment_status} />
                  </div>
                </article>
                <article className='rounded-2xl border border-[#eceaf8] p-4 dark:border-slate-700'>
                  <p className='text-xs uppercase tracking-[0.15em] text-[#9b97b9] dark:text-slate-400'>Final Price</p>
                  <p className='mt-2 text-lg font-bold text-[#2f8a57] dark:text-emerald-300'>
                    {formatCurrency(detailOrder.final_price)}
                  </p>
                </article>
                <article className='rounded-2xl border border-[#eceaf8] p-4 dark:border-slate-700'>
                  <p className='text-xs uppercase tracking-[0.15em] text-[#9b97b9] dark:text-slate-400'>Buyer</p>
                  <p className='mt-2 text-sm font-semibold text-[#2d2950] dark:text-slate-100'>
                    {getBuyerInfo(detailOrder).name}
                  </p>
                  <p className='mt-1 text-xs text-[#7a7697] dark:text-slate-400'>{getBuyerInfo(detailOrder).email}</p>
                  <p className='mt-1 text-xs text-[#7a7697] dark:text-slate-400'>{getBuyerInfo(detailOrder).phone}</p>
                </article>
                <article className='rounded-2xl border border-[#eceaf8] p-4 dark:border-slate-700'>
                  <p className='text-xs uppercase tracking-[0.15em] text-[#9b97b9] dark:text-slate-400'>
                    Delivery Address
                  </p>
                  <p className='mt-2 text-sm font-semibold text-[#2d2950] dark:text-slate-100'>
                    {getAddressInfo(detailOrder).receiver}
                  </p>
                  <p className='mt-1 text-xs text-[#7a7697] dark:text-slate-400'>{getAddressInfo(detailOrder).phone}</p>
                  <p className='mt-1 text-xs text-[#7a7697] dark:text-slate-400'>
                    {getAddressInfo(detailOrder).location}
                  </p>
                </article>
                <article className='rounded-2xl border border-[#eceaf8] p-4 dark:border-slate-700'>
                  <p className='text-xs uppercase tracking-[0.15em] text-[#9b97b9] dark:text-slate-400'>Shipper</p>
                  <p className='mt-2 text-sm font-semibold text-[#2d2950] dark:text-slate-100'>
                    {getShipperInfo(detailOrder).name}
                  </p>
                  <p className='mt-1 text-xs text-[#7a7697] dark:text-slate-400'>{getShipperInfo(detailOrder).email}</p>
                  <p className='mt-1 text-xs text-[#7a7697] dark:text-slate-400'>{getShipperInfo(detailOrder).phone}</p>
                  <p className='mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#8b86ab] dark:text-slate-400'>
                    Shipment: {getShipperInfo(detailOrder).status}
                  </p>
                </article>
              </div>

              <div className='overflow-hidden rounded-2xl border border-[#eceaf8]'>
                <table className='min-w-full divide-y divide-[#eceaf8]'>
                  <thead className='bg-[#faf9ff] text-left text-xs font-bold uppercase tracking-[0.18em] text-[#7f7a9e]'>
                    <tr>
                      <th className='px-4 py-3'>Variant</th>
                      <th className='px-4 py-3'>Qty</th>
                      <th className='px-4 py-3'>Unit Price</th>
                      <th className='px-4 py-3'>Line Total</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-[#f0edf8] bg-white'>
                    {detailOrder.items.map((item, index) => {
                      const variantId =
                        typeof item.variant_id === 'string'
                          ? item.variant_id
                          : item.variant_id?._id || `variant-${index + 1}`
                      const variantSku =
                        typeof item.variant_id === 'object' && item.variant_id ? item.variant_id.sku : ''

                      return (
                        <tr key={`${variantId}-${index}`}>
                          <td className='px-4 py-3 text-sm text-[#2d2950]'>
                            {variantSku || variantId}
                            {variantSku ? <p className='text-xs text-[#8f8aac]'>{variantId}</p> : null}
                          </td>
                          <td className='px-4 py-3 text-sm text-[#2d2950]'>{item.quantity}</td>
                          <td className='px-4 py-3 text-sm text-[#2d2950]'>{formatCurrency(item.price)}</td>
                          <td className='px-4 py-3 text-sm font-semibold text-[#2f8a57]'>
                            {formatCurrency(item.price * item.quantity)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className='flex justify-end gap-3 border-t border-[#eceaf8] px-6 py-4'>
              <button
                type='button'
                onClick={() => setDetailOrder(null)}
                className='inline-flex h-10 items-center rounded-full border border-[#d9d3ef] px-5 text-sm font-semibold text-[#5f5a7a] transition hover:bg-[#f0edf8]'
              >
                Close
              </button>
            </div>
          </article>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-[#191532]/45 px-4'>
          <article className='w-full max-w-md rounded-[26px] border border-[#f3d9df] bg-white p-6 shadow-[0_24px_60px_rgba(31,20,40,0.32)]'>
            <p className='text-lg font-bold text-[#2a254b]'>Delete this order?</p>
            <p className='mt-2 text-sm text-[#7a7697]'>
              Hành động này sẽ xóa vĩnh viễn đơn hàng #{extractOrderId(deleteTarget).slice(-8).toUpperCase()}.
            </p>
            <div className='mt-6 flex justify-end gap-3'>
              <button
                type='button'
                onClick={() => setDeleteTarget(null)}
                className='inline-flex h-10 items-center rounded-full border border-[#d9d3ef] px-5 text-sm font-semibold text-[#5f5a7a] transition hover:bg-[#f0edf8]'
              >
                Cancel
              </button>
              <button
                type='button'
                onClick={() => deleteMutation.mutate(extractOrderId(deleteTarget))}
                className='inline-flex h-10 items-center rounded-full bg-[#d85667] px-5 text-sm font-semibold text-white transition hover:bg-[#c73d52]'
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </article>
        </div>
      ) : null}
    </section>
  )
}
