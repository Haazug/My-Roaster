'use client'

import { Download, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import html2canvas from 'html2canvas'
import { useRef } from 'react'

interface BoardingPassProps {
  airline: string
  airlineIata: string
  flightNumber: string
  from: string
  to: string
  fromCity: string
  toCity: string
  date: string
  depTime: string
  boardingTime: string
  arrivalTime: string
  passenger: string
  aircraft: string
  registration?: string
  gate: string
  seat: string
  distance: number
  duration: string
}

export function BoardingPass({
  airline,
  airlineIata,
  flightNumber,
  from,
  to,
  fromCity,
  toCity,
  date,
  depTime,
  boardingTime,
  arrivalTime,
  passenger,
  aircraft,
  registration,
  gate,
  seat,
  distance,
  duration,
}: BoardingPassProps) {
  const ref = useRef<HTMLDivElement>(null)

  const handleDownload = async () => {
    if (!ref.current) return
    try {
      const canvas = await html2canvas(ref.current, {
        backgroundColor: '#0a0a0a',
        scale: 2,
      })
      const link = document.createElement('a')
      link.href = canvas.toDataURL('image/png')
      link.download = `${from}-${to}-boarding-pass.png`
      link.click()
      toast.success('Boarding pass saved as image')
    } catch {
      toast.error('Failed to save image')
    }
  }

  const handleShare = async () => {
    const text = `${airlineIata}${flightNumber} - ${fromCity} to ${toCity} on ${date}`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Boarding Pass', text })
      } catch {
        // Dismissed
      }
    } else {
      toast.success('Flight details copied')
    }
  }

  const barcode = `${from}${to}${airlineIata}${flightNumber}`.substring(0, 20)

  return (
    <div className="space-y-4">
      <div
        ref={ref}
        className="mx-auto max-w-md overflow-hidden rounded-xl border-2 border-white/20 bg-gradient-to-b from-[#1a1f2e] to-[#0f1419] p-0 shadow-2xl"
      >
        {/* Header */}
        <div className="border-b border-white/10 bg-[#1f88ff] px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-white/80 uppercase tracking-widest">
                BOARDING PASS
              </p>
              <p className="mt-1 text-xl font-bold text-white">{airline}</p>
            </div>
            <div className="text-right text-3xl font-black text-white opacity-20">
              ✈️
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-6 py-6">
          {/* Passenger */}
          <div className="mb-6 border-b border-dashed border-white/20 pb-4">
            <p className="text-xs text-white/50 uppercase tracking-widest">Passenger</p>
            <p className="mt-2 font-bold text-white">{passenger}</p>
          </div>

          {/* Route */}
          <div className="mb-6 space-y-3">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
              <div>
                <p className="text-xs text-white/50 uppercase">From</p>
                <p className="mt-1 text-2xl font-black text-[#1f88ff]">{from}</p>
                <p className="mt-0.5 text-xs text-white/60">{fromCity}</p>
              </div>

              <div className="text-center">
                <svg
                  className="h-6 w-6 text-white/40"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                <p className="mt-2 text-xs font-semibold text-white/50">{distance} nm</p>
              </div>

              <div className="text-right">
                <p className="text-xs text-white/50 uppercase">To</p>
                <p className="mt-1 text-2xl font-black text-[#1f88ff]">{to}</p>
                <p className="mt-0.5 text-xs text-white/60">{toCity}</p>
              </div>
            </div>
          </div>

          {/* Flight Info */}
          <div className="mb-6 grid grid-cols-2 gap-4 border-y border-dashed border-white/20 py-4">
            <div>
              <p className="text-xs text-white/50 uppercase">Flight</p>
              <p className="mt-1 font-bold text-lg text-white">
                {airlineIata}
                <span className="ml-1 text-[#1f88ff]">{flightNumber}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/50 uppercase">Date</p>
              <p className="mt-1 font-bold text-white">{date}</p>
            </div>
          </div>

          {/* Schedule */}
          <div className="mb-6 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xs text-white/50 uppercase">Boarding</p>
              <p className="mt-1 font-bold text-white">{boardingTime}</p>
            </div>
            <div>
              <p className="text-xs text-white/50 uppercase">Departure</p>
              <p className="mt-1 font-bold text-white">{depTime}</p>
            </div>
            <div>
              <p className="text-xs text-white/50 uppercase">Arrival</p>
              <p className="mt-1 font-bold text-white">{arrivalTime}</p>
            </div>
          </div>

          {/* Seat & Gate */}
          <div className="mb-6 grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-white/50 uppercase">Gate</p>
              <p className="mt-1 text-2xl font-black text-[#1f88ff]">{gate}</p>
            </div>
            <div>
              <p className="text-xs text-white/50 uppercase">Seat</p>
              <p className="mt-1 text-2xl font-black text-[#1f88ff]">{seat}</p>
            </div>
            <div>
              <p className="text-xs text-white/50 uppercase">Duration</p>
              <p className="mt-1 font-bold text-white text-sm">{duration}</p>
            </div>
          </div>

          {/* Aircraft */}
          {aircraft && (
            <div className="mb-6 border-t border-dashed border-white/20 pt-4">
              <p className="text-xs text-white/50 uppercase">Aircraft</p>
              <p className="mt-1 font-bold text-white">{aircraft}</p>
              {registration && (
                <p className="mt-1 text-xs text-white/60">Reg: {registration}</p>
              )}
            </div>
          )}

          {/* Barcode */}
          <div className="flex flex-col items-center border-t border-dashed border-white/20 pt-4">
            <svg
              className="h-12 w-full text-white/30"
              viewBox={`0 0 ${barcode.length * 10} 50`}
            >
              {barcode.split('').map((char, i) => (
                <line
                  key={i}
                  x1={i * 10 + 5}
                  y1="0"
                  x2={i * 10 + 5}
                  y2={char.charCodeAt(0) % 2 === 0 ? 40 : 20}
                  stroke="currentColor"
                  strokeWidth="2"
                />
              ))}
            </svg>
            <p className="mt-2 text-xs font-mono text-white/40">
              {barcode}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 bg-white/[.02] px-6 py-3 text-center">
          <p className="text-xs text-white/40">
            FOR FLIGHT SIMULATION ONLY • NOT A TRAVEL DOCUMENT
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-center">
        <button
          onClick={handleDownload}
          className="flex min-h-10 items-center gap-2 rounded-lg border border-white/20 px-4 text-sm font-semibold transition hover:bg-white/[.08]"
        >
          <Download className="size-4" /> Save Image
        </button>
        <button
          onClick={handleShare}
          className="flex min-h-10 items-center gap-2 rounded-lg border border-white/20 px-4 text-sm font-semibold transition hover:bg-white/[.08]"
        >
          <Share2 className="size-4" /> Share
        </button>
      </div>
    </div>
  )
}
