'use client'

export default function RouteMap({
  from,
  to,
  fromCity,
  toCity,
  cancelled,
}: {
  from: string
  to: string
  fromCity?: string
  toCity?: string
  cancelled?: boolean
}) {
  const color = cancelled ? '#ef4444' : '#22c55e'
  
  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-[#0a0a0acc] p-6">
      <p className="text-xs font-semibold uppercase tracking-[.2em] text-white/40">Rota</p>
      <svg
        viewBox="0 0 400 200"
        className="w-full h-auto mt-4"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background */}
        <rect width="400" height="200" fill="#0a0a0a" rx="8" />
        
        {/* Route line */}
        <line
          x1="50"
          y1="100"
          x2="350"
          y2="100"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
        />
        
        {/* From point */}
        <circle cx="50" cy="100" r="8" fill={color} />
        <text x="50" y="130" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">
          {from}
        </text>
        <text x="50" y="150" textAnchor="middle" fill="white" fontSize="10" opacity="0.6">
          {fromCity}
        </text>
        
        {/* To point */}
        <circle cx="350" cy="100" r="8" fill={color} />
        <text x="350" y="130" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">
          {to}
        </text>
        <text x="350" y="150" textAnchor="middle" fill="white" fontSize="10" opacity="0.6">
          {toCity}
        </text>
      </svg>
    </div>
  )
}
