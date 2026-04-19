import { useMemo, useState, type ChangeEvent } from 'react'
import { Search, Plus, Trash2, Boxes, Tags } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'

import Button from '../../components/Button'
import Pagination from '../../components/Pagination'
import CrudActionButtons from '../../components/CrudActionButtons'
import catalogApi from '../../apis/catalog.api'
import productApi from '../../apis/product.api'
import { useAuth } from '../../contexts/app.context'
import { formatDate, resolveAssetUrl } from '../../utils/common'
import type { ProductImage, Variant } from '../../types/catalog.type'
import type {
  BrandEntity,
  CategoryEntity,
  Product,
  ProductMutationPayload,
  ProductRefEntity
} from '../../types/product.type'

type ProductAction = 'create' | 'edit' | null

type ProductFormState = {
  name: string
  brandId: string
  categoryId: string
  description: string
  specificationFields: Array<{ key: string; value: string }>
  status: 'active' | 'inactive'
}

type SortKey = 'name' | 'status' | 'createdAt'
type SortDirection = 'asc' | 'desc'

const defaultFormState: ProductFormState = {
  name: '',
  brandId: '',
  categoryId: '',
  description: '',
  specificationFields: [{ key: '', value: '' }],
  status: 'active'
}

function normalizeProduct(raw: Product): Product {
  return {
    ...raw,
    id: raw.id || raw._id || '',
    status: raw.status || 'active'
  }
}

function getRefName(value: string | ProductRefEntity | null | undefined) {
  if (!value) return 'N/A'
  if (typeof value === 'string') return value
  return value.name || value._id
}

function getRefId(value: string | ProductRefEntity | null | undefined) {
  if (!value) return ''
  if (typeof value === 'string') return value
  return value._id
}

function flattenCategories(items: CategoryEntity[]): CategoryEntity[] {
  const result: CategoryEntity[] = []

  const walk = (list: CategoryEntity[]) => {
    list.forEach((item) => {
      result.push(item)
      if (item.children?.length) walk(item.children)
    })
  }

  walk(items)
  return result
}

function getSpecificationFields(specification: Record<string, unknown> | null | undefined) {
  if (!specification) {
    return [{ key: '', value: '' }]
  }

  const entries = Object.entries(specification).map(([key, value]) => ({
    key,
    value: typeof value === 'string' ? value : JSON.stringify(value)
  }))

  return entries.length > 0 ? entries : [{ key: '', value: '' }]
}

function buildSpecification(fields: Array<{ key: string; value: string }>) {
  const specification: Record<string, unknown> = {}
  const seenKeys = new Set<string>()

  for (const field of fields) {
    const key = field.key.trim()
    const value = field.value.trim()

    if (!key && !value) continue

    if (!key || !value) {
      toast.error('Specification cần đủ key và value ở từng dòng')
      return null
    }

    if (seenKeys.has(key)) {
      toast.error(`Specification bị trùng key: ${key}`)
      return null
    }

    seenKeys.add(key)
    specification[key] = value
  }

  return Object.keys(specification).length > 0 ? specification : undefined
}

function formatMoney(value: number | undefined) {
  if (value === undefined || value === null) return 'N/A'
  return `${value.toLocaleString('vi-VN')} VND`
}

function getVariantAttributesText(attributes: Variant['attributes']) {
  if (!attributes?.length) return 'N/A'
  return attributes
    .map((item) => {
      if (typeof item === 'string') return item
      return item.name || item._id
    })
    .join(' • ')
}

