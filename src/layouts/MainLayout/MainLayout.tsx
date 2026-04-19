import React, { useCallback, useEffect, useState } from 'react'
import SideBar from '../../components/SiderBar'
import Headers from '../../components/Headers'
// import { useAuth } from '../../contexts/app.context'
// import { Navigate } from 'react-router-dom'
// import path from '../../constants/path'
interface Props {
  children?: React.ReactNode
}

export default function MainLayout({ children }: Props) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const handleCloseSidebar = useCallback(() => {
    setIsSidebarOpen(false)
  }, [])

  const handleToggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev)
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.body.style.overflow = isSidebarOpen ? 'hidden' : ''

    return () => {
      document.body.style.overflow = ''
    }
  }, [isSidebarOpen])

  // const { isAuthenticated, role } = useAuth()

  // if (!isAuthenticated) {
  //   return <Navigate to={path.login} replace />
  // }

  // if (role === 'student') {
  //   return <Navigate to={path.login} replace />
  // }
  return (
    <div className='min-h-screen bg-[var(--app-bg)] text-[var(--app-text)] lg:grid lg:grid-cols-[260px_1fr]'>
      <SideBar isOpen={isSidebarOpen} onClose={handleCloseSidebar} />

      <main className='min-w-0 bg-[var(--app-bg)] px-3 py-3 sm:px-4 sm:py-4 lg:px-5 lg:py-4'>
        <Headers onToggleSidebar={handleToggleSidebar} />
        {children}
      </main>
    </div>
  )
}
