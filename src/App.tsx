import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className='min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-10 p-6'>
      {/* HERO */}
      <div className='relative flex items-center justify-center'>
        <img src={heroImg} className='w-40 h-auto absolute' />
        <img src={reactLogo} className='w-20 animate-spin-slow' />
        <img src={viteLogo} className='w-16 absolute right-[-40px]' />
      </div>

      {/* TEXT */}
      <div className='text-center space-y-3'>
        <h1 className='text-4xl font-bold text-gray-800'>Get started</h1>
        <p className='text-gray-500'>
          Edit <code className='bg-gray-200 px-1 rounded'>src/App.tsx</code> and save to test HMR
        </p>
      </div>

      {/* BUTTON */}
      <button
        onClick={() => setCount((c) => c + 1)}
        className='px-6 py-3 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 transition'
      >
        Count is {count}
      </button>

      {/* LINKS */}
      <div className='grid grid-cols-2 gap-8 mt-10'>
        <a href='https://vite.dev/' target='_blank' className='p-4 bg-white shadow rounded hover:shadow-lg transition'>
          Explore Vite
        </a>

        <a href='https://react.dev/' target='_blank' className='p-4 bg-white shadow rounded hover:shadow-lg transition'>
          Learn React
        </a>
      </div>
    </div>
  )
}

export default App
