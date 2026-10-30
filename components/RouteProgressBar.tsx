'use client'
import { progressFraction } from '@/lib/flight-workflow'

export default function RouteProgressBar({
  elapsed,
  total, label
}: {
  elapsed: number
  total: number
  label?:string
}) {
  const percent = progressFraction(elapsed,total)*100

  return (
    <div role="progressbar" aria-label={label||'Route progress'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)} className="mt-4 rounded-full bg-white/10 h-1 overflow-hidden">
      <div
        className="h-full bg-green-400 transition-all duration-500"
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}
