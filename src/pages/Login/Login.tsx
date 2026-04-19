import { useState } from 'react'
import logo from '../../assets/logo.svg'
import loginIllustration from '../../assets/login.svg'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoginInputSchema, type LoginInput } from '../../schemas/user.schema'
import Button from '../../components/Button'
import { useMutation } from '@tanstack/react-query'
import authApi from '../../apis/auth.api'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/app.context'

export default function Login() {
  const [showPassword, setShowPassword] = useState(false)
  const { setTokens, setProfile } = useAuth()
  const navigate = useNavigate()
  const {
    register,
    setError,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginInput>({ resolver: zodResolver(LoginInputSchema) }) // return register, handleSubmit, formState: {errors}

  const loginMutation = useMutation({
    mutationFn: (body: LoginInput) => authApi.login(body)
  })

  const onSubmit = handleSubmit((data) => {
    loginMutation.mutate(data, {
      onSuccess: (res) => {
        const { accessToken, refreshToken, user } = res.data

        // Validate role trước khi trả token đăng nhập
        if (!user.role || user.role === 'customer') {
          toast.error('Tài khoản không có quyền truy cập hệ thống này')
          return
        }

        // profile
        setProfile(user)
        setTokens(accessToken, refreshToken)

        //toast
        const roleMessages: Record<string, string> = {
          admin: '👑 Đăng nhập với quyền Quản trị viên',
          shipper: '🚚 Đăng nhập với quyền Nhân viên vận chuyển',
          support: '💬 Đăng nhập với quyền Nhân viên cửa hàng'
        }

        toast.success(roleMessages[user.role])
        navigate('/dashboard')
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError: (error: any) => {
        const message = error?.response?.data?.message
        if (typeof message === 'string') {
          toast.error(message)
          setError('email', { type: 'Server', message })
          return
        }

        toast.error('Đăng nhập thất bại')
      }
    })
  })
  return (
    <main
      className='min-h-screen p-3 sm:p-5 lg:p-6'
      style={{
        background: 'radial-gradient(circle at 10% 0%, #595479 0%, #3f3b5b 45%, #302d4c 100%)'
      }}
    >
      <section
        className='mx-auto grid min-h-[calc(100vh-24px)] overflow-hidden rounded-3xl border-[4px] border-[#3f3b5b] shadow-[0_30px_80px_rgba(25,20,50,0.38)] lg:min-h-[calc(100vh-48px)] lg:grid-cols-[60%_40%]'
        style={{ background: 'linear-gradient(to right, #f4f4f6 0 60%, #ffede1 60% 100%)' }}
      >
        <div className='relative z-20 grid place-items-center p-4 sm:p-6 lg:p-8'>
          <div className='w-full max-w-[380px] rounded-2xl bg-white/85 px-5 py-9 shadow-[0_24px_45px_rgba(0,0,0,0.09)] sm:px-9 sm:py-12'>
            <div className='mb-2 flex flex-col items-center text-center'>
              <img src={logo} alt='Logo' className='h-12 w-auto object-contain' />
              <p className='mt-6 text-sm text-[#9d9da8]'>Chào mừng bạn đến trang quản lý !!!</p>
              <h1 className='mt-2 mb-7 text-[2.1rem] leading-none font-bold text-[#13131a] sm:mb-8 sm:text-[3rem]'>
                Đăng Nhập
              </h1>
            </div>

            <form className='flex flex-col gap-3' onSubmit={onSubmit} noValidate>
              <label className='text-[0.95rem] font-medium text-[#5f5f6e]' htmlFor='email'>
                Email
              </label>
              <input
                id='email'
                className='h-[42px] rounded border border-[#F7D9C7] bg-[#FFF6F0] px-3 text-[#373748] outline-none transition focus:border-[#F47458] focus:shadow-[0_0_0_3px_rgba(244,116,88,0.18)]'
                type='email'
                placeholder='Nhập email đăng nhập'
                autoComplete='email'
                {...register('email')}
              />
              <div className='mt-1 text-red-600 min-h-4 text-sm'>{errors.email?.message}</div>

              <div className='mt-1 flex items-center justify-between'>
                <label className='text-[0.95rem] font-medium text-[#5f5f6e]' htmlFor='password'>
                  Password
                </label>
                <button type='button' className='cursor-pointer border-0 bg-transparent text-[0.85rem] text-[#a7a7ae]'>
                  Quên mật khẩu ?
                </button>
              </div>
              <div className='relative'>
                <input
                  id='password'
                  placeholder='Nhập mật khẩu'
                  {...register('password')}
                  className='h-[42px] w-full rounded border border-[#F7D9C7] bg-[#FFF6F0] px-3 pr-10 text-[#373748] outline-none transition focus:border-[#F47458] focus:shadow-[0_0_0_3px_rgba(244,116,88,0.18)]'
                  type={showPassword ? 'text' : 'password'}
                  autoComplete='current-password'
                />

                <button
                  type='button'
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'An mat khau' : 'Hien mat khau'}
                  className='absolute top-1/2 right-2 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-[#8d8f9e] transition hover:bg-[#f7dfd2] hover:text-[#F47458]'
                >
                  {showPassword ? (
                    <svg viewBox='0 0 24 24' className='h-5 w-5' fill='none' stroke='currentColor' strokeWidth='2'>
                      <path d='M3 3l18 18' />
                      <path d='M10.58 10.58a2 2 0 102.83 2.83' />
                      <path d='M9.88 5.09A10.94 10.94 0 0112 5c5 0 9.27 3.11 11 7.5a11.8 11.8 0 01-3.05 4.29' />
                      <path d='M6.61 6.61A11.83 11.83 0 001 12.5C2.73 16.89 7 20 12 20a10.9 10.9 0 005.39-1.39' />
                    </svg>
                  ) : (
                    <svg viewBox='0 0 24 24' className='h-5 w-5' fill='none' stroke='currentColor' strokeWidth='2'>
                      <path d='M1 12.5C2.73 8.11 7 5 12 5s9.27 3.11 11 7.5C21.27 16.89 17 20 12 20S2.73 16.89 1 12.5z' />
                      <circle cx='12' cy='12.5' r='3' />
                    </svg>
                  )}
                </button>
              </div>
              <div className='mt-1 text-red-600 min-h-4 text-sm'>{errors.password?.message}</div>
              {/* Submit */}
              <Button
                type='submit'
                className='w-full h-11 flex items-center justify-center rounded-md bg-indigo-400 hover:bg-indigo-700
                     text-white font-semibold transition'
                isLoading={loginMutation.isPending}
                disabled={loginMutation.isPending}
              >
                Đăng nhập
              </Button>
            </form>
          </div>
        </div>

        <div className='relative z-10 flex min-h-[220px] items-center justify-center overflow-hidden bg-[#FFEDE1] p-4 sm:min-h-[260px] lg:min-h-0 lg:items-end lg:bg-transparent lg:p-6'>
          <div
            className='pointer-events-none absolute inset-0 z-0 opacity-40'
            style={{
              backgroundImage:
                'repeating-linear-gradient(to right, transparent 0, transparent 40px, rgba(255,206,174,0.9) 40px, rgba(255,206,174,0.9) 42px)'
            }}
          />
          <div className='relative z-10 w-[88%] max-w-[440px] lg:translate-x-[30px]'>
            <img src={loginIllustration} alt='Login illustration' className='h-auto w-full object-contain' />
          </div>
        </div>
      </section>
    </main>
  )
}
