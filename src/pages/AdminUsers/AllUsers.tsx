import { useMemo, useState, type ChangeEvent } from 'react'
import { Mail, Plus, Trash2, UserCircle2, UserRound, Search } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import Button from '../../components/Button'
import Pagination from '../../components/Pagination'
import CrudActionButtons from '../../components/CrudActionButtons'
import type { User, UserRole, UserStatus } from '../../types/user.type'
import { ROLE_LABELS, USER_ROLE_OPTIONS } from '../../config/role.config'
import { formatDate, formatDateTime, getInitials, roleTone, statusTone } from '../../utils/common'
import { uploadImageToCloudinary } from '../../utils/upload'
import { StrongPasswordSchema } from '../../schemas/user.schema'
import adminUserApi from '../../apis/admin-user.api'
import type {
  AdminUserFormPayload,
  AdminUserListResponse,
  AdminUserUpdatePayload,
  UserSortField,
  UserSortOrder
} from '../../types/admin-user.type'

type UserFormState = Omit<AdminUserFormPayload, 'password' | 'phone' | 'avatar'> & {
  phone: string
  avatar: string
  password: string
  confirmPassword: string
}

type UserAction = 'create' | 'edit' | null

type SortKey = UserSortField

const statusOptions: UserStatus[] = ['active', 'inactive']

const defaultFormState: UserFormState = {
  username: '',
  email: '',
  phone: '',
  avatar: '',
  role: 'customer',
  status: 'active',
  password: '',
  confirmPassword: ''
}

function roleLabel(role: UserRole) {
  return ROLE_LABELS[role]
}

function validateStrongPassword(password: string) {
  const parsed = StrongPasswordSchema.safeParse(password)
  if (!parsed.success) {
    toast.error(parsed.error.issues[0]?.message || 'Mật khẩu không hợp lệ')
    return false
  }
  return true
}

