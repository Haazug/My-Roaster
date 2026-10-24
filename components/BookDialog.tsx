'use client'

import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

export default function BookDialog({
  open,
  onClose,
  onSaveRoute,
  onPlan,
  planHref,
}: {
  open: boolean
  onClose: () => void
  onSaveRoute: () => void
  onPlan: () => void
  planHref: string
}) {
  const router = useRouter()
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div role="dialog" aria-label="Book this flight" onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl border border-white/10 bg-[#111217] p-5 text-white shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold">Book this flight</h2>
            <p className="mt-1 text-sm text-white/50">How do you want to save it?</p>
          </div>
          <button aria-label="Close" onClick={onClose} className="p-1 text-white/50 hover:text-white"><X className="size-5" /></button>
        </div>
        <button onClick={() => { onPlan(); router.push(planHref) }} className="mt-5 w-full rounded-2xl bg-[#1f88ff] p-4 text-left">
          <p className="font-semibold">Prepare the flight plan now</p>
          <p className="mt-1 text-sm text-white/80">Fill in the plan and generate the boarding pass. It is saved as Booked, and you only tear it when you fly.</p>
        </button>
        <button onClick={() => { onSaveRoute(); onClose() }} className="mt-3 w-full rounded-2xl border border-white/15 bg-white/[.06] p-4 text-left">
          <p className="font-semibold">Save the route only</p>
          <p className="mt-1 text-sm text-white/60">Plan it later, when you are ready to fly.</p>
        </button>
      </div>
    </div>
  )
}
