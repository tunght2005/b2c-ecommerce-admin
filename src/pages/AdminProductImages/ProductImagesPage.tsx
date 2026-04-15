import { useMemo, useState, type ChangeEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2, UploadCloud } from 'lucide-react'
import { toast } from 'react-toastify'

import Button from '../../components/Button'
import catalogApi from '../../apis/catalog.api'
import { useAuth } from '../../contexts/app.context'
import { resolveAssetUrl } from '../../utils/common'
import type { ProductImage, ProductListForSelection } from '../../types/catalog.type'

export default function ProductImagesPage() {
  const { role } = useAuth()
  const canManage = role === 'admin'
  const queryClient = useQueryClient()

  const [selectedProductId, setSelectedProductId] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [deleteTarget, setDeleteTarget] = useState<ProductImage | null>(null)

  const productsQuery = useQuery({
    queryKey: ['products-options-for-images'],
    queryFn: async () => {
      const response = await catalogApi.listProducts()
      return response.data
    }
  })

  const imagesQuery = useQuery({
    queryKey: ['product-images', selectedProductId],
    enabled: Boolean(selectedProductId),
    queryFn: async () => {
      const response = await catalogApi.listProductImages(selectedProductId)
      return response.data
    },
    placeholderData: (prev) => prev
  })

  const uploadMutation = useMutation({
    mutationFn: () => catalogApi.uploadProductImages({ product_id: selectedProductId, files: selectedFiles }),
    onSuccess: (response) => {
      toast.success(response.data.message || 'Upload success')
      queryClient.invalidateQueries({ queryKey: ['product-images', selectedProductId] })
      setSelectedFiles([])
    }
  })

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!deleteTarget?._id) throw new Error('Missing image id')
      return catalogApi.removeProductImage(deleteTarget._id)
    },
    onSuccess: (response) => {
      toast.success(response.data.message || 'Delete image success')
      queryClient.invalidateQueries({ queryKey: ['product-images', selectedProductId] })
      setDeleteTarget(null)
    }
  })

  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data])
  const images = useMemo(() => imagesQuery.data ?? [], [imagesQuery.data])

  const selectedProductName = useMemo(() => {
    const item = products.find((product: ProductListForSelection) => (product.id || product._id) === selectedProductId)
    return item?.name || 'N/A'
  }, [products, selectedProductId])

  const handleFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(Array.from(event.target.files || []))
  }

  const handleUpload = () => {
    if (!canManage) {
      toast.error('Bạn không có quyền upload ảnh')
      return
    }
    if (!selectedProductId) {
      toast.error('Vui lòng chọn product')
      return
    }
    if (!selectedFiles.length) {
      toast.error('Vui lòng chọn ít nhất 1 file ảnh')
      return
    }
    uploadMutation.mutate()
  }

  return (
    <section className='space-y-5 pb-4'>
      <div>
        <p className='text-sm font-semibold uppercase tracking-[0.24em] text-[#8a84ad]'>Product Management</p>
        <h1 className='mt-2 text-3xl font-black tracking-tight text-[#201f47]'>Product Images</h1>
        <p className='mt-2 max-w-3xl text-sm leading-6 text-[#6d6a8a]'>
          Upload và quản lý ảnh sản phẩm theo từng product.
        </p>
      </div>

      <div className='rounded-[30px] border border-[#eceaf8] bg-white p-5 shadow-[0_18px_50px_rgba(27,23,64,0.08)]'>
        <div className='grid gap-4 md:grid-cols-[1fr_auto_auto]'>
          <select
            value={selectedProductId}
            onChange={(event) => setSelectedProductId(event.target.value)}
            className='h-11 rounded-full border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm outline-none'
          >
            <option value=''>Select product</option>
            {products.map((product: ProductListForSelection) => (
              <option key={product.id || product._id} value={product.id || product._id}>
                {product.name}
              </option>
            ))}
          </select>

          <label className='inline-flex h-11 cursor-pointer items-center rounded-full border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm font-semibold text-[#2d2950]'>
            Choose Images
            <input type='file' multiple accept='image/*' className='hidden' onChange={handleFilesChange} />
          </label>

          <Button
            type='button'
            onClick={handleUpload}
            disabled={uploadMutation.isPending}
            className='inline-flex h-11 items-center gap-2 rounded-full bg-[#6f62cf] px-5 text-sm font-semibold text-white'
          >
            <UploadCloud className='h-4 w-4' />
            {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
          </Button>
        </div>

        <div className='mt-3 text-xs text-[#7a7697]'>
          Product: <span className='font-semibold text-[#4d4970]'>{selectedProductName}</span> • Files selected:{' '}
          {selectedFiles.length}
        </div>

        <div className='mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {!selectedProductId ? (
            <p className='col-span-full rounded-2xl border border-dashed border-[#e5e1f3] p-8 text-center text-sm text-[#7a7697]'>
              Chọn sản phẩm để xem ảnh.
            </p>
          ) : imagesQuery.isLoading && !imagesQuery.data ? (
            <p className='col-span-full rounded-2xl border border-dashed border-[#e5e1f3] p-8 text-center text-sm text-[#7a7697]'>
              Loading images...
            </p>
          ) : images.length > 0 ? (
            images.map((image) => (
              <article key={image._id} className='overflow-hidden rounded-2xl border border-[#eceaf8] bg-white'>
                <div className='relative aspect-4/3 bg-[#f6f4ff]'>
                  <img src={resolveAssetUrl(image.url)} alt='Product image' className='h-full w-full object-cover' />
                  {image.is_primary && (
                    <span className='absolute top-2 left-2 rounded-full bg-[#6f62cf] px-2 py-1 text-[10px] font-semibold text-white'>
                      Primary
                    </span>
                  )}
                </div>
                <div className='flex items-center justify-between p-3'>
                  <p className='text-xs text-[#7a7697]'>Sort: {image.sort_order ?? 0}</p>
                  {canManage && (
                    <button
                      type='button'
                      onClick={() => setDeleteTarget(image)}
                      className='inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#f3ccd2] text-[#c84455] hover:bg-[#fff5f7]'
                    >
                      <Trash2 className='h-4 w-4' />
                    </button>
                  )}
                </div>
              </article>
            ))
          ) : (
            <p className='col-span-full rounded-2xl border border-dashed border-[#e5e1f3] p-8 text-center text-sm text-[#7a7697]'>
              No images for this product.
            </p>
          )}
        </div>
      </div>

      {deleteTarget && (
        <div
          className='fixed inset-0 z-40 flex items-center justify-center bg-[#191530]/55 px-4 py-8 backdrop-blur-sm'
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className='relative flex w-full max-w-xl max-h-[90vh] flex-col rounded-[28px] bg-white shadow-[0_28px_80px_rgba(18,16,44,0.35)]'
            onClick={(event) => event.stopPropagation()}
          >
            <div className='flex-shrink-0 border-b border-[#eceaf8] p-6'>
              <div className='flex items-start gap-4'>
                <div className='flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-[#fff2f4] text-[#c84455]'>
                  <Trash2 className='h-6 w-6' />
                </div>
                <div>
                  <p className='text-xs font-semibold uppercase tracking-[0.22em] text-[#8a84ad]'>
                    Delete confirmation
                  </p>
                  <h3 className='mt-2 text-2xl font-bold text-[#212047]'>Remove this image?</h3>
                </div>
              </div>
            </div>

            <div className='flex flex-shrink-0 gap-3 p-6'>
              <Button
                type='button'
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className='inline-flex h-11 items-center rounded-full bg-[#c84455] px-5 text-sm font-semibold text-white'
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
              <button
                type='button'
                onClick={() => setDeleteTarget(null)}
                disabled={deleteMutation.isPending}
                className='inline-flex h-11 items-center rounded-full border border-[#e0dbef] px-5 text-sm font-semibold text-[#544f72]'
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className='grid gap-4 sm:grid-cols-3'>
        <article className='rounded-3xl border border-[#eceaf8] bg-white p-5'>
          <p className='text-sm font-semibold text-[#8c88ac]'>Selected Product</p>
          <p className='mt-2 truncate text-lg font-black text-[#212047]'>{selectedProductName}</p>
        </article>
        <article className='rounded-3xl border border-[#eceaf8] bg-white p-5'>
          <p className='text-sm font-semibold text-[#8c88ac]'>Total Images</p>
          <p className='mt-2 text-4xl font-black text-[#212047]'>{images.length}</p>
        </article>
        <article className='rounded-3xl border border-[#eceaf8] bg-white p-5'>
          <p className='text-sm font-semibold text-[#8c88ac]'>Primary Images</p>
          <p className='mt-2 text-4xl font-black text-[#212047]'>{images.filter((image) => image.is_primary).length}</p>
        </article>
      </div>
    </section>
  )
}
