'use client'

import Link from 'next/link'
import { ArrowLeft, Plane, X } from 'lucide-react'
import { useLocalStorage } from '@/lib/use-local-storage'
import type { RosterFlight } from '@/lib/roster-data'
import { distanceFromNm, flightTitle } from '@/lib/flight-utils'

export default function TripsPage() {
  const [bookings, setBookings] = useLocalStorage<RosterFlight[]>('myroster.bookings', [])

  return (
    <section className="min-h-screen p-5 sm:p-8">
      <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm text-white/50"><ArrowLeft className="size-4" />MyRoster</Link>
      <h1 className="mt-4 text-4xl font-semibold">Booked Trips</h1>
      <p className="mt-2 text-sm text-white/45">Your saved routes, ready when you are.</p>
      {bookings.length ? (
        <div className="mt-8 flex flex-col gap-3">
          {bookings.map((flight) => {
            const d = distanceFromNm(flight.distanceNm)
            return (
              <article key={flight.id} className="rounded-2xl border border-white/10 bg-[#0a0a0acc] p-5">
                <Link href={`/route/${flight.airlineIata}/${flight.orig}-${flight.dest}`} className="flex min-h-11 items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium">{flightTitle(flight)}</p>
                    <p className="mt-1 text-sm text-white/45">{flight.orig} → {flight.dest} · {flight.airlineName} · {flight.aircraft}</p>
                  </div>
                  <Plane className="size-5 shrink-0 text-[#1f88ff]" aria-hidden="true" />
                </Link>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
                  <span className="text-white/45">{d.km.toLocaleString('en-US')} km / {d.nm.toLocaleString('en-US')} nm</span>
                  <div className="flex gap-2">
                    <Link href={`/route/${flight.airlineIata}/${flight.orig}-${flight.dest}`} className="flex min-h-11 items-center rounded-xl bg-[#1f88ff] px-4 font-medium">Fly Now</Link>
                    <button aria-label="Cancel booking" onClick={() => setBookings(bookings.filter((b) => b.id !== flight.id))} className="flex size-11 items-center justify-center rounded-xl border border-white/10 text-white/60 hover:bg-white/5">
                      <X className="size-4" />
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-dashed border-white/10 p-8 text-center text-white/40">
          No booked trips yet. Open a route and choose Book Trip.
          <Link href="/airlines" className="mx-auto mt-4 flex min-h-11 w-fit items-center rounded-xl bg-white px-4 text-sm font-medium text-black">Browse airlines</Link>
        </div>
      )}
    </section>
  )
}
