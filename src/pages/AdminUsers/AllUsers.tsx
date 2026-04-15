import { useMemo, useState, type ChangeEvent } from 'react'
import { Mail, Plus, ShieldCheck, Trash2, UserCircle2, UserRound, Search } from 'lucide-react'
import Button from '../../components/Button'
import Pagination from '../../components/Pagination'
import CrudActionButtons from '../../components/CrudActionButtons'
import type { User, UserRole } from '../../types/user.type'
import { ROLE_LABELS, USER_ROLE_OPTIONS } from '../../config/role.config'
import { formatDate, formatDateTime, getInitials, normalize, roleTone, statusTone } from '../../utils/common'

type UserFormState = Omit<User, 'id' | '_id' | 'phone' | 'avatar' | 'createdAt' | 'updatedAt'> & {
  phone: string
  avatar: string
}

type UserAction = 'create' | 'edit' | null

type SortKey = keyof Pick<User, 'createdAt' | 'username' | 'email' | 'role' | 'status'>

const statusOptions: Array<User['status']> = ['active', 'inactive']

const seedUsers: User[] = [
  {
    id: 'usr_001',
    username: 'Nguyen Minh Anh',
    email: 'minhanh@b2c.com',
    phone: '0912345678',
    avatar: '',
    role: 'admin',
    status: 'active',
    createdAt: '2026-03-12T08:12:00.000Z',
    updatedAt: '2026-04-14T09:30:00.000Z'
  },
  {
    id: 'usr_002',
    username: 'Tran Quynh Hoa',
    email: 'quynhhoa@b2c.com',
    phone: '0987654321',
    avatar: '',
    role: 'support',
    status: 'active',
    createdAt: '2026-02-25T06:30:00.000Z',
    updatedAt: '2026-04-13T10:10:00.000Z'
  },
  {
    id: 'usr_003',
    username: 'Le Bao Trung',
    email: 'baotrung@b2c.com',
    phone: '0901122334',
    avatar: '',
    role: 'customer',
    status: 'active',
    createdAt: '2026-03-20T03:45:00.000Z',
    updatedAt: '2026-04-12T14:20:00.000Z'
  },
  {
    id: 'usr_004',
    username: 'Pham Duy Khang',
    email: 'duykhang@b2c.com',
    phone: '0933456789',
    avatar: '',
    role: 'shipper',
    status: 'inactive',
    createdAt: '2026-01-18T11:10:00.000Z',
    updatedAt: '2026-04-10T16:05:00.000Z'
  },
  {
    id: 'usr_005',
    username: 'Vo Thanh Tuan',
    email: 'thanhtuan@b2c.com',
    phone: '0966123456',
    avatar: '',
    role: 'customer',
    status: 'active',
    createdAt: '2026-03-02T02:22:00.000Z',
    updatedAt: '2026-04-11T07:15:00.000Z'
  },
  {
    id: 'usr_006',
    username: 'Do Gia Huy',
    email: 'giahuy@b2c.com',
    phone: '0977888999',
    avatar: '',
    role: 'support',
    status: 'inactive',
    createdAt: '2026-02-14T13:00:00.000Z',
    updatedAt: '2026-04-09T18:25:00.000Z'
  },
  {
    id: 'usr_007',
    username: 'Bui Thu Ha',
    email: 'thuha@b2c.com',
    phone: '0922113344',
    avatar: '',
    role: 'customer',
    status: 'active',
    createdAt: '2026-03-28T08:55:00.000Z',
    updatedAt: '2026-04-13T09:35:00.000Z'
  },
  {
    id: 'usr_008',
    username: 'Ngo Hoang Long',
    email: 'hoanglong@b2c.com',
    phone: '0944556677',
    avatar: '',
    role: 'shipper',
    status: 'active',
    createdAt: '2026-01-29T05:15:00.000Z',
    updatedAt: '2026-04-08T11:45:00.000Z'
  }
]

const defaultFormState: UserFormState = {
  username: '',
  email: '',
  phone: '',
  avatar: '',
  role: 'customer',
  status: 'active'
}

function roleLabel(role: UserRole) {
  return ROLE_LABELS[role]
}

