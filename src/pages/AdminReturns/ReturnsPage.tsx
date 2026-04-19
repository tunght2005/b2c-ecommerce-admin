import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, RefreshCw, Clock3, X } from 'lucide-react'
import { toast } from 'react-toastify'

import Pagination from '../../components/Pagination'
import CrudActionButtons from '../../components/CrudActionButtons'
import { OrderStatsCards } from '../../components/Order'
import afterSalesApi from '../../apis/after-sales.api'
import type { ReturnRequestEntity, ReturnStatus } from '../../types/after-sales.type'
import { formatCurrency, formatDateTime } from '../../utils/common'

const RETURN_STATUSES: Array<ReturnStatus | 'all'> = ['all', 'PENDING', 'APPROVED', 'REJECTED', 'COMPLETED']

function resolvePolicyName(request: ReturnRequestEntity) {
  if (!request.policy_id) return 'N/A'
  if (typeof request.policy_id === 'object') {
    return request.policy_id.name || 'N/A'
  }
  return request.policy_id
}

function getReturnStatusTone(status: ReturnStatus) {
  if (status === 'APPROVED') return 'border-[#d8f0e2] bg-[#effaf4] text-[#2f8a57]'
  if (status === 'REJECTED') return 'border-[#f3d9df] bg-[#fff3f5] text-[#c84455]'
  if (status === 'COMPLETED') return 'border-[#dce8fb] bg-[#eef5ff] text-[#2f78d1]'
  return 'border-[#f3e4cf] bg-[#fff7eb] text-[#ba7b2d]'
}

