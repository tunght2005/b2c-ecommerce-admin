import { type FormEvent, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Shield, SlidersHorizontal, Users, X } from 'lucide-react'
import { toast } from 'react-toastify'

import adminUserApi from '../../apis/admin-user.api'
import CrudActionButtons from '../../components/CrudActionButtons'
import OrderStatsCards from '../../components/Order/OrderStatsCards'
import { roleTone, statusTone, formatDateTime } from '../../utils/common'
import type { UserRole, UserStatus } from '../../types/user.type'

type StaffFormState = {
  username: string
  email: string
  phone: string
  role: UserRole
  status: UserStatus
  password: string
}

const defaultFormState: StaffFormState = {
  username: '',
  email: '',
  phone: '',
  role: 'support',
  status: 'active',
  password: ''
}

export default function StaffPage() {
  const queryClient = useQueryClient()
  const [formState, setFormState] = useState<StaffFormState>(defaultFormState)
  const [editingId, setEditingId] = useState('')
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [deleteStaffId, setDeleteStaffId] = useState('')

  // Advanced filters
  const [keyword, setKeyword] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | UserStatus>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const staffQuery = useQuery({
    queryKey: ['staff-list-dashboard'],
    queryFn: async () => {
      const response = await adminUserApi.list({
        page: 1,
        limit: 200,
        role: 'all',
        status: 'all',
        sortBy: 'createdAt',
        sortOrder: 'desc'
      })
      return response.data
    },
    placeholderData: (prev) => prev
  })

  const createMutation = useMutation({
    mutationFn: () =>
      adminUserApi.create({
        username: formState.username.trim(),
        email: formState.email.trim(),
        phone: formState.phone.trim() || null,
        role: formState.role,
        status: formState.status,
        password: formState.password
      }),
    onSuccess: (response) => {
      toast.success(response.data.message || 'Tạo nhân sự thành công')
      setFormState(defaultFormState)
      setIsFormModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['staff-list-dashboard'] })
    },
    onError: () => toast.error('Không thể tạo nhân sự')
  })

  const updateMutation = useMutation({
    mutationFn: () =>
      adminUserApi.update(editingId, {
        username: formState.username.trim(),
        email: formState.email.trim(),
        phone: formState.phone.trim() || null,
        role: formState.role,
        status: formState.status,
        password: formState.password.trim() || undefined
      }),
    onSuccess: (response) => {
      toast.success(response.data.message || 'Cập nhật nhân sự thành công')
      setEditingId('')
      setFormState(defaultFormState)
      setIsFormModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['staff-list-dashboard'] })
    },
    onError: () => toast.error('Không thể cập nhật nhân sự')
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminUserApi.remove(id),
    onSuccess: (response) => {
      toast.success(response.data.message || 'Xóa nhân sự thành công')
      setDeleteStaffId('')
      queryClient.invalidateQueries({ queryKey: ['staff-list-dashboard'] })
    },
    onError: () => toast.error('Không thể xóa nhân sự')
  })

  const payload = staffQuery.data

  const staffs = useMemo(
    () =>
      (payload?.users || []).filter(
        (item) => item.role === 'admin' || item.role === 'support' || item.role === 'shipper'
      ),
    [payload?.users]
  )

  const filteredStaffs = useMemo(() => {
    return staffs.filter((item) => {
      const keywordText = `${item.username || ''} ${item.email || ''} ${item.phone || ''}`.toLowerCase()
      const keywordMatched = !keyword.trim() || keywordText.includes(keyword.trim().toLowerCase())

      const roleMatched = roleFilter === 'all' || item.role === roleFilter
      const statusMatched = statusFilter === 'all' || item.status === statusFilter

      const createdAt = item.createdAt ? new Date(item.createdAt).getTime() : 0
      const fromMatched = !fromDate || createdAt >= new Date(`${fromDate}T00:00:00`).getTime()
      const toMatched = !toDate || createdAt <= new Date(`${toDate}T23:59:59`).getTime()

      return keywordMatched && roleMatched && statusMatched && fromMatched && toMatched
    })
  }, [staffs, keyword, roleFilter, statusFilter, fromDate, toDate])

  const stats = useMemo(() => {
    const summary = payload?.summary
    return [
      { label: 'Tổng nhân sự', value: summary?.adminSupportUsers || 0, tone: 'from-[#6f62cf] to-[#8a7bf2]' },
      { label: 'Admin', value: summary?.adminUsers || 0, tone: 'from-[#2f86d6] to-[#65b4ff]' },
      { label: 'Support', value: summary?.supportUsers || 0, tone: 'from-[#f08c44] to-[#f7b36d]' },
      { label: 'Shipper', value: summary?.shipperUsers || 0, tone: 'from-[#2fb67a] to-[#5dd7a0]' }
    ]
  }, [payload?.summary])

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!formState.username.trim() || !formState.email.trim()) {
      toast.warn('Vui lòng nhập username và email')
      return
    }

    if (!editingId && !formState.password.trim()) {
      toast.warn('Vui lòng nhập mật khẩu cho tài khoản mới')
      return
    }

    if (editingId) {
      updateMutation.mutate()
      return
    }

    createMutation.mutate()
  }

  const onEdit = (id: string) => {
    const user = staffs.find((item) => (item._id || item.id) === id)
    if (!user) return

    setEditingId(id)
    setFormState({
      username: user.username,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      status: user.status,
      password: ''
    })
    setIsFormModalOpen(true)
  }

  const onDelete = (id: string) => {
    const user = staffs.find((item) => (item._id || item.id) === id)
    if (!user) return
    setDeleteStaffId(id)
  }

  const resetForm = () => {
    setEditingId('')
    setFormState(defaultFormState)
    setIsFormModalOpen(false)
  }

  const resetFilters = () => {
    setKeyword('')
    setRoleFilter('all')
    setStatusFilter('all')
    setFromDate('')
    setToDate('')
  }

  const confirmDelete = () => {
    if (!deleteStaffId) return
    deleteMutation.mutate(deleteStaffId)
  }

  return (
    <section className='space-y-5 pb-4'>
      <div className='rounded-[30px] border border-[#eceaf8] bg-white p-6 shadow-[0_18px_50px_rgba(27,23,64,0.08)]'>
        <p className='text-sm font-semibold uppercase tracking-[0.24em] text-[#8a84ad]'>Staff</p>
        <h1 className='mt-2 text-3xl font-black tracking-tight text-[#201f47]'>Staff Management</h1>
        <p className='mt-2 text-sm text-[#6d6a8a]'>Theo dõi nhân sự vận hành: admin, support, shipper.</p>
      </div>

      <OrderStatsCards items={stats} />

      <div className='grid gap-4 xl:grid-cols-[1.3fr_1fr]'>
        <article className='rounded-3xl border border-[#eceaf8] bg-white p-5 shadow-[0_12px_36px_rgba(28,24,70,0.06)]'>
          <div className='mb-4 flex items-center justify-between'>
            <h2 className='text-xl font-bold text-[#212047]'>Danh sách nhân sự ({filteredStaffs.length})</h2>
            <div className='flex items-center gap-2'>
              <button
                type='button'
                onClick={() => {
                  setEditingId('')
                  setFormState(defaultFormState)
                  setIsFormModalOpen(true)
                }}
                className='inline-flex h-8 items-center gap-2 rounded-full border border-[#d8edff] bg-[#eff8ff] px-3 text-xs font-semibold text-[#2f78d1] transition hover:bg-[#e2f2ff]'
              >
                <Plus className='h-3.5 w-3.5' />
                Tạo nhân sự
              </button>
              <button
                type='button'
                onClick={() => setIsFilterOpen((prev) => !prev)}
                className='inline-flex h-8 items-center gap-2 rounded-full border border-[#d9d3ef] bg-white px-3 text-xs font-semibold text-[#5f5a7a] transition hover:border-[#bfb5ea] hover:text-[#6f62cf]'
              >
                <SlidersHorizontal className='h-3.5 w-3.5' />
                Filter nâng cao
              </button>
              <Users className='h-5 w-5 text-[#6f62cf]' />
            </div>
          </div>

          {isFilterOpen ? (
            <div className='mb-4 rounded-2xl border border-[#eceaf8] bg-[#faf9ff] p-4'>
              <div className='grid gap-3 md:grid-cols-3'>
                <input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder='Tìm username / email / phone'
                  className='h-10 rounded-xl border border-[#e5e1f3] bg-white px-3 text-sm outline-none'
                />
                <select
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value as 'all' | UserRole)}
                  className='h-10 rounded-xl border border-[#e5e1f3] bg-white px-3 text-sm outline-none'
                >
                  <option value='all'>Role: Tất cả</option>
                  <option value='admin'>Admin</option>
                  <option value='support'>Support</option>
                  <option value='shipper'>Shipper</option>
                  <option value='customer'>Customer</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as 'all' | UserStatus)}
                  className='h-10 rounded-xl border border-[#e5e1f3] bg-white px-3 text-sm outline-none'
                >
                  <option value='all'>Status: Tất cả</option>
                  <option value='active'>Active</option>
                  <option value='inactive'>Inactive</option>
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
                <p className='text-xs text-[#7a7697]'>Hiển thị {filteredStaffs.length} nhân sự</p>
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
            {staffQuery.isLoading && !payload ? (
              <p className='rounded-2xl border border-[#eceaf8] px-4 py-6 text-sm text-[#7a7697]'>
                Đang tải nhân sự...
              </p>
            ) : filteredStaffs.length > 0 ? (
              filteredStaffs.map((user) => (
                <div
                  key={user._id || user.id || user.email}
                  className='grid gap-3 rounded-2xl border border-[#eceaf8] px-4 py-3 md:grid-cols-[1.4fr_auto_auto] md:items-center'
                >
                  <div>
                    <p className='text-sm font-bold text-[#2a254b]'>{user.username}</p>
                    <p className='mt-1 text-xs text-[#8f8aac]'>{user.email}</p>
                  </div>
                  <span
                    className={`inline-flex h-7 items-center rounded-full border px-3 text-xs font-semibold tracking-wide ${roleTone(user.role)}`}
                  >
                    {user.role}
                  </span>
                  <span
                    className={`inline-flex h-7 items-center rounded-full border px-3 text-xs font-semibold tracking-wide ${statusTone(user.status)}`}
                  >
                    {user.status}
                  </span>

                  <div className='md:col-span-3'>
                    <CrudActionButtons
                      onEdit={() => onEdit(user._id || user.id || '')}
                      onDelete={() => onDelete(user._id || user.id || '')}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className='rounded-2xl border border-[#eceaf8] px-4 py-6 text-sm text-[#7a7697]'>
                Không có dữ liệu nhân sự phù hợp bộ lọc.
              </p>
            )}
          </div>
        </article>

        <div className='space-y-4'>
          <article className='rounded-3xl border border-[#eceaf8] bg-white p-5 shadow-[0_12px_36px_rgba(28,24,70,0.06)]'>
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-xl font-bold text-[#212047]'>Insights</h2>
              <Shield className='h-5 w-5 text-[#2f78d1]' />
            </div>

            <div className='space-y-3'>
              <div className='rounded-2xl border border-[#eceaf8] bg-[#fbfaff] p-4'>
                <p className='text-sm text-[#7a7697]'>Nhân sự active</p>
                <p className='mt-2 text-3xl font-black text-[#212047]'>{payload?.summary?.activeUsers || 0}</p>
              </div>

              <div className='rounded-2xl border border-[#eceaf8] bg-[#fbfaff] p-4'>
                <p className='text-sm text-[#7a7697]'>Tổng user hệ thống</p>
                <p className='mt-2 text-3xl font-black text-[#212047]'>{payload?.summary?.totalUsers || 0}</p>
              </div>

              <div className='rounded-2xl border border-[#eceaf8] bg-[#fbfaff] p-4'>
                <p className='text-sm text-[#7a7697]'>Mốc cập nhật</p>
                <p className='mt-2 text-sm font-semibold text-[#212047]'>
                  {staffs[0]?.updatedAt ? formatDateTime(staffs[0].updatedAt) : 'N/A'}
                </p>
              </div>
            </div>
          </article>
        </div>
      </div>

      {isFormModalOpen ? (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-[#1f1b3f]/35 px-4'>
          <div className='w-full max-w-2xl rounded-3xl border border-[#eceaf8] bg-white p-6 shadow-[0_24px_64px_rgba(20,17,48,0.25)]'>
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-xl font-bold text-[#212047]'>{editingId ? 'Cập nhật nhân sự' : 'Tạo nhân sự'}</h2>
              <button
                type='button'
                onClick={resetForm}
                className='inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#eceaf8] text-[#6d688a] transition hover:border-[#d4cfea] hover:text-[#5f54bf]'
              >
                <X className='h-4 w-4' />
              </button>
            </div>

            <form className='space-y-3' onSubmit={onSubmit}>
              <input
                value={formState.username}
                onChange={(event) => setFormState((prev) => ({ ...prev, username: event.target.value }))}
                placeholder='Username'
                className='h-11 w-full rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm outline-none'
              />
              <input
                value={formState.email}
                onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
                placeholder='Email'
                className='h-11 w-full rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm outline-none'
              />
              <input
                value={formState.phone}
                onChange={(event) => setFormState((prev) => ({ ...prev, phone: event.target.value }))}
                placeholder='Phone'
                className='h-11 w-full rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm outline-none'
              />
              <input
                type='password'
                value={formState.password}
                onChange={(event) => setFormState((prev) => ({ ...prev, password: event.target.value }))}
                placeholder={editingId ? 'Mật khẩu mới (không bắt buộc)' : 'Mật khẩu'}
                className='h-11 w-full rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm outline-none'
              />

              <div className='grid gap-3 md:grid-cols-2'>
                <select
                  value={formState.role}
                  onChange={(event) => setFormState((prev) => ({ ...prev, role: event.target.value as UserRole }))}
                  className='h-11 rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm outline-none'
                >
                  <option value='admin'>Admin</option>
                  <option value='support'>Support</option>
                  <option value='shipper'>Shipper</option>
                </select>

                <select
                  value={formState.status}
                  onChange={(event) => setFormState((prev) => ({ ...prev, status: event.target.value as UserStatus }))}
                  className='h-11 rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm outline-none'
                >
                  <option value='active'>Active</option>
                  <option value='inactive'>Inactive</option>
                </select>
              </div>

              <div className='flex flex-wrap justify-end items-center gap-2 pt-1'>
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

      {deleteStaffId ? (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-[#1f1b3f]/35 px-4'>
          <div className='w-full max-w-md rounded-3xl border border-[#eceaf8] bg-white p-6 shadow-[0_24px_64px_rgba(20,17,48,0.25)]'>
            <h2 className='text-lg font-bold text-[#212047]'>Xác nhận xoá nhân sự</h2>
            <p className='mt-2 text-sm text-[#6d688a]'>Bạn có chắc muốn xoá nhân sự này không?</p>

            <div className='mt-5 flex justify-end gap-2'>
              <button
                type='button'
                onClick={() => setDeleteStaffId('')}
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
                {deleteMutation.isPending ? 'Đang xoá...' : 'Xoá nhân sự'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
