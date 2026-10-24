'use client'

export default function RouteProgressBar({ 
  elapsed, 
  total 
}: { 
  elapsed: number
  total: number
}) {
  const percent = Math.min(100, (elapsed / total) * 100)
  
  return (
    <div className="mt-4 rounded-full bg-white/10 h-2 overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-[#1f88ff] to-green-400 transition-all duration-500"
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}
