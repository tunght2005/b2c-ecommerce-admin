import { Bell, Search, ChevronDown } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import Popover from '../Popover'
import authApi from '../../apis/auth.api'
import path from '../../constants/path'
import { useAuth } from '../../contexts/app.context'

export default function Header() {
  const navigate = useNavigate()
  const { logout, email, profile, role } = useAuth()

  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      toast.success('Đăng xuất thành công')
    },
    onError: () => {
      toast.error('Không thể gọi API logout, hệ thống sẽ đăng xuất cục bộ')
    },
    onSettled: () => {
      logout()
      navigate(path.login, { replace: true })
    }
  })

  const displayName = profile?.username || email || 'User'
  const avatarUrl = profile?.avatar || ''
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  return (
    <header className='mb-5 flex flex-wrap items-center gap-3 border-b border-[#eceaf8] pb-4'>
      <div className='relative min-w-0 flex-1 max-w-110'>
        <Search className='pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[#8d87c0]' />
        <input
          type='text'
          placeholder='Search'
          className='h-11 w-full rounded-full border border-[#ebe9fa] bg-[#f5f4ff] pr-10 pl-11 text-sm text-[#5f5b7f] outline-none transition focus:border-[#7b68ee] focus:ring-2 focus:ring-[#b8aef8]/45'
        />
      </div>

      <div className='ml-auto flex items-center gap-3'>
        <button
          type='button'
          className='flex h-10 w-10 items-center justify-center rounded-full bg-[#f5f4ff] text-[#6f62cf] transition hover:bg-[#ece9ff]'
          aria-label='Notifications'
        >
          <Bell className='h-4 w-4' />
        </button>

        <Popover
          placement='bottom-end'
          renderPopover={
            <div className='w-56 rounded-2xl border border-[#eceaf8] bg-white p-2 shadow-[0_18px_40px_rgba(29,25,71,0.14)]'>
              <button
                type='button'
                onClick={() => navigate(path.myProfile)}
                className='w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-[#5f5b7f] hover:bg-[#f5f4ff]'
              >
                My Profile
              </button>
              <button
                type='button'
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className='w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-[#5f5b7f] hover:bg-[#f5f4ff]'
              >
                {logoutMutation.isPending ? 'Logging out...' : 'Logout'}
              </button>
            </div>
          }
        >
          {({ open }: { open: boolean }) => (
            <button
              type='button'
              className='flex items-center gap-2 rounded-full border border-[#ebe9fa] bg-white px-3 py-1.5 text-left transition hover:border-[#d9d5f4]'
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt='Avatar' className='h-8 w-8 rounded-full object-cover' />
              ) : (
                <div className='flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-[#ffb1a1] to-[#f47458] text-xs font-semibold text-white'>
                  {initials || 'US'}
                </div>
              )}
              <span className='hidden text-sm font-medium text-[#5f5b7f] sm:inline'>
                {displayName}
                {role ? ` (${role})` : ''}
              </span>
              <ChevronDown className={`h-4 w-4 text-[#8d87c0] transition ${open ? 'rotate-180' : ''}`} />
            </button>
          )}
        </Popover>
      </div>
    </header>
  )
}
