import React from 'react'
import SideBar from '../../components/SiderBar'
import Headers from '../../components/Headers'
// import { useAuth } from '../../contexts/app.context'
// import { Navigate } from 'react-router-dom'
// import path from '../../constants/path'
interface Props {
  children?: React.ReactNode
}

export default function MainLayout({ children }: Props) {
  // const { isAuthenticated, role } = useAuth()

  // if (!isAuthenticated) {
  //   return <Navigate to={path.login} replace />
  // }

  // if (role === 'student') {
  //   return <Navigate to={path.login} replace />
  // }
  return (
    <div className='grid min-h-screen grid-cols-[260px_1fr]'>
      <SideBar />
      <main className='col-span-1 min-w-0 h-full bg-[#f9ffff] px-5 py-4'>
        <Headers />
        {children}
      </main>
    </div>
  )
}
