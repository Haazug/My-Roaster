'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import useSWR from 'swr'
import { ArrowLeft, ChevronRight, RadioTower, ExternalLink } from 'lucide-react'
import { useEffect } from 'react'
import { useMapStore, type Point } from '@/lib/map-store'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type Airport = { iata: string; icao: string; name: string; city: string; country: string; lat: number; lon: number; routes?: number }
type Route = { from: string; to: string; fromAirport?: Airport; toAirport?: Airport }
type AirportDetail = { airport: Airport; routes: Route[]; nearby?: Airport[] }

export default function AirportDetailPage() {
  const { code } = useParams<{ code: string }>()
  const decoded = code ? decodeURIComponent(code).toUpperCase() : ''
  const { data, error } = useSWR(decoded ? `/api/airports/${decoded}` : null, fetcher)
  const setView = useMapStore((s) => s.setView)

  useEffect(() => {
    if (!data?.airport) return
    const airport = data.airport as Airport
    const routes = (data.routes as Route[] || [])
      .filter((r) => r.fromAirport?.lat != null && r.toAirport?.lat != null)
      .map((r) => ({ from: r.fromAirport as Point, to: r.toAirport as Point }))
    
    setView({ 
      mode: 'point', 
      point: airport as Point,
      nearby: data.nearby as Airport[] || []
    })
    return () => setView({ mode: 'idle' })
  }, [data, setView])

  if (error || data?.error) {
    return (
      <section className="min-h-screen p-5 sm:p-8">
        <Link href="/airports" className="inline-flex min-h-11 items-center gap-2 text-sm text-white/55 hover:text-white">
          <ArrowLeft className="size-4" /> Back to airports
        </Link>
        <div className="mt-10 rounded-2xl border border-red-400/20 bg-red-400/10 p-5 text-red-100">
          Airport "{decoded}" could not be found.
        </div>
      </section>
    )
  }

  if (!data) {
    return <section className="min-h-screen p-5 text-white/45 sm:p-8">Loading airport…</section>
  }

  const airport = data.airport as Airport
  const routes = (data.routes as Route[]) || []
  const nearby = (data.nearby as Airport[]) || []

  return (
    <section className="min-h-screen p-5 sm:p-8">
      <Link href="/airports" className="inline-flex min-h-11 items-center gap-2 text-sm text-white/55 hover:text-white">
        <ArrowLeft className="size-4" /> Back to airports
      </Link>
      <header className="mt-8 border-b border-white/10 pb-7">
        <div className="flex items-start gap-4">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-[#facc15]/15 text-sm font-black text-[#facc15]">
            {airport.iata}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#55a7ff]">Airport</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">{airport.city}</h1>
            <p className="mt-2 text-sm text-white/45">{airport.name} · {airport.icao} · {airport.country}</p>
            <p className="mt-1 text-xs text-white/40">{routes.length} routes</p>
          </div>
        </div>
      </header>

      {routes.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Departures & Arrivals</h2>
          <div className="flex flex-col gap-2">
            {routes.slice(0, 20).map((route, idx) => (
              <Link key={idx} href={`/routes/${route.from}-${route.to}`} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#111217cc] p-4 transition hover:border-[#1f88ff]/60">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3 font-semibold">
                    <span>{route.from}</span><span className="text-[#1f88ff]">→</span><span>{route.to}</span>
                  </div>
                  <p className="mt-1 text-sm text-white/45">{route.fromAirport?.city} → {route.toAirport?.city}</p>
                </div>
                <ChevronRight className="size-5 shrink-0 text-white/30" />
              </Link>
            ))}
          </div>
          {routes.length > 20 && <p className="mt-4 text-sm text-white/40">+{routes.length - 20} more routes</p>}
        </div>
      )}

      {nearby.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Nearby Airports</h2>
          <div className="flex flex-col gap-2">
            {nearby.slice(0, 8).map((a) => (
              <Link key={a.iata} href={`/airports/${a.iata}`} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-[#111217cc] p-4 hover:border-white/20">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#facc15]/15 text-xs font-bold text-[#facc15]">{a.iata}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{a.city} · {a.name}</p>
                  <p className="mt-1 text-sm text-white/45">{a.icao}</p>
                </div>
                <ChevronRight className="size-5 shrink-0 text-white/30" />
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 flex gap-2">
        <Link href={`https://www.flightradar24.com/data/airports/${airport.iata}`} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/[.06] px-3 text-sm hover:bg-white/[.1]">
          Live traffic <ExternalLink className="size-4" />
        </Link>
      </div>
    </section>
  )
}
