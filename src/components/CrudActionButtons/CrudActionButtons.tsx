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
  'inline-flex items-center gap-2 rounded-full border bg-white text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60'

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
          className={`${baseStyle} ${sizeClass} border-[#d9d3ef] text-[#5f5a7a] hover:border-[#bfb5ea] hover:text-[#6f62cf]`}
        >
          <Eye className='h-4 w-4' />
        </button>
      )}

      {onEdit && (
        <button
          type='button'
          onClick={onEdit}
          className={`${baseStyle} ${sizeClass} border-[#d9d3ef] text-[#5f5a7a] hover:border-[#bfb5ea] hover:text-[#6f62cf]`}
        >
          <Edit2 className='h-4 w-4' />
        </button>
      )}

      {onDelete && (
        <button
          type='button'
          onClick={onDelete}
          className={`${baseStyle} ${sizeClass} border-[#f3ccd2] text-[#c84455] hover:bg-[#fff5f7]`}
        >
          <Trash2 className='h-4 w-4' />
        </button>
      )}
    </div>
  )
}