export default function ReturnsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ReturnStatus | 'all'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(8)
  const [detailRequestId, setDetailRequestId] = useState<string | null>(null)
  const [updateRequest, setUpdateRequest] = useState<ReturnRequestEntity | null>(null)
  const [updateStatus, setUpdateStatus] = useState<ReturnStatus>('PENDING')

  const returnsQuery = useQuery({
    queryKey: ['after-sales-returns', statusFilter, currentPage, pageSize],
    queryFn: async () => {
      const response = await afterSalesApi.listReturns({
        status: statusFilter,
        page: currentPage,
        limit: pageSize
      })
      return response.data.data
    },
    placeholderData: (previousData) => previousData
  })

  const detailQuery = useQuery({
    queryKey: ['after-sales-return-detail', detailRequestId],
    queryFn: async () => {
      if (!detailRequestId) {
        throw new Error('Thiếu return request id')
      }

      const response = await afterSalesApi.getReturnDetail(detailRequestId)
      return response.data.data
    },
    enabled: !!detailRequestId
  })

  const detailRequest = detailQuery.data ?? null

  const eligibleItemQuery = useQuery({
    queryKey: ['after-sales-return-eligible-item', detailRequest?.order_item_id],
    queryFn: async () => {
      if (!detailRequest?.order_item_id) {
        throw new Error('Thiếu order_item_id')
      }

      const [orderId] = detailRequest.order_item_id.split(':')
      const response = await afterSalesApi.listEligibleOrderItems({
        search: orderId,
        page: 1,
        limit: 100
      })

      return response.data.data.items.find((item) => item.order_item_id === detailRequest.order_item_id) ?? null
    },
    enabled: !!detailRequest?.order_item_id
  })

  const eligibleItem = eligibleItemQuery.data ?? null

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ReturnStatus }) =>
      afterSalesApi.updateReturnStatus(id, status),
    onSuccess: () => {
      toast.success('Cập nhật trạng thái return thành công')
      queryClient.invalidateQueries({ queryKey: ['after-sales-returns'] })
      queryClient.invalidateQueries({ queryKey: ['after-sales-return-detail'] })
      setUpdateRequest(null)
    }
  })

  const returnData = returnsQuery.data
  const pagination = returnData?.pagination

  const filteredRequests = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    const requests = returnData?.returns ?? []

    return requests.filter((request) => {
      if (!normalized) return true

      return [request._id, request.order_item_id, request.status, request.reason, resolvePolicyName(request)]
        .join(' ')
        .toLowerCase()
        .includes(normalized)
    })
  }, [returnData?.returns, search])

  const pendingCount = filteredRequests.filter((item) => item.status === 'PENDING').length
  const approvedCount = filteredRequests.filter((item) => item.status === 'APPROVED').length
  const rejectedCount = filteredRequests.filter((item) => item.status === 'REJECTED').length

  const stats = [
    { label: 'Total Returns', value: filteredRequests.length, tone: 'from-[#6f62cf] to-[#8a7bf2]' },
    { label: 'Pending', value: pendingCount, tone: 'from-[#f08c44] to-[#f7b36d]' },
    { label: 'Approved', value: approvedCount, tone: 'from-[#2fb67a] to-[#5dd7a0]' },
    { label: 'Rejected', value: rejectedCount, tone: 'from-[#ea5168] to-[#f58b9a]' }
  ]

  const totalItems = pagination?.totalItems ?? filteredRequests.length
  const totalPages = pagination?.totalPages ?? Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage = pagination?.page ?? Math.min(currentPage, totalPages)

  function openUpdateModal(request: ReturnRequestEntity) {
    setUpdateRequest(request)
    setUpdateStatus(request.status)
  }

  function closeDetailModal() {
    setDetailRequestId(null)
  }

  function closeUpdateModal() {
    setUpdateRequest(null)
  }

  function resolvePolicyDescription(request: ReturnRequestEntity) {
    if (!request.policy_id || typeof request.policy_id === 'string') return 'N/A'
    return request.policy_id.description || 'N/A'
  }

  function resolveCreatedBy(request: ReturnRequestEntity) {
    if (!request.created_by) return 'N/A'
    return request.created_by.username || request.created_by.email || request.created_by._id
  }

  function resolveReporterName() {
    if (!eligibleItem?.customer) return 'N/A'
    return eligibleItem.customer.username || eligibleItem.customer.email || eligibleItem.customer._id
  }

  function resolveReporterEmail() {
    if (!eligibleItem?.customer) return 'N/A'
    return eligibleItem.customer.email || 'N/A'
  }

  function resolveProductName() {
    if (!eligibleItem?.product) return 'N/A'
    return eligibleItem.product.name || 'N/A'
  }

  function resolveVariantSku() {
    if (!eligibleItem?.variant) return 'N/A'
    return eligibleItem.variant.sku || eligibleItem.variant._id || 'N/A'
  }

  return (
    <section className='space-y-5 pb-4'>
      <div>
        <p className='text-sm font-semibold uppercase tracking-[0.24em] text-[#8a84ad]'>Return & Warranty</p>
        <h1 className='mt-2 text-3xl font-black tracking-tight text-[#201f47]'>Returns</h1>
        <p className='mt-2 max-w-2xl text-sm leading-6 text-[#6d6a8a]'>
          Quản lý yêu cầu hoàn trả theo policy, trạng thái xử lý, số tiền hoàn và minh chứng.
        </p>
      </div>

      <OrderStatsCards items={stats} />

      <div className='rounded-[30px] border border-[#eceaf8] bg-white p-5 shadow-[0_18px_50px_rgba(27,23,64,0.08)]'>
        <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
          <div>
            <h2 className='text-xl font-bold text-[#212047]'>Return Requests</h2>
            <p className='mt-1 text-sm text-[#7a7697]'>{totalItems} request(s) tracked</p>
          </div>

          <div className='grid w-full gap-2 md:flex md:w-auto md:flex-wrap md:items-center'>
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as ReturnStatus | 'all')
                setCurrentPage(1)
              }}
              className='h-11 w-full rounded-full border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm text-[#2d2950] outline-none md:w-auto'
            >
              {RETURN_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            <div className='relative w-full md:w-auto'>
              <Search className='pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#9d98bf]' />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                type='text'
                placeholder='Search request...'
                className='h-11 w-full rounded-full border border-[#e5e1f3] bg-[#fbfaff] pr-4 pl-10 text-sm text-[#2d2950] outline-none md:w-72'
              />
            </div>
          </div>
        </div>

        <div className='mt-5 overflow-hidden rounded-[26px] border border-[#eceaf8]'>
          <div className='overflow-x-auto'>
            <table className='min-w-[980px] divide-y divide-[#eceaf8] md:min-w-full'>
              <thead className='bg-[#faf9ff] text-left text-xs font-bold uppercase tracking-[0.18em] text-[#7f7a9e]'>
                <tr>
                  <th className='px-4 py-4'>Request</th>
                  <th className='px-4 py-4'>Policy</th>
                  <th className='px-4 py-4'>Amount</th>
                  <th className='px-4 py-4'>Status</th>
                  <th className='px-4 py-4'>Created</th>
                  <th className='px-4 py-4 text-right'>Actions</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-[#f0edf8] bg-white'>
                {returnsQuery.isLoading && !returnsQuery.data ? (
                  <tr>
                    <td colSpan={6} className='px-4 py-16 text-center text-sm text-[#7a7697]'>
                      Loading returns data...
                    </td>
                  </tr>
                ) : filteredRequests.length > 0 ? (
                  filteredRequests.map((request) => {
                    return (
                      <tr key={request._id} className='transition hover:bg-[#fbfaff]'>
                        <td className='px-4 py-4'>
                          <p className='font-semibold text-[#28244f]'>#{request._id.slice(-8).toUpperCase()}</p>
                          <p className='mt-1 text-xs text-[#8f8aac]'>{request.order_item_id}</p>
                        </td>
                        <td className='px-4 py-4 text-sm text-[#2d2950]'>{resolvePolicyName(request)}</td>
                        <td className='px-4 py-4 text-sm text-[#2d2950]'>
                          {formatCurrency(request.refund_amount || 0)}
                        </td>
                        <td className='px-4 py-4'>
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getReturnStatusTone(request.status)}`}
                          >
                            {request.status}
                          </span>
                        </td>
                        <td className='px-4 py-4 text-sm text-[#5f5a7a]'>
                          <span className='inline-flex items-center gap-1'>
                            <Clock3 className='h-3.5 w-3.5' /> {formatDateTime(request.created_at)}
                          </span>
                        </td>
                        <td className='px-4 py-4'>
                          <div className='flex justify-end gap-2'>
                            <CrudActionButtons
                              onEdit={() => openUpdateModal(request)}
                              onView={() => setDetailRequestId(request._id)}
                              buttonSize='sm'
                            />
                          </div>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className='px-4 py-16 text-center text-sm text-[#7a7697]'>
                      No return candidates found.
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
              onPageSizeChange={(size) => {
                setPageSize(size)
                setCurrentPage(1)
              }}
              itemLabel='requests'
            />
          </div>
        </div>
      </div>

      {updateRequest ? (
        <div className='fixed inset-0 z-40 flex items-center justify-center bg-[#191532]/45 px-4 py-6'>
          <article className='w-full max-w-lg rounded-[28px] border border-[#eceaf8] bg-white p-6 shadow-[0_25px_65px_rgba(23,20,55,0.35)]'>
            <div className='flex items-start justify-between gap-4'>
              <div>
                <p className='text-lg font-bold text-[#212047]'>Update Return Status</p>
                <p className='mt-1 text-sm text-[#7a7697]'>{updateRequest._id}</p>
              </div>
              <button
                type='button'
                onClick={closeUpdateModal}
                className='inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#d9d3ef] text-[#5f5a7a] transition hover:bg-[#f0edf8]'
              >
                <X className='h-4 w-4' />
              </button>
            </div>

            <div className='mt-5 space-y-4 text-sm text-[#5f5a7a]'>
              <div className='rounded-2xl border border-[#eceaf8] bg-[#faf9ff] p-4'>
                <p className='text-xs uppercase tracking-[0.18em] text-[#8f8aac]'>Current status</p>
                <p className='mt-1 text-base font-semibold text-[#212047]'>{updateRequest.status}</p>
              </div>

              <label className='block'>
                <span className='mb-2 block text-sm font-semibold text-[#3a365d]'>New status</span>
                <select
                  value={updateStatus}
                  onChange={(event) => setUpdateStatus(event.target.value as ReturnStatus)}
                  className='h-11 w-full rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm text-[#2d2950] outline-none'
                >
                  {RETURN_STATUSES.filter((status): status is ReturnStatus => status !== 'all').map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className='mt-6 flex justify-end gap-2'>
              <button
                type='button'
                onClick={closeUpdateModal}
                className='inline-flex h-10 items-center rounded-full border border-[#d9d3ef] px-5 text-sm font-semibold text-[#5f5a7a] transition hover:bg-[#f0edf8]'
              >
                Cancel
              </button>
              <button
                type='button'
                disabled={updateStatusMutation.isPending}
                onClick={() =>
                  updateStatusMutation.mutate({
                    id: updateRequest._id,
                    status: updateStatus
                  })
                }
                className='inline-flex h-10 items-center gap-2 rounded-full bg-[#2f78d1] px-5 text-sm font-semibold text-white transition hover:bg-[#2768b6] disabled:cursor-not-allowed disabled:opacity-60'
              >
                <RefreshCw className='h-4 w-4' /> Save
              </button>
            </div>
          </article>
        </div>
      ) : null}

      {detailRequestId ? (
        <div className='fixed inset-0 z-40 flex items-center justify-center bg-[#191532]/45 px-4 py-6'>
          <article className='max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-[28px] border border-[#eceaf8] bg-white shadow-[0_25px_65px_rgba(23,20,55,0.35)]'>
            <div className='flex items-start justify-between gap-4 border-b border-[#f0edf8] px-6 py-5'>
              <div>
                <p className='text-lg font-bold text-[#212047]'>Return Detail</p>
                <p className='mt-1 text-sm text-[#7a7697]'>{detailRequestId}</p>
              </div>
              <button
                type='button'
                onClick={closeDetailModal}
                className='inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#d9d3ef] text-[#5f5a7a] transition hover:bg-[#f0edf8]'
              >
                <X className='h-4 w-4' />
              </button>
            </div>

            <div className='max-h-[calc(90vh-88px)] overflow-y-auto px-6 py-5'>
              {detailQuery.isLoading ? (
                <div className='py-16 text-center text-sm text-[#7a7697]'>Loading return detail...</div>
              ) : detailQuery.error ? (
                <div className='rounded-2xl border border-[#f3d9df] bg-[#fff3f5] px-4 py-3 text-sm text-[#c84455]'>
                  Không tải được chi tiết return. Vui lòng thử lại.
                </div>
              ) : detailRequest ? (
                <div className='grid gap-4 lg:grid-cols-[1.2fr_0.8fr]'>
                  <div className='space-y-4'>
                    <div className='rounded-[22px] border border-[#eceaf8] bg-[#fbfaff] p-4'>
                      <div className='flex flex-wrap items-center justify-between gap-3'>
                        <div>
                          <p className='text-xs uppercase tracking-[0.18em] text-[#8f8aac]'>Request</p>
                          <p className='mt-1 text-lg font-bold text-[#212047]'>
                            #{detailRequest._id.slice(-8).toUpperCase()}
                          </p>
                        </div>
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getReturnStatusTone(detailRequest.status)}`}
                        >
                          {detailRequest.status}
                        </span>
                      </div>
                      <div className='mt-4 grid gap-3 md:grid-cols-2'>
                        <InfoCard label='Order item' value={detailRequest.order_item_id} />
                        <InfoCard label='Refund amount' value={formatCurrency(detailRequest.refund_amount || 0)} />
                        <InfoCard label='Policy' value={resolvePolicyName(detailRequest)} />
                        <InfoCard label='Policy description' value={resolvePolicyDescription(detailRequest)} />
                        <InfoCard label='Created by' value={resolveCreatedBy(detailRequest)} />
                        <InfoCard label='Customer' value={resolveReporterName()} />
                        <InfoCard label='Customer email' value={resolveReporterEmail()} />
                        <InfoCard label='Product' value={resolveProductName()} />
                        <InfoCard label='Variant SKU' value={resolveVariantSku()} />
                        <InfoCard
                          label='Approved at'
                          value={detailRequest.approved_at ? formatDateTime(detailRequest.approved_at) : 'N/A'}
                        />
                        <InfoCard label='Created at' value={formatDateTime(detailRequest.created_at)} />
                        <InfoCard label='Updated at' value={formatDateTime(detailRequest.updated_at)} />
                      </div>
                    </div>

                    <div className='rounded-[22px] border border-[#eceaf8] bg-white p-4'>
                      <p className='text-sm font-semibold text-[#3a365d]'>Reason</p>
                      <p className='mt-2 whitespace-pre-wrap text-sm leading-6 text-[#5f5a7a]'>
                        {detailRequest.reason || 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className='space-y-4'>
                    <div className='rounded-[22px] border border-[#eceaf8] bg-white p-4'>
                      <p className='text-sm font-semibold text-[#3a365d]'>Evidence image</p>
                      {detailRequest.evidence_image ? (
                        <div className='mt-3 overflow-hidden rounded-2xl border border-[#eceaf8] bg-[#fbfaff]'>
                          <img
                            src={detailRequest.evidence_image}
                            alt='Return evidence'
                            className='h-64 w-full object-cover'
                          />
                        </div>
                      ) : (
                        <div className='mt-3 rounded-2xl border border-dashed border-[#d9d3ef] bg-[#faf9ff] px-4 py-10 text-center text-sm text-[#7a7697]'>
                          No evidence image
                        </div>
                      )}
                      {detailRequest.evidence_image ? (
                        <a
                          href={detailRequest.evidence_image}
                          target='_blank'
                          rel='noreferrer'
                          className='mt-3 block break-all text-sm text-[#2f78d1] underline decoration-[#b9d5f7] underline-offset-4'
                        >
                          {detailRequest.evidence_image}
                        </a>
                      ) : null}
                    </div>

                    <div className='rounded-[22px] border border-[#eceaf8] bg-[#fbfaff] p-4'>
                      <p className='text-sm font-semibold text-[#3a365d]'>Raw data</p>
                      <div className='mt-3 space-y-2 text-sm text-[#5f5a7a]'>
                        <p>
                          Policy ID:{' '}
                          {typeof detailRequest.policy_id === 'string'
                            ? detailRequest.policy_id
                            : detailRequest.policy_id._id}
                        </p>
                        <p>Creator role: {detailRequest.created_by?.role || 'N/A'}</p>
                        <p>Created by email: {detailRequest.created_by?.email || 'N/A'}</p>
                        <p>Order ID: {eligibleItem?.order_id || 'N/A'}</p>
                        <p>Quantity: {eligibleItem?.quantity ?? 'N/A'}</p>
                        <p>Unit price: {eligibleItem ? formatCurrency(eligibleItem.price) : 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className='flex justify-end border-t border-[#f0edf8] px-6 py-5'>
              <button
                type='button'
                onClick={closeDetailModal}
                className='inline-flex h-10 items-center rounded-full border border-[#d9d3ef] px-5 text-sm font-semibold text-[#5f5a7a] transition hover:bg-[#f0edf8]'
              >
                Close
              </button>
            </div>
          </article>
        </div>
      ) : null}
    </section>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-2xl border border-[#eceaf8] bg-white px-4 py-3'>
      <p className='text-xs uppercase tracking-[0.18em] text-[#8f8aac]'>{label}</p>
      <p className='mt-1 wrap-break-word text-sm font-semibold text-[#212047]'>{value}</p>
    </div>
  )
}
