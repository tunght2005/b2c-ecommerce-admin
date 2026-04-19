import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

interface PaginationProps {
  totalItems: number
  currentPage: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  pageSizeOptions?: number[]
  maxVisiblePages?: number
  itemLabel?: string
  className?: string
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function getVisiblePages(totalPages: number, currentPage: number, maxVisiblePages: number) {
  if (totalPages <= maxVisiblePages) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const half = Math.floor(maxVisiblePages / 2)
  let start = currentPage - half
  let end = currentPage + half

  if (maxVisiblePages % 2 === 0) {
    end -= 1
  }

  if (start < 1) {
    start = 1
    end = maxVisiblePages
  }

  if (end > totalPages) {
    end = totalPages
    start = totalPages - maxVisiblePages + 1
  }

  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

export default function Pagination({
  totalItems,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  maxVisiblePages = 5,
  itemLabel = 'items',
  className = ''
}: PaginationProps) {
  const normalizedPageSize = pageSize > 0 ? pageSize : pageSizeOptions[0] || 10
  const totalPages = Math.max(1, Math.ceil(totalItems / normalizedPageSize))
  const safeCurrentPage = clamp(currentPage, 1, totalPages)

  const startItem = totalItems === 0 ? 0 : (safeCurrentPage - 1) * normalizedPageSize + 1
  const endItem = totalItems === 0 ? 0 : Math.min(safeCurrentPage * normalizedPageSize, totalItems)
  const visiblePages = getVisiblePages(totalPages, safeCurrentPage, Math.max(1, maxVisiblePages))

  const goToPage = (page: number) => {
    const nextPage = clamp(page, 1, totalPages)
    if (nextPage !== safeCurrentPage) {
      onPageChange(nextPage)
    }
  }

  const handlePageSizeChange = (nextPageSize: number) => {
    if (!onPageSizeChange || nextPageSize <= 0) {
      return
    }

    onPageSizeChange(nextPageSize)

    const nextTotalPages = Math.max(1, Math.ceil(totalItems / nextPageSize))
    if (safeCurrentPage > nextTotalPages) {
      onPageChange(nextTotalPages)
    }
  }

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#f4f6fa] px-4 py-3 dark:bg-slate-900/75 ${className}`.trim()}
    >
      <p className='text-sm font-medium text-[#6e7382] dark:text-slate-300'>
        {startItem}-{endItem} of {totalItems} {itemLabel}
      </p>

      <div className='flex items-center gap-2'>
        <button
          type='button'
          onClick={() => goToPage(1)}
          disabled={safeCurrentPage === 1}
          aria-label='Go to first page'
          className='inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#7ec2f7] bg-white text-[#3ba4f6] transition hover:bg-[#eef7ff] disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-sky-300 dark:hover:bg-slate-800'
        >
          <ChevronsLeft className='h-4 w-4' />
        </button>

        <button
          type='button'
          onClick={() => goToPage(safeCurrentPage - 1)}
          disabled={safeCurrentPage === 1}
          aria-label='Go to previous page'
          className='inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#7ec2f7] bg-white text-[#3ba4f6] transition hover:bg-[#eef7ff] disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-sky-300 dark:hover:bg-slate-800'
        >
          <ChevronLeft className='h-4 w-4' />
        </button>

        {visiblePages.map((page) => {
          const isActive = page === safeCurrentPage
          return (
            <button
              key={page}
              type='button'
              onClick={() => goToPage(page)}
              aria-current={isActive ? 'page' : undefined}
              className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md border text-sm font-medium transition ${
                isActive
                  ? 'border-[#7ec2f7] bg-white text-[#3ba4f6] dark:border-sky-400 dark:bg-slate-900 dark:text-sky-300'
                  : 'border-transparent bg-transparent text-[#4f5564] hover:bg-white hover:text-[#3ba4f6] dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
              }`}
            >
              {page}
            </button>
          )
        })}

        <button
          type='button'
          onClick={() => goToPage(safeCurrentPage + 1)}
          disabled={safeCurrentPage === totalPages}
          aria-label='Go to next page'
          className='inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#7ec2f7] bg-white text-[#3ba4f6] transition hover:bg-[#eef7ff] disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-sky-300 dark:hover:bg-slate-800'
        >
          <ChevronRight className='h-4 w-4' />
        </button>

        <button
          type='button'
          onClick={() => goToPage(totalPages)}
          disabled={safeCurrentPage === totalPages}
          aria-label='Go to last page'
          className='inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#7ec2f7] bg-white text-[#3ba4f6] transition hover:bg-[#eef7ff] disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-sky-300 dark:hover:bg-slate-800'
        >
          <ChevronsRight className='h-4 w-4' />
        </button>
      </div>

      <div className='flex items-center gap-2 text-sm text-[#6e7382] dark:text-slate-300'>
        <select
          value={normalizedPageSize}
          onChange={(event) => handlePageSizeChange(Number(event.target.value))}
          className='h-8 rounded-md border border-[#7ec2f7] bg-white px-2 text-[#3ba4f6] outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-sky-300'
          aria-label='Select page size'
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <span>{itemLabel} per page</span>
      </div>
    </div>
  )
}
