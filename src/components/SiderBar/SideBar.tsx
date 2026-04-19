import { useEffect, useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { CalendarDays, ChevronDown, Clock3, Globe, LayoutDashboard } from 'lucide-react'

import { useAuth } from '../../contexts/app.context'
import { ICON_MAP, filterMenuByRole, type MenuItem } from '../../config/menu.config'
import type { SidebarRole } from '../../config/role.config'
import path from '../../constants/path'
import logo from '../../assets/logo.svg'

interface SideBarProps {
  isOpen: boolean
  onClose: () => void
}

export default function SideBar({ isOpen, onClose }: SideBarProps) {
  const location = useLocation()
  const { role } = useAuth()
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({})
  const [now, setNow] = useState<Date>(() => new Date())
  const [isWidgetOpen, setIsWidgetOpen] = useState(false)

  useEffect(() => {
    onClose()
  }, [location.pathname, onClose])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date())
    }, 1000)

    return () => {
      window.clearInterval(timer)
    }
  }, [])

  // Default to 'admin' role if not available
  const currentRole: SidebarRole = role && role !== 'customer' ? (role as SidebarRole) : 'admin'

  const filteredMenus = useMemo(() => filterMenuByRole(currentRole), [currentRole])

  const linkClass = ({ isActive }: { isActive: boolean }) => {
    return `group relative flex items-center px-4 py-3 rounded-xl transition-all duration-300 mb-1 mx-2
      ${
        isActive
          ? 'bg-[#f2eeea] text-[#6d341d] shadow-[0_10px_30px_rgba(168,76,28,0.14)] ring-1 ring-white/30 dark:bg-slate-800 dark:text-indigo-200 dark:shadow-none dark:ring-slate-700/70'
          : 'text-[#8b5a46] hover:bg-white/20 hover:text-[#8a4a2d] border border-transparent dark:text-slate-200 dark:hover:bg-slate-800/70 dark:hover:text-white'
      }`
  }

  const isGroupActive = (item: MenuItem) => {
    if (!item.children?.length) {
      return location.pathname === item.path || location.pathname.startsWith(item.path)
    }
    return item.children.some((child) => location.pathname === child.path || location.pathname.startsWith(child.path))
  }

  const toggleGroup = (title: string) => {
    setOpenMenus((prev) => ({ ...prev, [title]: !prev[title] }))
  }

  const timeText = useMemo(
    () =>
      now.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
    [now]
  )

  const dateText = useMemo(
    () =>
      now.toLocaleDateString('vi-VN', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      }),
    [now]
  )

  const timezoneText = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local', [])

  const handleToggleWidget = () => {
    setIsWidgetOpen((prev) => !prev)
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[1px] transition-opacity duration-300 lg:hidden ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden='true'
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[260px] transform transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label='Sidebar navigation'
      >
        <div className='relative flex h-full flex-col overflow-hidden rounded-r-[28px] bg-linear-to-br from-[#ffd79f] via-[#ff9d4a] to-[#e25a24] px-2 py-5 shadow-2xl dark:from-slate-950 dark:via-slate-900 dark:to-slate-800'>
          <div className='flex justify-center p-2'>
            <img src={logo} alt='Logo' className='h-12 w-auto shrink-0' />
          </div>

          <div className='mx-2 mb-4 h-px bg-white/18 dark:bg-slate-700/80' />

          <aside className='flex-1 overflow-y-auto px-1 scroll-smooth [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.3)_transparent] dark:[scrollbar-color:rgba(148,163,184,0.35)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 hover:[&::-webkit-scrollbar-thumb]:bg-white/35 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600 dark:hover:[&::-webkit-scrollbar-thumb]:bg-slate-500'>
            <nav className='flex flex-col gap-1'>
              {filteredMenus.map((item) => {
                const Icon = ICON_MAP[item.title] ?? LayoutDashboard
                const hasSingleChild = item.children?.length === 1
                const hasChildren = Boolean(item.children?.length && item.children.length > 1)
                const displayTitle = hasSingleChild ? (item.children?.[0].title ?? item.title) : item.title
                const displayPath = hasSingleChild ? (item.children?.[0].path ?? item.path) : item.path
                const active = isGroupActive(item)
                const opened = openMenus[item.title] ?? active

                if (!hasChildren) {
                  const fallbackPath = displayPath === '/dashboard' ? path.dashboard : displayPath
                  return (
                    <NavLink key={item.path} to={fallbackPath} end className={linkClass}>
                      <Icon className='h-4 w-4' />
                      <span className='ml-3 text-sm font-semibold'>{displayTitle}</span>
                    </NavLink>
                  )
                }

                return (
                  <div key={item.title} className='mx-2'>
                    <button
                      type='button'
                      onClick={() => toggleGroup(item.title)}
                      className={`flex w-full items-center rounded-[22px] px-4 py-3.5 text-sm font-semibold transition-all duration-300 ${
                        active
                          ? 'bg-[#f2eeea] text-[#6d341d] shadow-[0_14px_30px_rgba(111,52,29,0.14)] ring-1 ring-white/45 dark:bg-slate-800 dark:text-indigo-200 dark:shadow-none dark:ring-slate-700/70'
                          : 'bg-white/10 text-[#fff7ef] hover:bg-white/18 hover:text-white dark:bg-slate-800/40 dark:text-slate-200 dark:hover:bg-slate-700/70'
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 shrink-0 ${active ? 'text-[#8a4a2d] dark:text-indigo-300' : 'text-white dark:text-slate-200'}`}
                      />
                      <span className='ml-3'>{item.title}</span>
                      <ChevronDown
                        className={`ml-auto h-4 w-4 shrink-0 transition-transform ${
                          opened ? 'rotate-180' : ''
                        } ${active ? 'text-[#8a4a2d] dark:text-indigo-300' : 'text-white dark:text-slate-200'}`}
                      />
                    </button>

                    {opened && (
                      <div className='mt-1 ml-4 space-y-1 border-l border-white/18 pl-3 dark:border-slate-700/80'>
                        {item.children?.map((child) => (
                          <NavLink
                            key={child.path}
                            to={child.path}
                            className={({ isActive }) =>
                              `block rounded-lg px-3 py-2 text-xs font-medium transition ${
                                isActive
                                  ? 'bg-[#f2eeea] text-[#8a4a2d] shadow-sm dark:bg-slate-800 dark:text-indigo-200'
                                  : 'text-[#ffe9da] hover:bg-white/10 hover:text-white dark:text-slate-300 dark:hover:bg-slate-700/70 dark:hover:text-white'
                              }`
                            }
                          >
                            {child.title}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </nav>
          </aside>

          <div className='relative mx-2 mt-4 overflow-hidden rounded-3xl border border-white/35 bg-linear-to-br from-[#ffe9d7]/95 via-[#fff1e4]/92 to-[#ffd7b8]/90 p-3 text-[#7a4a38] shadow-lg shadow-[#7b2f12]/10 ring-1 ring-white/25 dark:border-slate-700/80 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 dark:text-slate-200 dark:shadow-black/20 dark:ring-slate-700/60'>
            <div className='absolute -right-5 -top-5 h-16 w-16 rounded-full bg-white/35 blur-2xl' />
            <div className='absolute -bottom-6 -left-3 h-14 w-14 rounded-full bg-[#ffb47a]/25 blur-2xl' />

            <button
              type='button'
              onClick={handleToggleWidget}
              className='relative w-full rounded-2xl p-1.5 text-left transition hover:bg-white/25 dark:hover:bg-slate-800/40'
            >
              <div className='flex items-center gap-3'>
                <div className='relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-[#ffb86a] to-[#ff7a1f] text-white shadow-md shadow-[#ff7a1f]/25 ring-4 ring-white/50 dark:from-indigo-500 dark:to-cyan-500 dark:shadow-none dark:ring-slate-800/60'>
                  <span className='absolute inset-0 rounded-2xl bg-white/15' />
                  <Clock3 className='relative h-5 w-5' />
                </div>

                <div className='min-w-0 flex-1'>
                  <div className='flex items-center gap-2'>
                    <span className='h-2 w-2 rounded-full bg-[#ff8d2a] shadow-[0_0_0_4px_rgba(255,141,42,0.14)]' />
                    <p className='text-[10px] font-semibold uppercase tracking-[0.28em] text-[#b17b60] dark:text-slate-300'>
                      Now
                    </p>
                  </div>

                  <div className='mt-1 flex flex-wrap items-end gap-2'>
                    <span className='text-lg font-black leading-none tabular-nums text-[#6d341d] dark:text-slate-100'>
                      {timeText}
                    </span>
                    <span className='mb-0.5 rounded-full bg-white/75 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a55d2a] shadow-sm ring-1 ring-[#f0d0b6] dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700'>
                      Live
                    </span>
                  </div>

                  <p className='mt-1 truncate text-[11px] leading-4 text-[#9a6a54] dark:text-slate-300'>
                    Realtime panel: date and timezone
                  </p>
                </div>
              </div>
            </button>

            <div
              className={`relative overflow-hidden transition-all duration-300 ${isWidgetOpen ? 'mt-3 max-h-72 opacity-100' : 'max-h-0 opacity-0'}`}
            >
              <div className='rounded-2xl border border-white/35 bg-white/55 p-3 text-xs leading-5 text-[#7a4a38] dark:border-slate-700 dark:bg-slate-900/75 dark:text-slate-200'>
                <div className='space-y-2'>
                  <div className='rounded-xl border border-white/45 bg-white/65 px-2.5 py-2 dark:border-slate-700 dark:bg-slate-900/70'>
                    <p className='flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8f562f] dark:text-slate-300'>
                      <CalendarDays className='h-3.5 w-3.5' /> Date
                    </p>
                    <p className='mt-0.5 break-words text-[11px]'>{dateText}</p>
                  </div>

                  <div className='rounded-xl border border-white/45 bg-white/65 px-2.5 py-2 dark:border-slate-700 dark:bg-slate-900/70'>
                    <p className='flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8f562f] dark:text-slate-300'>
                      <Globe className='h-3.5 w-3.5' /> Timezone
                    </p>
                    <p className='mt-0.5 break-all text-[11px]'>{timezoneText}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
