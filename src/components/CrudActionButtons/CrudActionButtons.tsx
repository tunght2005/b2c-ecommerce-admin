import { Edit2, Eye, Trash2 } from 'lucide-react'

type ButtonSize = 'sm' | 'md'

interface CrudActionButtonsProps {
  onView?: () => void
  onEdit?: () => void
  onDelete?: () => void
  className?: string
  buttonSize?: ButtonSize
}

const baseStyle =
  'inline-flex items-center gap-2 rounded-full border bg-white text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'

const sizeStyleMap: Record<ButtonSize, string> = {
  sm: 'h-9 px-3',
  md: 'h-11 px-5 text-sm'
}

export default function CrudActionButtons({
  onView,
  onEdit,
  onDelete,
  className = '',
  buttonSize = 'sm'
}: CrudActionButtonsProps) {
  const sizeClass = sizeStyleMap[buttonSize]

  return (
    <div className={`flex flex-wrap justify-end gap-2 ${className}`.trim()}>
      {onView && (
        <button
          type='button'
          onClick={onView}
          className={`${baseStyle} ${sizeClass} border-[#d9d3ef] text-[#5f5a7a] hover:border-[#bfb5ea] hover:text-[#6f62cf] dark:hover:border-slate-500 dark:hover:text-slate-100`}
        >
          <Eye className='h-4 w-4' />
        </button>
      )}

      {onEdit && (
        <button
          type='button'
          onClick={onEdit}
          className={`${baseStyle} ${sizeClass} border-[#d9d3ef] text-[#5f5a7a] hover:border-[#bfb5ea] hover:text-[#6f62cf] dark:hover:border-slate-500 dark:hover:text-slate-100`}
        >
          <Edit2 className='h-4 w-4' />
        </button>
      )}

      {onDelete && (
        <button
          type='button'
          onClick={onDelete}
          className={`${baseStyle} ${sizeClass} border-[#f3ccd2] text-[#c84455] hover:bg-[#fff5f7] dark:border-rose-900/60 dark:text-rose-300 dark:hover:bg-rose-950/40`}
        >
          <Trash2 className='h-4 w-4' />
        </button>
      )}
    </div>
  )
}
