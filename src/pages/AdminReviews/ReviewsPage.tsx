import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageSquareText, SlidersHorizontal, Star, X } from 'lucide-react'
import { toast } from 'react-toastify'

import productApi from '../../apis/product.api'
import reviewApi from '../../apis/review.api'
import CrudActionButtons from '../../components/CrudActionButtons'
import OrderStatsCards from '../../components/Order/OrderStatsCards'
import type { Product } from '../../types/product.type'
import { formatDateTime } from '../../utils/common'

function getProductId(product: Product) {
  return product._id || product.id
}

export default function ReviewsPage() {
  const queryClient = useQueryClient()
  const [selectedProductId, setSelectedProductId] = useState('')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [userKeyword, setUserKeyword] = useState('')
  const [ratingFilter, setRatingFilter] = useState<'all' | '1' | '2' | '3' | '4' | '5'>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [selectedReview, setSelectedReview] = useState<any | null>(null)
  const [deleteReviewId, setDeleteReviewId] = useState<string | null>(null)

  const productsQuery = useQuery({
    queryKey: ['review-products'],
    queryFn: async () => {
      const response = await productApi.list()
      return response.data || []
    },
    placeholderData: (prev) => prev
  })

  useEffect(() => {
    if (!selectedProductId && productsQuery.data?.length) {
      const firstId = getProductId(productsQuery.data[0])
      if (firstId) setSelectedProductId(firstId)
    }
  }, [productsQuery.data, selectedProductId])

  const reviewsQuery = useQuery({
    queryKey: ['reviews-by-product', selectedProductId],
    queryFn: async () => {
      const response = await reviewApi.listByProduct(selectedProductId, { page: 1, limit: 10 })
      return response.data.data
    },
    enabled: Boolean(selectedProductId),
    placeholderData: (prev) => prev
  })

  const adminReviewsQuery = useQuery({
    queryKey: ['reviews-admin', selectedProductId],
    queryFn: async () => {
      const response = await reviewApi.listAdmin({ page: 1, limit: 20, product_id: selectedProductId || undefined })
      return response.data.data
    },
    placeholderData: (prev) => prev
  })

  const removeReviewMutation = useMutation({
    mutationFn: (id: string) => reviewApi.removeByAdmin(id),
    onSuccess: (response) => {
      toast.success(response.data.message || 'Đã xóa review')
      queryClient.invalidateQueries({ queryKey: ['reviews-admin'] })
      queryClient.invalidateQueries({ queryKey: ['reviews-by-product'] })
      queryClient.invalidateQueries({ queryKey: ['review-summary-by-product'] })
    },
    onError: () => {
      toast.error('Không thể xóa review')
    }
  })

  const reviewSummaryByProductQuery = useQuery({
    queryKey: ['review-summary-by-product', productsQuery.data?.length || 0],
    queryFn: async () => {
      const products = (productsQuery.data || []).slice(0, 6)
      const responses = await Promise.all(
        products.map(async (product) => {
          const productId = getProductId(product)
          if (!productId) return null
          const response = await reviewApi.listByProduct(productId, { page: 1, limit: 1 })
          return {
            product,
            summary: response.data.data.summary
          }
        })
      )

      return responses.filter(Boolean)
    },
    enabled: Boolean(productsQuery.data?.length),
    placeholderData: (prev) => prev
  })

  const reviewStats = useMemo(() => {
    const summaries = reviewSummaryByProductQuery.data || []
    const totalReviews = summaries.reduce((sum, item) => sum + (item?.summary?.totalReviews || 0), 0)
    const weightedRating = summaries.reduce(
      (sum, item) => sum + (item?.summary?.averageRating || 0) * (item?.summary?.totalReviews || 0),
      0
    )
    const avgRating = totalReviews > 0 ? weightedRating / totalReviews : 0

    return [
      {
        label: 'Sản phẩm có review',
        value: summaries.filter((item) => (item?.summary?.totalReviews || 0) > 0).length,
        tone: 'from-[#6f62cf] to-[#8a7bf2]'
      },
      { label: 'Tổng review (mẫu)', value: totalReviews, tone: 'from-[#2f86d6] to-[#65b4ff]' },
      { label: 'Điểm trung bình', value: avgRating.toFixed(2), tone: 'from-[#f08c44] to-[#f7b36d]' },
      {
        label: 'Review sản phẩm đang chọn',
        value: reviewsQuery.data?.summary?.totalReviews || 0,
        tone: 'from-[#2fb67a] to-[#5dd7a0]'
      }
    ]
  }, [reviewSummaryByProductQuery.data, reviewsQuery.data?.summary?.totalReviews])

  const filteredReviews = useMemo(() => {
    const reviews = adminReviewsQuery.data?.reviews || []

    return reviews.filter((review) => {
      const contentMatched =
        !keyword.trim() || (review.content || '').toLowerCase().includes(keyword.trim().toLowerCase())

      const username =
        typeof review.user_id === 'object'
          ? review.user_id.username || review.user_id.email || ''
          : String(review.user_id)
      const userMatched = !userKeyword.trim() || username.toLowerCase().includes(userKeyword.trim().toLowerCase())

      const ratingMatched = ratingFilter === 'all' || review.rating === Number(ratingFilter)

      const createdAt = review.createdAt ? new Date(review.createdAt).getTime() : 0
      const fromMatched = !fromDate || createdAt >= new Date(`${fromDate}T00:00:00`).getTime()
      const toMatched = !toDate || createdAt <= new Date(`${toDate}T23:59:59`).getTime()

      return contentMatched && userMatched && ratingMatched && fromMatched && toMatched
    })
  }, [adminReviewsQuery.data?.reviews, keyword, userKeyword, ratingFilter, fromDate, toDate])

  const resetFilters = () => {
    setKeyword('')
    setUserKeyword('')
    setRatingFilter('all')
    setFromDate('')
    setToDate('')
  }

  const onDeleteReview = () => {
    if (!deleteReviewId) return
    removeReviewMutation.mutate(deleteReviewId)
    setDeleteReviewId(null)
  }

  return (
    <section className='space-y-5 pb-4'>
      <div className='rounded-[30px] border border-[#eceaf8] bg-white p-6 shadow-[0_18px_50px_rgba(27,23,64,0.08)]'>
        <p className='text-sm font-semibold uppercase tracking-[0.24em] text-[#8a84ad]'>Reviews</p>
        <h1 className='mt-2 text-3xl font-black tracking-tight text-[#201f47]'>Customer Reviews</h1>
        <p className='mt-2 text-sm text-[#6d6a8a]'>
          Theo dõi chất lượng đánh giá và phản hồi của khách hàng theo từng sản phẩm.
        </p>
      </div>

      <OrderStatsCards items={reviewStats} />

      <div className='grid gap-4 xl:grid-cols-[1.1fr_1.4fr]'>
        <article className='rounded-3xl border border-[#eceaf8] bg-white p-5 shadow-[0_12px_36px_rgba(28,24,70,0.06)]'>
          <div className='mb-4 flex items-center justify-between'>
            <h2 className='text-xl font-bold text-[#212047]'>Top sản phẩm theo review</h2>
            <Star className='h-5 w-5 text-[#f08c44]' />
          </div>

          <div className='space-y-3'>
            {(reviewSummaryByProductQuery.data || []).map((item) => {
              const productId = item?.product ? getProductId(item.product) : ''
              return (
                <button
                  key={productId || item?.product?.name}
                  type='button'
                  onClick={() => productId && setSelectedProductId(productId)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                    selectedProductId === productId
                      ? 'border-[#d9d3ef] bg-[#f8f6ff]'
                      : 'border-[#eceaf8] bg-white hover:bg-[#fbfaff]'
                  }`}
                >
                  <p className='text-sm font-bold text-[#2a254b]'>{item?.product?.name || 'N/A'}</p>
                  <p className='mt-1 text-xs text-[#8f8aac]'>
                    {item?.summary?.totalReviews || 0} review(s) -{' '}
                    {Number(item?.summary?.averageRating || 0).toFixed(2)} sao
                  </p>
                </button>
              )
            })}
          </div>
        </article>

        <article className='rounded-3xl border border-[#eceaf8] bg-white p-5 shadow-[0_12px_36px_rgba(28,24,70,0.06)]'>
          <div className='mb-4 flex items-center justify-between'>
            <h2 className='text-xl font-bold text-[#212047]'>Review chi tiết sản phẩm ({filteredReviews.length})</h2>
            <div className='flex items-center gap-2'>
              <button
                type='button'
                onClick={() => setIsFilterOpen((prev) => !prev)}
                className='inline-flex h-8 items-center gap-2 rounded-full border border-[#d9d3ef] bg-white px-3 text-xs font-semibold text-[#5f5a7a] transition hover:border-[#bfb5ea] hover:text-[#6f62cf]'
              >
                <SlidersHorizontal className='h-3.5 w-3.5' />
                Filter nâng cao
              </button>
              <MessageSquareText className='h-5 w-5 text-[#6f62cf]' />
            </div>
          </div>

          {isFilterOpen ? (
            <div className='mb-4 rounded-2xl border border-[#eceaf8] bg-[#faf9ff] p-4'>
              <div className='grid gap-3 md:grid-cols-3'>
                <input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder='Tìm theo nội dung review'
                  className='h-10 rounded-xl border border-[#e5e1f3] bg-white px-3 text-sm outline-none'
                />
                <input
                  value={userKeyword}
                  onChange={(event) => setUserKeyword(event.target.value)}
                  placeholder='Tìm theo username/email'
                  className='h-10 rounded-xl border border-[#e5e1f3] bg-white px-3 text-sm outline-none'
                />
                <select
                  value={ratingFilter}
                  onChange={(event) => setRatingFilter(event.target.value as 'all' | '1' | '2' | '3' | '4' | '5')}
                  className='h-10 rounded-xl border border-[#e5e1f3] bg-white px-3 text-sm outline-none'
                >
                  <option value='all'>Rating: Tất cả</option>
                  <option value='5'>5 sao</option>
                  <option value='4'>4 sao</option>
                  <option value='3'>3 sao</option>
                  <option value='2'>2 sao</option>
                  <option value='1'>1 sao</option>
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
                <p className='text-xs text-[#7a7697]'>Hiển thị {filteredReviews.length} review</p>
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
            {adminReviewsQuery.isLoading && !adminReviewsQuery.data ? (
              <p className='rounded-2xl border border-[#eceaf8] px-4 py-6 text-sm text-[#7a7697]'>Đang tải review...</p>
            ) : filteredReviews.length > 0 ? (
              filteredReviews.map((review) => (
                <div key={review._id} className='rounded-2xl border border-[#eceaf8] px-4 py-3'>
                  <div className='flex items-center justify-between gap-3'>
                    <p className='text-sm font-semibold text-[#2a254b]'>
                      {typeof review.user_id === 'object'
                        ? review.user_id.username || review.user_id.email
                        : review.user_id}
                    </p>
                    <span className='rounded-full border border-[#ffe5c7] bg-[#fff6eb] px-3 py-1 text-xs font-semibold text-[#c67818]'>
                      {review.rating}/5
                    </span>
                  </div>
                  <p className='mt-2 text-sm text-[#5f5a7a]'>{review.content}</p>
                  <p className='mt-2 text-xs text-[#8f8aac]'>{formatDateTime(review.createdAt)}</p>
                  <div className='mt-2'>
                    <CrudActionButtons
                      onView={() => setSelectedReview(review)}
                      onDelete={() => setDeleteReviewId(review._id)}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className='rounded-2xl border border-[#eceaf8] px-4 py-6 text-sm text-[#7a7697]'>
                Không có review phù hợp bộ lọc.
              </p>
            )}
          </div>
        </article>
      </div>

      {selectedReview ? (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-[#1f1b3f]/35 px-4'>
          <div className='w-full max-w-xl rounded-3xl border border-[#eceaf8] bg-white p-6 shadow-[0_24px_64px_rgba(20,17,48,0.25)]'>
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-xl font-bold text-[#212047]'>Chi tiết review</h2>
              <button
                type='button'
                onClick={() => setSelectedReview(null)}
                className='inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#eceaf8] text-[#6d688a] transition hover:border-[#d4cfea] hover:text-[#5f54bf]'
              >
                <X className='h-4 w-4' />
              </button>
            </div>

            <div className='space-y-3 rounded-2xl border border-[#eceaf8] p-4'>
              <p className='text-sm text-[#5f5a7a]'>
                Người dùng:{' '}
                <span className='font-semibold text-[#2a254b]'>
                  {typeof selectedReview.user_id === 'object'
                    ? selectedReview.user_id.username || selectedReview.user_id.email
                    : selectedReview.user_id}
                </span>
              </p>
              <p className='text-sm text-[#5f5a7a]'>
                Rating: <span className='font-semibold text-[#c67818]'>{selectedReview.rating}/5</span>
              </p>
              <p className='text-sm text-[#5f5a7a]'>Nội dung:</p>
              <p className='rounded-xl bg-[#faf9ff] p-3 text-sm text-[#2a254b]'>{selectedReview.content}</p>
              <p className='text-xs text-[#8f8aac]'>{formatDateTime(selectedReview.createdAt)}</p>
            </div>
          </div>
        </div>
      ) : null}

      {deleteReviewId ? (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-[#1f1b3f]/35 px-4'>
          <div className='w-full max-w-md rounded-3xl border border-[#eceaf8] bg-white p-6 shadow-[0_24px_64px_rgba(20,17,48,0.25)]'>
            <h2 className='text-lg font-bold text-[#212047]'>Xác nhận xoá review</h2>
            <p className='mt-2 text-sm text-[#6d688a]'>Bạn có chắc muốn xoá review này không?</p>

            <div className='mt-5 flex justify-end gap-2'>
              <button
                type='button'
                onClick={() => setDeleteReviewId(null)}
                className='inline-flex h-10 items-center rounded-full border border-[#e0dcf1] bg-white px-4 text-sm font-semibold text-[#6d688a] transition hover:border-[#bfb5ea] hover:text-[#6f62cf]'
              >
                Huỷ
              </button>
              <button
                type='button'
                onClick={onDeleteReview}
                disabled={removeReviewMutation.isPending}
                className='inline-flex h-10 items-center rounded-full bg-[#c03747] px-4 text-sm font-semibold text-white transition hover:bg-[#ae2f3f] disabled:opacity-60'
              >
                {removeReviewMutation.isPending ? 'Đang xoá...' : 'Xoá review'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
