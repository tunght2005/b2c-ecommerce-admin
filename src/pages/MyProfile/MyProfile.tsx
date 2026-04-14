import { Mail, ShieldCheck, User, IdCard, Phone, Save, Eye, EyeOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '../../contexts/app.context'
import userApi from '../../apis/user.api'
import type { User as UserType } from '../../types/user.type'
import { uploadImageToCloudinary } from '../../utils/upload'
import { ChangePasswordSchema, type ChangePasswordInput } from '../../schemas/user.schema'

type ProfileForm = {
  username: string
  email: string
  phone: string
}

const normalizeUserProfile = (user: UserType): UserType => ({
  ...user,
  id: user.id || user._id || '',
  createdAt: user.createdAt || new Date().toISOString(),
  updatedAt: user.updatedAt || new Date().toISOString()
})

export default function MyProfile() {
  const { email, role, userId, profile, setProfile } = useAuth()
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [pendingAvatarUrl, setPendingAvatarUrl] = useState<string | null>(null)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const { register, handleSubmit, reset } = useForm<ProfileForm>({
    defaultValues: {
      username: profile?.username || '',
      email: profile?.email || email || '',
      phone: profile?.phone || ''
    }
  })

  const profileQuery = useQuery({
    queryKey: ['my-profile'],
    queryFn: async () => {
      const res = await userApi.getProfile()
      return res.data.user
    }
  })

  const updateProfileMutation = useMutation({
    mutationFn: userApi.updateProfile
  })

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPassword,
    formState: { errors: passwordErrors }
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(ChangePasswordSchema)
  })

  const changePasswordMutation = useMutation({
    mutationFn: userApi.changePassword
  })

  useEffect(() => {
    if (profileQuery.data) {
      const normalized = normalizeUserProfile(profileQuery.data)
      setProfile(normalized)
      setPendingAvatarUrl(null)
      reset({
        username: normalized.username || '',
        email: normalized.email || '',
        phone: normalized.phone || ''
      })
    }
  }, [profileQuery.data, reset, setProfile])

  const onSubmit = handleSubmit((data) => {
    updateProfileMutation.mutate(
      {
        username: data.username.trim(),
        email: data.email.trim(),
        phone: data.phone.trim(),
        avatar: pendingAvatarUrl || undefined
      },
      {
        onSuccess: (res) => {
          const normalized = normalizeUserProfile(res.data.user)
          setProfile(normalized)
          setPendingAvatarUrl(null)
          toast.success(res.data.message || 'Cập nhật profile thành công')
        }
      }
    )
  })

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setIsUploadingAvatar(true)
      const avatarUrl = await uploadImageToCloudinary(file)
      setPendingAvatarUrl(avatarUrl)
      toast.success('Ảnh đã sẵn sàng, bấm Lưu thay đổi để cập nhật avatar')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload avatar thất bại')
    } finally {
      setIsUploadingAvatar(false)
      event.target.value = ''
    }
  }

  const onSubmitChangePassword = handleSubmitPassword((data) => {
    changePasswordMutation.mutate(
      {
        oldPassword: data.currentPassword,
        newPassword: data.newPassword
      },
      {
        onSuccess: (res) => {
          toast.success(res.data.message || 'Đổi mật khẩu thành công')
          resetPassword()
        }
      }
    )
  })

  const handleCancelProfileEdits = () => {
    reset({
      username: profile?.username || '',
      email: profile?.email || email || '',
      phone: profile?.phone || ''
    })
    setPendingAvatarUrl(null)
    toast.info('Đã hủy thay đổi profile chưa lưu')
  }

  const handleCancelChangePassword = () => {
    resetPassword()
    setShowCurrentPassword(false)
    setShowNewPassword(false)
    setShowConfirmPassword(false)
    toast.info('Đã hủy nhập đổi mật khẩu')
  }

  const username = profile?.username || 'Not set'
  const phone = profile?.phone || 'Not set'
  const status = profile?.status || 'active'
  const currentAvatar = pendingAvatarUrl || profile?.avatar

  return (
    <section className='space-y-5'>
      <div>
        <h1 className='text-2xl font-bold text-[#2f2b4f]'>My Profile</h1>
        <p className='mt-1 text-sm text-[#7e7a9f]'>Thông tin tài khoản đang đăng nhập</p>
      </div>

      <div className='grid gap-4 sm:grid-cols-2'>
        <div className='rounded-2xl border border-[#eceaf8] bg-white p-4 shadow-[0_10px_30px_rgba(29,25,71,0.06)] sm:col-span-2'>
          <div className='mb-2 flex items-center gap-2 text-[#6f62cf]'>
            <User className='h-4 w-4' />
            <span className='text-xs font-semibold uppercase tracking-wide'>Avatar</span>
          </div>
          <div className='flex items-center gap-4'>
            {currentAvatar ? (
              <img
                src={currentAvatar}
                alt='Avatar'
                className='h-16 w-16 rounded-full object-cover ring-2 ring-[#eceaf8]'
              />
            ) : (
              <div className='flex h-16 w-16 items-center justify-center rounded-full bg-[#f2f0fc] text-[#6f62cf]'>
                <User className='h-7 w-7' />
              </div>
            )}

            <label className='inline-flex h-10 cursor-pointer items-center rounded-lg border border-[#d6d2ec] px-4 text-sm font-medium text-[#2f2b4f] transition hover:bg-[#f7f5ff]'>
              {isUploadingAvatar ? 'Đang upload...' : 'Đổi avatar'}
              <input
                type='file'
                accept='image/*'
                className='hidden'
                onChange={handleAvatarChange}
                disabled={isUploadingAvatar}
              />
            </label>

            {pendingAvatarUrl && <span className='text-xs text-[#c17800]'>Ảnh mới chưa được lưu</span>}
          </div>
        </div>

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

      <form
        onSubmit={onSubmit}
        className='rounded-2xl border border-[#eceaf8] bg-white p-4 shadow-[0_10px_30px_rgba(29,25,71,0.06)]'
      >
        <div className='mb-4 flex items-center justify-between'>
          <h2 className='text-sm font-semibold uppercase tracking-wide text-[#6f62cf]'>Update Profile</h2>
          {profileQuery.isLoading && <span className='text-xs text-[#7e7a9f]'>Đang tải dữ liệu profile...</span>}
        </div>

        <div className='grid gap-4 sm:grid-cols-2'>
          <div>
            <label className='mb-1 block text-xs text-[#7e7a9f]'>Username</label>
            <div className='relative'>
              <User className='pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#9a96be]' />
              <input
                {...register('username')}
                className='h-10 w-full rounded-lg border border-[#e6e2f7] bg-[#fbfaff] pr-3 pl-9 text-sm text-[#2f2b4f] outline-none focus:border-[#6f62cf]'
                placeholder='Nhập username'
              />
            </div>
          </div>

          <div>
            <label className='mb-1 block text-xs text-[#7e7a9f]'>Email</label>
            <div className='relative'>
              <Mail className='pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#9a96be]' />
              <input
                {...register('email')}
                type='email'
                className='h-10 w-full rounded-lg border border-[#e6e2f7] bg-[#fbfaff] pr-3 pl-9 text-sm text-[#2f2b4f] outline-none focus:border-[#6f62cf]'
                placeholder='Nhập email'
              />
            </div>
          </div>

          <div className='sm:col-span-2'>
            <label className='mb-1 block text-xs text-[#7e7a9f]'>Phone</label>
            <div className='relative'>
              <Phone className='pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#9a96be]' />
              <input
                {...register('phone')}
                className='h-10 w-full rounded-lg border border-[#e6e2f7] bg-[#fbfaff] pr-3 pl-9 text-sm text-[#2f2b4f] outline-none focus:border-[#6f62cf]'
                placeholder='Nhập số điện thoại'
              />
            </div>
          </div>
        </div>

        <div className='mt-5 flex items-center gap-3'>
          <button
            type='submit'
            disabled={updateProfileMutation.isPending}
            className='inline-flex h-10 items-center gap-2 rounded-lg bg-[#6f62cf] px-4 text-sm font-semibold text-white transition hover:bg-[#5c4ec8] disabled:cursor-not-allowed disabled:opacity-70'
          >
            <Save className='h-4 w-4' />
            {updateProfileMutation.isPending ? 'Đang cập nhật...' : 'Lưu thay đổi'}
          </button>
          <button
            type='button'
            onClick={handleCancelProfileEdits}
            disabled={updateProfileMutation.isPending || isUploadingAvatar}
            className='inline-flex h-10 items-center rounded-lg border border-[#d5d0ef] px-4 text-sm font-semibold text-[#4b466e] transition hover:bg-[#f7f5ff] disabled:cursor-not-allowed disabled:opacity-70'
          >
            Hủy
          </button>
        </div>
      </form>

      <form
        onSubmit={onSubmitChangePassword}
        className='rounded-2xl border border-[#eceaf8] bg-white p-4 shadow-[0_10px_30px_rgba(29,25,71,0.06)]'
      >
        <div className='mb-4'>
          <h2 className='text-sm font-semibold uppercase tracking-wide text-[#6f62cf]'>Đổi mật khẩu</h2>
        </div>

        <div className='grid gap-4 sm:grid-cols-2'>
          <div className='sm:col-span-2'>
            <label className='mb-1 block text-xs text-[#7e7a9f]'>Mật khẩu hiện tại</label>
            <div className='relative'>
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                {...registerPassword('currentPassword')}
                className='h-10 w-full rounded-lg border border-[#e6e2f7] bg-[#fbfaff] px-3 pr-10 text-sm text-[#2f2b4f] outline-none focus:border-[#6f62cf]'
                placeholder='Nhập mật khẩu hiện tại'
              />
              <button
                type='button'
                onClick={() => setShowCurrentPassword((v) => !v)}
                className='absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-[#8d87c0] hover:bg-[#f0edff]'
                aria-label={showCurrentPassword ? 'Ẩn mật khẩu hiện tại' : 'Hiện mật khẩu hiện tại'}
              >
                {showCurrentPassword ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
              </button>
            </div>
            <p className='mt-1 min-h-4 text-xs text-red-600'>{passwordErrors.currentPassword?.message}</p>
          </div>

          <div>
            <label className='mb-1 block text-xs text-[#7e7a9f]'>Mật khẩu mới</label>
            <div className='relative'>
              <input
                type={showNewPassword ? 'text' : 'password'}
                {...registerPassword('newPassword')}
                className='h-10 w-full rounded-lg border border-[#e6e2f7] bg-[#fbfaff] px-3 pr-10 text-sm text-[#2f2b4f] outline-none focus:border-[#6f62cf]'
                placeholder='Nhập mật khẩu mới'
              />
              <button
                type='button'
                onClick={() => setShowNewPassword((v) => !v)}
                className='absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-[#8d87c0] hover:bg-[#f0edff]'
                aria-label={showNewPassword ? 'Ẩn mật khẩu mới' : 'Hiện mật khẩu mới'}
              >
                {showNewPassword ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
              </button>
            </div>
            <p className='mt-1 min-h-4 text-xs text-red-600'>{passwordErrors.newPassword?.message}</p>
          </div>

          <div>
            <label className='mb-1 block text-xs text-[#7e7a9f]'>Xác nhận mật khẩu mới</label>
            <div className='relative'>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                {...registerPassword('confirmNewPassword')}
                className='h-10 w-full rounded-lg border border-[#e6e2f7] bg-[#fbfaff] px-3 pr-10 text-sm text-[#2f2b4f] outline-none focus:border-[#6f62cf]'
                placeholder='Nhập lại mật khẩu mới'
              />
              <button
                type='button'
                onClick={() => setShowConfirmPassword((v) => !v)}
                className='absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-[#8d87c0] hover:bg-[#f0edff]'
                aria-label={showConfirmPassword ? 'Ẩn xác nhận mật khẩu' : 'Hiện xác nhận mật khẩu'}
              >
                {showConfirmPassword ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
              </button>
            </div>
            <p className='mt-1 min-h-4 text-xs text-red-600'>{passwordErrors.confirmNewPassword?.message}</p>
          </div>
        </div>

        <div className='mt-5 flex items-center gap-3'>
          <button
            type='submit'
            disabled={changePasswordMutation.isPending}
            className='inline-flex h-10 items-center gap-2 rounded-lg bg-[#2f2b4f] px-4 text-sm font-semibold text-white transition hover:bg-[#1f1b39] disabled:cursor-not-allowed disabled:opacity-70'
          >
            <Save className='h-4 w-4' />
            {changePasswordMutation.isPending ? 'Đang đổi mật khẩu...' : 'Đổi mật khẩu'}
          </button>
          <button
            type='button'
            onClick={handleCancelChangePassword}
            disabled={changePasswordMutation.isPending}
            className='inline-flex h-10 items-center rounded-lg border border-[#d5d0ef] px-4 text-sm font-semibold text-[#4b466e] transition hover:bg-[#f7f5ff] disabled:cursor-not-allowed disabled:opacity-70'
          >
            Hủy
          </button>
        </div>
      </form>
    </section>
  )
}
