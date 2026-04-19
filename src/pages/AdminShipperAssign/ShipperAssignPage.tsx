import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, WandSparkles, Truck, UserRoundCheck } from 'lucide-react'
import { toast } from 'react-toastify'

import Pagination from '../../components/Pagination'
import { OrderStatsCards } from '../../components/Order'
import orderApi from '../../apis/order.api'
import shipmentApi from '../../apis/shipment.api'
import adminUserApi from '../../apis/admin-user.api'
import { useAuth } from '../../contexts/app.context'
import type { OrderEntity } from '../../types/order.type'
import type { User } from '../../types/user.type'
import type { ShipmentStaffRef } from '../../types/shipment.type'
import { formatCurrency, formatDateTime } from '../../utils/common'

function getBuyer(order: OrderEntity) {
  return typeof order.user_id === 'object' && order.user_id
    ? order.user_id.username || order.user_id.email || 'N/A'
    : 'N/A'
}

function getBuyerContact(order: OrderEntity) {
  return typeof order.user_id === 'object' && order.user_id
    ? order.user_id.email || order.user_id.phone || 'N/A'
    : 'N/A'
}

function hasShipment(order: OrderEntity) {
  return Boolean(order.shipment)
}

function isOrderPaid(order: OrderEntity) {
  return order.payment_status === 'paid'
}

function getOrderSearchText(order: OrderEntity) {
  const buyer = typeof order.user_id === 'object' && order.user_id ? order.user_id.username || '' : ''
  const buyerEmail = typeof order.user_id === 'object' && order.user_id ? order.user_id.email || '' : ''
  return [order._id, buyer, buyerEmail, order.status, order.payment_status].join(' ').toLowerCase()
}

