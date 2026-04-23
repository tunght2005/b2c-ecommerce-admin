import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageSquareText, SendHorizonal, SlidersHorizontal, Star, X } from 'lucide-react'
import { toast } from 'react-toastify'

import productApi from '../../apis/product.api'
import reviewApi, { type ReviewEntity } from '../../apis/review.api'
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
  const [selectedReview, setSelectedReview] = useState<ReviewEntity | null>(null)
  const [deleteReviewId, setDeleteReviewId] = useState<string | null>(null)
  const [replyReview, setReplyReview] = useState<ReviewEntity | null>(null)
  const [replyContent, setReplyContent] = useState('')

  const productsQuery = useQuery({
    queryKey: ['review-products'],
    queryFn: async () => {
      const response = await productApi.list()
      return response.data || []
    },
    placeholderData: (prev) => prev
  })

  const firstProductId = productsQuery.data?.length ? getProductId(productsQuery.data[0]) : ''
  const activeProductId = selectedProductId || firstProductId

  const reviewsQuery = useQuery({
    queryKey: ['reviews-by-product', activeProductId],
    queryFn: async () => {
      const response = await reviewApi.listByProduct(activeProductId, { page: 1, limit: 10 })
      return response.data.data
    },
    enabled: Boolean(activeProductId),
    placeholderData: (prev) => prev
  })

  const adminReviewsQuery = useQuery({
    queryKey: ['reviews-admin', activeProductId],
    queryFn: async () => {
      const response = await reviewApi.listAdmin({ page: 1, limit: 20, product_id: activeProductId || undefined })
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

  const replyReviewMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) => reviewApi.replyByAdmin(id, { content }),
    onSuccess: (response) => {
      toast.success(response.data.message || 'Đã gửi phản hồi')
      queryClient.invalidateQueries({ queryKey: ['reviews-admin'] })
      queryClient.invalidateQueries({ queryKey: ['reviews-by-product'] })
      queryClient.invalidateQueries({ queryKey: ['review-summary-by-product'] })
      setReplyReview(null)
      setReplyContent('')
    },
    onError: () => {
      toast.error('Không thể gửi phản hồi cho review')
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

  const renderProductName = (review: ReviewEntity) => {
    if (typeof review.product_id === 'object' && review.product_id) {
      return review.product_id.name || review.product_id._id
    }
    return review.product_id || 'N/A'
  }

  const renderProductId = (review: ReviewEntity) => {
    if (typeof review.product_id === 'object' && review.product_id) {
      return review.product_id._id
    }
    return review.product_id || 'N/A'
  }

  return (
    <section className='space-y-5 pb-4'>
      <div className='rounded-[30px] border border-[#eceaf8] bg-white p-6 shadow-[0_18px_50px_rgba(27,23,64,0.08)] dark:border-slate-700 dark:bg-slate-900/80 dark:shadow-[0_18px_50px_rgba(0,0,0,0.22)]'>
        <p className='text-sm font-semibold uppercase tracking-[0.24em] text-[#8a84ad] dark:text-slate-400'>Reviews</p>
        <h1 className='mt-2 text-3xl font-black tracking-tight text-[#201f47] dark:text-slate-100'>Customer Reviews</h1>
        <p className='mt-2 text-sm text-[#6d6a8a] dark:text-slate-400'>
          Theo dõi chất lượng đánh giá và phản hồi của khách hàng theo từng sản phẩm.
        </p>
      </div>

      <OrderStatsCards items={reviewStats} />

      <div className='grid gap-4 xl:grid-cols-[1.1fr_1.4fr]'>
        <article className='rounded-3xl border border-[#eceaf8] bg-white p-5 shadow-[0_12px_36px_rgba(28,24,70,0.06)] dark:border-slate-700 dark:bg-slate-900/80 dark:shadow-[0_12px_36px_rgba(0,0,0,0.18)]'>
          <div className='mb-4 flex items-center justify-between'>
            <h2 className='text-xl font-bold text-[#212047] dark:text-slate-100'>Top sản phẩm theo review</h2>
            <Star className='h-5 w-5 text-[#f08c44] dark:text-amber-300' />
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
                    activeProductId === productId
                      ? 'border-[#d9d3ef] bg-[#f8f6ff] dark:border-indigo-500/40 dark:bg-slate-800/95'
                      : 'border-[#eceaf8] bg-white hover:bg-[#fbfaff] dark:border-slate-700 dark:bg-slate-950/70 dark:hover:bg-slate-900/85'
                  }`}
                >
                  <p className='text-sm font-bold text-[#2a254b] dark:text-slate-100'>{item?.product?.name || 'N/A'}</p>
                  <p className='mt-1 text-xs text-[#8f8aac] dark:text-slate-400'>
                    {item?.summary?.totalReviews || 0} review(s) -{' '}
                    {Number(item?.summary?.averageRating || 0).toFixed(2)} sao
                  </p>
                </button>
              )
            })}
          </div>
        </article>

        <article className='rounded-3xl border border-[#eceaf8] bg-white p-5 shadow-[0_12px_36px_rgba(28,24,70,0.06)] dark:border-slate-700 dark:bg-slate-900/80 dark:shadow-[0_12px_36px_rgba(0,0,0,0.18)]'>
          <div className='mb-4 flex items-center justify-between'>
            <h2 className='text-xl font-bold text-[#212047] dark:text-slate-100'>
              Review chi tiết sản phẩm ({filteredReviews.length})
            </h2>
            <div className='flex items-center gap-2'>
              <button
                type='button'
                onClick={() => setIsFilterOpen((prev) => !prev)}
                className='inline-flex h-8 items-center gap-2 rounded-full border border-[#d9d3ef] bg-white px-3 text-xs font-semibold text-[#5f5a7a] transition hover:border-[#bfb5ea] hover:text-[#6f62cf] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-slate-100'
              >
                <SlidersHorizontal className='h-3.5 w-3.5' />
                Filter nâng cao
              </button>
              <MessageSquareText className='h-5 w-5 text-[#6f62cf] dark:text-indigo-300' />
            </div>
          </div>

          {isFilterOpen ? (
            <div className='mb-4 rounded-2xl border border-[#eceaf8] bg-[#faf9ff] p-4 dark:border-slate-700 dark:bg-slate-950/70'>
              <div className='grid gap-3 md:grid-cols-3'>
                <input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder='Tìm theo nội dung review'
                  className='h-10 rounded-xl border border-[#e5e1f3] bg-white px-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500'
                />
                <input
                  value={userKeyword}
                  onChange={(event) => setUserKeyword(event.target.value)}
                  placeholder='Tìm theo username/email'
                  className='h-10 rounded-xl border border-[#e5e1f3] bg-white px-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500'
                />
                <select
                  value={ratingFilter}
                  onChange={(event) => setRatingFilter(event.target.value as 'all' | '1' | '2' | '3' | '4' | '5')}
                  className='h-10 rounded-xl border border-[#e5e1f3] bg-white px-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100'
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
                  className='h-10 rounded-xl border border-[#e5e1f3] bg-white px-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100'
                />
                <input
                  type='date'
                  value={toDate}
                  onChange={(event) => setToDate(event.target.value)}
                  className='h-10 rounded-xl border border-[#e5e1f3] bg-white px-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100'
                />
              </div>

              <div className='mt-3 flex items-center justify-between'>
                <p className='text-xs text-[#7a7697] dark:text-slate-400'>Hiển thị {filteredReviews.length} review</p>
                <button
                  type='button'
                  onClick={resetFilters}
                  className='inline-flex h-8 items-center rounded-full border border-[#e0dcf1] bg-white px-3 text-xs font-semibold text-[#6d688a] transition hover:border-[#bfb5ea] hover:text-[#6f62cf] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-slate-100'
                >
                  Reset filter
                </button>
              </div>
            </div>
          ) : null}

          <div className='space-y-3'>
            {adminReviewsQuery.isLoading && !adminReviewsQuery.data ? (
              <p className='rounded-2xl border border-[#eceaf8] px-4 py-6 text-sm text-[#7a7697] dark:border-slate-700 dark:text-slate-400'>
                Đang tải review...
              </p>
            ) : filteredReviews.length > 0 ? (
              filteredReviews.map((review) => (
                <div key={review._id} className='rounded-2xl border border-[#eceaf8] px-4 py-3 dark:border-slate-700'>
                  <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                    <p className='text-sm font-semibold text-[#2a254b] dark:text-slate-100'>
                      {typeof review.user_id === 'object'
                        ? review.user_id.username || review.user_id.email
                        : review.user_id}
                    </p>
                    <span className='rounded-full border border-[#ffe5c7] bg-[#fff6eb] px-3 py-1 text-xs font-semibold text-[#c67818] dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-300'>
                      {review.rating}/5
                    </span>
                  </div>
                  <p className='mt-2 text-sm text-[#5f5a7a] dark:text-slate-300'>{review.content}</p>
                  <p className='mt-2 text-xs text-[#6f62cf] dark:text-indigo-300'>
                    Sản phẩm: {renderProductName(review)}
                  </p>
                  {review.admin_reply?.content ? (
                    <div className='mt-2 rounded-xl border border-[#d8edff] bg-[#eff8ff] px-3 py-2 text-xs text-[#2f78d1] dark:border-indigo-500/40 dark:bg-indigo-950/30 dark:text-indigo-200'>
                      <p className='font-semibold'>Phản hồi Admin/Support</p>
                      <p className='mt-1 whitespace-pre-line'>{review.admin_reply.content}</p>
                    </div>
                  ) : null}
                  <p className='mt-2 text-xs text-[#8f8aac] dark:text-slate-400'>{formatDateTime(review.createdAt)}</p>
                  <div className='mt-2'>
                    <CrudActionButtons
                      onView={() => setSelectedReview(review)}
                      onDelete={() => setDeleteReviewId(review._id)}
                    />
                    <button
                      type='button'
                      onClick={() => {
                        setReplyReview(review)
                        setReplyContent(review.admin_reply?.content || '')
                      }}
                      className='mt-2 inline-flex h-8 items-center gap-2 rounded-full border border-[#d8edff] bg-[#eff8ff] px-3 text-xs font-semibold text-[#2f78d1] transition hover:bg-[#e2f2ff] dark:border-indigo-500/40 dark:bg-indigo-950/30 dark:text-indigo-200 dark:hover:bg-indigo-950/45'
                    >
                      <SendHorizonal className='h-3.5 w-3.5' />
                      {review.admin_reply?.content ? 'Sửa phản hồi' : 'Phản hồi review'}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className='rounded-2xl border border-[#eceaf8] px-4 py-6 text-sm text-[#7a7697] dark:border-slate-700 dark:text-slate-400'>
                Không có review phù hợp bộ lọc.
              </p>
            )}
          </div>
        </article>
      </div>

      {selectedReview ? (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-[#1f1b3f]/35 px-4'>
          <div className='w-full max-w-xl rounded-3xl border border-[#eceaf8] bg-white p-6 shadow-[0_24px_64px_rgba(20,17,48,0.25)] dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_24px_64px_rgba(0,0,0,0.35)]'>
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-xl font-bold text-[#212047] dark:text-slate-100'>Chi tiết review</h2>
              <button
                type='button'
                onClick={() => setSelectedReview(null)}
                className='inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#eceaf8] text-[#6d688a] transition hover:border-[#d4cfea] hover:text-[#5f54bf] dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-slate-100'
              >
                <X className='h-4 w-4' />
              </button>
            </div>

            <div className='space-y-3 rounded-2xl border border-[#eceaf8] p-4 dark:border-slate-700'>
              <p className='text-sm text-[#5f5a7a] dark:text-slate-300'>
                Người dùng:{' '}
                <span className='font-semibold text-[#2a254b] dark:text-slate-100'>
                  {typeof selectedReview.user_id === 'object'
                    ? selectedReview.user_id.username || selectedReview.user_id.email
                    : selectedReview.user_id}
                </span>
              </p>
              <p className='text-sm text-[#5f5a7a] dark:text-slate-300'>
                Rating:{' '}
                <span className='font-semibold text-[#c67818] dark:text-amber-300'>{selectedReview.rating}/5</span>
              </p>
              <p className='text-sm text-[#5f5a7a] dark:text-slate-300'>Nội dung:</p>
              <p className='rounded-xl bg-[#faf9ff] p-3 text-sm text-[#2a254b] dark:bg-slate-950/70 dark:text-slate-100'>
                {selectedReview.content}
              </p>
              <p className='text-sm text-[#5f5a7a] dark:text-slate-300'>Sản phẩm:</p>
              <p className='rounded-xl bg-[#faf9ff] p-3 text-sm text-[#2a254b] dark:bg-slate-950/70 dark:text-slate-100'>
                {renderProductName(selectedReview)}
              </p>
              <p className='text-sm text-[#5f5a7a] dark:text-slate-300'>Product ID:</p>
              <p className='rounded-xl bg-[#faf9ff] p-3 text-sm text-[#2a254b] dark:bg-slate-950/70 dark:text-slate-100'>
                {renderProductId(selectedReview)}
              </p>
              {selectedReview.admin_reply?.content ? (
                <>
                  <p className='text-sm text-[#5f5a7a] dark:text-slate-300'>Phản hồi Admin/Support:</p>
                  <p className='rounded-xl border border-[#d8edff] bg-[#eff8ff] p-3 text-sm text-[#2f78d1] dark:border-indigo-500/40 dark:bg-indigo-950/30 dark:text-indigo-200'>
                    {selectedReview.admin_reply.content}
                  </p>
                </>
              ) : null}
              <p className='text-xs text-[#8f8aac] dark:text-slate-400'>{formatDateTime(selectedReview.createdAt)}</p>
            </div>
          </div>
        </div>
      ) : null}

      {replyReview ? (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-[#1f1b3f]/35 px-4'>
          <div className='w-full max-w-xl rounded-3xl border border-[#eceaf8] bg-white p-6 shadow-[0_24px_64px_rgba(20,17,48,0.25)] dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_24px_64px_rgba(0,0,0,0.35)]'>
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-xl font-bold text-[#212047] dark:text-slate-100'>Phản hồi review</h2>
              <button
                type='button'
                onClick={() => {
                  setReplyReview(null)
                  setReplyContent('')
                }}
                className='inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#eceaf8] text-[#6d688a] transition hover:border-[#d4cfea] hover:text-[#5f54bf] dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-slate-100'
              >
                <X className='h-4 w-4' />
              </button>
            </div>

            <p className='text-sm text-[#5f5a7a] dark:text-slate-300'>Sản phẩm: {renderProductName(replyReview)}</p>
            <p className='mt-1 text-sm text-[#5f5a7a] dark:text-slate-300'>Review: {replyReview.content}</p>

            <label className='mt-4 block'>
              <span className='text-sm font-semibold text-[#4a4666] dark:text-slate-300'>Nội dung phản hồi</span>
              <textarea
                value={replyContent}
                onChange={(event) => setReplyContent(event.target.value)}
                rows={5}
                placeholder='Nhập phản hồi từ Admin/Support...'
                className='mt-2 w-full rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 py-3 text-sm text-[#2d2950] outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100'
              />
            </label>

            <div className='mt-5 flex justify-end gap-2'>
              <button
                type='button'
                onClick={() => {
                  setReplyReview(null)
                  setReplyContent('')
                }}
                className='inline-flex h-10 items-center rounded-full border border-[#e0dcf1] bg-white px-4 text-sm font-semibold text-[#6d688a] transition hover:border-[#bfb5ea] hover:text-[#6f62cf] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-slate-100'
              >
                Hủy
              </button>
              <button
                type='button'
                onClick={() => replyReviewMutation.mutate({ id: replyReview._id, content: replyContent })}
                disabled={!replyContent.trim() || replyReviewMutation.isPending}
                className='inline-flex h-10 items-center rounded-full bg-[#6f62cf] px-4 text-sm font-semibold text-white transition hover:bg-[#5e53bf] disabled:cursor-not-allowed disabled:opacity-60'
              >
                {replyReviewMutation.isPending ? 'Đang gửi...' : 'Gửi phản hồi'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteReviewId ? (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-[#1f1b3f]/35 px-4'>
          <div className='w-full max-w-md rounded-3xl border border-[#eceaf8] bg-white p-6 shadow-[0_24px_64px_rgba(20,17,48,0.25)] dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_24px_64px_rgba(0,0,0,0.35)]'>
            <h2 className='text-lg font-bold text-[#212047] dark:text-slate-100'>Xác nhận xoá review</h2>
            <p className='mt-2 text-sm text-[#6d688a] dark:text-slate-400'>Bạn có chắc muốn xoá review này không?</p>

            <div className='mt-5 flex justify-end gap-2'>
              <button
                type='button'
                onClick={() => setDeleteReviewId(null)}
                className='inline-flex h-10 items-center rounded-full border border-[#e0dcf1] bg-white px-4 text-sm font-semibold text-[#6d688a] transition hover:border-[#bfb5ea] hover:text-[#6f62cf] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-slate-100'
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
