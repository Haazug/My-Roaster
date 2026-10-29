'use client'

import Link from 'next/link'
import { ArrowLeft, Plane, Star } from 'lucide-react'
import { useFavourites } from '@/lib/use-favourites'
import { distanceFromNm, flightTitle } from '@/lib/flight-utils'

export default function FavouritesPage() {
  const { items, toggle } = useFavourites()

  return (
    <section className="min-h-screen p-5 sm:p-8">
      <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm text-white/50"><ArrowLeft className="size-4" />MyRoster</Link>
      <header className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#55a7ff]">Saved routes</p>
        <h1 className="mt-2 text-4xl font-semibold">My Favourites</h1>
      </header>
      {items.length ? (
        <div className="mt-8 flex flex-col gap-3">
          {items.map((flight) => (
            <article key={flight.id} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-[#0a0a0acc] p-5">
              <Link href={`/route/${flight.airlineIata}/${flight.orig}-${flight.dest}`} className="min-h-11 min-w-0 flex-1">
                <p className="font-medium">{flightTitle(flight)}</p>
                <p className="mt-1 text-sm text-white/45">{flight.orig} → {flight.dest} · {flight.airlineName}</p>
                <p className="mt-3 flex items-center gap-2 text-xs text-white/45"><Plane className="size-4 text-[#1f88ff]" aria-hidden="true" />{flight.aircraft} · {distanceFromNm(flight.distanceNm).km.toLocaleString('en-US')} km</p>
              </Link>
              <button aria-label="Remove favourite" onClick={() => toggle(flight)} className="flex size-11 shrink-0 items-center justify-center rounded-xl hover:bg-white/5">
                <Star className="size-5 fill-[#55a7ff] text-[#55a7ff]" />
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-dashed border-white/10 p-8 text-center text-white/40">Tap the star on any route to save it here.</div>
      )}
    </section>
  )
}