export default function AllUsers() {
  const [users, setUsers] = useState<User[]>(seedUsers)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all')
  const [sortKey, setSortKey] = useState<SortKey>('createdAt')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(8)
  const [actionMode, setActionMode] = useState<UserAction>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [formState, setFormState] = useState<UserFormState>(defaultFormState)

  const stats = useMemo(() => {
    const active = users.filter((user) => user.status === 'active').length
    const admins = users.filter((user) => user.role === 'admin').length
    const support = users.filter((user) => user.role === 'support').length
    const customers = users.filter((user) => user.role === 'customer').length

    return [
      { label: 'Total Users', value: users.length, tone: 'from-[#6f62cf] to-[#8a7bf2]' },
      { label: 'Active Accounts', value: active, tone: 'from-[#2fb67a] to-[#5dd7a0]' },
      { label: 'Admin & Support', value: admins + support, tone: 'from-[#f08c44] to-[#f7b36d]' },
      { label: 'Customers', value: customers, tone: 'from-[#2f86d6] to-[#65b4ff]' }
    ]
  }, [users])

  const filteredUsers = useMemo(() => {
    const filtered = users.filter((user) => {
      const keyword = normalize(search)
      const matchesKeyword =
        !keyword ||
        [user.username, user.email, user.phone, user.role, user.status].some((field) =>
          normalize(String(field || '')).includes(keyword)
        )

      const matchesRole = roleFilter === 'all' || user.role === roleFilter
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter

      return matchesKeyword && matchesRole && matchesStatus
    })

    const sorted = [...filtered].sort((left, right) => {
      const direction = sortDirection === 'asc' ? 1 : -1

      if (sortKey === 'createdAt') {
        return (new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()) * direction
      }

      const leftValue = String(left[sortKey] ?? '')
      const rightValue = String(right[sortKey] ?? '')
      return leftValue.localeCompare(rightValue) * direction
    })

    return sorted
  }, [roleFilter, statusFilter, search, sortDirection, sortKey, users])

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedUsers = filteredUsers.slice((safePage - 1) * pageSize, safePage * pageSize)

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
      status: user.status
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
    if (!formState.username.trim() || !formState.email.trim()) {
      return
    }

    if (actionMode === 'create') {
      const newUser: User = {
        id: `usr_${String(users.length + 1).padStart(3, '0')}`,
        username: formState.username.trim(),
        email: formState.email.trim(),
        phone: formState.phone.trim() || null,
        avatar: formState.avatar.trim() || '',
        role: formState.role,
        status: formState.status,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      setUsers((prev) => [newUser, ...prev])
      setCurrentPage(1)
      closeOverlay()
      return
    }

    if (actionMode === 'edit' && selectedUser) {
      const updatedUser: User = {
        ...selectedUser,
        username: formState.username.trim(),
        email: formState.email.trim(),
        phone: formState.phone.trim() || null,
        avatar: formState.avatar.trim() || '',
        role: formState.role,
        status: formState.status,
        updatedAt: new Date().toISOString()
      }

      setUsers((prev) => prev.map((user) => (user.id === selectedUser.id ? updatedUser : user)))
      closeOverlay()
    }
  }

  const handleDelete = () => {
    if (!deleteTarget) return

    setUsers((prev) => prev.filter((user) => user.id !== deleteTarget.id))
    if (safePage > 1 && paginatedUsers.length === 1) {
      setCurrentPage((page) => Math.max(1, page - 1))
    }
    closeOverlay()
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
            Add User
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
              {filteredUsers.length} user(s) found
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
                setStatusFilter(event.target.value)
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
                {paginatedUsers.length > 0 ? (
                  paginatedUsers.map((user) => (
                    <tr key={user.id} className='transition hover:bg-[#fbfaff]'>
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
              totalItems={filteredUsers.length}
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
                  <span className='text-xs font-semibold uppercase tracking-[0.18em] text-[#8a84ad]'>Avatar URL</span>
                  <input
                    value={formState.avatar}
                    onChange={handleFormChange('avatar')}
                    className='h-11 w-full rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm text-[#25224a] outline-none focus:border-[#7a6ae0]'
                    placeholder='https://...'
                  />
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
              </div>

              <div className='mt-6 flex flex-wrap items-center gap-3'>
                <Button
                  type='button'
                  onClick={handleSubmit}
                  className='inline-flex h-11 items-center gap-2 rounded-full bg-[#6f62cf] px-5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(111,98,207,0.28)] transition hover:bg-[#5f52bf]'
                >
                  <ShieldCheck className='h-4 w-4' />
                  {actionMode === 'create' ? 'Create user' : 'Save changes'}
                </Button>
                <button
                  type='button'
                  onClick={closeOverlay}
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
                  className='inline-flex h-11 items-center gap-2 rounded-full bg-[#c84455] px-5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(200,68,85,0.22)] transition hover:bg-[#b93b4b]'
                >
                  <Trash2 className='h-4 w-4' />
                  Yes, delete
                </Button>
                <button
                  type='button'
                  onClick={closeOverlay}
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
