'use client'

import Link from 'next/link'
import { Trash2 } from 'lucide-react'
import { useLocalStorage } from '@/lib/use-local-storage'
import { AirlineLogo } from '@/components/AirlineLogo'

export default function BookedFlights() {
  const [bookings, setBookings] = useLocalStorage<any[]>('myroster.bookings', [])
  if (!bookings.length) return null
  return (
    <div className="mt-8">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[.2em] text-[#55a7ff]">
        Booked flights
        <span className="rounded-full bg-[#55a7ff]/15 px-2 py-0.5 text-[10px]">{bookings.length}</span>
      </h2>
      <div className="flex flex-col gap-3">
        {bookings.map((b) => {
          const href = b.plan ? `/boarding/${encodeURIComponent(b.id)}` : `/route/${b.airlineIata}/${b.orig}-${b.dest}`
          return (
            <div key={b.id} className="rounded-2xl border border-[#55a7ff]/30 bg-[#55a7ff]/5 p-4">
              <div className="flex items-center gap-3">
                <AirlineLogo iata={b.airlineIata} name={b.airlineName} size="sm" showText={false} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{b.flightNumber} · {b.orig} → {b.dest}</p>
                  <p className="truncate text-sm text-white/50">{b.fromCity} → {b.toCity}{b.aircraft ? ` · ${b.aircraft}` : ''}</p>
                </div>
                <span className="shrink-0 rounded bg-[#55a7ff]/20 px-2 py-0.5 text-[10px] font-semibold text-[#55a7ff]">Booked</span>
              </div>
              <p className="mt-2 text-xs text-white/40">{b.plan ? 'Plan ready: tear the boarding pass to start' : 'Route saved: plan not prepared yet'}</p>
              <div className="mt-3 flex gap-2">
                <Link href={href} className="flex min-h-11 flex-1 items-center justify-center rounded-xl bg-[#1f88ff] text-sm font-semibold">Fly now</Link>
                <button type="button" aria-label="Remove booking" onClick={() => window.confirm('Remove this booking?') && setBookings(bookings.filter((x) => x.id !== b.id))} className="flex size-11 items-center justify-center rounded-xl border border-white/10 text-white/60 hover:bg-white/5">
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
