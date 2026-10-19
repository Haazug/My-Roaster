'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import useSWR from 'swr'
import { ArrowLeft, ChevronRight, Plane } from 'lucide-react'
import { useEffect } from 'react'
import { useMapStore, type Point } from '@/lib/map-store'

const fetcher = (url: string) => fetch(url).then((response) => response.json())

type Airport = { iata?: string; name?: string; city?: string; country?: string; lat?: number; lon?: number }
type Route = { from: string; to: string; fromAirport?: Airport; toAirport?: Airport; aircraft?: string[] }
type Airline = { name: string; iata?: string; icao?: string; country?: string; active?: boolean }

export default function AirlineDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data, error } = useSWR(id ? `/api/airlines/${id}` : null, fetcher)
  const setView = useMapStore((s) => s.setView)

  useEffect(() => {
    if (!data?.routes) return
    const routes = (data.routes as Route[])
      .filter((r) => r.fromAirport?.lat != null && r.toAirport?.lat != null)
      .map((r) => ({ from: r.fromAirport as Point, to: r.toAirport as Point }))
    setView({ mode: 'airline', routes })
    return () => setView({ mode: 'idle' })
  }, [data, setView])

  if (error || data?.error) {
    return (
      <section className="min-h-screen p-5 sm:p-8">
        <Link href="/airlines" className="inline-flex min-h-11 items-center gap-2 text-sm text-white/55 hover:text-white">
          <ArrowLeft className="size-4" /> Back to airlines
        </Link>
        <div className="mt-10 rounded-2xl border border-red-400/20 bg-red-400/10 p-5 text-red-100">
          This airline could not be loaded.
        </div>
      </section>
    )
  }

  if (!data) {
    return <section className="min-h-screen p-5 text-white/45 sm:p-8">Loading airline routes…</section>
  }

  const airline = data.airline as Airline
  const routes = data.routes as Route[]

  return (
    <section className="min-h-screen p-5 sm:p-8">
      <Link href="/airlines" className="inline-flex min-h-11 items-center gap-2 text-sm text-white/55 hover:text-white">
        <ArrowLeft className="size-4" /> Back to airlines
      </Link>
      <header className="mt-8 border-b border-white/10 pb-7">
        <div className="flex items-start gap-4">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-white text-sm font-black text-black">
            {airline.iata || <Plane className="size-6 text-[#1f88ff]" />}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#55a7ff]">Airline route network</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">{airline.name}</h1>
            <p className="mt-2 text-sm text-white/45">{airline.country || 'International'} · {routes.length} routes · {airline.icao || 'ICAO unavailable'}</p>
          </div>
        </div>
      </header>
      <div className="mt-7 flex flex-col gap-2">
        {routes.map((route, index) => {
          const from = route.fromAirport
          const to = route.toAirport
          return (
            <Link key={`${route.from}-${route.to}-${index}`} href={`/route/${airline.iata || id}/${route.from}-${route.to}`} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#111217cc] p-4 transition hover:border-[#1f88ff]/60">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3 font-semibold">
                  <span>{route.from}</span><span className="text-[#1f88ff]">→</span><span>{route.to}</span>
                </div>
                <p className="mt-1 truncate text-sm text-white/45">{from?.city || from?.name || 'Origin'} → {to?.city || to?.name || 'Destination'}</p>
                {route.aircraft?.length ? <p className="mt-2 text-xs text-white/30">{route.aircraft.join(', ')}</p> : null}
              </div>
              <ChevronRight className="size-5 shrink-0 text-white/30" />
            </Link>
          )
        })}
      </div>
    </section>
  )
}
