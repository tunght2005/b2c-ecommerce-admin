import { useMemo, useState, type ChangeEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'react-toastify'

import Button from '../../components/Button'
import CrudActionButtons from '../../components/CrudActionButtons'
import catalogApi from '../../apis/catalog.api'
import { useAuth } from '../../contexts/app.context'
import type {
  Attribute,
  AttributeGroup,
  CreateOrUpdateVariantPayload,
  ProductListForSelection,
  Variant
} from '../../types/catalog.type'

type GroupAction = 'create' | 'edit' | null

type AttributeAction = 'create' | 'edit' | null

type VariantAction = 'create' | 'edit' | null

type VariantFormState = {
  sku: string
  price: string
  oldPrice: string
  stock: string
  attributes: string[]
}

type SkuMode = 'auto' | 'manual'

const defaultVariantForm: VariantFormState = {
  sku: '',
  price: '',
  oldPrice: '',
  stock: '',
  attributes: []
}

function getGroupId(group: Attribute['group_id']) {
  return typeof group === 'string' ? group : group?._id || ''
}

function getGroupName(group: Attribute['group_id']) {
  return typeof group === 'string' ? group : group?.name || 'N/A'
}

function getAttributeName(attribute: Variant['attributes'][number], lookup: Map<string, string>) {
  const id = typeof attribute === 'string' ? attribute : attribute._id
  return lookup.get(id) || (typeof attribute === 'string' ? attribute : attribute.name || attribute._id)
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function buildAutoSku(productName: string, attributeNames: string[]) {
  const productPart = slugify(productName) || 'product'
  const attributePart = attributeNames
    .map((name) => slugify(name).slice(0, 4))
    .filter(Boolean)
    .join('-')
  const suffix = Date.now().toString(36).slice(-4)

  return [productPart, attributePart, suffix].filter(Boolean).join('-').toUpperCase()
}

export default function AttributesVariantsPage() {
  const { role } = useAuth()
  const canManage = role === 'admin'
  const queryClient = useQueryClient()

  const [selectedProductId, setSelectedProductId] = useState('')
  const [attributeSearch, setAttributeSearch] = useState('')
  const [groupAction, setGroupAction] = useState<GroupAction>(null)
  const [attributeAction, setAttributeAction] = useState<AttributeAction>(null)
  const [variantAction, setVariantAction] = useState<VariantAction>(null)

  const [selectedGroup, setSelectedGroup] = useState<AttributeGroup | null>(null)
  const [selectedAttribute, setSelectedAttribute] = useState<Attribute | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null)

  const [groupName, setGroupName] = useState('')
  const [attributeName, setAttributeName] = useState('')
  const [attributeGroupId, setAttributeGroupId] = useState('')
  const [variantForm, setVariantForm] = useState<VariantFormState>(defaultVariantForm)
  const [skuMode, setSkuMode] = useState<SkuMode>('auto')

  const [deleteGroupTarget, setDeleteGroupTarget] = useState<AttributeGroup | null>(null)
  const [deleteAttributeTarget, setDeleteAttributeTarget] = useState<Attribute | null>(null)
  const [deleteVariantTarget, setDeleteVariantTarget] = useState<Variant | null>(null)

  const productsQuery = useQuery({
    queryKey: ['products-options-for-variants'],
    queryFn: async () => {
      const response = await catalogApi.listProducts()
      return response.data
    }
  })

  const groupsQuery = useQuery({
    queryKey: ['attribute-groups'],
    queryFn: async () => {
      const response = await catalogApi.listAttributeGroups()
      return response.data
    }
  })

  const attributesQuery = useQuery({
    queryKey: ['attributes'],
    queryFn: async () => {
      const response = await catalogApi.listAttributes()
      return response.data
    }
  })

  const variantsQuery = useQuery({
    queryKey: ['variants-by-product', selectedProductId],
    enabled: Boolean(selectedProductId),
    queryFn: async () => {
      const response = await catalogApi.listVariantsByProduct(selectedProductId)
      return response.data
    },
    placeholderData: (prev) => prev
  })

  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data])
  const groups = useMemo(() => groupsQuery.data ?? [], [groupsQuery.data])
  const attributes = useMemo(() => attributesQuery.data ?? [], [attributesQuery.data])
  const variants = useMemo(() => variantsQuery.data ?? [], [variantsQuery.data])

  const attributeLookup = useMemo(() => new Map(attributes.map((item) => [item._id, item.name])), [attributes])

  const filteredAttributes = useMemo(() => {
    const keyword = attributeSearch.trim().toLowerCase()
    if (!keyword) return attributes
    return attributes.filter(
      (item) => item.name.toLowerCase().includes(keyword) || getGroupName(item.group_id).toLowerCase().includes(keyword)
    )
  }, [attributes, attributeSearch])

  function updateAutoSku(nextProductId: string, nextAttributeIds: string[]) {
    if (variantAction !== 'create' || skuMode !== 'auto') {
      return
    }

    const productName = products.find((item) => (item.id || item._id || '') === nextProductId)?.name || ''
    if (!productName) return

    const nextAttributeNames = nextAttributeIds
      .map((attributeId) => attributeLookup.get(attributeId))
      .filter((name): name is string => Boolean(name))

    setVariantForm((prev) => ({
      ...prev,
      sku: buildAutoSku(productName, nextAttributeNames)
    }))
  }

  const createGroupMutation = useMutation({
    mutationFn: () => catalogApi.createAttributeGroup({ name: groupName.trim() }),
    onSuccess: () => {
      toast.success('Create attribute group success')
      queryClient.invalidateQueries({ queryKey: ['attribute-groups'] })
      closeAllOverlays()
    }
  })

  const updateGroupMutation = useMutation({
    mutationFn: () => {
      if (!selectedGroup?._id) throw new Error('Missing group id')
      return catalogApi.updateAttributeGroup(selectedGroup._id, { name: groupName.trim() })
    },
    onSuccess: () => {
      toast.success('Update attribute group success')
      queryClient.invalidateQueries({ queryKey: ['attribute-groups'] })
      closeAllOverlays()
    }
  })

  const deleteGroupMutation = useMutation({
    mutationFn: () => {
      if (!deleteGroupTarget?._id) throw new Error('Missing group id')
      return catalogApi.removeAttributeGroup(deleteGroupTarget._id)
    },
    onSuccess: (response) => {
      toast.success(response.data.message || 'Delete attribute group success')
      queryClient.invalidateQueries({ queryKey: ['attribute-groups'] })
      queryClient.invalidateQueries({ queryKey: ['attributes'] })
      closeAllOverlays()
    }
  })

  const createAttributeMutation = useMutation({
    mutationFn: () =>
      catalogApi.createAttribute({
        name: attributeName.trim(),
        group_id: attributeGroupId
      }),
    onSuccess: (response) => {
      toast.success(response.data.message || 'Create attribute success')
      queryClient.invalidateQueries({ queryKey: ['attributes'] })
      closeAllOverlays()
    }
  })

  const updateAttributeMutation = useMutation({
    mutationFn: () => {
      if (!selectedAttribute?._id) throw new Error('Missing attribute id')
      return catalogApi.updateAttribute(selectedAttribute._id, {
        name: attributeName.trim(),
        group_id: attributeGroupId
      })
    },
    onSuccess: (response) => {
      toast.success(response.data.message || 'Update attribute success')
      queryClient.invalidateQueries({ queryKey: ['attributes'] })
      queryClient.invalidateQueries({ queryKey: ['variants-by-product'] })
      closeAllOverlays()
    }
  })

  const deleteAttributeMutation = useMutation({
    mutationFn: () => {
      if (!deleteAttributeTarget?._id) throw new Error('Missing attribute id')
      return catalogApi.removeAttribute(deleteAttributeTarget._id)
    },
    onSuccess: (response) => {
      toast.success(response.data.message || 'Delete attribute success')
      queryClient.invalidateQueries({ queryKey: ['attributes'] })
      queryClient.invalidateQueries({ queryKey: ['variants-by-product'] })
      closeAllOverlays()
    }
  })

  const createVariantMutation = useMutation({
    mutationFn: () => catalogApi.createVariant(buildVariantPayload()),
    onSuccess: (response) => {
      toast.success(response.data.message || 'Create variant success')
      queryClient.invalidateQueries({ queryKey: ['variants-by-product', selectedProductId] })
      closeAllOverlays()
    }
  })

  const updateVariantMutation = useMutation({
    mutationFn: () => {
      if (!selectedVariant?._id) throw new Error('Missing variant id')
      return catalogApi.updateVariant(selectedVariant._id, buildVariantPayload())
    },
    onSuccess: (response) => {
      toast.success(response.data.message || 'Update variant success')
      queryClient.invalidateQueries({ queryKey: ['variants-by-product', selectedProductId] })
      closeAllOverlays()
    }
  })

  const deleteVariantMutation = useMutation({
    mutationFn: () => {
      if (!deleteVariantTarget?._id) throw new Error('Missing variant id')
      return catalogApi.removeVariant(deleteVariantTarget._id)
    },
    onSuccess: (response) => {
      toast.success(response.data.message || 'Delete variant success')
      queryClient.invalidateQueries({ queryKey: ['variants-by-product', selectedProductId] })
      closeAllOverlays()
    }
  })

  function buildVariantPayload(): CreateOrUpdateVariantPayload {
    const payload: CreateOrUpdateVariantPayload = {
      product_id: selectedProductId,
      sku: variantForm.sku.trim(),
      attributes: variantForm.attributes
    }

    if (variantForm.price.trim()) payload.price = Number(variantForm.price)
    if (variantForm.oldPrice.trim()) payload.old_price = Number(variantForm.oldPrice)
    if (variantForm.stock.trim()) payload.stock = Number(variantForm.stock)

    return payload
  }

  function openCreateGroup() {
    setGroupAction('create')
    setSelectedGroup(null)
    setGroupName('')
  }

  function openEditGroup(item: AttributeGroup) {
    setGroupAction('edit')
    setSelectedGroup(item)
    setGroupName(item.name)
  }

  function openCreateAttribute() {
    setAttributeAction('create')
    setSelectedAttribute(null)
    setAttributeName('')
    setAttributeGroupId(groups[0]?._id || '')
  }

  function openEditAttribute(item: Attribute) {
    setAttributeAction('edit')
    setSelectedAttribute(item)
    setAttributeName(item.name)
    setAttributeGroupId(getGroupId(item.group_id))
  }

  function openCreateVariant() {
    if (!selectedProductId) {
      toast.error('Vui lòng chọn product trước khi tạo variant')
      return
    }
    setVariantAction('create')
    setSelectedVariant(null)
    setSkuMode('auto')
    const productName = products.find((item) => (item.id || item._id || '') === selectedProductId)?.name || ''
    setVariantForm({
      ...defaultVariantForm,
      sku: buildAutoSku(productName, [])
    })
  }

  function openEditVariant(item: Variant) {
    setVariantAction('edit')
    setSelectedVariant(item)
    setSkuMode('manual')
    setVariantForm({
      sku: item.sku,
      price: String(item.price || ''),
      oldPrice: String(item.old_price || ''),
      stock: String(item.stock || ''),
      attributes: item.attributes.map((attribute) => (typeof attribute === 'string' ? attribute : attribute._id))
    })
  }

  function closeAllOverlays() {
    setGroupAction(null)
    setAttributeAction(null)
    setVariantAction(null)
    setSelectedGroup(null)
    setSelectedAttribute(null)
    setSelectedVariant(null)
    setDeleteGroupTarget(null)
    setDeleteAttributeTarget(null)
    setDeleteVariantTarget(null)
    setGroupName('')
    setAttributeName('')
    setAttributeGroupId('')
    setVariantForm(defaultVariantForm)
    setSkuMode('auto')
  }

  function handleSubmitGroup() {
    if (!canManage) {
      toast.error('Bạn không có quyền thao tác attribute group')
      return
    }
    if (!groupName.trim()) {
      toast.error('Vui lòng nhập tên group')
      return
    }

    if (groupAction === 'create') createGroupMutation.mutate()
    if (groupAction === 'edit') updateGroupMutation.mutate()
  }

  function handleSubmitAttribute() {
    if (!canManage) {
      toast.error('Bạn không có quyền thao tác attribute')
      return
    }
    if (!attributeName.trim()) {
      toast.error('Vui lòng nhập tên attribute')
      return
    }
    if (!attributeGroupId) {
      toast.error('Vui lòng chọn group')
      return
    }

    if (attributeAction === 'create') createAttributeMutation.mutate()
    if (attributeAction === 'edit') updateAttributeMutation.mutate()
  }

  function handleSubmitVariant() {
    if (!canManage) {
      toast.error('Bạn không có quyền thao tác variant')
      return
    }
    if (!selectedProductId) {
      toast.error('Vui lòng chọn product')
      return
    }
    if (!variantForm.sku.trim()) {
      toast.error('Vui lòng nhập SKU')
      return
    }

    if (variantAction === 'create') createVariantMutation.mutate()
    if (variantAction === 'edit') updateVariantMutation.mutate()
  }

  const productsOptions = products.map((item: ProductListForSelection) => ({
    id: item.id || item._id || '',
    name: item.name
  }))

  return (
    <section className='space-y-5 pb-4'>
      <div>
        <p className='text-sm font-semibold uppercase tracking-[0.24em] text-[#8a84ad]'>Product Management</p>
        <h1 className='mt-2 text-3xl font-black tracking-tight text-[#201f47]'>Attributes & Variants</h1>
        <p className='mt-2 max-w-3xl text-sm leading-6 text-[#6d6a8a]'>
          Quản lý attribute groups, attributes và variants theo sản phẩm.
        </p>
      </div>

      <div className='grid gap-4 xl:grid-cols-2'>
        <div className='rounded-3xl border border-[#eceaf8] bg-white p-5 shadow-[0_14px_40px_rgba(27,23,64,0.07)]'>
          <div className='mb-4 flex items-center justify-between gap-2'>
            <h2 className='text-lg font-bold text-[#212047]'>Attribute Groups</h2>
            {canManage && (
              <Button
                type='button'
                onClick={openCreateGroup}
                className='inline-flex h-9 items-center gap-2 rounded-full bg-[#6f62cf] px-4 text-xs font-semibold text-white'
              >
                <Plus className='h-3.5 w-3.5' /> Add Group
              </Button>
            )}
          </div>

          <div className='space-y-2'>
            {groups.map((group) => (
              <div
                key={group._id}
                className='flex items-center justify-between rounded-2xl border border-[#eceaf8] px-4 py-3'
              >
                <p className='font-semibold text-[#25224a]'>{group.name}</p>
                <CrudActionButtons
                  onEdit={canManage ? () => openEditGroup(group) : undefined}
                  onDelete={canManage ? () => setDeleteGroupTarget(group) : undefined}
                />
              </div>
            ))}
            {!groups.length && <p className='text-sm text-[#7a7697]'>No attribute groups.</p>}
          </div>
        </div>

        <div className='rounded-3xl border border-[#eceaf8] bg-white p-5 shadow-[0_14px_40px_rgba(27,23,64,0.07)]'>
          <div className='mb-4 flex items-center justify-between gap-2'>
            <h2 className='text-lg font-bold text-[#212047]'>Attributes</h2>
            {canManage && (
              <Button
                type='button'
                onClick={openCreateAttribute}
                className='inline-flex h-9 items-center gap-2 rounded-full bg-[#6f62cf] px-4 text-xs font-semibold text-white'
              >
                <Plus className='h-3.5 w-3.5' /> Add Attribute
              </Button>
            )}
          </div>

          <div className='relative mb-3'>
            <Search className='pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#9d98bf]' />
            <input
              value={attributeSearch}
              onChange={(event) => setAttributeSearch(event.target.value)}
              placeholder='Search attribute...'
              className='h-10 w-full rounded-full border border-[#e5e1f3] bg-[#fbfaff] pr-4 pl-10 text-sm outline-none focus:border-[#7a6ae0]'
            />
          </div>

          <div className='max-h-80 space-y-2 overflow-auto pr-1'>
            {filteredAttributes.map((attribute) => (
              <div
                key={attribute._id}
                className='flex items-center justify-between rounded-2xl border border-[#eceaf8] px-4 py-3'
              >
                <div>
                  <p className='font-semibold text-[#25224a]'>{attribute.name}</p>
                  <p className='text-xs text-[#7a7697]'>{getGroupName(attribute.group_id)}</p>
                </div>
                <CrudActionButtons
                  onEdit={canManage ? () => openEditAttribute(attribute) : undefined}
                  onDelete={canManage ? () => setDeleteAttributeTarget(attribute) : undefined}
                />
              </div>
            ))}
            {!filteredAttributes.length && <p className='text-sm text-[#7a7697]'>No attributes.</p>}
          </div>
        </div>
      </div>

      <div className='rounded-[30px] border border-[#eceaf8] bg-white p-5 shadow-[0_18px_50px_rgba(27,23,64,0.08)]'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <h2 className='text-xl font-bold text-[#212047]'>Variants</h2>
            <p className='mt-1 text-sm text-[#7a7697]'>Chọn sản phẩm để xem và quản lý variants</p>
          </div>

          <div className='flex items-center gap-3'>
            <select
              value={selectedProductId}
              onChange={(event) => {
                const nextProductId = event.target.value
                setSelectedProductId(nextProductId)
                updateAutoSku(nextProductId, variantForm.attributes)
              }}
              className='h-11 min-w-64 rounded-full border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm outline-none'
            >
              <option value=''>Select product</option>
              {productsOptions.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>

            {canManage && (
              <Button
                type='button'
                onClick={openCreateVariant}
                className='inline-flex h-11 items-center gap-2 rounded-full bg-[#6f62cf] px-5 text-sm font-semibold text-white'
              >
                <Plus className='h-4 w-4' />
                Add Variant
              </Button>
            )}
          </div>
        </div>

        <div className='mt-5 overflow-hidden rounded-[26px] border border-[#eceaf8]'>
          <div className='overflow-x-auto'>
            <table className='min-w-full divide-y divide-[#eceaf8]'>
              <thead className='bg-[#faf9ff] text-left text-xs font-bold uppercase tracking-[0.18em] text-[#7f7a9e]'>
                <tr>
                  <th className='px-4 py-4'>SKU</th>
                  <th className='px-4 py-4'>Price</th>
                  <th className='px-4 py-4'>Stock</th>
                  <th className='px-4 py-4'>Attributes</th>
                  <th className='px-4 py-4 text-right'>Actions</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-[#f0edf8] bg-white'>
                {!selectedProductId ? (
                  <tr>
                    <td colSpan={5} className='px-4 py-12 text-center text-[#7a7697]'>
                      Select a product to load variants.
                    </td>
                  </tr>
                ) : variantsQuery.isLoading && !variantsQuery.data ? (
                  <tr>
                    <td colSpan={5} className='px-4 py-12 text-center text-[#7a7697]'>
                      Loading variants...
                    </td>
                  </tr>
                ) : variants.length > 0 ? (
                  variants.map((variant) => (
                    <tr key={variant._id} className='transition hover:bg-[#fbfaff]'>
                      <td className='px-4 py-4 font-semibold text-[#25224a]'>{variant.sku}</td>
                      <td className='px-4 py-4 text-sm text-[#5f5a7a]'>${variant.price || 0}</td>
                      <td className='px-4 py-4 text-sm text-[#5f5a7a]'>{variant.stock || 0}</td>
                      <td className='px-4 py-4 text-sm text-[#5f5a7a]'>
                        {variant.attributes
                          .map((attribute) => getAttributeName(attribute, attributeLookup))
                          .join(', ') || 'N/A'}
                      </td>
                      <td className='px-4 py-4'>
                        <CrudActionButtons
                          onEdit={canManage ? () => openEditVariant(variant) : undefined}
                          onDelete={canManage ? () => setDeleteVariantTarget(variant) : undefined}
                        />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className='px-4 py-12 text-center text-[#7a7697]'>
                      No variants found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {(groupAction ||
        attributeAction ||
        variantAction ||
        deleteGroupTarget ||
        deleteAttributeTarget ||
        deleteVariantTarget) && (
        <div
          className='fixed inset-0 z-40 flex items-center justify-center bg-[#191530]/55 px-4 py-8 backdrop-blur-sm'
          onClick={closeAllOverlays}
        >
          {groupAction && (
            <div
              className='flex w-full max-w-lg max-h-[90vh] flex-col rounded-3xl bg-white'
              onClick={(event) => event.stopPropagation()}
            >
              <div className='shrink-0 border-b border-[#eceaf8] p-6'>
                <h3 className='text-xl font-bold text-[#212047]'>
                  {groupAction === 'create' ? 'Create group' : 'Update group'}
                </h3>
              </div>
              <div className='flex-1 overflow-y-auto px-6 pt-6'>
                <input
                  value={groupName}
                  onChange={(event) => setGroupName(event.target.value)}
                  placeholder='Group name'
                  className='h-11 w-full rounded-2xl border border-[#e5e1f3] px-4 text-sm outline-none focus:border-[#7a6ae0]'
                />
              </div>
              <div className='flex shrink-0 gap-3 border-t border-[#eceaf8] p-6'>
                <Button
                  type='button'
                  onClick={handleSubmitGroup}
                  disabled={createGroupMutation.isPending || updateGroupMutation.isPending}
                  className='h-10 rounded-full bg-[#6f62cf] px-4 text-sm font-semibold text-white'
                >
                  Save
                </Button>
                <button type='button' onClick={closeAllOverlays} className='h-10 rounded-full border px-4 text-sm'>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {attributeAction && (
            <div
              className='flex w-full max-w-lg max-h-[90vh] flex-col rounded-3xl bg-white'
              onClick={(event) => event.stopPropagation()}
            >
              <div className='shrink-0 border-b border-[#eceaf8] p-6'>
                <h3 className='text-xl font-bold text-[#212047]'>
                  {attributeAction === 'create' ? 'Create attribute' : 'Update attribute'}
                </h3>
              </div>
              <div className='flex-1 overflow-y-auto px-6 pt-6'>
                <div className='space-y-3'>
                  <input
                    value={attributeName}
                    onChange={(event) => setAttributeName(event.target.value)}
                    placeholder='Attribute name'
                    className='h-11 w-full rounded-2xl border border-[#e5e1f3] px-4 text-sm outline-none focus:border-[#7a6ae0]'
                  />
                  <select
                    value={attributeGroupId}
                    onChange={(event) => setAttributeGroupId(event.target.value)}
                    className='h-11 w-full rounded-2xl border border-[#e5e1f3] px-4 text-sm outline-none focus:border-[#7a6ae0]'
                  >
                    <option value=''>Select group</option>
                    {groups.map((group) => (
                      <option key={group._id} value={group._id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className='flex shrink-0 gap-3 border-t border-[#eceaf8] p-6'>
                <Button
                  type='button'
                  onClick={handleSubmitAttribute}
                  disabled={createAttributeMutation.isPending || updateAttributeMutation.isPending}
                  className='h-10 rounded-full bg-[#6f62cf] px-4 text-sm font-semibold text-white'
                >
                  Save
                </Button>
                <button type='button' onClick={closeAllOverlays} className='h-10 rounded-full border px-4 text-sm'>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {variantAction && (
            <div
              className='flex w-full max-w-2xl max-h-[90vh] flex-col rounded-3xl bg-white'
              onClick={(event) => event.stopPropagation()}
            >
              <div className='shrink-0 border-b border-[#eceaf8] p-6'>
                <h3 className='text-xl font-bold text-[#212047]'>
                  {variantAction === 'create' ? 'Create variant' : 'Update variant'}
                </h3>
              </div>
              <div className='flex-1 overflow-y-auto px-6 pt-6'>
                <div className='grid gap-3 md:grid-cols-2'>
                  <input
                    value={variantForm.sku}
                    onChange={(event) => {
                      setSkuMode('manual')
                      setVariantForm((prev) => ({ ...prev, sku: event.target.value }))
                    }}
                    placeholder='SKU'
                    className='h-11 rounded-2xl border border-[#e5e1f3] px-4 text-sm outline-none focus:border-[#7a6ae0]'
                  />
                  <input
                    value={variantForm.stock}
                    onChange={(event) => setVariantForm((prev) => ({ ...prev, stock: event.target.value }))}
                    placeholder='Stock'
                    type='number'
                    className='h-11 rounded-2xl border border-[#e5e1f3] px-4 text-sm outline-none focus:border-[#7a6ae0]'
                  />
                  <input
                    value={variantForm.price}
                    onChange={(event) => setVariantForm((prev) => ({ ...prev, price: event.target.value }))}
                    placeholder='Price'
                    type='number'
                    className='h-11 rounded-2xl border border-[#e5e1f3] px-4 text-sm outline-none focus:border-[#7a6ae0]'
                  />
                  <input
                    value={variantForm.oldPrice}
                    onChange={(event) => setVariantForm((prev) => ({ ...prev, oldPrice: event.target.value }))}
                    placeholder='Old price'
                    type='number'
                    className='h-11 rounded-2xl border border-[#e5e1f3] px-4 text-sm outline-none focus:border-[#7a6ae0]'
                  />
                </div>

                {variantAction === 'create' && (
                  <div className='mt-3 flex flex-wrap items-center gap-3'>
                    <Button
                      type='button'
                      onClick={() => {
                        setSkuMode('auto')
                        updateAutoSku(selectedProductId, variantForm.attributes)
                      }}
                      className='inline-flex h-9 items-center rounded-full border border-[#d9d3ef] bg-white px-4 text-xs font-semibold text-[#5f5a7a]'
                    >
                      Regenerate SKU
                    </Button>
                    <p className='text-xs text-[#7a7697]'>
                      SKU sẽ tự sinh theo product và attributes, nhưng bạn vẫn có thể sửa tay.
                    </p>
                  </div>
                )}

                <div className='mt-4'>
                  <p className='mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8a84ad]'>Attributes</p>
                  <div className='max-h-40 overflow-auto rounded-2xl border border-[#e5e1f3] p-3'>
                    {attributes.map((attribute) => {
                      const checked = variantForm.attributes.includes(attribute._id)
                      return (
                        <label key={attribute._id} className='flex items-center gap-2 py-1 text-sm text-[#25224a]'>
                          <input
                            type='checkbox'
                            checked={checked}
                            onChange={(event: ChangeEvent<HTMLInputElement>) => {
                              const nextAttributes = event.target.checked
                                ? [...variantForm.attributes, attribute._id]
                                : variantForm.attributes.filter((id) => id !== attribute._id)

                              setVariantForm((prev) => ({
                                ...prev,
                                attributes: event.target.checked
                                  ? [...prev.attributes, attribute._id]
                                  : prev.attributes.filter((id) => id !== attribute._id)
                              }))

                              updateAutoSku(selectedProductId, nextAttributes)
                            }}
                          />
                          <span>{attribute.name}</span>
                          <span className='text-xs text-[#8d88ab]'>({getGroupName(attribute.group_id)})</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              </div>
              <div className='flex shrink-0 gap-3 border-t border-[#eceaf8] p-6'>
                <Button
                  type='button'
                  onClick={handleSubmitVariant}
                  disabled={createVariantMutation.isPending || updateVariantMutation.isPending}
                  className='h-10 rounded-full bg-[#6f62cf] px-4 text-sm font-semibold text-white'
                >
                  Save
                </Button>
                <button type='button' onClick={closeAllOverlays} className='h-10 rounded-full border px-4 text-sm'>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {(deleteGroupTarget || deleteAttributeTarget || deleteVariantTarget) &&
            !groupAction &&
            !attributeAction &&
            !variantAction && (
              <div
                className='flex w-full max-w-xl max-h-[90vh] flex-col rounded-3xl bg-white'
                onClick={(event) => event.stopPropagation()}
              >
                <div className='shrink-0 border-b border-[#eceaf8] p-6'>
                  <div className='flex items-start gap-4'>
                    <div className='flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#fff2f4] text-[#c84455]'>
                      <Trash2 className='h-6 w-6' />
                    </div>
                    <div>
                      <p className='text-xs font-semibold uppercase tracking-[0.22em] text-[#8a84ad]'>
                        Delete confirmation
                      </p>
                      <h3 className='mt-2 text-2xl font-bold text-[#212047]'>Remove this item?</h3>
                    </div>
                  </div>
                </div>

                <div className='flex shrink-0 gap-3 p-6'>
                  <Button
                    type='button'
                    onClick={() => {
                      if (deleteGroupTarget) deleteGroupMutation.mutate()
                      if (deleteAttributeTarget) deleteAttributeMutation.mutate()
                      if (deleteVariantTarget) deleteVariantMutation.mutate()
                    }}
                    disabled={
                      deleteGroupMutation.isPending ||
                      deleteAttributeMutation.isPending ||
                      deleteVariantMutation.isPending
                    }
                    className='inline-flex h-11 items-center rounded-full bg-[#c84455] px-5 text-sm font-semibold text-white'
                  >
                    Delete
                  </Button>
                  <button type='button' onClick={closeAllOverlays} className='h-11 rounded-full border px-5 text-sm'>
                    Cancel
                  </button>
                </div>
              </div>
            )}
        </div>
      )}

      <div className='grid gap-4 md:grid-cols-3'>
        <div className='rounded-3xl border border-[#eceaf8] bg-white p-5'>
          <p className='text-sm font-semibold text-[#8c88ac]'>Attribute Groups</p>
          <p className='mt-2 text-4xl font-black text-[#212047]'>{groups.length}</p>
        </div>
        <div className='rounded-3xl border border-[#eceaf8] bg-white p-5'>
          <p className='text-sm font-semibold text-[#8c88ac]'>Attributes</p>
          <p className='mt-2 text-4xl font-black text-[#212047]'>{attributes.length}</p>
        </div>
        <div className='rounded-3xl border border-[#eceaf8] bg-white p-5'>
          <p className='text-sm font-semibold text-[#8c88ac]'>Variants</p>
          <p className='mt-2 text-4xl font-black text-[#212047]'>{variants.length}</p>
        </div>
      </div>
    </section>
  )
}