export default function ProductsPage() {
  const { role } = useAuth()
  const canManageProducts = role === 'admin'
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [brandFilter, setBrandFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [sortKey, setSortKey] = useState<SortKey>('createdAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(8)

  const [actionMode, setActionMode] = useState<ProductAction>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [formState, setFormState] = useState<ProductFormState>(defaultFormState)

  const productsQuery = useQuery({
    queryKey: ['admin-products', search],
    queryFn: async () => {
      const keyword = search.trim()
      const response = keyword ? await productApi.search(keyword) : await productApi.list()
      return response.data.map(normalizeProduct)
    },
    placeholderData: (prev) => prev
  })

  const brandsQuery = useQuery({
    queryKey: ['brands-options'],
    queryFn: async () => {
      const response = await productApi.listBrands()
      return response.data
    }
  })

  const categoriesQuery = useQuery({
    queryKey: ['categories-options'],
    queryFn: async () => {
      const response = await productApi.listCategories()
      return flattenCategories(response.data)
    }
  })

  const selectedProductImagesQuery = useQuery({
    queryKey: ['product-detail-images', selectedProduct?.id],
    enabled: Boolean(selectedProduct?.id && !actionMode && !deleteTarget),
    queryFn: async () => {
      const response = await catalogApi.listProductImages(selectedProduct?.id || '')
      return response.data
    },
    placeholderData: (prev) => prev
  })

  const selectedProductVariantsQuery = useQuery({
    queryKey: ['product-detail-variants', selectedProduct?.id],
    enabled: Boolean(selectedProduct?.id && !actionMode && !deleteTarget),
    queryFn: async () => {
      const response = await catalogApi.listVariantsByProduct(selectedProduct?.id || '')
      return response.data
    },
    placeholderData: (prev) => prev
  })

  const createMutation = useMutation({
    mutationFn: (payload: ProductMutationPayload) => productApi.create(payload),
    onSuccess: (response) => {
      toast.success(response.data.message || 'Create product success')
      setCurrentPage(1)
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      closeOverlay()
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ProductMutationPayload }) => productApi.update(id, payload),
    onSuccess: (response) => {
      toast.success(response.data.message || 'Update product success')
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      closeOverlay()
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productApi.remove(id),
    onSuccess: (response) => {
      toast.success(response.data.message || 'Delete product success')
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      closeOverlay()
    }
  })

  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data])
  const brands = useMemo(() => brandsQuery.data ?? [], [brandsQuery.data])
  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data])
  const selectedProductImages = useMemo(() => selectedProductImagesQuery.data ?? [], [selectedProductImagesQuery.data])
  const selectedProductVariants = useMemo(
    () => selectedProductVariantsQuery.data ?? [],
    [selectedProductVariantsQuery.data]
  )

  const filteredProducts = useMemo(() => {
    const items = products.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false
      if (brandFilter !== 'all' && getRefId(item.brand_id) !== brandFilter) return false
      if (categoryFilter !== 'all' && getRefId(item.category_id) !== categoryFilter) return false
      return true
    })

    items.sort((a, b) => {
      if (sortKey === 'createdAt') {
        const aTime = new Date(a.createdAt || '').getTime() || 0
        const bTime = new Date(b.createdAt || '').getTime() || 0
        return sortDirection === 'asc' ? aTime - bTime : bTime - aTime
      }

      const aValue = String(a[sortKey] || '').toLowerCase()
      const bValue = String(b[sortKey] || '').toLowerCase()
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return items
  }, [products, statusFilter, brandFilter, categoryFilter, sortKey, sortDirection])

  const totalItems = filteredProducts.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedProducts = filteredProducts.slice((safePage - 1) * pageSize, safePage * pageSize)

  const stats = useMemo(() => {
    const activeProducts = products.filter((item) => item.status === 'active').length
    const inactiveProducts = products.filter((item) => item.status === 'inactive').length

    return [
      { label: 'Total Products', value: products.length, tone: 'from-[#6f62cf] to-[#8a7bf2]' },
      { label: 'Active Products', value: activeProducts, tone: 'from-[#2fb67a] to-[#5dd7a0]' },
      { label: 'Inactive Products', value: inactiveProducts, tone: 'from-[#f08c44] to-[#f7b36d]' },
      { label: 'Brands', value: brands.length, tone: 'from-[#2f86d6] to-[#65b4ff]' }
    ]
  }, [products, brands.length])

  const openCreateModal = () => {
    setActionMode('create')
    setSelectedProduct(null)
    setFormState(defaultFormState)
  }

  const openEditModal = (product: Product) => {
    setActionMode('edit')
    setSelectedProduct(product)
    setFormState({
      name: product.name || '',
      brandId: getRefId(product.brand_id),
      categoryId: getRefId(product.category_id),
      description: product.description || '',
      specificationFields: getSpecificationFields(product.specification),
      status: product.status === 'inactive' ? 'inactive' : 'active'
    })
  }

  const openDetailModal = (product: Product) => {
    setSelectedProduct(product)
    setActionMode(null)
  }

  const closeOverlay = () => {
    setActionMode(null)
    setSelectedProduct(null)
    setDeleteTarget(null)
    setFormState(defaultFormState)
  }

  const handleFormChange =
    (field: keyof ProductFormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setFormState((prev) => ({ ...prev, [field]: event.target.value }))
    }

  const updateSpecificationField = (index: number, fieldName: 'key' | 'value', value: string) => {
    setFormState((prev) => ({
      ...prev,
      specificationFields: prev.specificationFields.map((field, currentIndex) =>
        currentIndex === index ? { ...field, [fieldName]: value } : field
      )
    }))
  }

  const addSpecificationField = () => {
    setFormState((prev) => ({
      ...prev,
      specificationFields: [...prev.specificationFields, { key: '', value: '' }]
    }))
  }

  const removeSpecificationField = (index: number) => {
    setFormState((prev) => ({
      ...prev,
      specificationFields:
        prev.specificationFields.length > 1
          ? prev.specificationFields.filter((_, currentIndex) => currentIndex !== index)
          : [{ key: '', value: '' }]
    }))
  }

  const toggleSort = (nextSortKey: SortKey) => {
    if (sortKey === nextSortKey) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(nextSortKey)
    setSortDirection(nextSortKey === 'createdAt' ? 'desc' : 'asc')
  }

  const handleSubmit = () => {
    if (!canManageProducts) {
      toast.error('Bạn không có quyền thao tác CRUD sản phẩm')
      return
    }

    if (!formState.name.trim()) {
      toast.error('Vui lòng nhập tên sản phẩm')
      return
    }

    if (!formState.brandId) {
      toast.error('Vui lòng chọn brand')
      return
    }

    if (!formState.categoryId) {
      toast.error('Vui lòng chọn category')
      return
    }

    const specification = buildSpecification(formState.specificationFields)
    if (specification === null) return

    const payload: ProductMutationPayload = {
      name: formState.name.trim(),
      brand_id: formState.brandId,
      category_id: formState.categoryId,
      description: formState.description.trim() || undefined,
      status: formState.status,
      ...(specification ? { specification } : {})
    }

    if (actionMode === 'create') {
      createMutation.mutate(payload)
      return
    }

    if (actionMode === 'edit' && selectedProduct?.id) {
      updateMutation.mutate({ id: selectedProduct.id, payload })
    }
  }

  const handleDelete = () => {
    if (!canManageProducts) {
      toast.error('Bạn không có quyền xoá sản phẩm')
      return
    }

    if (!deleteTarget?.id) return
    deleteMutation.mutate(deleteTarget.id)
  }

  return (
    <section className='space-y-5 pb-4'>
      <div className='flex flex-wrap items-end justify-between gap-3'>
        <div>
          <p className='text-sm font-semibold uppercase tracking-[0.24em] text-[#8a84ad]'>Product Management</p>
          <h1 className='mt-2 text-3xl font-black tracking-tight text-[#201f47]'>All Product</h1>
          <p className='mt-2 max-w-2xl text-sm leading-6 text-[#6d6a8a]'>
            Quản lý sản phẩm đồng bộ với backend b2c-BE: xem danh sách, tìm kiếm, tạo mới, cập nhật và xoá.
          </p>
        </div>

        {canManageProducts && (
          <div className='flex flex-wrap gap-3'>
            <Button
              type='button'
              onClick={openCreateModal}
              className='inline-flex h-11 items-center gap-2 rounded-full bg-[#6f62cf] px-5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(111,98,207,0.28)] transition hover:bg-[#5f52bf]'
            >
              <Plus className='h-4 w-4' />
              Add Product
            </Button>
          </div>
        )}
      </div>

      <div className='grid gap-4 xl:grid-cols-4'>
        {stats.map((item) => (
          <article
            key={item.label}
            className='overflow-hidden rounded-3xl border border-[#eceaf8] bg-white p-5 shadow-[0_12px_40px_rgba(28,24,70,0.06)] dark:border-slate-700 dark:bg-slate-900/80 dark:shadow-[0_12px_40px_rgba(0,0,0,0.2)]'
          >
            <div className={`mb-4 h-1.5 rounded-full bg-linear-to-r ${item.tone}`} />
            <p className='text-sm font-semibold text-[#8c88ac] dark:text-slate-400'>{item.label}</p>
            <p className='mt-3 text-4xl font-black text-[#212047] dark:text-slate-100'>{item.value}</p>
          </article>
        ))}
      </div>

      <div className='rounded-[30px] border border-[#eceaf8] bg-white p-5 shadow-[0_18px_50px_rgba(27,23,64,0.08)] dark:border-slate-700 dark:bg-slate-900/80 dark:shadow-[0_18px_50px_rgba(0,0,0,0.22)]'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <h2 className='text-xl font-bold text-[#212047] dark:text-slate-100'>Product List</h2>
            <p className='mt-1 text-sm text-[#7a7697] dark:text-slate-400'>{totalItems} product(s) found</p>
          </div>

          <div className='flex flex-wrap items-center gap-3'>
            <div className='relative'>
              <Search className='pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#9d98bf] dark:text-slate-500' />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setCurrentPage(1)
                }}
                type='text'
                placeholder='Search product...'
                className='h-11 w-64 rounded-full border border-[#e5e1f3] bg-[#fbfaff] pr-4 pl-10 text-sm text-[#2d2950] outline-none transition focus:border-[#7a6ae0] focus:ring-2 focus:ring-[#b7abe6]/35 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/25'
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as 'all' | 'active' | 'inactive')
                setCurrentPage(1)
              }}
              className='h-11 rounded-full border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm text-[#2d2950] outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100'
            >
              <option value='all'>All status</option>
              <option value='active'>active</option>
              <option value='inactive'>inactive</option>
            </select>

            <select
              value={brandFilter}
              onChange={(event) => {
                setBrandFilter(event.target.value)
                setCurrentPage(1)
              }}
              className='h-11 rounded-full border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm text-[#2d2950] outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100'
            >
              <option value='all'>All brands</option>
              {brands.map((brand) => (
                <option key={brand._id} value={brand._id}>
                  {brand.name}
                </option>
              ))}
            </select>

            <select
              value={categoryFilter}
              onChange={(event) => {
                setCategoryFilter(event.target.value)
                setCurrentPage(1)
              }}
              className='h-11 rounded-full border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm text-[#2d2950] outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100'
            >
              <option value='all'>All categories</option>
              {categories.map((category) => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className='mt-5 overflow-hidden rounded-[26px] border border-[#eceaf8] dark:border-slate-700'>
          <div className='overflow-x-auto'>
            <table className='min-w-full divide-y divide-[#eceaf8] dark:divide-slate-700'>
              <thead className='bg-[#faf9ff] text-left text-xs font-bold uppercase tracking-[0.18em] text-[#7f7a9e] dark:bg-slate-950 dark:text-slate-400'>
                <tr>
                  <th className='cursor-pointer px-4 py-4' onClick={() => toggleSort('name')}>
                    Product
                  </th>
                  <th className='px-4 py-4'>Brand</th>
                  <th className='px-4 py-4'>Category</th>
                  <th className='cursor-pointer px-4 py-4' onClick={() => toggleSort('status')}>
                    Status
                  </th>
                  <th className='cursor-pointer px-4 py-4' onClick={() => toggleSort('createdAt')}>
                    Created
                  </th>
                  <th className='px-4 py-4 text-right'>Actions</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-[#f0edf8] bg-white dark:divide-slate-800 dark:bg-slate-900/70'>
                {productsQuery.isLoading && !productsQuery.data ? (
                  <tr>
                    <td colSpan={6} className='px-4 py-16 text-center text-sm text-[#7a7697] dark:text-slate-400'>
                      Loading products...
                    </td>
                  </tr>
                ) : paginatedProducts.length > 0 ? (
                  paginatedProducts.map((product) => (
                    <tr key={product.id} className='transition hover:bg-[#fbfaff] dark:hover:bg-slate-800/70'>
                      <td className='px-4 py-4'>
                        <div className='space-y-1'>
                          <p className='font-semibold text-[#25224a] dark:text-slate-100'>{product.name}</p>
                          <p className='text-xs text-[#8d88ab] dark:text-slate-400'>{product.slug || 'No slug'}</p>
                        </div>
                      </td>
                      <td className='px-4 py-4 text-sm text-[#5f5a7a] dark:text-slate-300'>
                        {getRefName(product.brand_id)}
                      </td>
                      <td className='px-4 py-4 text-sm text-[#5f5a7a] dark:text-slate-300'>
                        {getRefName(product.category_id)}
                      </td>
                      <td className='px-4 py-4'>
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                            product.status === 'active'
                              ? 'border-[#c8f2dd] bg-[#f2fff8] text-[#1d8b5f]'
                              : 'border-[#ffd8d8] bg-[#fff4f4] text-[#c14f4f]'
                          }`}
                        >
                          {product.status}
                        </span>
                      </td>
                      <td className='px-4 py-4 text-sm text-[#5f5a7a] dark:text-slate-300'>
                        {formatDate(product.createdAt || '')}
                      </td>
                      <td className='px-4 py-4'>
                        <CrudActionButtons
                          onView={() => openDetailModal(product)}
                          onEdit={canManageProducts ? () => openEditModal(product) : undefined}
                          onDelete={canManageProducts ? () => setDeleteTarget(product) : undefined}
                        />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className='px-4 py-12 text-center'>
                      <div className='mx-auto max-w-sm space-y-3'>
                        <div className='mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f3f0ff] text-[#6f62cf] dark:bg-slate-900 dark:text-indigo-300'>
                          <Boxes className='h-6 w-6' />
                        </div>
                        <p className='text-lg font-semibold text-[#25224a] dark:text-slate-100'>No products found</p>
                        <p className='text-sm text-[#7d7899] dark:text-slate-400'>
                          Try changing keyword, status, brand, or category filters.
                        </p>
                        <Button
                          type='button'
                          onClick={() => {
                            setSearch('')
                            setStatusFilter('all')
                            setBrandFilter('all')
                            setCategoryFilter('all')
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

          <div className='border-t border-[#eceaf8] p-4 dark:border-slate-700'>
            <Pagination
              totalItems={totalItems}
              currentPage={safePage}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(nextSize) => {
                setPageSize(nextSize)
                setCurrentPage(1)
              }}
              pageSizeOptions={[5, 8, 10, 20]}
              itemLabel='products'
            />
          </div>
        </div>
      </div>

      {(actionMode || selectedProduct || deleteTarget) && (
        <div
          className='fixed inset-0 z-40 flex items-center justify-center bg-[#191530]/55 px-4 py-8 backdrop-blur-sm'
          onClick={closeOverlay}
        >
          {actionMode && (
            <div
              className='relative flex w-full max-w-4xl max-h-[90vh] flex-col rounded-[28px] bg-white shadow-[0_28px_80px_rgba(18,16,44,0.35)]'
              onClick={(event) => event.stopPropagation()}
            >
              <div className='flex shrink-0 items-start justify-between gap-4 border-b border-[#eceaf8] p-6'>
                <div>
                  <p className='text-xs font-semibold uppercase tracking-[0.22em] text-[#8a84ad]'>
                    {actionMode === 'create' ? 'Create Product' : 'Edit Product'}
                  </p>
                  <h3 className='mt-2 text-2xl font-bold text-[#212047]'>
                    {actionMode === 'create' ? 'Add new product' : 'Update product information'}
                  </h3>
                </div>
                <button
                  type='button'
                  onClick={closeOverlay}
                  className='shrink-0 rounded-full border border-[#e6e1f4] px-3 py-2 text-sm font-semibold text-[#5b567a] transition hover:bg-[#faf9ff]'
                >
                  Close
                </button>
              </div>

              <div className='flex-1 overflow-y-auto px-6 pt-6'>
                <div className='grid gap-4 md:grid-cols-2'>
                  <label className='space-y-2'>
                    <span className='text-xs font-semibold uppercase tracking-[0.18em] text-[#8a84ad]'>
                      Product name
                    </span>
                    <input
                      value={formState.name}
                      onChange={handleFormChange('name')}
                      className='h-11 w-full rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm text-[#25224a] outline-none focus:border-[#7a6ae0]'
                      placeholder='Enter product name'
                    />
                  </label>

                  <label className='space-y-2'>
                    <span className='text-xs font-semibold uppercase tracking-[0.18em] text-[#8a84ad]'>Status</span>
                    <select
                      value={formState.status}
                      onChange={handleFormChange('status')}
                      className='h-11 w-full rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm text-[#25224a] outline-none focus:border-[#7a6ae0]'
                    >
                      <option value='active'>active</option>
                      <option value='inactive'>inactive</option>
                    </select>
                  </label>

                  <label className='space-y-2'>
                    <span className='text-xs font-semibold uppercase tracking-[0.18em] text-[#8a84ad]'>Brand</span>
                    <select
                      value={formState.brandId}
                      onChange={handleFormChange('brandId')}
                      className='h-11 w-full rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm text-[#25224a] outline-none focus:border-[#7a6ae0]'
                    >
                      <option value=''>Select brand</option>
                      {brands.map((brand: BrandEntity) => (
                        <option key={brand._id} value={brand._id}>
                          {brand.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className='space-y-2'>
                    <span className='text-xs font-semibold uppercase tracking-[0.18em] text-[#8a84ad]'>Category</span>
                    <select
                      value={formState.categoryId}
                      onChange={handleFormChange('categoryId')}
                      className='h-11 w-full rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm text-[#25224a] outline-none focus:border-[#7a6ae0]'
                    >
                      <option value=''>Select category</option>
                      {categories.map((category: CategoryEntity) => (
                        <option key={category._id} value={category._id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className='space-y-2 md:col-span-2'>
                    <span className='text-xs font-semibold uppercase tracking-[0.18em] text-[#8a84ad]'>
                      Description
                    </span>
                    <textarea
                      value={formState.description}
                      onChange={handleFormChange('description')}
                      rows={3}
                      className='w-full rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] p-4 text-sm text-[#25224a] outline-none focus:border-[#7a6ae0]'
                      placeholder='Enter product description'
                    />
                  </label>

                  <label className='space-y-2 md:col-span-2'>
                    <span className='inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8a84ad]'>
                      <Tags className='h-3.5 w-3.5' />
                      Specification builder
                    </span>
                    <div className='space-y-3 rounded-2xl border border-dashed border-[#ddd7ef] bg-[#fcfbff] p-4'>
                      {formState.specificationFields.map((field, index) => (
                        <div key={`${field.key}-${index}`} className='grid gap-3 md:grid-cols-[1fr_1fr_auto]'>
                          <input
                            value={field.key}
                            onChange={(event) => updateSpecificationField(index, 'key', event.target.value)}
                            className='h-11 rounded-2xl border border-[#e5e1f3] bg-white px-4 text-sm text-[#25224a] outline-none focus:border-[#7a6ae0]'
                            placeholder='Key, e.g. ram'
                          />
                          <input
                            value={field.value}
                            onChange={(event) => updateSpecificationField(index, 'value', event.target.value)}
                            className='h-11 rounded-2xl border border-[#e5e1f3] bg-white px-4 text-sm text-[#25224a] outline-none focus:border-[#7a6ae0]'
                            placeholder='Value, e.g. 16GB'
                          />
                          <button
                            type='button'
                            onClick={() => removeSpecificationField(index)}
                            className='inline-flex h-11 items-center justify-center rounded-2xl border border-[#f0d6db] bg-white px-4 text-sm font-semibold text-[#c14f5f] transition hover:bg-[#fff6f7]'
                          >
                            <Trash2 className='h-4 w-4' />
                          </button>
                        </div>
                      ))}

                      <div className='flex flex-wrap items-center justify-between gap-3'>
                        <p className='text-xs leading-5 text-[#7c7796]'>
                          Mỗi dòng sẽ được lưu thành một key-value trong object specification.
                        </p>
                        <button
                          type='button'
                          onClick={addSpecificationField}
                          className='inline-flex h-10 items-center gap-2 rounded-full border border-[#ddd7ef] bg-white px-4 text-sm font-semibold text-[#5f5a7a] transition hover:bg-[#faf9ff]'
                        >
                          <Plus className='h-4 w-4' />
                          Add field
                        </button>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div className='flex shrink-0 flex-wrap items-center gap-3 border-t border-[#eceaf8] p-6'>
                <Button
                  type='button'
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className='inline-flex h-11 items-center gap-2 rounded-full bg-[#6f62cf] px-5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(111,98,207,0.28)] transition hover:bg-[#5f52bf]'
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Saving...'
                    : actionMode === 'create'
                      ? 'Create product'
                      : 'Save changes'}
                </Button>
                <button
                  type='button'
                  onClick={closeOverlay}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className='inline-flex h-11 items-center rounded-full border border-[#e0dbef] px-5 text-sm font-semibold text-[#544f72] transition hover:bg-[#faf9ff]'
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {selectedProduct && !actionMode && !deleteTarget && (
            <div
              className='relative flex w-full max-w-3xl max-h-[90vh] flex-col rounded-[28px] bg-white shadow-[0_28px_80px_rgba(18,16,44,0.35)]'
              onClick={(event) => event.stopPropagation()}
            >
              <div className='flex shrink-0 items-start justify-between gap-4 border-b border-[#eceaf8] p-6'>
                <div>
                  <p className='text-xs font-semibold uppercase tracking-[0.22em] text-[#8a84ad]'>Product Detail</p>
                  <h3 className='mt-2 text-2xl font-bold text-[#212047]'>{selectedProduct.name}</h3>
                  <p className='mt-1 text-sm text-[#7a7697]'>{selectedProduct.slug || 'No slug'}</p>
                </div>
                <button
                  type='button'
                  onClick={closeOverlay}
                  className='shrink-0 rounded-full border border-[#e6e1f4] px-3 py-2 text-sm font-semibold text-[#5b567a] transition hover:bg-[#faf9ff]'
                >
                  Close
                </button>
              </div>

              <div className='flex-1 overflow-y-auto px-6 pt-6 pb-6'>
                <div className='grid gap-4 sm:grid-cols-2'>
                  <div className='rounded-2xl border border-[#eceaf8] bg-[#fbfaff] p-4'>
                    <p className='text-xs uppercase tracking-[0.18em] text-[#8a84ad]'>Brand</p>
                    <p className='mt-2 text-sm font-semibold text-[#25224a]'>{getRefName(selectedProduct.brand_id)}</p>
                  </div>
                  <div className='rounded-2xl border border-[#eceaf8] bg-[#fbfaff] p-4'>
                    <p className='text-xs uppercase tracking-[0.18em] text-[#8a84ad]'>Category</p>
                    <p className='mt-2 text-sm font-semibold text-[#25224a]'>
                      {getRefName(selectedProduct.category_id)}
                    </p>
                  </div>
                  <div className='rounded-2xl border border-[#eceaf8] bg-[#fbfaff] p-4'>
                    <p className='text-xs uppercase tracking-[0.18em] text-[#8a84ad]'>Status</p>
                    <p className='mt-2 text-sm font-semibold text-[#25224a]'>{selectedProduct.status || 'N/A'}</p>
                  </div>
                  <div className='rounded-2xl border border-[#eceaf8] bg-[#fbfaff] p-4'>
                    <p className='text-xs uppercase tracking-[0.18em] text-[#8a84ad]'>Created</p>
                    <p className='mt-2 text-sm font-semibold text-[#25224a]'>
                      {formatDate(selectedProduct.createdAt || '')}
                    </p>
                  </div>
                  <div className='rounded-2xl border border-[#eceaf8] bg-[#fbfaff] p-4'>
                    <p className='text-xs uppercase tracking-[0.18em] text-[#8a84ad]'>Updated</p>
                    <p className='mt-2 text-sm font-semibold text-[#25224a]'>
                      {selectedProduct.updatedAt ? formatDate(selectedProduct.updatedAt) : 'N/A'}
                    </p>
                  </div>
                  <div className='rounded-2xl border border-[#eceaf8] bg-[#fbfaff] p-4'>
                    <p className='text-xs uppercase tracking-[0.18em] text-[#8a84ad]'>Product ID</p>
                    <p className='mt-2 break-all text-sm font-semibold text-[#25224a]'>{selectedProduct.id || 'N/A'}</p>
                  </div>
                  <div className='rounded-2xl border border-[#eceaf8] bg-[#fbfaff] p-4 sm:col-span-2'>
                    <p className='text-xs uppercase tracking-[0.18em] text-[#8a84ad]'>Description</p>
                    <p className='mt-2 text-sm font-semibold text-[#25224a]'>
                      {selectedProduct.description || 'No description'}
                    </p>
                  </div>
                  <div className='rounded-2xl border border-[#eceaf8] bg-[#fbfaff] p-4 sm:col-span-2'>
                    <p className='text-xs uppercase tracking-[0.18em] text-[#8a84ad]'>Product Images</p>

                    {selectedProductImagesQuery.isLoading ? (
                      <p className='mt-2 text-sm text-[#7a7697]'>Loading images...</p>
                    ) : selectedProductImages.length > 0 ? (
                      <div className='mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
                        {selectedProductImages.map((image: ProductImage) => (
                          <article
                            key={image._id}
                            className='overflow-hidden rounded-xl border border-[#e9e5f7] bg-white shadow-[0_8px_20px_rgba(37,34,74,0.04)]'
                          >
                            <div className='relative aspect-4/3 bg-[#f6f4ff]'>
                              <img
                                src={resolveAssetUrl(image.url)}
                                alt='Product'
                                className='h-full w-full object-cover'
                              />
                              {image.is_primary && (
                                <span className='absolute top-2 left-2 rounded-full bg-[#6f62cf] px-2 py-1 text-[10px] font-semibold text-white'>
                                  Primary
                                </span>
                              )}
                            </div>
                            <div className='flex items-center justify-between px-3 py-2'>
                              <p className='text-xs font-semibold text-[#6d688b]'>Sort: {image.sort_order ?? 0}</p>
                              <p className='truncate text-[11px] text-[#8b86aa]'>{image._id}</p>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className='mt-2 text-sm text-[#7a7697]'>No images</p>
                    )}
                  </div>
                  <div className='rounded-2xl border border-[#eceaf8] bg-[#fbfaff] p-4 sm:col-span-2'>
                    <p className='text-xs uppercase tracking-[0.18em] text-[#8a84ad]'>Variants</p>

                    {selectedProductVariantsQuery.isLoading ? (
                      <p className='mt-2 text-sm text-[#7a7697]'>Loading variants...</p>
                    ) : selectedProductVariants.length > 0 ? (
                      <div className='mt-3 space-y-3'>
                        {selectedProductVariants.map((variant: Variant) => (
                          <article
                            key={variant._id}
                            className='rounded-xl border border-[#e9e5f7] bg-white p-3 shadow-[0_8px_20px_rgba(37,34,74,0.04)]'
                          >
                            <div className='flex flex-wrap items-start justify-between gap-2'>
                              <p className='text-sm font-bold text-[#25224a]'>SKU: {variant.sku || 'N/A'}</p>
                              <p className='text-xs text-[#8b86aa]'>{variant._id}</p>
                            </div>
                            <div className='mt-2 grid gap-2 sm:grid-cols-3'>
                              <p className='text-xs text-[#5f5a7a]'>Price: {formatMoney(variant.price)}</p>
                              <p className='text-xs text-[#5f5a7a]'>Old price: {formatMoney(variant.old_price)}</p>
                              <p className='text-xs text-[#5f5a7a]'>Stock: {variant.stock ?? 'N/A'}</p>
                            </div>
                            <p className='mt-2 text-xs text-[#5f5a7a]'>
                              Attributes: {getVariantAttributesText(variant.attributes)}
                            </p>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className='mt-2 text-sm text-[#7a7697]'>No variants</p>
                    )}
                  </div>
                  <div className='rounded-2xl border border-[#eceaf8] bg-[#fbfaff] p-4 sm:col-span-2'>
                    <p className='inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#8a84ad]'>
                      <Tags className='h-3.5 w-3.5' />
                      Specification
                    </p>
                    <pre className='mt-2 overflow-auto rounded-xl bg-white p-3 text-xs text-[#25224a]'>
                      {JSON.stringify(selectedProduct.specification || {}, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}

          {deleteTarget && !actionMode && !selectedProduct && (
            <div
              className='relative flex w-full max-w-xl max-h-[90vh] flex-col rounded-[28px] bg-white shadow-[0_28px_80px_rgba(18,16,44,0.35)]'
              onClick={(event) => event.stopPropagation()}
            >
              <div className='flex shrink-0 items-start gap-4 border-b border-[#eceaf8] p-6'>
                <div className='flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#fff2f4] text-[#c84455]'>
                  <Trash2 className='h-6 w-6' />
                </div>
                <div>
                  <p className='text-xs font-semibold uppercase tracking-[0.22em] text-[#8a84ad]'>
                    Delete confirmation
                  </p>
                  <h3 className='mt-2 text-2xl font-bold text-[#212047]'>Remove this product?</h3>
                  <p className='mt-2 text-sm leading-6 text-[#6d6a8a]'>
                    Bạn đang xoá sản phẩm <span className='font-semibold text-[#25224a]'>{deleteTarget.name}</span>.
                  </p>
                </div>
              </div>

              <div className='flex shrink-0 gap-3 p-6'>
                <Button
                  type='button'
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className='inline-flex h-11 items-center gap-2 rounded-full bg-[#c84455] px-5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(200,68,85,0.22)] transition hover:bg-[#b93b4b]'
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                </Button>
                <button
                  type='button'
                  onClick={closeOverlay}
                  disabled={deleteMutation.isPending}
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
