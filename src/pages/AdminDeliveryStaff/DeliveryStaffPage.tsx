import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, UserRound } from 'lucide-react'
import { toast } from 'react-toastify'

import Button from '../../components/Button'
import Pagination from '../../components/Pagination'
import { OrderStatsCards } from '../../components/Order'
import adminUserApi from '../../apis/admin-user.api'
import shipmentApi from '../../apis/shipment.api'
import { useAuth } from '../../contexts/app.context'
import type { ShipmentStaffRef, ShipmentStaffCreatePayload } from '../../types/shipment.type'
import type { User } from '../../types/user.type'

export default function DeliveryStaffPage() {
  const queryClient = useQueryClient()
  const { role } = useAuth()
  const isAdmin = role === 'admin'

  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(8)
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState<ShipmentStaffCreatePayload>({
    user_id: '',
    name: '',
    phone: '',
    email: '',
    status: 'active'
  })

  const staffQuery = useQuery({
    queryKey: ['delivery-staff', role],
    queryFn: async () => {
      if (!isAdmin) {
        return [] as ShipmentStaffRef[]
      }
      const response = await shipmentApi.listDeliveryStaff()
      return response.data.data
    },
    placeholderData: (previousData) => previousData
  })

  const shipperUsersQuery = useQuery({
    queryKey: ['delivery-staff-shipper-users', role],
    queryFn: async () => {
      if (!isAdmin) {
        return [] as User[]
      }
      const response = await adminUserApi.list({
        role: 'shipper',
        status: 'active',
        page: 1,
        limit: 100,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      })
      return response.data.users
    },
    placeholderData: (previousData) => previousData
  })

  const createMutation = useMutation({
    mutationFn: (payload: ShipmentStaffCreatePayload) => shipmentApi.createDeliveryStaff(payload),
    onSuccess: (response) => {
      toast.success(response.data.message || 'Tạo delivery staff thành công')
      queryClient.invalidateQueries({ queryKey: ['delivery-staff'] })
      setCreateOpen(false)
      setForm({ user_id: '', name: '', phone: '', email: '', status: 'active' })
    }
  })

  const staff = staffQuery.data ?? []
  const shipperUsers = shipperUsersQuery.data ?? []

  const filteredStaff = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    if (!normalizedSearch) return staff
    return staff.filter((item) => {
      const linkedUser = typeof item.user_id === 'object' && item.user_id ? item.user_id : null
      return [item.name, item.email, item.phone, linkedUser?.username, linkedUser?.email, item.status]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch)
    })
  }, [search, staff])

  const totalItems = filteredStaff.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedStaff = filteredStaff.slice((safePage - 1) * pageSize, safePage * pageSize)

  const stats = [
    { label: 'Total Staff', value: staff.length, tone: 'from-[#6f62cf] to-[#8a7bf2]' },
    {
      label: 'Active',
      value: staff.filter((item) => item.status === 'active').length,
      tone: 'from-[#2fb67a] to-[#5dd7a0]'
    },
    {
      label: 'Inactive',
      value: staff.filter((item) => item.status === 'inactive').length,
      tone: 'from-[#f08c44] to-[#f7b36d]'
    },
    { label: 'Shipper Users', value: shipperUsers.length, tone: 'from-[#2f86d6] to-[#65b4ff]' }
  ]

  if (!isAdmin) {
    return (
      <section className='rounded-[30px] border border-[#eceaf8] bg-white p-6 shadow-[0_18px_50px_rgba(27,23,64,0.08)]'>
        <p className='text-lg font-bold text-[#201f47]'>Delivery Staff</p>
        <p className='mt-2 text-sm text-[#6d6a8a]'>Chỉ admin được quản lý delivery staff.</p>
      </section>
    )
  }

  return (
    <section className='space-y-5 pb-4'>
      <div className='flex flex-wrap items-end justify-between gap-3'>
        <div>
          <p className='text-sm font-semibold uppercase tracking-[0.24em] text-[#8a84ad]'>Shipment Management</p>
          <h1 className='mt-2 text-3xl font-black tracking-tight text-[#201f47]'>Delivery Staff</h1>
          <p className='mt-2 max-w-2xl text-sm leading-6 text-[#6d6a8a]'>
            Quản lý danh sách shipper đã được gán vào hệ thống delivery staff.
          </p>
        </div>
        <Button
          type='button'
          onClick={() => setCreateOpen(true)}
          className='inline-flex h-11 items-center gap-2 rounded-full bg-[#6f62cf] px-5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(111,98,207,0.25)]'
        >
          <Plus className='h-4 w-4' /> Add Staff
        </Button>
      </div>

      <OrderStatsCards items={stats} />

      <div className='rounded-[30px] border border-[#eceaf8] bg-white p-5 shadow-[0_18px_50px_rgba(27,23,64,0.08)]'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <h2 className='text-xl font-bold text-[#212047]'>Delivery Staff List</h2>
            <p className='mt-1 text-sm text-[#7a7697]'>{totalItems} staff(s) found</p>
          </div>

          <div className='relative'>
            <Search className='pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#9d98bf]' />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setCurrentPage(1)
              }}
              placeholder='Search staff...'
              className='h-11 w-72 rounded-full border border-[#e5e1f3] bg-[#fbfaff] pr-4 pl-10 text-sm text-[#2d2950] outline-none'
            />
          </div>
        </div>

        <div className='mt-5 overflow-hidden rounded-[26px] border border-[#eceaf8]'>
          <div className='overflow-x-auto'>
            <table className='min-w-full divide-y divide-[#eceaf8]'>
              <thead className='bg-[#faf9ff] text-left text-xs font-bold uppercase tracking-[0.18em] text-[#7f7a9e]'>
                <tr>
                  <th className='px-4 py-4'>Staff</th>
                  <th className='px-4 py-4'>Contact</th>
                  <th className='px-4 py-4'>Linked User</th>
                  <th className='px-4 py-4'>Status</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-[#f0edf8] bg-white'>
                {paginatedStaff.length > 0 ? (
                  paginatedStaff.map((item) => {
                    const linkedUser = typeof item.user_id === 'object' && item.user_id ? item.user_id : null
                    return (
                      <tr key={item._id} className='transition hover:bg-[#fbfaff]'>
                        <td className='px-4 py-4'>
                          <div className='flex items-center gap-3'>
                            <div className='flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f4efff] text-[#6f62cf]'>
                              <UserRound className='h-5 w-5' />
                            </div>
                            <div>
                              <p className='font-semibold text-[#28244f]'>{item.name}</p>
                              <p className='mt-1 text-xs text-[#8f8aac]'>{item._id}</p>
                            </div>
                          </div>
                        </td>
                        <td className='px-4 py-4 text-sm text-[#3f3b62]'>
                          <p>{item.email || 'N/A'}</p>
                          <p className='mt-1 text-xs text-[#8f8aac]'>{item.phone || 'N/A'}</p>
                        </td>
                        <td className='px-4 py-4 text-sm text-[#3f3b62]'>
                          <p className='font-semibold text-[#2d2950]'>{linkedUser?.username || 'N/A'}</p>
                          <p className='mt-1 text-xs text-[#8f8aac]'>{linkedUser?.email || 'N/A'}</p>
                        </td>
                        <td className='px-4 py-4'>
                          <span
                            className={`inline-flex h-7 items-center rounded-full border px-3 text-xs font-semibold ${item.status === 'active' ? 'border-[#bdeed5] bg-[#eefaf3] text-[#14804a]' : 'border-[#f7d3d8] bg-[#fff2f4] text-[#c03747]'}`}
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className='px-4 py-16 text-center text-sm text-[#7a7697]'>
                      No delivery staff found.
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
              itemLabel='staff'
            />
          </div>
        </div>
      </div>

      {createOpen ? (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-[#191532]/45 px-4 py-6'>
          <article className='w-full max-w-xl rounded-[28px] border border-[#eceaf8] bg-white p-6 shadow-[0_25px_65px_rgba(23,20,55,0.35)]'>
            <p className='text-lg font-bold text-[#212047]'>Create Delivery Staff</p>
            <p className='mt-1 text-sm text-[#7a7697]'>Chọn user shipper đã tồn tại trong hệ thống.</p>

            <div className='mt-5 space-y-4'>
              <label className='block'>
                <span className='text-sm font-semibold text-[#4a4666]'>User</span>
                <select
                  value={form.user_id}
                  onChange={(event) => {
                    const selected = shipperUsers.find((item) => (item._id || item.id) === event.target.value)
                    setForm((prev) => ({
                      ...prev,
                      user_id: event.target.value,
                      name: selected?.username || prev.name,
                      phone: selected?.phone || prev.phone,
                      email: selected?.email || prev.email
                    }))
                  }}
                  className='mt-2 h-11 w-full rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm text-[#2d2950] outline-none'
                >
                  <option value=''>Select shipper user</option>
                  {shipperUsers.map((user) => (
                    <option key={user._id || user.id} value={user._id || user.id}>
                      {user.username} ({user.email})
                    </option>
                  ))}
                </select>
              </label>

              <div className='grid gap-4 md:grid-cols-2'>
                <label className='block'>
                  <span className='text-sm font-semibold text-[#4a4666]'>Name</span>
                  <input
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    className='mt-2 h-11 w-full rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm text-[#2d2950] outline-none'
                  />
                </label>
                <label className='block'>
                  <span className='text-sm font-semibold text-[#4a4666]'>Phone</span>
                  <input
                    value={form.phone || ''}
                    onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                    className='mt-2 h-11 w-full rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm text-[#2d2950] outline-none'
                  />
                </label>
              </div>

              <div className='grid gap-4 md:grid-cols-2'>
                <label className='block'>
                  <span className='text-sm font-semibold text-[#4a4666]'>Email</span>
                  <input
                    value={form.email || ''}
                    onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                    className='mt-2 h-11 w-full rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm text-[#2d2950] outline-none'
                  />
                </label>
                <label className='block'>
                  <span className='text-sm font-semibold text-[#4a4666]'>Status</span>
                  <select
                    value={form.status}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, status: event.target.value as 'active' | 'inactive' }))
                    }
                    className='mt-2 h-11 w-full rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm text-[#2d2950] outline-none'
                  >
                    <option value='active'>active</option>
                    <option value='inactive'>inactive</option>
                  </select>
                </label>
              </div>
            </div>

            <div className='mt-6 flex justify-end gap-3'>
              <button
                type='button'
                onClick={() => setCreateOpen(false)}
                className='inline-flex h-10 items-center rounded-full border border-[#d9d3ef] px-5 text-sm font-semibold text-[#5f5a7a] transition hover:bg-[#f0edf8]'
              >
                Cancel
              </button>
              <button
                type='button'
                disabled={!form.user_id || !form.name}
                onClick={() => createMutation.mutate(form)}
                className='inline-flex h-10 items-center rounded-full bg-[#6f62cf] px-5 text-sm font-semibold text-white transition hover:bg-[#5e53bf] disabled:cursor-not-allowed disabled:opacity-60'
              >
                {createMutation.isPending ? 'Creating...' : 'Create Staff'}
              </button>
            </div>
          </article>
        </div>
      ) : null}
    </section>
  )
}
