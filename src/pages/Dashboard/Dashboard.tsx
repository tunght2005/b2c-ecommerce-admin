import { MoreVertical, ShoppingCart, ChartNoAxesCombined, FileText, UserRound, CircleDot } from 'lucide-react'

export default function Dashboard() {
  const reps = [
    { name: 'Nicholas Patrick', sales: '$ 2540.58', products: '150 Products', premium: '105 Premium', rank: '+Gold' },
    { name: 'Cordell Edwards', sales: '$ 1567.80', products: '95 Products', premium: '60 Premium', rank: '+Silver' },
    { name: 'Derrick Spencer', sales: '$ 1640.26', products: '120 Products', premium: '75 Premium', rank: '+Silver' },
    { name: 'Larissa Burton', sales: '$ 2340.58', products: '120 Products', premium: '99 Premium', rank: '+Gold' }
  ]

  const stats = [
    { title: 'Product sold', value: '25.1k', delta: '+15%', negative: false, icon: ShoppingCart, action: 'View Report' },
    { title: 'Total Profit', value: '$2,435k', delta: '-3.5%', negative: true, icon: ChartNoAxesCombined, action: 'View Report' },
    { title: 'Total No. of Claim', value: '3.5M', delta: '+15%', negative: false, icon: FileText, action: 'View More' },
    { title: 'New Customer', value: '43.5k', delta: '+10%', negative: false, icon: UserRound, action: 'View More' }
  ]

  return (
    <div className='space-y-5'>
      <section className='rounded-3xl border border-[#eceaf9] bg-white p-5'>
        <h1 className='mb-1 text-[2.05rem] leading-none font-bold text-[#22204a]'>Overview</h1>
        <p className='mb-4 text-lg font-semibold text-[#2f2d57]'>Top Sales Representative</p>

        <div className='space-y-3'>
          {reps.map((rep) => (
            <article
              key={rep.name}
              className='grid items-center gap-4 rounded-2xl border border-[#eceaf9] px-4 py-3 md:grid-cols-[2fr_1.1fr_1fr_1fr_0.8fr_auto]'
            >
              <div className='flex items-center gap-3'>
                <div className='flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#f59e85] to-[#594ad0] text-sm font-bold text-white'>
                  {rep.name
                    .split(' ')
                    .map((v) => v[0])
                    .join('')
                    .slice(0, 2)}
                </div>
                <p className='font-semibold text-[#6e6d84]'>{rep.name}</p>
              </div>
              <p className='font-extrabold text-[#22204a]'>{rep.sales}</p>
              <p className='font-medium text-[#9492ab]'>{rep.products}</p>
              <p className='font-medium text-[#9492ab]'>{rep.premium}</p>
              <p className={`font-semibold ${rep.rank.includes('Gold') ? 'text-[#f5a14b]' : 'text-[#48b788]'}`}>{rep.rank}</p>
              <button type='button' className='justify-self-end text-[#7d6de2]'>
                <MoreVertical className='h-4 w-4' />
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className='grid gap-4 xl:grid-cols-4'>
        {stats.map((item) => {
          const Icon = item.icon
          return (
            <article key={item.title} className='rounded-2xl border border-[#eceaf9] bg-white p-5'>
              <div className='mb-3 flex items-start justify-between'>
                <p className='text-sm font-semibold text-[#9a98b3]'>{item.title}</p>
                <Icon className='h-5 w-5 text-[#4c437a]' />
              </div>
              <p className='text-4xl font-extrabold text-[#22204a]'>{item.value}</p>
              <div className='mt-2 flex items-center justify-between'>
                <p className={`text-sm font-semibold ${item.negative ? 'text-[#ea6f75]' : 'text-[#4dbc8f]'}`}>{item.delta}</p>
                <button type='button' className='text-sm font-semibold text-[#7465d7]'>
                  {item.action}
                </button>
              </div>
            </article>
          )
        })}
      </section>

      <section className='grid gap-4 xl:grid-cols-[1.6fr_1fr]'>
        <article className='rounded-2xl border border-[#eceaf9] bg-white p-5'>
          <div className='mb-4 flex items-center justify-between'>
            <p className='text-2xl font-bold text-[#22204a]'>Claims Over the Years</p>
            <div className='flex items-center gap-4 text-sm font-semibold'>
              <span className='flex items-center gap-1 text-[#ed94a1]'>
                <CircleDot className='h-4 w-4 fill-[#ed94a1] text-[#ed94a1]' /> Approved
              </span>
              <span className='flex items-center gap-1 text-[#7465d7]'>
                <CircleDot className='h-4 w-4 fill-[#7465d7] text-[#7465d7]' /> Submitted
              </span>
            </div>
          </div>

          <div className='h-[220px] rounded-xl bg-[#faf9ff] p-3'>
            <svg viewBox='0 0 760 240' className='h-full w-full'>
              <path d='M20 185 C100 120, 180 225, 260 170 C340 110, 420 80, 500 178 C580 252, 660 60, 740 160' fill='none' stroke='#ed94a1' strokeWidth='5' strokeLinecap='round' />
              <path d='M20 195 C100 165, 180 220, 260 162 C340 85, 420 95, 500 182 C580 240, 660 90, 740 152' fill='none' stroke='#6f60d9' strokeWidth='5' strokeLinecap='round' />
            </svg>
          </div>
        </article>

        <article className='relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#5c4ad2] to-[#3e2aac] p-6 text-white'>
          <div className='absolute inset-0 opacity-20' style={{ backgroundImage: 'radial-gradient(circle at 10% 20%, #ffffff 0, transparent 35%), radial-gradient(circle at 80% 70%, #b39dff 0, transparent 30%)' }} />
          <div className='relative'>
            <p className='text-lg font-semibold text-white/90'>Sales team target</p>
            <p className='mt-2 text-5xl leading-none font-black'>82%</p>
            <p className='mt-2 text-xl text-white/80'>Achived</p>

            <div className='mt-8 space-y-1'>
              <p className='text-lg font-semibold text-white/90'>Cleared Que</p>
              <p className='text-5xl leading-none font-black'>1.4k</p>
              <p className='text-sm text-white/80'>No. of Bills</p>
            </div>
          </div>
        </article>
      </section>
    </div>
  )
}