export default function ShipperAssignPage() {
  const queryClient = useQueryClient()
  const { role } = useAuth()
  const isAdmin = role === 'admin'
  const isSupport = role === 'support'
  const canAssign = isAdmin || isSupport

  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(8)
  const [assignTarget, setAssignTarget] = useState<OrderEntity | null>(null)
  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [expectedDeliveryAt, setExpectedDeliveryAt] = useState('')
  const [note, setNote] = useState('')

  const ordersQuery = useQuery({
    queryKey: ['shipment-assign-orders', role],
    queryFn: async () => {
      if (!canAssign) {
        return [] as OrderEntity[]
      }

      const pageSizeForFetch = 100
      let page = 1
      let totalPages = 1
      const confirmedOrders: OrderEntity[] = []

      do {
        const response = await orderApi.listAllAdmin({
          status: 'confirmed',
          page,
          limit: pageSizeForFetch,
          sortBy: 'createdAt',
          sortOrder: 'desc'
        })
        const payload = response.data.data
        confirmedOrders.push(...(payload.orders ?? []))
        totalPages = payload.pagination.totalPages
        page += 1
      } while (page <= totalPages)

      return confirmedOrders
    },
    placeholderData: (previousData) => previousData
  })

  const staffQuery = useQuery({
    queryKey: ['shipment-delivery-staff', role],
    queryFn: async () => {
      if (!canAssign) {
        return [] as ShipmentStaffRef[]
      }

      if (isSupport) {
        const staffResponse = await shipmentApi.listDeliveryStaff()
        return staffResponse.data.data ?? []
      }

      const [staffResponse, shipperUsersResponse] = await Promise.all([
        shipmentApi.listDeliveryStaff(),
        adminUserApi.list({
          role: 'shipper',
          status: 'active',
          page: 1,
          limit: 100,
          sortBy: 'createdAt',
          sortOrder: 'desc'
        })
      ])

      const existing = staffResponse.data.data ?? []
      const shipperUsers = shipperUsersResponse.data.users ?? []

      const merged = shipperUsers.map((user: User) => {
        const matched = existing.find((item) => {
          const linkedUserId = typeof item.user_id === 'object' && item.user_id ? item.user_id._id : ''
          return linkedUserId === (user._id || user.id)
        })

        return {
          _id: matched?._id || user._id || user.id || user.email,
          user_id: user,
          name: matched?.name || user.username,
          phone: matched?.phone || user.phone,
          email: matched?.email || user.email,
          status: matched?.status || 'active',
          createdAt: matched?.createdAt || user.createdAt,
          updatedAt: matched?.updatedAt || user.updatedAt
        } as ShipmentStaffRef
      })

      return merged
    },
    placeholderData: (previousData) => previousData
  })

  const assignMutation = useMutation({
    mutationFn: ({
      orderId,
      deliveryStaffId,
      expectedAt,
      noteText
    }: {
      orderId: string
      deliveryStaffId: string
      expectedAt?: string
      noteText?: string
    }) =>
      shipmentApi.assign({
        order_id: orderId,
        delivery_staff_id: deliveryStaffId,
        expected_delivery_at: expectedAt || null,
        note: noteText || null
      }),
    onSuccess: (response) => {
      toast.success(response.data.message || 'Gán shipper thành công')
      queryClient.invalidateQueries({ queryKey: ['shipment-assign-orders'] })
      queryClient.invalidateQueries({ queryKey: ['shipments'] })
      setAssignTarget(null)
    }
  })

  const autoAssignMutation = useMutation({
    mutationFn: (orderId: string) => shipmentApi.autoAssign({ order_id: orderId }),
    onSuccess: (response) => {
      toast.success(response.data.message || 'Tự động gán shipper thành công')
      queryClient.invalidateQueries({ queryKey: ['shipment-assign-orders'] })
      queryClient.invalidateQueries({ queryKey: ['shipments'] })
    }
  })

  const pendingOrders = (ordersQuery.data ?? []).filter((order) => !hasShipment(order))
  const assignableOrdersCount = pendingOrders.filter((order) => isOrderPaid(order)).length
  const filteredOrders = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    if (!normalizedSearch) return pendingOrders
    return pendingOrders.filter((order) => getOrderSearchText(order).includes(normalizedSearch))
  }, [pendingOrders, search])

  const totalItems = filteredOrders.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedOrders = filteredOrders.slice((safePage - 1) * pageSize, safePage * pageSize)

  const staff = staffQuery.data ?? []
  const activeStaff = staff.filter((item) => item.status === 'active').length

  const stats = [
    { label: 'Ready Orders', value: assignableOrdersCount, tone: 'from-[#6f62cf] to-[#8a7bf2]' },
    { label: 'Active Shippers', value: activeStaff, tone: 'from-[#2fb67a] to-[#5dd7a0]' },
    { label: 'Manual Assign', value: assignableOrdersCount, tone: 'from-[#f08c44] to-[#f7b36d]' },
    { label: 'Auto Assign', value: assignableOrdersCount, tone: 'from-[#2f86d6] to-[#65b4ff]' }
  ]

  if (!canAssign) {
    return (
      <section className='rounded-[30px] border border-[#eceaf8] bg-white p-6 shadow-[0_18px_50px_rgba(27,23,64,0.08)]'>
        <p className='text-lg font-bold text-[#201f47]'>Shipper Assign</p>
        <p className='mt-2 text-sm text-[#6d6a8a]'>Chỉ admin và support được quyền gán shipper cho đơn hàng.</p>
      </section>
    )
  }

  return (
    <section className='space-y-5 pb-4'>
      <div className='flex flex-wrap items-end justify-between gap-3'>
        <div>
          <p className='text-sm font-semibold uppercase tracking-[0.24em] text-[#8a84ad]'>Shipment Management</p>
          <h1 className='mt-2 text-3xl font-black tracking-tight text-[#201f47]'>Shipper Assign</h1>
          <p className='mt-2 max-w-2xl text-sm leading-6 text-[#6d6a8a]'>
            Chọn đơn hàng đã xác nhận và gán shipper thủ công hoặc tự động theo tải công việc.
          </p>
        </div>
      </div>

      <OrderStatsCards items={stats} />

      <div className='rounded-[30px] border border-[#eceaf8] bg-white p-5 shadow-[0_18px_50px_rgba(27,23,64,0.08)]'>
        <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
          <div>
            <h2 className='text-xl font-bold text-[#212047]'>Confirmed Orders Waiting for Assignment</h2>
            <p className='mt-1 text-sm text-[#7a7697]'>{totalItems} order(s) ready</p>
          </div>

          <div className='relative w-full md:w-auto'>
            <Search className='pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#9d98bf]' />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setCurrentPage(1)
              }}
              type='text'
              placeholder='Search order, buyer...'
              className='h-11 w-full rounded-full border border-[#e5e1f3] bg-[#fbfaff] pr-4 pl-10 text-sm text-[#2d2950] outline-none transition focus:border-[#7a6ae0] focus:ring-2 focus:ring-[#b7abe6]/35 md:w-72'
            />
          </div>
        </div>

        <div className='mt-5 overflow-hidden rounded-[26px] border border-[#eceaf8]'>
          <div className='overflow-x-auto'>
            <table className='min-w-[960px] divide-y divide-[#eceaf8] md:min-w-full'>
              <thead className='bg-[#faf9ff] text-left text-xs font-bold uppercase tracking-[0.18em] text-[#7f7a9e]'>
                <tr>
                  <th className='px-4 py-4'>Order</th>
                  <th className='px-4 py-4'>Buyer</th>
                  <th className='px-4 py-4'>Items</th>
                  <th className='px-4 py-4'>Total</th>
                  <th className='px-4 py-4'>Created</th>
                  <th className='px-4 py-4 text-right'>Actions</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-[#f0edf8] bg-white'>
                {paginatedOrders.length > 0 ? (
                  paginatedOrders.map((order) => {
                    const isUnpaid = order.payment_status === 'unpaid'

                    return (
                      <tr key={order._id} className='transition hover:bg-[#fbfaff]'>
                        <td className='px-4 py-4'>
                          <p className='font-semibold text-[#28244f]'>#{order._id.slice(-8).toUpperCase()}</p>
                          <p className='mt-1 text-xs text-[#8f8aac]'>{order.status}</p>
                          <p className={`mt-1 text-xs font-semibold ${isUnpaid ? 'text-[#d74c4c]' : 'text-[#2f8a57]'}`}>
                            Payment: {order.payment_status}
                          </p>
                        </td>
                        <td className='px-4 py-4'>
                          <p className='text-sm font-semibold text-[#2d2950]'>{getBuyer(order)}</p>
                          <p className='mt-1 text-xs text-[#8f8aac]'>{getBuyerContact(order)}</p>
                        </td>
                        <td className='px-4 py-4 text-sm text-[#3f3b62]'>{order.items.length} item(s)</td>
                        <td className='px-4 py-4 text-sm font-semibold text-[#2f8a57]'>
                          {formatCurrency(order.final_price)}
                        </td>
                        <td className='px-4 py-4 text-sm text-[#5f5a7a]'>{formatDateTime(order.createdAt)}</td>
                        <td className='px-4 py-4'>
                          <div className='flex flex-wrap items-center justify-end gap-2'>
                            <button
                              type='button'
                              onClick={() => {
                                if (isUnpaid) {
                                  toast.error('Đơn hàng unpaid không thể auto assign shipment')
                                  return
                                }
                                autoAssignMutation.mutate(order._id)
                              }}
                              disabled={isUnpaid}
                              className='inline-flex h-9 items-center gap-1.5 rounded-full border border-[#d8f0e2] bg-[#effaf4] px-3 text-xs font-semibold text-[#2f8a57] transition hover:bg-[#e0f5ea] disabled:cursor-not-allowed disabled:border-[#ebe8f5] disabled:bg-[#f7f6fb] disabled:text-[#9f9ab8]'
                            >
                              <WandSparkles className='h-4 w-4' /> Auto Assign
                            </button>
                            <button
                              type='button'
                              onClick={() => {
                                if (isUnpaid) {
                                  toast.error('Đơn hàng unpaid không thể gán shipment')
                                  return
                                }
                                setAssignTarget(order)
                              }}
                              disabled={isUnpaid}
                              className='inline-flex h-9 items-center gap-1.5 rounded-full border border-[#d8edff] bg-[#eff8ff] px-3 text-xs font-semibold text-[#2f78d1] transition hover:bg-[#e2f2ff] disabled:cursor-not-allowed disabled:border-[#ebe8f5] disabled:bg-[#f7f6fb] disabled:text-[#9f9ab8]'
                            >
                              <Truck className='h-4 w-4' /> Assign
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className='px-4 py-16 text-center text-sm text-[#7a7697]'>
                      No confirmed orders waiting for assignment.
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
              itemLabel='orders'
            />
          </div>
        </div>
      </div>

      {assignTarget ? (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-[#191532]/45 px-4 py-6'>
          <article className='w-full max-w-xl rounded-[28px] border border-[#eceaf8] bg-white p-6 shadow-[0_25px_65px_rgba(23,20,55,0.35)]'>
            <div className='flex items-center justify-between gap-3'>
              <div>
                <p className='text-lg font-bold text-[#212047]'>Assign Shipments</p>
                <p className='mt-1 text-sm text-[#7a7697]'>{assignTarget._id}</p>
              </div>
              <UserRoundCheck className='h-5 w-5 text-[#6f62cf]' />
            </div>

            <div className='mt-5 space-y-4'>
              <label className='block'>
                <span className='text-sm font-semibold text-[#4a4666]'>Delivery Staff</span>
                <select
                  value={selectedStaffId}
                  onChange={(event) => setSelectedStaffId(event.target.value)}
                  className='mt-2 h-11 w-full rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm text-[#2d2950] outline-none'
                >
                  <option value=''>Select shipper</option>
                  {staff.map((item) => (
                    <option key={item._id} value={typeof item.user_id === 'object' ? item.user_id._id : item.user_id}>
                      {item.name} {item.email ? `(${item.email})` : ''}
                    </option>
                  ))}
                </select>
              </label>

              <label className='block'>
                <span className='text-sm font-semibold text-[#4a4666]'>Expected Delivery</span>
                <input
                  type='datetime-local'
                  value={expectedDeliveryAt}
                  onChange={(event) => setExpectedDeliveryAt(event.target.value)}
                  className='mt-2 h-11 w-full rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm text-[#2d2950] outline-none'
                />
              </label>

              <label className='block'>
                <span className='text-sm font-semibold text-[#4a4666]'>Note</span>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={4}
                  className='mt-2 w-full rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 py-3 text-sm text-[#2d2950] outline-none'
                  placeholder='Optional assignment note...'
                />
              </label>
            </div>

            <div className='mt-6 flex justify-end gap-3'>
              <button
                type='button'
                onClick={() => setAssignTarget(null)}
                className='inline-flex h-10 items-center rounded-full border border-[#d9d3ef] px-5 text-sm font-semibold text-[#5f5a7a] transition hover:bg-[#f0edf8]'
              >
                Cancel
              </button>
              <button
                type='button'
                disabled={!selectedStaffId || assignTarget.payment_status === 'unpaid'}
                onClick={() => {
                  if (assignTarget.payment_status === 'unpaid') {
                    toast.error('Đơn hàng unpaid không thể gán shipment')
                    return
                  }

                  assignMutation.mutate({
                    orderId: assignTarget._id,
                    deliveryStaffId: selectedStaffId,
                    expectedAt: expectedDeliveryAt,
                    noteText: note
                  })
                }}
                className='inline-flex h-10 items-center rounded-full bg-[#6f62cf] px-5 text-sm font-semibold text-white transition hover:bg-[#5e53bf] disabled:cursor-not-allowed disabled:opacity-60'
              >
                {assignMutation.isPending ? 'Assigning...' : 'Confirm Assign'}
              </button>
            </div>
          </article>
        </div>
      ) : null}
    </section>
  )
}