export default function AllUsers() {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | UserStatus>('all')
  const [sortKey, setSortKey] = useState<SortKey>('createdAt')
  const [sortDirection, setSortDirection] = useState<UserSortOrder>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(8)
  const [actionMode, setActionMode] = useState<UserAction>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [formState, setFormState] = useState<UserFormState>(defaultFormState)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const queryClient = useQueryClient()

  const usersQuery = useQuery<AdminUserListResponse>({
    queryKey: ['admin-users', search, roleFilter, statusFilter, sortKey, sortDirection, currentPage, pageSize],
    queryFn: async () => {
      const response = await adminUserApi.list({
        search: search.trim() || undefined,
        role: roleFilter,
        status: statusFilter,
        page: currentPage,
        limit: pageSize,
        sortBy: sortKey,
        sortOrder: sortDirection
      })

      return response.data
    },
    placeholderData: (previousData) => previousData
  })

  const users = usersQuery.data?.users ?? []
  const pagination = usersQuery.data?.pagination
  const summary = usersQuery.data?.summary

  const createMutation = useMutation({
    mutationFn: (payload: AdminUserFormPayload) => adminUserApi.create(payload),
    onSuccess: (response) => {
      toast.success(response.data.message)
      setCurrentPage(1)
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      closeOverlay()
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AdminUserUpdatePayload }) => adminUserApi.update(id, payload),
    onSuccess: (response) => {
      toast.success(response.data.message)
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      closeOverlay()
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminUserApi.remove(id),
    onSuccess: (response) => {
      toast.success(response.data.message)
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      closeOverlay()
    }
  })

  const stats = useMemo(() => {
    const active = summary?.activeUsers ?? 0
    const staffCount =
      summary?.adminUsers !== undefined && summary?.supportUsers !== undefined && summary?.shipperUsers !== undefined
        ? summary.adminUsers + summary.supportUsers + summary.shipperUsers
        : (summary?.adminSupportUsers ?? 0)
    const customers = summary?.customers ?? 0
    const totalUsers = summary?.totalUsers ?? 0

    return [
      { label: 'Total Users', value: totalUsers, tone: 'from-[#6f62cf] to-[#8a7bf2]' },
      { label: 'Active Accounts', value: active, tone: 'from-[#2fb67a] to-[#5dd7a0]' },
      { label: 'Staff (Admin/Support/Shipper)', value: staffCount, tone: 'from-[#f08c44] to-[#f7b36d]' },
      { label: 'Customers', value: customers, tone: 'from-[#2f86d6] to-[#65b4ff]' }
    ]
  }, [summary])

  const totalItems = pagination?.totalItems ?? 0
  const safePage = pagination?.page ?? currentPage
  const paginatedUsers = users

  const activeFiltersCount = [roleFilter !== 'all', statusFilter !== 'all', Boolean(search.trim())].filter(
    Boolean
  ).length

  const openCreateModal = () => {
    setActionMode('create')
    setSelectedUser(null)
    setFormState(defaultFormState)
  }

  const openEditModal = (user: User) => {
    setActionMode('edit')
    setSelectedUser(user)
    setFormState({
      username: user.username,
      email: user.email,
      phone: user.phone || '',
      avatar: user.avatar || '',
      role: user.role,
      status: user.status,
      password: '',
      confirmPassword: ''
    })
  }

  const openDetailModal = (user: User) => {
    setSelectedUser(user)
    setActionMode(null)
  }

  const closeOverlay = () => {
    setActionMode(null)
    setSelectedUser(null)
    setDeleteTarget(null)
    setFormState(defaultFormState)
  }

  const handleFormChange =
    (field: keyof UserFormState) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setFormState((prev) => ({ ...prev, [field]: event.target.value }))
    }

  const handleSubmit = () => {
    if (isUploadingAvatar) {
      toast.error('Ảnh đang upload, vui lòng đợi hoàn tất')
      return
    }

    if (!formState.username.trim() || !formState.email.trim()) {
      return
    }

    if (actionMode === 'create') {
      if (!formState.password.trim() || !formState.confirmPassword.trim()) {
        toast.error('Vui lòng nhập mật khẩu và xác nhận mật khẩu')
        return
      }

      if (formState.password !== formState.confirmPassword) {
        toast.error('Mật khẩu xác nhận không khớp')
        return
      }

      if (!validateStrongPassword(formState.password)) {
        return
      }

      createMutation.mutate({
        username: formState.username.trim(),
        email: formState.email.trim(),
        password: formState.password,
        phone: formState.phone.trim() || null,
        avatar: formState.avatar.trim() || null,
        role: formState.role,
        status: formState.status
      })
      return
    }

    if (actionMode === 'edit' && selectedUser) {
      if (formState.password.trim() || formState.confirmPassword.trim()) {
        if (!formState.password.trim() || !formState.confirmPassword.trim()) {
          toast.error('Vui lòng nhập đầy đủ mật khẩu mới và xác nhận')
          return
        }

        if (formState.password !== formState.confirmPassword) {
          toast.error('Mật khẩu xác nhận không khớp')
          return
        }

        if (!validateStrongPassword(formState.password)) {
          return
        }
      }

      updateMutation.mutate({
        id: selectedUser.id || selectedUser._id || '',
        payload: {
          username: formState.username.trim(),
          email: formState.email.trim(),
          phone: formState.phone.trim() || null,
          avatar: formState.avatar.trim() || null,
          role: formState.role,
          status: formState.status,
          ...(formState.password.trim() ? { password: formState.password } : {})
        }
      })
    }
  }

  const handleAvatarFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setIsUploadingAvatar(true)
      const avatarUrl = await uploadImageToCloudinary(file)
      setFormState((prev) => ({ ...prev, avatar: avatarUrl }))
      toast.success('Upload avatar thành công')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload avatar thất bại')
    } finally {
      setIsUploadingAvatar(false)
      event.target.value = ''
    }
  }

  const handleDelete = () => {
    if (!deleteTarget) return

    deleteMutation.mutate(deleteTarget.id || deleteTarget._id || '')
  }

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'))
      return
    }

    setSortKey(key)
    setSortDirection(key === 'createdAt' ? 'desc' : 'asc')
  }

  return (
    <section className='space-y-5 pb-4'>
      <div className='flex flex-wrap items-end justify-between gap-3'>
        <div>
          <p className='text-sm font-semibold uppercase tracking-[0.24em] text-[#8a84ad]'>User Management</p>
          <h1 className='mt-2 text-3xl font-black tracking-tight text-[#201f47]'>All User</h1>
          <p className='mt-2 max-w-2xl text-sm leading-6 text-[#6d6a8a]'>
            Quản lý toàn bộ tài khoản từ schema backend b2c-BE, gồm xem, thêm, sửa, xoá và kiểm soát trạng thái.
          </p>
        </div>

        <div className='flex flex-wrap gap-3'>
          <Button
            type='button'
            onClick={openCreateModal}
            className='inline-flex h-11 items-center gap-2 rounded-full bg-[#6f62cf] px-5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(111,98,207,0.28)] transition hover:bg-[#5f52bf]'
          >
            <Plus className='h-4 w-4' />
          </Button>
        </div>
      </div>

      <div className='grid gap-4 xl:grid-cols-4'>
        {stats.map((item) => (
          <article
            key={item.label}
            className='overflow-hidden rounded-3xl border border-[#eceaf8] bg-white p-5 shadow-[0_12px_40px_rgba(28,24,70,0.06)]'
          >
            <div className={`mb-4 h-1.5 rounded-full bg-gradient-to-r ${item.tone}`} />
            <p className='text-sm font-semibold text-[#8c88ac]'>{item.label}</p>
            <p className='mt-3 text-4xl font-black text-[#212047]'>{item.value}</p>
          </article>
        ))}
      </div>

      <div className='rounded-[30px] border border-[#eceaf8] bg-white p-5 shadow-[0_18px_50px_rgba(27,23,64,0.08)]'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <h2 className='text-xl font-bold text-[#212047]'>User List</h2>
            <p className='mt-1 text-sm text-[#7a7697]'>
              {totalItems} user(s) found
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
                placeholder='Search user...'
                className='h-11 w-64 rounded-full border border-[#e5e1f3] bg-[#fbfaff] pr-4 pl-10 text-sm text-[#2d2950] outline-none transition focus:border-[#7a6ae0] focus:ring-2 focus:ring-[#b7abe6]/35'
              />
            </div>

            <select
              value={roleFilter}
              onChange={(event) => {
                setRoleFilter(event.target.value as 'all' | UserRole)
                setCurrentPage(1)
              }}
              className='h-11 rounded-full border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm text-[#2d2950] outline-none'
            >
              <option value='all'>All roles</option>
              {USER_ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {roleLabel(role)}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as 'all' | UserStatus)
                setCurrentPage(1)
              }}
              className='h-11 rounded-full border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm text-[#2d2950] outline-none'
            >
              <option value='all'>All status</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
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
                  <th className='px-4 py-4'>User</th>
                  <th className='cursor-pointer px-4 py-4' onClick={() => toggleSort('email')}>
                    Email
                  </th>
                  <th className='cursor-pointer px-4 py-4' onClick={() => toggleSort('role')}>
                    Role
                  </th>
                  <th className='cursor-pointer px-4 py-4' onClick={() => toggleSort('status')}>
                    Status
                  </th>
                  <th className='cursor-pointer px-4 py-4' onClick={() => toggleSort('createdAt')}>
                    Created
                  </th>
                  <th className='px-4 py-4 text-right'>Actions</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-[#f0edf8] bg-white'>
                {usersQuery.isLoading && !usersQuery.data ? (
                  <tr>
                    <td colSpan={6} className='px-4 py-16 text-center text-sm text-[#7a7697]'>
                      Loading users...
                    </td>
                  </tr>
                ) : paginatedUsers.length > 0 ? (
                  paginatedUsers.map((user) => (
                    <tr key={user._id || user.id || user.email} className='transition hover:bg-[#fbfaff]'>
                      <td className='px-4 py-4'>
                        <div className='flex items-center gap-3'>
                          {user.avatar ? (
                            <img
                              src={user.avatar}
                              alt={user.username}
                              className='h-11 w-11 rounded-full object-cover ring-2 ring-[#eceaf8]'
                            />
                          ) : (
                            <div className='flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#f6b26b] to-[#6f62cf] text-sm font-black text-white'>
                              {getInitials(user.username) || <UserCircle2 className='h-5 w-5' />}
                            </div>
                          )}
                          <div>
                            <p className='font-semibold text-[#25224a]'>{user.username}</p>
                            <p className='text-xs text-[#8d88ab]'>{user.phone || 'No phone'}</p>
                          </div>
                        </div>
                      </td>
                      <td className='px-4 py-4 text-sm text-[#5f5a7a]'>{user.email}</td>
                      <td className='px-4 py-4'>
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${roleTone(user.role)}`}
                        >
                          {roleLabel(user.role)}
                        </span>
                      </td>
                      <td className='px-4 py-4'>
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusTone(user.status)}`}
                        >
                          {user.status}
                        </span>
                      </td>
                      <td className='px-4 py-4 text-sm text-[#5f5a7a]'>{formatDate(user.createdAt)}</td>
                      <td className='px-4 py-4'>
                        <CrudActionButtons
                          onView={() => openDetailModal(user)}
                          onEdit={() => openEditModal(user)}
                          onDelete={() => setDeleteTarget(user)}
                        />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className='px-4 py-12 text-center'>
                      <div className='mx-auto max-w-sm space-y-3'>
                        <div className='mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f3f0ff] text-[#6f62cf]'>
                          <Mail className='h-6 w-6' />
                        </div>
                        <p className='text-lg font-semibold text-[#25224a]'>No users match your filters</p>
                        <p className='text-sm text-[#7d7899]'>
                          Clear search, role, or status filters to see the full list again.
                        </p>
                        <Button
                          type='button'
                          onClick={() => {
                            setSearch('')
                            setRoleFilter('all')
                            setStatusFilter('all')
                            setCurrentPage(1)
                          }}
                          className='inline-flex h-10 items-center gap-2 rounded-full bg-[#6f62cf] px-4 text-sm font-semibold text-white'
                        >
                          Reset filters
                        </Button>
                      </div>
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
              onPageSizeChange={(nextSize) => {
                setPageSize(nextSize)
                setCurrentPage(1)
              }}
              pageSizeOptions={[5, 8, 10, 20]}
              itemLabel='users'
            />
          </div>
        </div>
      </div>

      {(actionMode || selectedUser || deleteTarget) && (
        <div
          className='fixed inset-0 z-40 flex items-center justify-center bg-[#191530]/55 px-4 py-8 backdrop-blur-sm'
          onClick={closeOverlay}
        >
          {actionMode && (
            <div
              className='relative w-full max-w-3xl rounded-[28px] bg-white p-6 shadow-[0_28px_80px_rgba(18,16,44,0.35)]'
              onClick={(event) => event.stopPropagation()}
            >
              <div className='flex items-start justify-between gap-4'>
                <div>
                  <p className='text-xs font-semibold uppercase tracking-[0.22em] text-[#8a84ad]'>
                    {actionMode === 'create' ? 'Create User' : 'Edit User'}
                  </p>
                  <h3 className='mt-2 text-2xl font-bold text-[#212047]'>
                    {actionMode === 'create' ? 'Add new account' : 'Update account details'}
                  </h3>
                </div>
                <button
                  type='button'
                  onClick={closeOverlay}
                  className='rounded-full border border-[#e6e1f4] px-3 py-2 text-sm font-semibold text-[#5b567a] transition hover:bg-[#faf9ff]'
                >
                  Close
                </button>
              </div>

              <div className='mt-6 grid gap-4 md:grid-cols-2'>
                <label className='space-y-2'>
                  <span className='text-xs font-semibold uppercase tracking-[0.18em] text-[#8a84ad]'>Username</span>
                  <input
                    value={formState.username}
                    onChange={handleFormChange('username')}
                    className='h-11 w-full rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm text-[#25224a] outline-none focus:border-[#7a6ae0]'
                    placeholder='Enter username'
                  />
                </label>

                <label className='space-y-2'>
                  <span className='text-xs font-semibold uppercase tracking-[0.18em] text-[#8a84ad]'>Email</span>
                  <input
                    value={formState.email}
                    onChange={handleFormChange('email')}
                    className='h-11 w-full rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm text-[#25224a] outline-none focus:border-[#7a6ae0]'
                    placeholder='Enter email'
                    type='email'
                  />
                </label>

                <label className='space-y-2'>
                  <span className='text-xs font-semibold uppercase tracking-[0.18em] text-[#8a84ad]'>Phone</span>
                  <input
                    value={formState.phone}
                    onChange={handleFormChange('phone')}
                    className='h-11 w-full rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm text-[#25224a] outline-none focus:border-[#7a6ae0]'
                    placeholder='Enter phone'
                  />
                </label>

                <label className='space-y-2'>
                  <span className='text-xs font-semibold uppercase tracking-[0.18em] text-[#8a84ad]'>Avatar</span>
                  <div className='flex items-center gap-3'>
                    <label className='inline-flex h-11 cursor-pointer items-center rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm font-medium text-[#25224a] transition hover:bg-white'>
                      {isUploadingAvatar ? 'Đang upload...' : 'Chọn ảnh'}
                      <input
                        type='file'
                        accept='image/*'
                        className='hidden'
                        onChange={handleAvatarFileChange}
                        disabled={isUploadingAvatar}
                      />
                    </label>
                    {formState.avatar && <span className='text-xs text-[#2f86d6]'>Đã có ảnh avatar mới</span>}
                  </div>
                </label>

                <label className='space-y-2'>
                  <span className='text-xs font-semibold uppercase tracking-[0.18em] text-[#8a84ad]'>Role</span>
                  <select
                    value={formState.role}
                    onChange={handleFormChange('role')}
                    className='h-11 w-full rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm text-[#25224a] outline-none focus:border-[#7a6ae0]'
                  >
                    {USER_ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {roleLabel(role)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className='space-y-2'>
                  <span className='text-xs font-semibold uppercase tracking-[0.18em] text-[#8a84ad]'>Status</span>
                  <select
                    value={formState.status}
                    onChange={handleFormChange('status')}
                    className='h-11 w-full rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm text-[#25224a] outline-none focus:border-[#7a6ae0]'
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>

                {actionMode === 'create' && (
                  <>
                    <label className='space-y-2'>
                      <span className='text-xs font-semibold uppercase tracking-[0.18em] text-[#8a84ad]'>Password</span>
                      <input
                        value={formState.password}
                        onChange={handleFormChange('password')}
                        type='password'
                        className='h-11 w-full rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm text-[#25224a] outline-none focus:border-[#7a6ae0]'
                        placeholder='Enter password'
                      />
                    </label>

                    <label className='space-y-2'>
                      <span className='text-xs font-semibold uppercase tracking-[0.18em] text-[#8a84ad]'>
                        Confirm Password
                      </span>
                      <input
                        value={formState.confirmPassword}
                        onChange={handleFormChange('confirmPassword')}
                        type='password'
                        className='h-11 w-full rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm text-[#25224a] outline-none focus:border-[#7a6ae0]'
                        placeholder='Confirm password'
                      />
                    </label>
                  </>
                )}

                {actionMode === 'edit' && (
                  <div className='rounded-2xl border border-dashed border-[#e5e1f3] bg-[#fbfaff] p-4 md:col-span-2'>
                    <p className='text-sm font-semibold text-[#4b466e]'>Password update</p>
                    <p className='mt-1 text-xs text-[#7a7697]'>
                      Để trống nếu không đổi mật khẩu. Nếu nhập, cần nhập đủ 2 trường và hệ thống sẽ hash lại mật khẩu.
                    </p>
                    <div className='mt-4 grid gap-4 md:grid-cols-2'>
                      <label className='space-y-2'>
                        <span className='text-xs font-semibold uppercase tracking-[0.18em] text-[#8a84ad]'>
                          New Password
                        </span>
                        <input
                          value={formState.password}
                          onChange={handleFormChange('password')}
                          type='password'
                          className='h-11 w-full rounded-2xl border border-[#e5e1f3] bg-white px-4 text-sm text-[#25224a] outline-none focus:border-[#7a6ae0]'
                          placeholder='Optional new password'
                        />
                      </label>

                      <label className='space-y-2'>
                        <span className='text-xs font-semibold uppercase tracking-[0.18em] text-[#8a84ad]'>
                          Confirm New Password
                        </span>
                        <input
                          value={formState.confirmPassword}
                          onChange={handleFormChange('confirmPassword')}
                          type='password'
                          className='h-11 w-full rounded-2xl border border-[#e5e1f3] bg-white px-4 text-sm text-[#25224a] outline-none focus:border-[#7a6ae0]'
                          placeholder='Confirm new password'
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>

              <div className='mt-6 flex flex-wrap items-center gap-3'>
                <Button
                  type='button'
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending || isUploadingAvatar}
                  className='inline-flex h-11 items-center gap-2 rounded-full bg-[#6f62cf] px-5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(111,98,207,0.28)] transition hover:bg-[#5f52bf]'
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Saving...'
                    : isUploadingAvatar
                      ? 'Uploading avatar...'
                      : actionMode === 'create'
                        ? 'Create user'
                        : 'Save'}
                </Button>
                <button
                  type='button'
                  onClick={closeOverlay}
                  disabled={createMutation.isPending || updateMutation.isPending || isUploadingAvatar}
                  className='inline-flex h-11 items-center rounded-full border border-[#e0dbef] px-5 text-sm font-semibold text-[#544f72] transition hover:bg-[#faf9ff]'
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {selectedUser && !actionMode && !deleteTarget && (
            <div
              className='relative w-full max-w-2xl rounded-[28px] bg-white p-6 shadow-[0_28px_80px_rgba(18,16,44,0.35)]'
              onClick={(event) => event.stopPropagation()}
            >
              <div className='flex items-start justify-between gap-4'>
                <div className='flex items-center gap-4'>
                  {selectedUser.avatar ? (
                    <img
                      src={selectedUser.avatar}
                      alt={selectedUser.username}
                      className='h-16 w-16 rounded-full object-cover ring-2 ring-[#eceaf8]'
                    />
                  ) : (
                    <div className='flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#f6b26b] to-[#6f62cf] text-xl font-black text-white'>
                      {getInitials(selectedUser.username) || <UserRound className='h-7 w-7' />}
                    </div>
                  )}
                  <div>
                    <p className='text-xs font-semibold uppercase tracking-[0.22em] text-[#8a84ad]'>User Detail</p>
                    <h3 className='mt-2 text-2xl font-bold text-[#212047]'>{selectedUser.username}</h3>
                    <p className='mt-1 text-sm text-[#7a7697]'>{selectedUser.email}</p>
                  </div>
                </div>
                <button
                  type='button'
                  onClick={closeOverlay}
                  className='rounded-full border border-[#e6e1f4] px-3 py-2 text-sm font-semibold text-[#5b567a] transition hover:bg-[#faf9ff]'
                >
                  Close
                </button>
              </div>

              <div className='mt-6 grid gap-4 sm:grid-cols-2'>
                <div className='rounded-2xl border border-[#eceaf8] bg-[#fbfaff] p-4'>
                  <p className='text-xs uppercase tracking-[0.18em] text-[#8a84ad]'>Phone</p>
                  <p className='mt-2 text-sm font-semibold text-[#25224a]'>{selectedUser.phone || 'Not set'}</p>
                </div>
                <div className='rounded-2xl border border-[#eceaf8] bg-[#fbfaff] p-4'>
                  <p className='text-xs uppercase tracking-[0.18em] text-[#8a84ad]'>Role</p>
                  <p className='mt-2 text-sm font-semibold text-[#25224a]'>{roleLabel(selectedUser.role)}</p>
                </div>
                <div className='rounded-2xl border border-[#eceaf8] bg-[#fbfaff] p-4'>
                  <p className='text-xs uppercase tracking-[0.18em] text-[#8a84ad]'>Status</p>
                  <p className='mt-2 text-sm font-semibold text-[#25224a]'>{selectedUser.status}</p>
                </div>
                <div className='rounded-2xl border border-[#eceaf8] bg-[#fbfaff] p-4'>
                  <p className='text-xs uppercase tracking-[0.18em] text-[#8a84ad]'>Updated</p>
                  <p className='mt-2 text-sm font-semibold text-[#25224a]'>{formatDateTime(selectedUser.updatedAt)}</p>
                </div>
              </div>

              <div className='mt-6 flex flex-wrap gap-3'>
                <CrudActionButtons
                  buttonSize='md'
                  onEdit={() => openEditModal(selectedUser)}
                  onDelete={() => setDeleteTarget(selectedUser)}
                  className='justify-start'
                />
              </div>
            </div>
          )}

          {deleteTarget && !actionMode && !selectedUser && (
            <div
              className='relative w-full max-w-xl rounded-[28px] bg-white p-6 shadow-[0_28px_80px_rgba(18,16,44,0.35)]'
              onClick={(event) => event.stopPropagation()}
            >
              <div className='flex items-start gap-4'>
                <div className='flex h-14 w-14 items-center justify-center rounded-full bg-[#fff2f4] text-[#c84455]'>
                  <Trash2 className='h-6 w-6' />
                </div>
                <div>
                  <p className='text-xs font-semibold uppercase tracking-[0.22em] text-[#8a84ad]'>
                    Delete confirmation
                  </p>
                  <h3 className='mt-2 text-2xl font-bold text-[#212047]'>Remove this user?</h3>
                  <p className='mt-2 text-sm leading-6 text-[#6d6a8a]'>
                    Bạn đang xoá tài khoản <span className='font-semibold text-[#25224a]'>{deleteTarget.username}</span>
                    . Hành động này chỉ thay đổi dữ liệu trên UI hiện tại.
                  </p>
                </div>
              </div>

              <div className='mt-6 flex flex-wrap gap-3'>
                <Button
                  type='button'
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className='inline-flex h-11 items-center gap-2 rounded-full bg-[#c84455] px-5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(200,68,85,0.22)] transition hover:bg-[#b93b4b]'
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                </Button>
                <button
                  type='button'
                  onClick={closeOverlay}
                  disabled={deleteMutation.isPending}
                  className='inline-flex h-11 items-center rounded-full border border-[#e0dbef] px-5 text-sm font-semibold text-[#544f72] transition hover:bg-[#faf9ff]'
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
