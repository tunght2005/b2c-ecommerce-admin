import { Bell, Search, ChevronDown } from 'lucide-react'
import Popover from '../Popover'

export default function Header() {
  return (
    <header className='mb-5 flex flex-wrap items-center gap-3 border-b border-[#eceaf8] pb-4'>
      <div className='relative min-w-0 flex-1 max-w-110'>
        <Search className='pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[#8d87c0]' />
        <input
          type='text'
          placeholder='Search'
          className='h-11 w-full rounded-full border border-[#ebe9fa] bg-[#f5f4ff] pr-10 pl-11 text-sm text-[#5f5b7f] outline-none transition focus:border-[#7b68ee] focus:ring-2 focus:ring-[#b8aef8]/45'
        />
      </div>

      <div className='ml-auto flex items-center gap-3'>
        <button
          type='button'
          className='flex h-10 w-10 items-center justify-center rounded-full bg-[#f5f4ff] text-[#6f62cf] transition hover:bg-[#ece9ff]'
          aria-label='Notifications'
        >
          <Bell className='h-4 w-4' />
        </button>

        <Popover
          placement='bottom-end'
          renderPopover={
            <div className='w-56 rounded-2xl border border-[#eceaf8] bg-white p-2 shadow-[0_18px_40px_rgba(29,25,71,0.14)]'>
              <button
                type='button'
                className='w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-[#5f5b7f] hover:bg-[#f5f4ff]'
              >
                My Profile
              </button>
              <button
                type='button'
                className='w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-[#5f5b7f] hover:bg-[#f5f4ff]'
              >
                Account Settings
              </button>
              <button
                type='button'
                className='w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-[#5f5b7f] hover:bg-[#f5f4ff]'
              >
                Logout
              </button>
            </div>
          }
        >
          {({ open }: { open: boolean }) => (
            <button
              type='button'
              className='flex items-center gap-2 rounded-full border border-[#ebe9fa] bg-white px-3 py-1.5 text-left transition hover:border-[#d9d5f4]'
            >
              <div className='flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-[#ffb1a1] to-[#f47458] text-xs font-semibold text-white'>
                DC
              </div>
              <span className='hidden text-sm font-medium text-[#5f5b7f] sm:inline'>Danielle Campbell</span>
              <ChevronDown className={`h-4 w-4 text-[#8d87c0] transition ${open ? 'rotate-180' : ''}`} />
            </button>
          )}
        </Popover>
      </div>
    </header>
  )
}
