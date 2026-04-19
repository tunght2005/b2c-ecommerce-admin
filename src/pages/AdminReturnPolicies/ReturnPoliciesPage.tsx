import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link as LinkIcon, PlusCircle, X } from 'lucide-react'
import { toast } from 'react-toastify'

import CrudActionButtons from '../../components/CrudActionButtons'
import { OrderStatsCards } from '../../components/Order'
import afterSalesApi from '../../apis/after-sales.api'
import productApi from '../../apis/product.api'

function resolveProductId(product: { id?: string; _id?: string }) {
  return product._id || product.id || ''
}

export default function ReturnPoliciesPage() {
  const queryClient = useQueryClient()
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState<{
    _id: string
    name: string
    description?: string
    days_allowed: number
    is_active: boolean
  } | null>(null)

  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    days_allowed: '7',
    is_active: true
  })

  const [policyForm, setPolicyForm] = useState({
    name: '',
    description: '',
    days_allowed: '7',
    is_active: true
  })

  const [linkForm, setLinkForm] = useState({
    product_id: '',
    policy_id: ''
  })

  const policiesQuery = useQuery({
    queryKey: ['after-sales-policies-all'],
    queryFn: async () => {
      const response = await afterSalesApi.listPolicies()
      return response.data.data
    }
  })

  const linksQuery = useQuery({
    queryKey: ['after-sales-policy-links'],
    queryFn: async () => {
      const response = await afterSalesApi.listPolicyProductLinks()
      return response.data.data
    }
  })

  const productsQuery = useQuery({
    queryKey: ['return-policy-products'],
    queryFn: async () => {
      const response = await productApi.list()
      return response.data
    }
  })

  const createPolicyMutation = useMutation({
    mutationFn: async () => {
      if (!policyForm.name.trim()) {
        throw new Error('Tên policy là bắt buộc')
      }

      return afterSalesApi.createPolicy({
        name: policyForm.name,
        description: policyForm.description,
        days_allowed: Number(policyForm.days_allowed) || 7,
        is_active: policyForm.is_active
      })
    },
    onSuccess: () => {
      toast.success('Tạo return policy thành công')
      queryClient.invalidateQueries({ queryKey: ['after-sales-policies-all'] })
      setPolicyForm({ name: '', description: '', days_allowed: '7', is_active: true })
      setCreateModalOpen(false)
    },
    onError: (error: Error) => toast.error(error.message || 'Không thể tạo return policy')
  })

  const updatePolicyMutation = useMutation({
    mutationFn: async () => {
      if (!editingPolicy?._id) {
        throw new Error('Không xác định được policy cần cập nhật')
      }

      if (!editForm.name.trim()) {
        throw new Error('Tên policy là bắt buộc')
      }

      return afterSalesApi.updatePolicy(editingPolicy._id, {
        name: editForm.name,
        description: editForm.description,
        days_allowed: Number(editForm.days_allowed) || 7,
        is_active: editForm.is_active
      })
    },
    onSuccess: () => {
      toast.success('Cập nhật return policy thành công')
      queryClient.invalidateQueries({ queryKey: ['after-sales-policies-all'] })
      setEditingPolicy(null)
    },
    onError: (error: Error) => toast.error(error.message || 'Không thể cập nhật return policy')
  })

  const assignPolicyMutation = useMutation({
    mutationFn: async () => {
      if (!linkForm.product_id || !linkForm.policy_id) {
        throw new Error('Cần nhập product_id và policy_id')
      }
      return afterSalesApi.assignPolicyToProduct(linkForm)
    },
    onSuccess: () => {
      toast.success('Gán policy cho product thành công')
      queryClient.invalidateQueries({ queryKey: ['after-sales-policy-links'] })
      setLinkForm({ product_id: '', policy_id: '' })
      setAssignModalOpen(false)
    },
    onError: (error: Error) => toast.error(error.message || 'Không thể gán policy')
  })

  const policies = useMemo(() => policiesQuery.data ?? [], [policiesQuery.data])
  const links = useMemo(() => linksQuery.data ?? [], [linksQuery.data])
  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data])

  const stats = useMemo(
    () => [
      { label: 'Total Policies', value: policies.length, tone: 'from-[#6f62cf] to-[#8a7bf2]' },
      {
        label: 'Active Policies',
        value: policies.filter((item) => item.is_active).length,
        tone: 'from-[#2fb67a] to-[#5dd7a0]'
      },
      {
        label: 'Inactive Policies',
        value: policies.filter((item) => !item.is_active).length,
        tone: 'from-[#ea5168] to-[#f58b9a]'
      },
      { label: 'Product Links', value: links.length, tone: 'from-[#2f86d6] to-[#65b4ff]' }
    ],
    [policies, links]
  )

  return (
    <section className='space-y-5 pb-4'>
      <div>
        <p className='text-sm font-semibold uppercase tracking-[0.24em] text-[#8a84ad]'>Return & Warranty</p>
        <h1 className='mt-2 text-3xl font-black tracking-tight text-[#201f47]'>Return Policies</h1>
        <p className='mt-2 max-w-2xl text-sm leading-6 text-[#6d6a8a]'>
          Quản trị chính sách đổi trả và ánh xạ policy cho từng sản phẩm.
        </p>
      </div>

      <OrderStatsCards items={stats} />

      <div className='grid gap-5 lg:grid-cols-2'>
        <article className='rounded-[30px] border border-[#eceaf8] bg-white p-5 shadow-[0_18px_50px_rgba(27,23,64,0.08)]'>
          <div className='flex items-center justify-between'>
            <div>
              <h2 className='text-xl font-bold text-[#212047]'>Create Policy</h2>
              <p className='mt-1 text-sm text-[#7a7697]'>Mở modal để thêm return policy mới.</p>
            </div>
            <button
              type='button'
              onClick={() => setCreateModalOpen(true)}
              className='inline-flex h-10 items-center gap-2 rounded-full bg-[#2f78d1] px-4 text-sm font-semibold text-white transition hover:bg-[#2768b6]'
            >
              <PlusCircle className='h-4 w-4' /> Create
            </button>
          </div>
        </article>

        <article className='rounded-[30px] border border-[#eceaf8] bg-white p-5 shadow-[0_18px_50px_rgba(27,23,64,0.08)]'>
          <div className='flex items-center justify-between'>
            <div>
              <h2 className='text-xl font-bold text-[#212047]'>Map Product To Policy</h2>
              <p className='mt-1 text-sm text-[#7a7697]'>Mở modal để gán product cho policy.</p>
            </div>
            <button
              type='button'
              onClick={() => setAssignModalOpen(true)}
              className='inline-flex h-10 items-center gap-2 rounded-full border border-[#d8edff] bg-[#eff8ff] px-4 text-sm font-semibold text-[#2f78d1] transition hover:bg-[#e2f2ff]'
            >
              <LinkIcon className='h-4 w-4' /> Assign
            </button>
          </div>
        </article>
      </div>

      <div className='grid gap-5 lg:grid-cols-2'>
        <article className='rounded-[30px] border border-[#eceaf8] bg-white p-5 shadow-[0_18px_50px_rgba(27,23,64,0.08)]'>
          <h2 className='text-xl font-bold text-[#212047]'>Policies</h2>
          <div className='mt-4 space-y-3'>
            {policies.length ? (
              policies.map((policy) => (
                <div key={policy._id} className='rounded-2xl border border-[#eceaf8] p-4'>
                  <div className='flex items-start justify-between gap-4'>
                    <div className='min-w-0 flex-1'>
                      <p className='font-semibold text-[#28244f]'>{policy.name}</p>
                      <p className='mt-1 text-xs text-[#8f8aac]'>days_allowed: {policy.days_allowed}</p>
                      <p className='mt-2 text-sm leading-6 text-[#5f5a7a]'>{policy.description || 'N/A'}</p>
                    </div>
                    <div className='flex shrink-0 flex-col items-end gap-3 pt-0.5'>
                      <CrudActionButtons
                        onEdit={() => {
                          setEditingPolicy(policy)
                          setEditForm({
                            name: policy.name || '',
                            description: policy.description || '',
                            days_allowed: String(policy.days_allowed ?? 7),
                            is_active: Boolean(policy.is_active)
                          })
                        }}
                      />
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                          policy.is_active
                            ? 'border-[#d8f0e2] bg-[#effaf4] text-[#2f8a57]'
                            : 'border-[#f3d9df] bg-[#fff3f5] text-[#c84455]'
                        }`}
                      >
                        {policy.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className='text-sm text-[#7a7697]'>No policies found.</p>
            )}
          </div>
        </article>

        <article className='rounded-[30px] border border-[#eceaf8] bg-white p-5 shadow-[0_18px_50px_rgba(27,23,64,0.08)]'>
          <h2 className='text-xl font-bold text-[#212047]'>Product Policy Links</h2>
          <div className='mt-4 space-y-3'>
            {links.length ? (
              links.map((link) => {
                const productName =
                  typeof link.product_id === 'object' ? link.product_id.name || 'N/A' : link.product_id
                const policyName = typeof link.policy_id === 'object' ? link.policy_id.name : link.policy_id

                return (
                  <div key={link._id} className='rounded-2xl border border-[#eceaf8] p-4 text-sm text-[#5f5a7a]'>
                    <p className='font-semibold text-[#28244f]'>{productName}</p>
                    <p className='mt-1'>Policy: {policyName}</p>
                    <p className='mt-1 text-xs text-[#8f8aac]'>Link ID: {link._id}</p>
                  </div>
                )
              })
            ) : (
              <p className='text-sm text-[#7a7697]'>No product links found.</p>
            )}
          </div>
        </article>
      </div>

      {createModalOpen ? (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-[#191532]/45 px-4 py-6'>
          <article className='w-full max-w-lg rounded-[28px] border border-[#eceaf8] bg-white p-6 shadow-[0_25px_65px_rgba(23,20,55,0.35)]'>
            <div className='flex items-start justify-between gap-4'>
              <div>
                <p className='text-lg font-bold text-[#212047]'>Create Return Policy</p>
                <p className='mt-1 text-sm text-[#7a7697]'>Tạo policy mới cho luồng return.</p>
              </div>
              <button
                type='button'
                onClick={() => setCreateModalOpen(false)}
                className='inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#d9d3ef] text-[#5f5a7a] transition hover:bg-[#f0edf8]'
              >
                <X className='h-4 w-4' />
              </button>
            </div>

            <div className='mt-5 space-y-3'>
              <input
                value={policyForm.name}
                onChange={(event) => setPolicyForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder='Policy name'
                className='h-11 w-full rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm text-[#2d2950] outline-none'
              />
              <textarea
                value={policyForm.description}
                onChange={(event) => setPolicyForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder='Description'
                className='min-h-22 w-full rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] p-4 text-sm text-[#2d2950] outline-none'
              />
              <div className='grid grid-cols-2 gap-3'>
                <input
                  value={policyForm.days_allowed}
                  onChange={(event) => setPolicyForm((prev) => ({ ...prev, days_allowed: event.target.value }))}
                  type='number'
                  min={0}
                  placeholder='Days allowed'
                  className='h-11 rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm text-[#2d2950] outline-none'
                />
                <label className='inline-flex h-11 items-center gap-2 rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm text-[#2d2950]'>
                  <input
                    checked={policyForm.is_active}
                    onChange={(event) => setPolicyForm((prev) => ({ ...prev, is_active: event.target.checked }))}
                    type='checkbox'
                  />
                  Active
                </label>
              </div>
            </div>

            <div className='mt-6 flex justify-end gap-3'>
              <button
                type='button'
                onClick={() => setCreateModalOpen(false)}
                className='inline-flex h-10 items-center rounded-full border border-[#d9d3ef] px-5 text-sm font-semibold text-[#5f5a7a] transition hover:bg-[#f0edf8]'
              >
                Cancel
              </button>
              <button
                type='button'
                onClick={() => createPolicyMutation.mutate()}
                className='inline-flex h-10 items-center gap-2 rounded-full bg-[#2f78d1] px-5 text-sm font-semibold text-white transition hover:bg-[#2768b6]'
              >
                <PlusCircle className='h-4 w-4' /> Save
              </button>
            </div>
          </article>
        </div>
      ) : null}

      {assignModalOpen ? (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-[#191532]/45 px-4 py-6'>
          <article className='w-full max-w-lg rounded-[28px] border border-[#eceaf8] bg-white p-6 shadow-[0_25px_65px_rgba(23,20,55,0.35)]'>
            <div className='flex items-start justify-between gap-4'>
              <div>
                <p className='text-lg font-bold text-[#212047]'>Assign Product To Policy</p>
                <p className='mt-1 text-sm text-[#7a7697]'>Gán policy bằng modal thay vì form trực tiếp.</p>
              </div>
              <button
                type='button'
                onClick={() => setAssignModalOpen(false)}
                className='inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#d9d3ef] text-[#5f5a7a] transition hover:bg-[#f0edf8]'
              >
                <X className='h-4 w-4' />
              </button>
            </div>

            <div className='mt-5 space-y-3'>
              <select
                value={linkForm.product_id}
                onChange={(event) => setLinkForm((prev) => ({ ...prev, product_id: event.target.value }))}
                className='h-11 w-full rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm text-[#2d2950] outline-none'
              >
                <option value=''>Chọn sản phẩm</option>
                {products.map((product) => {
                  const productId = resolveProductId(product)
                  if (!productId) return null

                  return (
                    <option key={productId} value={productId}>
                      {product.name} ({productId.slice(-8).toUpperCase()})
                    </option>
                  )
                })}
              </select>
              <select
                value={linkForm.policy_id}
                onChange={(event) => setLinkForm((prev) => ({ ...prev, policy_id: event.target.value }))}
                className='h-11 w-full rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm text-[#2d2950] outline-none'
              >
                <option value=''>Chọn policy</option>
                {policies.map((policy) => (
                  <option key={policy._id} value={policy._id}>
                    {policy.name}
                  </option>
                ))}
              </select>
              <p className='text-xs text-[#8f8aac]'>
                {productsQuery.isLoading
                  ? 'Đang tải danh sách sản phẩm...'
                  : `${products.length} sản phẩm có thể gán policy`}
              </p>
            </div>

            <div className='mt-6 flex justify-end gap-3'>
              <button
                type='button'
                onClick={() => setAssignModalOpen(false)}
                className='inline-flex h-10 items-center rounded-full border border-[#d9d3ef] px-5 text-sm font-semibold text-[#5f5a7a] transition hover:bg-[#f0edf8]'
              >
                Cancel
              </button>
              <button
                type='button'
                onClick={() => assignPolicyMutation.mutate()}
                className='inline-flex h-10 items-center gap-2 rounded-full border border-[#d8edff] bg-[#eff8ff] px-5 text-sm font-semibold text-[#2f78d1] transition hover:bg-[#e2f2ff]'
              >
                <LinkIcon className='h-4 w-4' /> Assign
              </button>
            </div>
          </article>
        </div>
      ) : null}

      {editingPolicy ? (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-[#191532]/45 px-4 py-6'>
          <article className='w-full max-w-lg rounded-[28px] border border-[#eceaf8] bg-white p-6 shadow-[0_25px_65px_rgba(23,20,55,0.35)]'>
            <p className='text-lg font-bold text-[#212047]'>Update Policy</p>
            <p className='mt-1 text-sm text-[#7a7697]'>{editingPolicy._id}</p>

            <div className='mt-5 space-y-4'>
              <label className='block'>
                <span className='text-sm font-semibold text-[#4a4666]'>Policy Name</span>
                <input
                  value={editForm.name}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))}
                  className='mt-2 h-11 w-full rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm text-[#2d2950] outline-none'
                />
              </label>

              <label className='block'>
                <span className='text-sm font-semibold text-[#4a4666]'>Description</span>
                <textarea
                  value={editForm.description}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, description: event.target.value }))}
                  className='mt-2 min-h-22 w-full rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] p-4 text-sm text-[#2d2950] outline-none'
                />
              </label>

              <div className='grid grid-cols-2 gap-3'>
                <label className='block'>
                  <span className='text-sm font-semibold text-[#4a4666]'>Days Allowed</span>
                  <input
                    value={editForm.days_allowed}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, days_allowed: event.target.value }))}
                    type='number'
                    min={0}
                    className='mt-2 h-11 w-full rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm text-[#2d2950] outline-none'
                  />
                </label>

                <label className='inline-flex h-11 self-end items-center gap-2 rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm text-[#2d2950]'>
                  <input
                    checked={editForm.is_active}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, is_active: event.target.checked }))}
                    type='checkbox'
                  />
                  Active
                </label>
              </div>
            </div>

            <div className='mt-6 flex justify-end gap-3'>
              <button
                type='button'
                onClick={() => setEditingPolicy(null)}
                className='inline-flex h-10 items-center rounded-full border border-[#d9d3ef] px-5 text-sm font-semibold text-[#5f5a7a] transition hover:bg-[#f0edf8]'
              >
                Cancel
              </button>
              <button
                type='button'
                onClick={() => updatePolicyMutation.mutate()}
                className='inline-flex h-10 items-center rounded-full bg-[#6f62cf] px-5 text-sm font-semibold text-white transition hover:bg-[#5e53bf]'
              >
                {updatePolicyMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </article>
        </div>
      ) : null}
    </section>
  )
}
