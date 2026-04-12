import { Mail, ShieldCheck, User, IdCard } from 'lucide-react'
import { useAuth } from '../../contexts/app.context'

export default function MyProfile() {
  const { email, role, userId, profile } = useAuth()

  const username = profile?.username || 'Not set'
  const phone = profile?.phone || 'Not set'
  const status = profile?.status || 'active'

  return (
    <section className='space-y-5'>
      <div>
        <h1 className='text-2xl font-bold text-[#2f2b4f]'>My Profile</h1>
        <p className='mt-1 text-sm text-[#7e7a9f]'>Thông tin tài khoản đang đăng nhập</p>
      </div>

      <div className='grid gap-4 sm:grid-cols-2'>
        <div className='rounded-2xl border border-[#eceaf8] bg-white p-4 shadow-[0_10px_30px_rgba(29,25,71,0.06)]'>
          <div className='mb-2 flex items-center gap-2 text-[#6f62cf]'>
            <User className='h-4 w-4' />
            <span className='text-xs font-semibold uppercase tracking-wide'>Username</span>
          </div>
          <p className='text-sm font-medium text-[#2f2b4f]'>{username}</p>
        </div>

        <div className='rounded-2xl border border-[#eceaf8] bg-white p-4 shadow-[0_10px_30px_rgba(29,25,71,0.06)]'>
          <div className='mb-2 flex items-center gap-2 text-[#6f62cf]'>
            <Mail className='h-4 w-4' />
            <span className='text-xs font-semibold uppercase tracking-wide'>Email</span>
          </div>
          <p className='text-sm font-medium text-[#2f2b4f]'>{email || 'Not set'}</p>
        </div>

        <div className='rounded-2xl border border-[#eceaf8] bg-white p-4 shadow-[0_10px_30px_rgba(29,25,71,0.06)]'>
          <div className='mb-2 flex items-center gap-2 text-[#6f62cf]'>
            <ShieldCheck className='h-4 w-4' />
            <span className='text-xs font-semibold uppercase tracking-wide'>Role</span>
          </div>
          <p className='text-sm font-medium text-[#2f2b4f]'>{role || 'Not set'}</p>
        </div>

        <div className='rounded-2xl border border-[#eceaf8] bg-white p-4 shadow-[0_10px_30px_rgba(29,25,71,0.06)]'>
          <div className='mb-2 flex items-center gap-2 text-[#6f62cf]'>
            <IdCard className='h-4 w-4' />
            <span className='text-xs font-semibold uppercase tracking-wide'>User ID</span>
          </div>
          <p className='break-all text-sm font-medium text-[#2f2b4f]'>{userId || 'Not set'}</p>
        </div>
      </div>

      <div className='rounded-2xl border border-[#eceaf8] bg-white p-4 shadow-[0_10px_30px_rgba(29,25,71,0.06)]'>
        <h2 className='mb-3 text-sm font-semibold uppercase tracking-wide text-[#6f62cf]'>Additional Info</h2>
        <div className='grid gap-3 sm:grid-cols-2'>
          <div>
            <p className='text-xs text-[#7e7a9f]'>Phone</p>
            <p className='text-sm font-medium text-[#2f2b4f]'>{phone}</p>
          </div>
          <div>
            <p className='text-xs text-[#7e7a9f]'>Status</p>
            <p className='text-sm font-medium text-[#2f2b4f]'>{status}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
