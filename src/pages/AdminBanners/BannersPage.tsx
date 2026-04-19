import { type ChangeEvent, type FormEvent, useMemo, useRef, useState } from 'react'
import { type AxiosError } from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ImagePlus, Plus, SlidersHorizontal, X } from 'lucide-react'
import { toast } from 'react-toastify'

import bannerApi from '../../apis/banner.api'
import type { BannerEntity } from '../../apis/banner.api'
import OrderStatsCards from '../../components/Order/OrderStatsCards'
import CrudActionButtons from '../../components/CrudActionButtons'
import { formatDateTime, resolveAssetUrl } from '../../utils/common'

interface ErrorResponse {
  message?: string
  data?: unknown
}

type AppAxiosError = AxiosError<ErrorResponse>

export default function BannersPage() {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  // Form states
  const [title, setTitle] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState('')
  const [link, setLink] = useState('')
  const [position, setPosition] = useState<'top' | 'middle' | 'bottom'>('top')

  // Advanced filters (client-side)
  const [keyword, setKeyword] = useState('')
  const [positionFilter, setPositionFilter] = useState<'all' | 'top' | 'middle' | 'bottom'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  // Queries
  const bannersQuery = useQuery({
    queryKey: ['admin-banners'],
    queryFn: async () => {
      const response = await bannerApi.list({ page: 1, limit: 100 })
      return response.data.data.banners
    },
    placeholderData: (prev) => prev
  })

  // Mutations
  const createBannerMutation = useMutation({
    mutationFn: async () => {
      if (!image) throw new Error('Vui lòng chọn hình ảnh')

      const response = await bannerApi.create({
        title: title.trim(),
        image,
        link: link.trim(),
        position
      })

      return response
    },
    onSuccess: (response) => {
      toast.success(response.data.message || 'Đã tạo banner thành công')
      resetForm()
      setIsCreateModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['admin-banners'] })
    },
    onError: (error: AppAxiosError) => {
      const errorMsg = error.response?.data?.message || error.message || 'Không thể tạo banner'
      toast.error(errorMsg)
    }
  })

  const deleteBannerMutation = useMutation({
    mutationFn: (id: string) => bannerApi.remove(id),
    onSuccess: () => {
      toast.success('Đã xóa banner thành công')
      queryClient.invalidateQueries({ queryKey: ['admin-banners'] })
    },
    onError: (error: AppAxiosError) => {
      const errorMsg = error.response?.data?.message || error.message || 'Không thể xóa banner'
      toast.error(errorMsg)
    }
  })

  // Handlers
  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      const file = files[0]
      setImage(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const resetForm = () => {
    setTitle('')
    setImage(null)
    setImagePreview('')
    setLink('')
    setPosition('top')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const onCreateBanner = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!title.trim()) {
      toast.warn('Vui lòng nhập tiêu đề banner')
      return
    }

    if (!image) {
      toast.warn('Vui lòng chọn hình ảnh banner')
      return
    }

    createBannerMutation.mutate()
  }

  const banners = useMemo(() => bannersQuery.data || [], [bannersQuery.data])

  const stats = useMemo(() => {
    const currentBanners = bannersQuery.data || []
    const active = currentBanners.filter((item) => item.is_active).length
    const inactive = currentBanners.length - active

    return [
      { label: 'Tổng banners', value: currentBanners.length, tone: 'from-[#6f62cf] to-[#8a7bf2]' },
      { label: 'Banner active', value: active, tone: 'from-[#2fb67a] to-[#5dd7a0]' },
      { label: 'Inactive', value: inactive, tone: 'from-[#2f86d6] to-[#65b4ff]' },
      {
        label: 'Vị trí top',
        value: currentBanners.filter((b) => b.position === 'top').length,
        tone: 'from-[#f08c44] to-[#f7b36d]'
      }
    ]
  }, [bannersQuery.data])

  const filteredBanners = useMemo(() => {
    return banners.filter((item) => {
      const keywordText = `${item.title || ''} ${item.link || ''}`.toLowerCase()
      const keywordMatched = !keyword.trim() || keywordText.includes(keyword.trim().toLowerCase())

      const statusMatched =
        statusFilter === 'all' ||
        (statusFilter === 'active' && item.is_active) ||
        (statusFilter === 'inactive' && !item.is_active)

      const positionMatched = positionFilter === 'all' || item.position === positionFilter

      const createdAt = item.createdAt ? new Date(item.createdAt).getTime() : 0
      const fromMatched = !fromDate || createdAt >= new Date(`${fromDate}T00:00:00`).getTime()
      const toMatched = !toDate || createdAt <= new Date(`${toDate}T23:59:59`).getTime()

      return keywordMatched && statusMatched && positionMatched && fromMatched && toMatched
    })
  }, [banners, keyword, statusFilter, positionFilter, fromDate, toDate])

  const resetFilters = () => {
    setKeyword('')
    setPositionFilter('all')
    setStatusFilter('all')
    setFromDate('')
    setToDate('')
  }

  return (
    <section className='space-y-5 pb-4'>
      <div className='rounded-[30px] border border-[#eceaf8] bg-white p-6 shadow-[0_18px_50px_rgba(27,23,64,0.08)]'>
        <p className='text-sm font-semibold uppercase tracking-[0.24em] text-[#8a84ad]'>Banners</p>
        <h1 className='mt-2 text-3xl font-black tracking-tight text-[#201f47]'>Marketing Banners</h1>
        <p className='mt-2 text-sm text-[#6d6a8a]'>Quản lý các banner hiển thị trên website.</p>
      </div>

      <OrderStatsCards items={stats} />

      <article className='rounded-3xl border border-[#eceaf8] bg-white p-5 shadow-[0_12px_36px_rgba(28,24,70,0.06)]'>
        <div className='mb-4 flex items-center justify-between'>
          <h2 className='text-xl font-bold text-[#212047]'>Danh sách banners ({filteredBanners.length})</h2>
          <div className='flex items-center gap-2'>
            <button
              type='button'
              onClick={() => setIsCreateModalOpen(true)}
              className='inline-flex h-8 items-center gap-2 rounded-full border border-[#d8edff] bg-[#eff8ff] px-3 text-xs font-semibold text-[#2f78d1] transition hover:bg-[#e2f2ff]'
            >
              <Plus className='h-3.5 w-3.5' />
              Tạo banner
            </button>
            <button
              type='button'
              onClick={() => setIsFilterOpen((prev) => !prev)}
              className='inline-flex h-8 items-center gap-2 rounded-full border border-[#d9d3ef] bg-white px-3 text-xs font-semibold text-[#5f5a7a] transition hover:border-[#bfb5ea] hover:text-[#6f62cf]'
            >
              <SlidersHorizontal className='h-3.5 w-3.5' />
              Filter nâng cao
            </button>
            <ImagePlus className='h-5 w-5 text-[#6f62cf]' />
          </div>
        </div>

        {isFilterOpen ? (
          <div className='mb-4 rounded-2xl border border-[#eceaf8] bg-[#faf9ff] p-4'>
            <div className='grid gap-3 md:grid-cols-3'>
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder='Tìm theo tiêu đề hoặc link'
                className='h-10 rounded-xl border border-[#e5e1f3] bg-white px-3 text-sm outline-none'
              />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as 'all' | 'active' | 'inactive')}
                className='h-10 rounded-xl border border-[#e5e1f3] bg-white px-3 text-sm outline-none'
              >
                <option value='all'>Trạng thái: Tất cả</option>
                <option value='active'>Active</option>
                <option value='inactive'>Inactive</option>
              </select>
              <select
                value={positionFilter}
                onChange={(event) => setPositionFilter(event.target.value as 'all' | 'top' | 'middle' | 'bottom')}
                className='h-10 rounded-xl border border-[#e5e1f3] bg-white px-3 text-sm outline-none'
              >
                <option value='all'>Vị trí: Tất cả</option>
                <option value='top'>Top</option>
                <option value='middle'>Middle</option>
                <option value='bottom'>Bottom</option>
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
              <p className='text-xs text-[#7a7697]'>Hiển thị {filteredBanners.length} banner</p>
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
          {filteredBanners.length > 0 ? (
            filteredBanners.map((banner: BannerEntity) => (
              <div
                key={banner._id}
                className='rounded-2xl border border-[#eceaf8] p-4 transition hover:border-[#d8d4e8]'
              >
                <div className='flex gap-4'>
                  {/* Thumbnail */}
                  <img
                    src={resolveAssetUrl(banner.image)}
                    alt={banner.title}
                    className='h-20 w-20 rounded-lg object-cover'
                  />

                  {/* Content */}
                  <div className='flex-1'>
                    <div className='flex items-start justify-between gap-2'>
                      <div>
                        <h3 className='font-semibold text-[#212047]'>{banner.title}</h3>
                        {banner.link && <p className='text-xs text-[#6f62cf]'>{banner.link}</p>}
                      </div>
                      <span
                        className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
                          banner.is_active ? 'bg-[#effaf4] text-[#2f8a57]' : 'bg-[#fff2f4] text-[#c03747]'
                        }`}
                      >
                        {banner.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className='mt-2 text-xs text-[#8f8aac]'>
                      Vị trí: <span className='font-medium text-[#6f62cf]'>{banner.position}</span> •{' '}
                      {banner.createdAt ? formatDateTime(banner.createdAt) : 'N/A'}
                    </p>
                  </div>

                  {/* Actions */}
                  <CrudActionButtons
                    onDelete={() => {
                      if (window.confirm('Bạn chắc chắn muốn xóa banner này?')) {
                        deleteBannerMutation.mutate(banner._id)
                      }
                    }}
                  />
                </div>
              </div>
            ))
          ) : (
            <p className='rounded-2xl border border-[#eceaf8] px-4 py-8 text-center text-sm text-[#7a7697]'>
              Không có banner phù hợp bộ lọc.
            </p>
          )}
        </div>
      </article>

      {isCreateModalOpen ? (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-[#1f1b3f]/35 px-4'>
          <div className='w-full max-w-2xl rounded-3xl border border-[#eceaf8] bg-white p-6 shadow-[0_24px_64px_rgba(20,17,48,0.25)]'>
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-xl font-bold text-[#212047]'>Tạo banner mới</h2>
              <button
                type='button'
                onClick={() => setIsCreateModalOpen(false)}
                className='inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#eceaf8] text-[#6d688a] transition hover:border-[#d4cfea] hover:text-[#5f54bf]'
              >
                <X className='h-4 w-4' />
              </button>
            </div>

            <form className='space-y-4' onSubmit={onCreateBanner}>
              <div>
                <label className='mb-2 block text-sm font-medium text-[#212047]'>Hình ảnh banner *</label>
                <div
                  className='relative cursor-pointer rounded-2xl border-2 border-dashed border-[#e5e1f3] bg-[#fbfaff] p-6 text-center transition hover:border-[#6f62cf]'
                  onClick={() => fileInputRef.current?.click()}
                >
                  {imagePreview ? (
                    <>
                      <img src={imagePreview} alt='Preview' className='mx-auto max-h-32 rounded-lg' />
                      <p className='mt-2 text-xs text-[#6f62cf]'>Click để thay đổi hình ảnh</p>
                    </>
                  ) : (
                    <>
                      <ImagePlus className='mx-auto h-8 w-8 text-[#6f62cf]' />
                      <p className='mt-2 text-sm font-medium text-[#212047]'>Chọn hoặc kéo hình ảnh vào đây</p>
                      <p className='text-xs text-[#6d6a8a]'>Hỗ trợ JPG, PNG</p>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type='file'
                    accept='image/*'
                    onChange={handleImageChange}
                    className='hidden'
                  />
                </div>
              </div>

              <div>
                <label className='mb-2 block text-sm font-medium text-[#212047]'>Tiêu đề *</label>
                <input
                  type='text'
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder='Nhập tiêu đề banner'
                  className='w-full rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 py-2.5 text-sm outline-none transition focus:border-[#6f62cf]'
                />
              </div>

              <div>
                <label className='mb-2 block text-sm font-medium text-[#212047]'>Link (Tùy chọn)</label>
                <input
                  type='text'
                  value={link}
                  onChange={(event) => setLink(event.target.value)}
                  placeholder='https://example.com'
                  className='w-full rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 py-2.5 text-sm outline-none transition focus:border-[#6f62cf]'
                />
              </div>

              <div>
                <label className='mb-2 block text-sm font-medium text-[#212047]'>Vị trí hiển thị</label>
                <select
                  value={position}
                  onChange={(event) => setPosition(event.target.value as 'top' | 'middle' | 'bottom')}
                  className='w-full rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 py-2.5 text-sm outline-none transition focus:border-[#6f62cf]'
                >
                  <option value='top'>Top (Header)</option>
                  <option value='middle'>Middle (Main)</option>
                  <option value='bottom'>Bottom (Footer)</option>
                </select>
              </div>

              <div className='flex justify-end gap-2 pt-1'>
                <button
                  type='button'
                  onClick={() => setIsCreateModalOpen(false)}
                  className='inline-flex h-10 items-center rounded-full border border-[#e0dcf1] bg-white px-4 text-sm font-semibold text-[#6d688a] transition hover:border-[#bfb5ea] hover:text-[#6f62cf]'
                >
                  Huỷ
                </button>
                <button
                  type='submit'
                  disabled={createBannerMutation.isPending}
                  className='inline-flex h-10 items-center rounded-full bg-[#6f62cf] px-4 text-sm font-semibold text-white transition hover:bg-[#5f54bf] disabled:opacity-50'
                >
                  {createBannerMutation.isPending ? 'Đang tạo...' : 'Tạo banner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  )
}
