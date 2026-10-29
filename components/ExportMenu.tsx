'use client'

import { useState } from 'react'
import { ChevronDown, Share2, Cloud, FileDown, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { simbriefUrl, flightSummary, downloadPln, copyText, type ExportFlight } from '@/lib/export'

export function ExportMenu({ flight }: { flight: ExportFlight }) {
  const [open, setOpen] = useState(false)

  const handleSimBrief = async () => {
    const url = simbriefUrl(flight)
    window.open(url, '_blank', 'noopener,noreferrer')
    toast.success('Opening SimBrief... log in if asked. Your flight is pre-filled.')
    setOpen(false)
  }

  const handleVolanta = async () => {
    const url = 'https://fly.volanta.app/map'
    window.open(url, '_blank', 'noopener,noreferrer')
    const summary = flightSummary(flight)
    const copied = await copyText(summary)
    if (copied) {
      toast.success('Flight details copied. Tip: plan it in SimBrief, then in Volanta use Plan a Flight > Add a Flight Plan > Import from SimBrief.')
    }
    setOpen(false)
  }

  const handleMSFS = async () => {
    const url = 'https://planner.flightsimulator.com'
    window.open(url, '_blank', 'noopener,noreferrer')
    downloadPln(flight)
    const summary = flightSummary(flight)
    await copyText(summary)
    toast.success('.pln downloaded and details copied. Enter the airports in the planner, or load the .pln from the in-sim World Map.')
    setOpen(false)
  }

  const handleCopySummary = async () => {
    const summary = flightSummary(flight)
    const copied = await copyText(summary)
    if (copied) {
      toast.success('Copied')
    }
    setOpen(false)
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="flex min-h-11 min-w-32 items-center justify-center gap-2 rounded-xl bg-[#1f88ff] px-4 text-sm font-semibold text-white transition hover:bg-[#1f88ff]/90"
        aria-label="Export flight"
      >
        Export <ChevronDown className="size-4" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-white/10 bg-[#111217] p-2 shadow-lg backdrop-blur">
            <button
              onClick={handleSimBrief}
              className="flex w-full items-start gap-3 rounded-xl p-3 text-left transition hover:bg-white/[.08]"
              aria-label="Export to SimBrief"
            >
              <Cloud className="size-5 shrink-0 text-[#1f88ff] mt-0.5" />
              <div>
                <p className="font-semibold text-sm">SimBrief Dispatch</p>
                <p className="text-xs text-white/40 mt-1">Opens with the flight pre-filled</p>
              </div>
            </button>

            <button
              onClick={handleVolanta}
              className="flex w-full items-start gap-3 rounded-xl p-3 text-left transition hover:bg-white/[.08]"
              aria-label="Export to Volanta"
            >
              <Share2 className="size-5 shrink-0 text-[#55a7ff] mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Volanta</p>
                <p className="text-xs text-white/40 mt-1">Copies flight details and opens the map</p>
              </div>
            </button>

            <button
              onClick={handleMSFS}
              className="flex w-full items-start gap-3 rounded-xl p-3 text-left transition hover:bg-white/[.08]"
              aria-label="Export to MSFS"
            >
              <FileDown className="size-5 shrink-0 text-[#55a7ff] mt-0.5" />
              <div>
                <p className="font-semibold text-sm">MSFS Flight Planner</p>
                <p className="text-xs text-white/40 mt-1">Downloads a .pln file and opens the planner</p>
              </div>
            </button>

            <div className="my-2 border-t border-white/10" />

            <button
              onClick={handleCopySummary}
              className="flex w-full items-start gap-3 rounded-xl p-3 text-left transition hover:bg-white/[.08]"
              aria-label="Copy flight summary"
            >
              <Copy className="size-5 shrink-0 text-white/40 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Copy flight summary</p>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
