import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'

import Pagination from '../../components/Pagination'
import { OrderStatusBadge, OrderStatsCards } from '../../components/Order'
import orderApi from '../../apis/order.api'
import { useAuth } from '../../contexts/app.context'
import type { OrderEntity, OrderStatus, PaymentStatus } from '../../types/order.type'
import { formatCurrency, formatDateTime } from '../../utils/common'

interface OrderItemRow {
  key: string
  orderId: string
  orderStatus: OrderStatus
  paymentStatus: PaymentStatus
  variantId: string
  variantSku: string
  quantity: number
  unitPrice: number
  lineTotal: number
  createdAt: string
}

const ORDER_STATUS_OPTIONS: Array<'all' | OrderStatus> = [
  'all',
  'pending',
  'confirmed',
  'shipping',
  'completed',
  'cancelled'
]

function flattenOrderItems(orders: OrderEntity[]): OrderItemRow[] {
  return orders.flatMap((order) =>
    order.items.map((item, index) => {
      const variantId = typeof item.variant_id === 'string' ? item.variant_id : item.variant_id?._id || ''
      const variantSku = typeof item.variant_id === 'object' && item.variant_id ? item.variant_id.sku || '' : ''
      const lineTotal = item.price * item.quantity

      return {
        key: `${order._id}-${variantId}-${index}`,
        orderId: order._id,
        orderStatus: order.status,
        paymentStatus: order.payment_status,
        variantId,
        variantSku,
        quantity: item.quantity,
        unitPrice: item.price,
        lineTotal,
        createdAt: order.createdAt
      }
    })
  )
}

