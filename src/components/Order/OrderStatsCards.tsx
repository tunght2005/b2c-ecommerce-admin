interface OrderStatsCardItem {
  label: string
  value: string | number
  helper?: string
  tone: string
}

interface OrderStatsCardsProps {
  items: OrderStatsCardItem[]
}

export default function OrderStatsCards({ items }: OrderStatsCardsProps) {
  return (
    <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
      {items.map((item) => (
        <article
          key={item.label}
          className='overflow-hidden rounded-3xl border border-[#eceaf8] bg-white p-5 shadow-[0_12px_40px_rgba(28,24,70,0.06)]'
        >
          <div className={`mb-4 h-1.5 rounded-full bg-gradient-to-r ${item.tone}`} />
          <p className='text-sm font-semibold text-[#8c88ac]'>{item.label}</p>
          <p className='mt-3 text-3xl font-black text-[#212047] sm:text-4xl'>{item.value}</p>
          {item.helper ? <p className='mt-2 text-xs text-[#8f8aac]'>{item.helper}</p> : null}
        </article>
      ))}
    </div>
  )
}
