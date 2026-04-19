import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link2 } from 'lucide-react'
import { toast } from 'react-toastify'

import promotionApi from '../../apis/promotion.api'
import productApi from '../../apis/product.api'
import CrudActionButtons from '../../components/CrudActionButtons'
import OrderStatsCards from '../../components/Order/OrderStatsCards'

function getProductId(product: { _id?: string; id?: string }) {
  return product._id || product.id || ''
}

export default function ProductPromotionsPage() {
  const queryClient = useQueryClient()
  const [promotionId, setPromotionId] = useState('')
  const [productId, setProductId] = useState('')

  const promotionsQuery = useQuery({
    queryKey: ['product-promotions-list-promotions'],
    queryFn: async () => {
      const response = await promotionApi.list()
      return response.data.data || []
    },
    placeholderData: (prev) => prev
  })

  const productsQuery = useQuery({
    queryKey: ['product-promotions-list-products'],
    queryFn: async () => {
      const response = await productApi.list()
      return response.data || []
    },
    placeholderData: (prev) => prev
  })

  const assignmentsQuery = useQuery({
    queryKey: ['product-promotions-assignments'],
    queryFn: async () => {
      const response = await promotionApi.listAssignments()
      return response.data.data || []
    },
    placeholderData: (prev) => prev
  })

  const assignMutation = useMutation({
    mutationFn: () => promotionApi.assign({ promotion_id: promotionId, product_ids: [productId] }),
    onSuccess: (response) => {
      toast.success(response.data.message || 'Gán promotion thành công')
      queryClient.invalidateQueries({ queryKey: ['product-promotions-assignments'] })
    },
    onError: () => toast.error('Không thể gán promotion cho sản phẩm')
  })

  const removeMutation = useMutation({
    mutationFn: ({
      selectedPromotionId,
      selectedProductId
    }: {
      selectedPromotionId: string
      selectedProductId: string
    }) => promotionApi.removeFromProduct({ promotion_id: selectedPromotionId, product_id: selectedProductId }),
    onSuccess: (response) => {
      toast.success(response.data.message || 'Đã gỡ liên kết promotion')
      queryClient.invalidateQueries({ queryKey: ['product-promotions-assignments'] })
    },
    onError: () => toast.error('Không thể gỡ liên kết')
  })

  const stats = useMemo(() => {
    const assignments = assignmentsQuery.data || []
    const uniqueProducts = new Set(
      assignments.map((item) => (typeof item.product_id === 'string' ? item.product_id : item.product_id?._id || ''))
    )

    return [
      { label: 'Tổng liên kết', value: assignments.length, tone: 'from-[#6f62cf] to-[#8a7bf2]' },
      { label: 'Sản phẩm đã gán', value: uniqueProducts.size, tone: 'from-[#2f86d6] to-[#65b4ff]' },
      { label: 'Promotion khả dụng', value: (promotionsQuery.data || []).length, tone: 'from-[#2fb67a] to-[#5dd7a0]' },
      { label: 'Products khả dụng', value: (productsQuery.data || []).length, tone: 'from-[#f08c44] to-[#f7b36d]' }
    ]
  }, [assignmentsQuery.data, productsQuery.data, promotionsQuery.data])

  const onAssign = () => {
    if (!promotionId || !productId) {
      toast.warn('Vui lòng chọn promotion và sản phẩm')
      return
    }

    assignMutation.mutate()
  }

  const onRemove = (selectedPromotionId: string, selectedProductId: string) => {
    if (!window.confirm('Xác nhận gỡ promotion khỏi sản phẩm này?')) return
    removeMutation.mutate({ selectedPromotionId, selectedProductId })
  }

  return (
    <section className='space-y-5 pb-4'>
      <div className='rounded-[30px] border border-[#eceaf8] bg-white p-6 shadow-[0_18px_50px_rgba(27,23,64,0.08)]'>
        <p className='text-sm font-semibold uppercase tracking-[0.24em] text-[#8a84ad]'>Product Promotions</p>
        <h1 className='mt-2 text-3xl font-black tracking-tight text-[#201f47]'>Product Promotion Mapping</h1>
        <p className='mt-2 text-sm text-[#6d6a8a]'>Gán promotion cho từng sản phẩm và quản lý liên kết nhanh.</p>
      </div>

      <OrderStatsCards items={stats} />

      <article className='rounded-3xl border border-[#eceaf8] bg-white p-5 shadow-[0_12px_36px_rgba(28,24,70,0.06)]'>
        <div className='grid gap-3 md:grid-cols-3'>
          <select
            value={promotionId}
            onChange={(event) => setPromotionId(event.target.value)}
            className='h-11 rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm outline-none'
          >
            <option value=''>Chọn promotion</option>
            {(promotionsQuery.data || []).map((item) => (
              <option key={item._id} value={item._id}>
                {item.name || item._id}
              </option>
            ))}
          </select>

          <select
            value={productId}
            onChange={(event) => setProductId(event.target.value)}
            className='h-11 rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm outline-none'
          >
            <option value=''>Chọn sản phẩm</option>
            {(productsQuery.data || []).map((item) => (
              <option key={getProductId(item)} value={getProductId(item)}>
                {item.name || getProductId(item)}
              </option>
            ))}
          </select>

          <button
            type='button'
            onClick={onAssign}
            className='inline-flex h-11 items-center justify-center rounded-full bg-[#6f62cf] px-5 text-sm font-semibold text-white transition hover:bg-[#5f54bf]'
          >
            {assignMutation.isPending ? 'Đang gán...' : 'Gán Promotion'}
          </button>
        </div>
      </article>

      <article className='rounded-3xl border border-[#eceaf8] bg-white p-5 shadow-[0_12px_36px_rgba(28,24,70,0.06)]'>
        <div className='mb-4 flex items-center justify-between'>
          <h2 className='text-xl font-bold text-[#212047]'>Liên kết hiện tại</h2>
          <Link2 className='h-5 w-5 text-[#6f62cf]' />
        </div>

        <div className='space-y-3'>
          {(assignmentsQuery.data || []).length > 0 ? (
            (assignmentsQuery.data || []).map((item) => {
              const selectedPromotionId =
                typeof item.promotion_id === 'string' ? item.promotion_id : item.promotion_id?._id || ''
              const selectedProductId =
                typeof item.product_id === 'string' ? item.product_id : item.product_id?._id || ''

              return (
                <div key={item._id} className='rounded-2xl border border-[#eceaf8] px-4 py-3'>
                  <div className='flex flex-wrap items-center justify-between gap-3'>
                    <div>
                      <p className='text-sm font-bold text-[#2a254b]'>
                        {typeof item.product_id === 'string'
                          ? item.product_id
                          : item.product_id?.name || item.product_id?._id}
                      </p>
                      <p className='mt-1 text-xs text-[#8f8aac]'>
                        Promotion:{' '}
                        {typeof item.promotion_id === 'string'
                          ? item.promotion_id
                          : item.promotion_id?.name || item.promotion_id?._id}
                      </p>
                    </div>
                    <CrudActionButtons onDelete={() => onRemove(selectedPromotionId, selectedProductId)} />
                  </div>
                </div>
              )
            })
          ) : (
            <p className='rounded-2xl border border-[#eceaf8] px-4 py-6 text-sm text-[#7a7697]'>
              Chưa có liên kết promotion-product nào.
            </p>
          )}
        </div>
      </article>
    </section>
  )
}