export default function OrderItemsPage() {
  const { role } = useAuth()
  const canViewAllOrderItems = role === 'admin' || role === 'support'
  const isShipper = role === 'shipper'
  const isStaffOrderItemsView = canViewAllOrderItems || isShipper

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)

  const ordersQuery = useQuery({
    queryKey: ['orders-items', role],
    queryFn: async () => {
      if (isStaffOrderItemsView) {
        // Staff: admin/support nhận all orders, shipper nhận assigned orders từ BE
        const response = await orderApi.listAllAdmin({
          page: 1,
          limit: 100 // Lấy nhiều để flatten toàn bộ items
        })
        return response.data?.data?.orders ?? []
      } else {
        // Customer: gọi API lấy orders của họ
        const response = await orderApi.listMine()
        return response.data.data ?? []
      }
      console.log(flattenOrderItems(ordersQuery.data ?? []))
    },
    placeholderData: (prev) => prev
  })

  const allRows = useMemo(() => flattenOrderItems(ordersQuery.data ?? []), [ordersQuery.data])

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return allRows.filter((row) => {
      if (statusFilter !== 'all' && row.orderStatus !== statusFilter) return false

      if (!normalizedSearch) return true

      const searchText = [row.orderId, row.variantId, row.variantSku].join(' ').toLowerCase()
      return searchText.includes(normalizedSearch)
    })
  }, [allRows, search, statusFilter])

  const stats = useMemo(() => {
    const totalQuantity = allRows.reduce((acc, row) => acc + row.quantity, 0)
    const totalLineAmount = allRows.reduce((acc, row) => acc + row.lineTotal, 0)
    const averageItemAmount = allRows.length > 0 ? totalLineAmount / allRows.length : 0

    return [
      { label: 'Order Items', value: allRows.length, tone: 'from-[#6f62cf] to-[#8a7bf2]' },
      { label: 'Total Quantity', value: totalQuantity, tone: 'from-[#2fb67a] to-[#5dd7a0]' },
      { label: 'Line Amount', value: formatCurrency(totalLineAmount), tone: 'from-[#f08c44] to-[#f7b36d]' },
      { label: 'Avg / Item Row', value: formatCurrency(averageItemAmount), tone: 'from-[#2f86d6] to-[#65b4ff]' }
    ]
  }, [allRows])

  const totalItems = filteredRows.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedRows = filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize)

  const activeFiltersCount = [Boolean(search.trim()), statusFilter !== 'all'].filter(Boolean).length

  return (
    <section className='space-y-5 pb-4'>
      <div className='flex flex-wrap items-end justify-between gap-3'>
        <div>
          <p className='text-sm font-semibold uppercase tracking-[0.24em] text-[#8a84ad]'>Order Management</p>
          <h1 className='mt-2 text-3xl font-black tracking-tight text-[#201f47]'>
            {canViewAllOrderItems ? 'All Order Items' : isShipper ? 'My Assigned Order Items' : 'My Order Items'}
          </h1>
          <p className='mt-2 max-w-2xl text-sm leading-6 text-[#6d6a8a]'>
            {canViewAllOrderItems
              ? 'Quản lý chi tiết sản phẩm trong toàn bộ đơn hàng hệ thống, kiểm tra SKU, số lượng và giá trị.'
              : isShipper
                ? 'Theo dõi chi tiết sản phẩm trong các đơn hàng thuộc shipment được gán cho bạn.'
                : 'Quản lý chi tiết sản phẩm trong đơn hàng của bạn, hỗ trợ kiểm tra SKU, số lượng và giá trị dòng đơn.'}
          </p>
        </div>
      </div>

      <OrderStatsCards items={stats} />

      <div className='rounded-[30px] border border-[#eceaf8] bg-white p-5 shadow-[0_18px_50px_rgba(27,23,64,0.08)]'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <h2 className='text-xl font-bold text-[#212047]'>Order Item List</h2>
            <p className='mt-1 text-sm text-[#7a7697]'>
              {totalItems} row(s) found
              {activeFiltersCount > 0 ? ` • ${activeFiltersCount} filter(s) applied` : ''}
            </p>
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
                placeholder='Search by order id / SKU...'
                className='h-11 w-72 rounded-full border border-[#e5e1f3] bg-[#fbfaff] pr-4 pl-10 text-sm text-[#2d2950] outline-none transition focus:border-[#7a6ae0] focus:ring-2 focus:ring-[#b7abe6]/35'
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as 'all' | OrderStatus)
                setCurrentPage(1)
              }}
              className='h-11 rounded-full border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm text-[#2d2950] outline-none'
            >
              {ORDER_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status === 'all' ? 'All order status' : status}
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
                  <th className='px-4 py-4'>Order</th>
                  <th className='px-4 py-4'>Variant</th>
                  <th className='px-4 py-4'>Quantity</th>
                  <th className='px-4 py-4'>Unit Price</th>
                  <th className='px-4 py-4'>Line Total</th>
                  <th className='px-4 py-4'>Payment</th>
                  <th className='px-4 py-4'>Order Status</th>
                  <th className='px-4 py-4'>Created</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-[#f0edf8] bg-white'>
                {ordersQuery.isLoading && !ordersQuery.data ? (
                  <tr>
                    <td colSpan={8} className='px-4 py-16 text-center text-sm text-[#7a7697]'>
                      Loading order items...
                    </td>
                  </tr>
                ) : paginatedRows.length > 0 ? (
                  paginatedRows.map((row) => (
                    <tr key={row.key} className='transition hover:bg-[#fbfaff]'>
                      <td className='px-4 py-4'>
                        <p className='font-semibold text-[#28244f]'>#{row.orderId.slice(-8).toUpperCase()}</p>
                        <p className='mt-1 text-xs text-[#8f8aac]'>{row.orderId}</p>
                      </td>
                      <td className='px-4 py-4'>
                        <p className='text-sm font-semibold text-[#2d2950]'>{row.variantSku || 'N/A'}</p>
                        <p className='text-xs text-[#8f8aac]'>{row.variantId || 'Unknown variant'}</p>
                      </td>
                      <td className='px-4 py-4 text-sm text-[#2d2950]'>{row.quantity}</td>
                      <td className='px-4 py-4 text-sm text-[#2d2950]'>{formatCurrency(row.unitPrice)}</td>
                      <td className='px-4 py-4 text-sm font-semibold text-[#2f8a57]'>
                        {formatCurrency(row.lineTotal)}
                      </td>
                      <td className='px-4 py-4'>
                        <OrderStatusBadge variant='payment' status={row.paymentStatus} />
                      </td>
                      <td className='px-4 py-4'>
                        <OrderStatusBadge variant='order' status={row.orderStatus} />
                      </td>
                      <td className='px-4 py-4 text-sm text-[#5f5a7a]'>{formatDateTime(row.createdAt)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className='px-4 py-16 text-center text-sm text-[#7a7697]'>
                      No order items found.
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
              itemLabel='rows'
            />
          </div>
        </div>
      </div>
    </section>
  )
}
