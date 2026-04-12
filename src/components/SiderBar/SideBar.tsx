import { useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronDown, Clock3, LayoutDashboard } from 'lucide-react'

import { useAuth } from '../../contexts/app.context'
import { ICON_MAP, filterMenuByRole, type MenuItem } from '../../config/menu.config'
import type { SidebarRole } from '../../config/role.config'
import path from '../../constants/path'
import logo from '../../assets/logo.svg'

export default function SideBar() {
  const location = useLocation()
  const { role } = useAuth()
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({})

  // Default to 'admin' role if not available
  const currentRole: SidebarRole = role && role !== 'customer' ? (role as SidebarRole) : 'admin'

  const filteredMenus = useMemo(() => filterMenuByRole(currentRole), [currentRole])

  const linkClass = ({ isActive }: { isActive: boolean }) => {
    return `group relative flex items-center px-4 py-3 rounded-xl transition-all duration-300 mb-1 mx-2
      ${
        isActive
          ? 'bg-[#f2eeea] text-[#6d341d] shadow-[0_10px_30px_rgba(168,76,28,0.14)] ring-1 ring-white/30'
          : 'text-[#8b5a46] hover:bg-white/20 hover:text-[#8a4a2d] border border-transparent'
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

  return (
    <div className='sticky top-0 flex h-screen flex-col overflow-hidden rounded-r-[28px] bg-linear-to-br from-[#ffd79f] via-[#ff9d4a] to-[#e25a24] px-2 py-5 shadow-2xl'>
      <div className='flex justify-center p-2'>
        <img src={logo} alt='Logo' className='h-12 w-auto shrink-0' />
      </div>

      <div className='mx-2 mb-4 h-px bg-white/18' />

      <aside className='flex-1 overflow-y-auto px-1 scroll-smooth [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.3)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 hover:[&::-webkit-scrollbar-thumb]:bg-white/35'>
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
                      ? 'bg-[#f2eeea] text-[#6d341d] shadow-[0_14px_30px_rgba(111,52,29,0.14)] ring-1 ring-white/45'
                      : 'bg-white/10 text-[#fff7ef] hover:bg-white/18 hover:text-white'
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-[#8a4a2d]' : 'text-white'}`} />
                  <span className='ml-3'>{item.title}</span>
                  <ChevronDown
                    className={`ml-auto h-4 w-4 shrink-0 transition-transform ${
                      opened ? 'rotate-180' : ''
                    } ${active ? 'text-[#8a4a2d]' : 'text-white'}`}
                  />
                </button>

                {opened && (
                  <div className='mt-1 ml-4 space-y-1 border-l border-white/18 pl-3'>
                    {item.children?.map((child) => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        className={({ isActive }) =>
                          `block rounded-lg px-3 py-2 text-xs font-medium transition ${
                            isActive
                              ? 'bg-[#f2eeea] text-[#8a4a2d] shadow-sm'
                              : 'text-[#ffe9da] hover:bg-white/10 hover:text-white'
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

      <div className='mx-2 mt-4 overflow-hidden rounded-3xl border border-white/35 bg-linear-to-br from-[#ffe9d7]/95 via-[#fff1e4]/92 to-[#ffd7b8]/90 p-3 text-[#7a4a38] shadow-lg shadow-[#7b2f12]/10 ring-1 ring-white/25'>
        <div className='absolute -right-5 -top-5 h-16 w-16 rounded-full bg-white/35 blur-2xl' />
        <div className='absolute -bottom-6 -left-3 h-14 w-14 rounded-full bg-[#ffb47a]/25 blur-2xl' />

        <div className='relative flex items-center gap-3'>
          <div className='relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-[#ffb86a] to-[#ff7a1f] text-white shadow-md shadow-[#ff7a1f]/25 ring-4 ring-white/50'>
            <span className='absolute inset-0 rounded-2xl bg-white/15' />
            <Clock3 className='relative h-5 w-5' />
          </div>

          <div className='min-w-0 flex-1'>
            <div className='flex items-center gap-2'>
              <span className='h-2 w-2 rounded-full bg-[#ff8d2a] shadow-[0_0_0_4px_rgba(255,141,42,0.14)]' />
              <p className='text-[10px] font-semibold uppercase tracking-[0.28em] text-[#b17b60]'>Now</p>
            </div>

            <div className='mt-1 flex items-end gap-2'>
              <span className='text-lg font-black leading-none text-[#6d341d]'>09:24</span>
              <span className='mb-0.5 rounded-full bg-white/75 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a55d2a] shadow-sm ring-1 ring-[#f0d0b6]'>
                Live
              </span>
            </div>

            <p className='mt-1 truncate text-[11px] leading-4 text-[#9a6a54]'>
              Quick glance widget for the admin layout
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
