import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FolderTree, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'react-toastify'

import Button from '../../components/Button'
import CrudActionButtons from '../../components/CrudActionButtons'
import Pagination from '../../components/Pagination'
import catalogApi from '../../apis/catalog.api'
import { useAuth } from '../../contexts/app.context'
import type { CategoryEntity } from '../../types/product.type'

type ActionMode = 'create' | 'edit' | null

type FormState = {
  name: string
  parentId: string
}

type FlatCategory = CategoryEntity & { level: number }

const defaultFormState: FormState = {
  name: '',
  parentId: ''
}

function flattenCategories(categories: CategoryEntity[], level = 0): FlatCategory[] {
  return categories.flatMap((category) => {
    const current: FlatCategory = { ...category, level }
    const children = category.children?.length ? flattenCategories(category.children, level + 1) : []
    return [current, ...children]
  })
}

function getParentName(item: FlatCategory, lookup: Map<string, string>) {
  if (!item.parent_id) return 'Root'
  return lookup.get(String(item.parent_id)) || String(item.parent_id)
}

export default function CategoriesPage() {
  const { role } = useAuth()
  const canManage = role === 'admin'
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(8)
  const [actionMode, setActionMode] = useState<ActionMode>(null)
  const [selectedCategory, setSelectedCategory] = useState<FlatCategory | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<FlatCategory | null>(null)
  const [formState, setFormState] = useState<FormState>(defaultFormState)

  const categoriesQuery = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const response = await catalogApi.listCategories()
      return flattenCategories(response.data)
    },
    placeholderData: (prev) => prev
  })

  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data])
  const nameLookup = useMemo(() => new Map(categories.map((item) => [item._id, item.name])), [categories])

  const filteredCategories = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return categories
    return categories.filter((item) => item.name.toLowerCase().includes(keyword) || (item.slug || '').includes(keyword))
  }, [categories, search])

  const totalItems = filteredCategories.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const paginated = filteredCategories.slice((safePage - 1) * pageSize, safePage * pageSize)

  const stats = useMemo(
    () => [
      { label: 'Total Categories', value: categories.length, tone: 'from-[#6f62cf] to-[#8a7bf2]' },
      {
        label: 'Root Categories',
        value: categories.filter((item) => !item.parent_id).length,
        tone: 'from-[#2fb67a] to-[#5dd7a0]'
      },
      {
        label: 'Sub Categories',
        value: categories.filter((item) => Boolean(item.parent_id)).length,
        tone: 'from-[#f08c44] to-[#f7b36d]'
      }
    ],
    [categories]
  )

  const createMutation = useMutation({
    mutationFn: () =>
      catalogApi.createCategory({
        name: formState.name.trim(),
        parent_id: formState.parentId || null
      }),
    onSuccess: (response) => {
      toast.success(response.data.message || 'Create category success')
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
      setCurrentPage(1)
      closeOverlay()
    }
  })

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!selectedCategory?._id) throw new Error('Missing category id')
      return catalogApi.updateCategory(selectedCategory._id, {
        name: formState.name.trim(),
        parent_id: formState.parentId || null
      })
    },
    onSuccess: (response) => {
      toast.success(response.data.message || 'Update category success')
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
      closeOverlay()
    }
  })

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!deleteTarget?._id) throw new Error('Missing category id')
      return catalogApi.removeCategory(deleteTarget._id)
    },
    onSuccess: (response) => {
      toast.success(response.data.message || 'Delete category success')
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
      closeOverlay()
    }
  })

  const openCreate = () => {
    setActionMode('create')
    setSelectedCategory(null)
    setFormState(defaultFormState)
  }

  const openEdit = (item: FlatCategory) => {
    setActionMode('edit')
    setSelectedCategory(item)
    setFormState({
      name: item.name,
      parentId: item.parent_id ? String(item.parent_id) : ''
    })
  }

  const closeOverlay = () => {
    setActionMode(null)
    setSelectedCategory(null)
    setDeleteTarget(null)
    setFormState(defaultFormState)
  }

  const handleSubmit = () => {
    if (!canManage) {
      toast.error('Bạn không có quyền thao tác category')
      return
    }

    if (!formState.name.trim()) {
      toast.error('Vui lòng nhập tên category')
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

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <section className='space-y-5 pb-4'>
      <div className='flex flex-wrap items-end justify-between gap-3'>
        <div>
          <p className='text-sm font-semibold uppercase tracking-[0.24em] text-[#8a84ad]'>Product Management</p>
          <h1 className='mt-2 text-3xl font-black tracking-tight text-[#201f47]'>Categories</h1>
          <p className='mt-2 max-w-2xl text-sm leading-6 text-[#6d6a8a]'>
            Quản lý cây danh mục sản phẩm đồng bộ với backend.
          </p>
        </div>

        {canManage && (
          <Button
            type='button'
            onClick={openCreate}
            className='inline-flex h-11 items-center gap-2 rounded-full bg-[#6f62cf] px-5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(111,98,207,0.28)] transition hover:bg-[#5f52bf]'
          >
            <Plus className='h-4 w-4' />
            Add Category
          </Button>
        )}
      </div>

      <div className='grid gap-4 sm:grid-cols-2 md:grid-cols-3'>
        {stats.map((item) => (
          <article
            key={item.label}
            className='overflow-hidden rounded-3xl border border-[#eceaf8] bg-white p-5 shadow-[0_12px_40px_rgba(28,24,70,0.06)]'
          >
            <div className={`mb-4 h-1.5 rounded-full bg-linear-to-r ${item.tone}`} />
            <p className='text-sm font-semibold text-[#8c88ac]'>{item.label}</p>
            <p className='mt-3 text-4xl font-black text-[#212047]'>{item.value}</p>
          </article>
        ))}
      </div>

      <div className='rounded-[30px] border border-[#eceaf8] bg-white p-5 shadow-[0_18px_50px_rgba(27,23,64,0.08)]'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <h2 className='text-xl font-bold text-[#212047]'>Category List</h2>
            <p className='mt-1 text-sm text-[#7a7697]'>{totalItems} category(s)</p>
          </div>

          <div className='relative w-full md:w-auto'>
            <Search className='pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#9d98bf]' />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setCurrentPage(1)
              }}
              type='text'
              placeholder='Search category...'
              className='h-11 w-full rounded-full border border-[#e5e1f3] bg-[#fbfaff] pr-4 pl-10 text-sm text-[#2d2950] outline-none transition focus:border-[#7a6ae0] focus:ring-2 focus:ring-[#b7abe6]/35 md:w-64'
            />
          </div>
        </div>

        <div className='mt-5 overflow-hidden rounded-[26px] border border-[#eceaf8]'>
          <div className='overflow-x-auto'>
            <table className='min-w-[760px] divide-y divide-[#eceaf8] md:min-w-full'>
              <thead className='bg-[#faf9ff] text-left text-xs font-bold uppercase tracking-[0.18em] text-[#7f7a9e]'>
                <tr>
                  <th className='px-4 py-4'>Category</th>
                  <th className='px-4 py-4'>Slug</th>
                  <th className='px-4 py-4'>Parent</th>
                  <th className='px-4 py-4 text-right'>Actions</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-[#f0edf8] bg-white'>
                {categoriesQuery.isLoading && !categoriesQuery.data ? (
                  <tr>
                    <td colSpan={4} className='px-4 py-16 text-center text-sm text-[#7a7697]'>
                      Loading categories...
                    </td>
                  </tr>
                ) : paginated.length > 0 ? (
                  paginated.map((item) => (
                    <tr key={item._id} className='transition hover:bg-[#fbfaff]'>
                      <td className='px-4 py-4'>
                        <p className='inline-flex items-center gap-2 text-sm font-semibold text-[#25224a]'>
                          <FolderTree className='h-4 w-4 text-[#8a84ad]' />
                          <span style={{ marginLeft: `${item.level * 12}px` }}>{item.name}</span>
                        </p>
                      </td>
                      <td className='px-4 py-4 text-sm text-[#5f5a7a]'>{item.slug || '-'}</td>
                      <td className='px-4 py-4 text-sm text-[#5f5a7a]'>{getParentName(item, nameLookup)}</td>
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
                    <td colSpan={4} className='px-4 py-12 text-center text-[#7a7697]'>
                      No categories found.
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
              itemLabel='categories'
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
                  {actionMode === 'create' ? 'Create category' : 'Update category'}
                </h3>
              </div>

              <div className='flex-1 overflow-y-auto px-6 pt-6'>
                <div className='space-y-4'>
                  <label className='block space-y-2'>
                    <span className='text-xs font-semibold uppercase tracking-[0.18em] text-[#8a84ad]'>Name</span>
                    <input
                      value={formState.name}
                      onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                      className='h-11 w-full rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm outline-none focus:border-[#7a6ae0]'
                      placeholder='Enter category name'
                    />
                  </label>

                  <label className='block space-y-2'>
                    <span className='text-xs font-semibold uppercase tracking-[0.18em] text-[#8a84ad]'>Parent</span>
                    <select
                      value={formState.parentId}
                      onChange={(event) => setFormState((prev) => ({ ...prev, parentId: event.target.value }))}
                      className='h-11 w-full rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm outline-none focus:border-[#7a6ae0]'
                    >
                      <option value=''>Root</option>
                      {categories
                        .filter((item) => item._id !== selectedCategory?._id)
                        .map((item) => (
                          <option key={item._id} value={item._id}>
                            {item.name}
                          </option>
                        ))}
                    </select>
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
                    <h3 className='mt-2 text-2xl font-bold text-[#212047]'>Remove this category?</h3>
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
