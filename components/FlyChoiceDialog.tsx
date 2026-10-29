'use client'

import { Plane, SlidersHorizontal, X } from 'lucide-react'

export default function FlyChoiceDialog({
  open,
  onClose,
  onSimbrief,
  onManual,
}: {
  open: boolean
  onClose: () => void
  onSimbrief: () => void
  onManual: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div role="dialog" aria-label="Plan your flight" onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl border border-white/10 bg-[#111217] p-5 text-white shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold">Plan your flight</h2>
            <p className="mt-1 text-sm text-white/50">How do you want to prepare it?</p>
          </div>
          <button aria-label="Close" onClick={onClose} className="p-1 text-white/50 hover:text-white"><X className="size-5" /></button>
        </div>
        <button onClick={onSimbrief} className="mt-5 w-full rounded-2xl bg-[#1f88ff] p-4 text-left">
          <p className="flex items-center gap-2 font-semibold"><Plane className="size-4" />Plan it in SimBrief</p>
          <p className="mt-1 text-sm text-white/80">Opens SimBrief in your browser with the flight pre-filled. This page moves on to the flight plan, where you can import the result.</p>
        </button>
        <button onClick={onManual} className="mt-3 w-full rounded-2xl border border-white/15 bg-white/[.06] p-4 text-left">
          <p className="flex items-center gap-2 font-semibold"><SlidersHorizontal className="size-4" />Plan it manually</p>
          <p className="mt-1 text-sm text-white/60">Fill in the flight plan here, without leaving MyRoster.</p>
        </button>
      </div>
    </div>
  )
}
