import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Shield, CalendarDays, X, RefreshCw } from 'lucide-react'
import { toast } from 'react-toastify'

import CrudActionButtons from '../../components/CrudActionButtons'
import { OrderStatsCards } from '../../components/Order'
import afterSalesApi from '../../apis/after-sales.api'
import type { WarrantyEntity, WarrantyStatus } from '../../types/after-sales.type'
import { formatDateTime } from '../../utils/common'

const WARRANTY_STATUSES: Array<WarrantyStatus | 'all'> = ['all', 'ACTIVE', 'EXPIRED', 'CLAIMED']

function calcWarrantyDaysLeft(endDate: string) {
  const expiry = new Date(endDate)
  const now = new Date()
  const remain = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(0, remain)
}

export default function WarrantyPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<WarrantyStatus | 'all'>('all')
  const [editingRecord, setEditingRecord] = useState<WarrantyEntity | null>(null)
  const [nextStatus, setNextStatus] = useState<WarrantyStatus>('ACTIVE')
  const [claimIssue, setClaimIssue] = useState('Claim từ trang admin')

  const warrantyQuery = useQuery({
    queryKey: ['after-sales-warranty', statusFilter],
    queryFn: async () => {
      const response = await afterSalesApi.listWarranty({
        status: statusFilter,
        page: 1,
        limit: 200
      })
      return response.data.data.records
    },
    placeholderData: (previousData) => previousData
  })

  const claimMutation = useMutation({
    mutationFn: async ({ id, issue }: { id: string; issue: string }) => afterSalesApi.claimWarranty(id, issue),
    onSuccess: () => {
      toast.success('Claim warranty thành công')
      queryClient.invalidateQueries({ queryKey: ['after-sales-warranty'] })
      setEditingRecord(null)
    }
  })

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: WarrantyStatus }) =>
      afterSalesApi.updateWarrantyStatus(id, status),
    onSuccess: () => {
      toast.success('Cập nhật trạng thái warranty thành công')
      queryClient.invalidateQueries({ queryKey: ['after-sales-warranty'] })
      setEditingRecord(null)
    }
  })

  const warranties = useMemo(() => warrantyQuery.data ?? [], [warrantyQuery.data])

  const stats = useMemo(() => {
    const activeWarranty = warranties.filter((item) => item.status === 'ACTIVE').length
    const expiredWarranty = warranties.filter((item) => item.status === 'EXPIRED').length
    const claimedWarranty = warranties.filter((item) => item.status === 'CLAIMED').length

    return [
      { label: 'Warranty Cases', value: warranties.length, tone: 'from-[#6f62cf] to-[#8a7bf2]' },
      { label: 'Active Warranty', value: activeWarranty, tone: 'from-[#2fb67a] to-[#5dd7a0]' },
      { label: 'Expired Warranty', value: expiredWarranty, tone: 'from-[#f08c44] to-[#f7b36d]' },
      { label: 'Claimed', value: claimedWarranty, tone: 'from-[#2f86d6] to-[#65b4ff]' }
    ]
  }, [warranties])

  function openEditModal(record: WarrantyEntity) {
    setEditingRecord(record)
    setNextStatus(record.status)
    setClaimIssue(record.description_issue || 'Claim từ trang admin')
  }

  function closeEditModal() {
    setEditingRecord(null)
  }

  return (
    <section className='space-y-5 pb-4'>
      <div>
        <p className='text-sm font-semibold uppercase tracking-[0.24em] text-[#8a84ad]'>Return & Warranty</p>
        <h1 className='mt-2 text-3xl font-black tracking-tight text-[#201f47]'>Warranty</h1>
        <p className='mt-2 max-w-2xl text-sm leading-6 text-[#6d6a8a]'>
          Theo dõi và xử lý bảo hành theo schema mới: status, claim_count, issue description, warranty_period.
        </p>
      </div>

      <OrderStatsCards items={stats} />

      <div className='rounded-[30px] border border-[#eceaf8] bg-white p-5 shadow-[0_18px_50px_rgba(27,23,64,0.08)]'>
        <div className='flex items-center justify-between gap-3'>
          <div>
            <h2 className='text-xl font-bold text-[#212047]'>Warranty Coverage List</h2>
            <p className='mt-1 text-sm text-[#7a7697]'>
              Warranty records are generated automatically when orders become completed.
            </p>
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as WarrantyStatus | 'all')}
            className='h-11 rounded-full border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm text-[#2d2950] outline-none'
          >
            {WARRANTY_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <p className='mt-2 text-sm text-[#7a7697]'>{warranties.length} warranty record(s)</p>

        <div className='mt-5 overflow-hidden rounded-[26px] border border-[#eceaf8]'>
          <div className='overflow-x-auto'>
            <table className='min-w-full divide-y divide-[#eceaf8]'>
              <thead className='bg-[#faf9ff] text-left text-xs font-bold uppercase tracking-[0.18em] text-[#7f7a9e]'>
                <tr>
                  <th className='px-4 py-4'>Order Item</th>
                  <th className='px-4 py-4'>Warranty Period</th>
                  <th className='px-4 py-4'>Warranty Left</th>
                  <th className='px-4 py-4'>Status</th>
                  <th className='px-4 py-4 text-right'>Actions</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-[#f0edf8] bg-white'>
                {warrantyQuery.isLoading && !warrantyQuery.data ? (
                  <tr>
                    <td colSpan={5} className='px-4 py-16 text-center text-sm text-[#7a7697]'>
                      Loading warranty list...
                    </td>
                  </tr>
                ) : warranties.length > 0 ? (
                  warranties.map((record) => {
                    const daysLeft = calcWarrantyDaysLeft(record.end_date)
                    return (
                      <tr key={record._id} className='transition hover:bg-[#fbfaff]'>
                        <td className='px-4 py-4'>
                          <p className='font-semibold text-[#28244f]'>{record.order_item_id}</p>
                          <p className='mt-1 text-xs text-[#8f8aac]'>Created: {formatDateTime(record.created_at)}</p>
                        </td>
                        <td className='px-4 py-4 text-sm text-[#5f5a7a]'>
                          <span className='inline-flex items-center gap-1'>
                            <CalendarDays className='h-3.5 w-3.5' /> {record.warranty_period} month(s)
                          </span>
                        </td>
                        <td className='px-4 py-4 text-sm font-semibold text-[#2d2950]'>{daysLeft} day(s)</td>
                        <td className='px-4 py-4'>
                          {record.status === 'ACTIVE' ? (
                            <span className='inline-flex items-center gap-1 rounded-full border border-[#d8f0e2] bg-[#effaf4] px-3 py-1 text-xs font-semibold text-[#2f8a57]'>
                              <Shield className='h-3.5 w-3.5' /> Active
                            </span>
                          ) : record.status === 'CLAIMED' ? (
                            <span className='inline-flex items-center gap-1 rounded-full border border-[#dce8fb] bg-[#eef5ff] px-3 py-1 text-xs font-semibold text-[#2f78d1]'>
                              <Shield className='h-3.5 w-3.5' /> Claimed
                            </span>
                          ) : (
                            <span className='inline-flex items-center gap-1 rounded-full border border-[#f3d9df] bg-[#fff3f5] px-3 py-1 text-xs font-semibold text-[#c84455]'>
                              <Shield className='h-3.5 w-3.5' /> Expired
                            </span>
                          )}
                        </td>
                        <td className='px-4 py-4'>
                          <div className='flex justify-end gap-2'>
                            <CrudActionButtons onEdit={() => openEditModal(record)} buttonSize='sm' />
                          </div>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className='px-4 py-16 text-center text-sm text-[#7a7697]'>
                      No warranty records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editingRecord ? (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-[#191532]/45 px-4 py-6'>
          <article className='w-full max-w-lg rounded-[28px] border border-[#eceaf8] bg-white p-6 shadow-[0_25px_65px_rgba(23,20,55,0.35)]'>
            <div className='flex items-start justify-between gap-4'>
              <div>
                <p className='text-lg font-bold text-[#212047]'>Update Warranty</p>
                <p className='mt-1 text-sm text-[#7a7697]'>{editingRecord.order_item_id}</p>
              </div>
              <button
                type='button'
                onClick={closeEditModal}
                className='inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#d9d3ef] text-[#5f5a7a] transition hover:bg-[#f0edf8]'
              >
                <X className='h-4 w-4' />
              </button>
            </div>

            <div className='mt-5 space-y-4'>
              <label className='block'>
                <span className='mb-2 block text-sm font-semibold text-[#3a365d]'>Status</span>
                <select
                  value={nextStatus}
                  onChange={(event) => setNextStatus(event.target.value as WarrantyStatus)}
                  className='h-11 w-full rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] px-4 text-sm text-[#2d2950] outline-none'
                >
                  {WARRANTY_STATUSES.filter((status): status is WarrantyStatus => status !== 'all').map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              <label className='block'>
                <span className='mb-2 block text-sm font-semibold text-[#3a365d]'>Claim issue</span>
                <textarea
                  value={claimIssue}
                  onChange={(event) => setClaimIssue(event.target.value)}
                  className='min-h-22 w-full rounded-2xl border border-[#e5e1f3] bg-[#fbfaff] p-4 text-sm text-[#2d2950] outline-none'
                  placeholder='Mô tả lỗi bảo hành...'
                />
              </label>
            </div>

            <div className='mt-6 flex justify-end gap-2'>
              {editingRecord.status !== 'CLAIMED' ? (
                <button
                  type='button'
                  disabled={claimMutation.isPending}
                  onClick={() =>
                    claimMutation.mutate({ id: editingRecord._id, issue: claimIssue.trim() || 'Claim từ trang admin' })
                  }
                  className='inline-flex h-10 items-center rounded-full border border-[#d8edff] bg-[#eff8ff] px-5 text-sm font-semibold text-[#2f78d1] transition hover:bg-[#e2f2ff] disabled:cursor-not-allowed disabled:opacity-60'
                >
                  Claim
                </button>
              ) : null}
              <button
                type='button'
                onClick={closeEditModal}
                className='inline-flex h-10 items-center rounded-full border border-[#d9d3ef] px-5 text-sm font-semibold text-[#5f5a7a] transition hover:bg-[#f0edf8]'
              >
                Cancel
              </button>
              <button
                type='button'
                disabled={updateStatusMutation.isPending}
                onClick={() => updateStatusMutation.mutate({ id: editingRecord._id, status: nextStatus })}
                className='inline-flex h-10 items-center gap-2 rounded-full bg-[#2f78d1] px-5 text-sm font-semibold text-white transition hover:bg-[#2768b6] disabled:cursor-not-allowed disabled:opacity-60'
              >
                <RefreshCw className='h-4 w-4' /> Save
              </button>
            </div>
          </article>
        </div>
      ) : null}
    </section>
  )
}
