import { useMemo, useState, type ChangeEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'react-toastify'

import Button from '../../components/Button'
import CrudActionButtons from '../../components/CrudActionButtons'
import Pagination from '../../components/Pagination'
import catalogApi from '../../apis/catalog.api'
import { useAuth } from '../../contexts/app.context'
import { resolveAssetUrl } from '../../utils/common'
import type { BrandEntity } from '../../types/product.type'

type ActionMode = 'create' | 'edit' | null

type FormState = {
  name: string
}

const defaultFormState: FormState = { name: '' }

export default function BrandsPage() {
  const { role } = useAuth()
  const canManage = role === 'admin'
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(8)
  const [actionMode, setActionMode] = useState<ActionMode>(null)
  const [selectedBrand, setSelectedBrand] = useState<BrandEntity | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<BrandEntity | null>(null)
  const [formState, setFormState] = useState<FormState>(defaultFormState)
  const [logoFile, setLogoFile] = useState<File | null>(null)

  const brandsQuery = useQuery({
    queryKey: ['admin-brands'],
    queryFn: async () => {
      const response = await catalogApi.listBrands()
      return response.data
    },
    placeholderData: (prev) => prev
  })

  const brands = useMemo(() => brandsQuery.data ?? [], [brandsQuery.data])

  const filteredBrands = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return brands
    return brands.filter((item) => item.name.toLowerCase().includes(keyword))
  }, [brands, search])

  const totalItems = filteredBrands.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const paginated = filteredBrands.slice((safePage - 1) * pageSize, safePage * pageSize)

  const createMutation = useMutation({
    mutationFn: () => catalogApi.createBrand({ name: formState.name.trim(), logoFile }),
    onSuccess: (response) => {
      toast.success(response.data.message || 'Create brand success')
      queryClient.invalidateQueries({ queryKey: ['admin-brands'] })
      setCurrentPage(1)
      closeOverlay()
    }
  })

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!selectedBrand?._id) throw new Error('Missing brand id')
      return catalogApi.updateBrand(selectedBrand._id, { name: formState.name.trim(), logoFile })
    },
    onSuccess: (response) => {
      toast.success(response.data.message || 'Update brand success')
      queryClient.invalidateQueries({ queryKey: ['admin-brands'] })
      closeOverlay()
    }
  })

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!deleteTarget?._id) throw new Error('Missing brand id')
      return catalogApi.removeBrand(deleteTarget._id)
    },
    onSuccess: (response) => {
      toast.success(response.data.message || 'Delete brand success')
      queryClient.invalidateQueries({ queryKey: ['admin-brands'] })
      closeOverlay()
    }
  })

  const openCreate = () => {
    setActionMode('create')
    setSelectedBrand(null)
    setFormState(defaultFormState)
    setLogoFile(null)
  }

  const openEdit = (brand: BrandEntity) => {
    setActionMode('edit')
    setSelectedBrand(brand)
    setFormState({ name: brand.name })
    setLogoFile(null)
  }

  const closeOverlay = () => {
    setActionMode(null)
    setSelectedBrand(null)
    setDeleteTarget(null)
    setFormState(defaultFormState)
    setLogoFile(null)
  }

  const handleSubmit = () => {
    if (!canManage) {
      toast.error('Bạn không có quyền thao tác brand')
      return
    }

    if (!formState.name.trim()) {
      toast.error('Vui lòng nhập tên brand')
      return
    }

    if (actionMode === 'create') {
      createMutation.mutate()
      return
    }

    if (actionMode === 'edit') {
      updateMutation.mutate()
    }
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setLogoFile(file || null)
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <section className='space-y-5 pb-4'>
      <div className='flex flex-wrap items-end justify-between gap-3'>
        <div>
          <p className='text-sm font-semibold uppercase tracking-[0.24em] text-[#8a84ad]'>Product Management</p>
          <h1 className='mt-2 text-3xl font-black tracking-tight text-[#201f47]'>Brands</h1>
          <p className='mt-2 max-w-2xl text-sm leading-6 text-[#6d6a8a]'>
            Quản lý thương hiệu sản phẩm theo backend schema.
          </p>
        </div>

        {canManage && (
          <Button
            type='button'
            onClick={openCreate}
            className='inline-flex h-11 items-center gap-2 rounded-full bg-[#6f62cf] px-5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(111,98,207,0.28)] transition hover:bg-[#5f52bf]'
          >
            <Plus className='h-4 w-4' />
            Add Brand
          </Button>
        )}
      </div>

      <div className='rounded-[30px] border border-[#eceaf8] bg-white p-5 shadow-[0_18px_50px_rgba(27,23,64,0.08)]'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <h2 className='text-xl font-bold text-[#212047]'>Brand List</h2>
            <p className='mt-1 text-sm text-[#7a7697]'>{totalItems} brand(s)</p>
          </div>

          <div className='relative'>
            <Search className='pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#9d98bf]' />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setCurrentPage(1)
              }}
              type='text'
              placeholder='Search brand...'
              className='h-11 w-64 rounded-full border border-[#e5e1f3] bg-[#fbfaff] pr-4 pl-10 text-sm text-[#2d2950] outline-none transition focus:border-[#7a6ae0] focus:ring-2 focus:ring-[#b7abe6]/35'
            />
          </div>
        </div>

        <div className='mt-5 overflow-hidden rounded-[26px] border border-[#eceaf8]'>
          <div className='overflow-x-auto'>
            <table className='min-w-full divide-y divide-[#eceaf8]'>
              <thead className='bg-[#faf9ff] text-left text-xs font-bold uppercase tracking-[0.18em] text-[#7f7a9e]'>
                <tr>
                  <th className='px-4 py-4'>Brand</th>
                  <th className='px-4 py-4'>Logo</th>
                  <th className='px-4 py-4 text-right'>Actions</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-[#f0edf8] bg-white'>
                {brandsQuery.isLoading && !brandsQuery.data ? (
                  <tr>
                    <td colSpan={3} className='px-4 py-16 text-center text-sm text-[#7a7697]'>
                      Loading brands...
                    </td>
                  </tr>
                ) : paginated.length > 0 ? (
                  paginated.map((item) => (
                    <tr key={item._id} className='transition hover:bg-[#fbfaff]'>
                      <td className='px-4 py-4'>
                        <p className='inline-flex items-center gap-2 text-sm font-semibold text-[#25224a]'>
                          <Building2 className='h-4 w-4 text-[#8a84ad]' />
                          {item.name}
                        </p>
                      </td>
                      <td className='px-4 py-4'>
                        {item.logo ? (
                          <img
                            src={resolveAssetUrl(item.logo)}
                            alt={item.name}
                            className='h-10 w-10 rounded-xl border border-[#eceaf8] object-cover'
                          />
                        ) : (
                          <span className='text-xs text-[#8d88ab]'>No logo</span>
                        )}
                      </td>
                      <td className='px-4 py-4'>
                        <CrudActionButtons
                          onEdit={canManage ? () => openEdit(item) : undefined}
                          onDelete={canManage ? () => setDeleteTarget(item) : undefined}
                        />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className='px-4 py-12 text-center text-[#7a7697]'>
                      No brands found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className='border-t border-[#eceaf8] p-4'>
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
              itemLabel='brands'
            />
          </div>
        </div>
      </div>

      {(actionMode || deleteTarget) && (
        <div
          className='fixed inset-0 z-40 flex items-center justify-center bg-[#191530]/55 px-4 py-8 backdrop-blur-sm'
          onClick={closeOverlay}
        >
          {actionMode && (
            <div
              className='relative flex w-full max-w-xl max-h-[90vh] flex-col rounded-[28px] bg-white shadow-[0_28px_80px_rgba(18,16,44,0.35)]'
              onClick={(event) => event.stopPropagation()}
            >
              <div className='flex-shrink-0 border-b border-[#eceaf8] p-6'>
                <h3 className='text-2xl font-bold text-[#212047]'>
                  {actionMode === 'create' ? 'Create brand' : 'Update brand'}
                </h3>
              </div>

              <div className='flex-1 overflow-y-auto px-6 pt-6'>
                <div className='space-y-4'>
                  <label className='block space-y-2'>
                    <span className='text-xs font-semibold uppercase tracking-[0.18em] text-[#8a84ad]'>Name</span>
                    <input
                      value={formState.name}
                      onChange={(event) => setFormState({ name: event.target.value })}
                      className='h-11 w-full rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm outline-none focus:border-[#7a6ae0]'
                      placeholder='Enter brand name'
                    />
                  </label>

                  <label className='block space-y-2'>
                    <span className='text-xs font-semibold uppercase tracking-[0.18em] text-[#8a84ad]'>Logo</span>
                    <input
                      type='file'
                      accept='image/*'
                      onChange={handleFileChange}
                      className='w-full rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-3 py-2 text-sm outline-none'
                    />
                  </label>
                </div>
              </div>

              <div className='flex flex-shrink-0 gap-3 border-t border-[#eceaf8] p-6'>
                <Button
                  type='button'
                  onClick={handleSubmit}
                  disabled={isSaving}
                  className='inline-flex h-11 items-center rounded-full bg-[#6f62cf] px-5 text-sm font-semibold text-white'
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
                <button
                  type='button'
                  onClick={closeOverlay}
                  disabled={isSaving}
                  className='inline-flex h-11 items-center rounded-full border border-[#e0dbef] px-5 text-sm font-semibold text-[#544f72]'
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {deleteTarget && !actionMode && (
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
                    <h3 className='mt-2 text-2xl font-bold text-[#212047]'>Remove this brand?</h3>
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
                  onClick={closeOverlay}
                  disabled={deleteMutation.isPending}
                  className='inline-flex h-11 items-center rounded-full border border-[#e0dbef] px-5 text-sm font-semibold text-[#544f72]'
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
