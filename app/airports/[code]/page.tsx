'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import useSWR from 'swr'
import { ArrowLeft, ChevronRight, ExternalLink, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useMapStore, type Point } from '@/lib/map-store'
import { AirlineLogo } from '@/components/AirlineLogo'
import LiveNow from '@/components/AirportLiveNow'
import { Flag } from '@/components/Flag'
import { fixName } from '@/lib/airline-names'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type Airport = { iata: string; icao: string; name: string; city: string; country: string; lat: number; lon: number; routes?: number }
type Route = { from: string; to: string; fromAirport?: Airport; toAirport?: Airport; airlines?: { id: string; iata: string; icao: string; name: string }[] }
const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export default function AirportDetailPage() {
  const { code } = useParams<{ code: string }>()
  const decoded = code ? decodeURIComponent(code).toUpperCase() : ''
  const { data, error } = useSWR(decoded ? `/api/airports/${decoded}` : null, fetcher)
  const { data: liveData } = useSWR(decoded ? `/api/airports/${decoded}/live` : null, fetcher, { refreshInterval: 60000 })
  const setView = useMapStore((s) => s.setView)
  const [q, setQ] = useState('')

  useEffect(() => {
    if (!data?.airport) return
    setView({ mode: 'point', point: data.airport as Point, nearby: (data.nearby as Airport[]) || [] })
    return () => setView({ mode: 'idle' })
  }, [data, setView])

  const allRoutes = ((data?.routes as Route[]) || [])
  const routes = useMemo(() => {
    const n = norm(q.trim())
    if (!n) return allRoutes
    return allRoutes.filter((r) =>
      norm([r.from, r.to, r.toAirport?.city, r.toAirport?.name, r.toAirport?.country, ...(r.airlines || []).map((a) => `${a.name} ${a.iata} ${a.icao}`)].filter(Boolean).join(' ')).includes(n)
    )
  }, [allRoutes, q])

  if (error || data?.error) {
    return (
      <section className="min-h-screen p-5 sm:p-8">
        <Link href="/airports" className="inline-flex min-h-11 items-center gap-2 text-sm text-white/55 hover:text-white">
          <ArrowLeft className="size-4" /> Back to airports
        </Link>
        <div className="mt-10 rounded-2xl border border-red-400/20 bg-red-400/10 p-5 text-red-100">Airport "{decoded}" could not be found.</div>
      </section>
    )
  }

  if (!data) return <section className="min-h-screen p-5 text-white/45 sm:p-8">Loading airport…</section>

  const airport = data.airport as Airport
  const nearby = (data.nearby as Airport[]) || []
  const liveFlights: any[] = liveData?.data || []

  return (
    <section className="min-h-screen p-5 pb-32 sm:p-8">
      <Link href="/airports" className="inline-flex min-h-11 items-center gap-2 text-sm text-white/55 hover:text-white">
        <ArrowLeft className="size-4" /> Back to airports
      </Link>
      <header className="mt-8 border-b border-white/10 pb-7">
        <div className="flex items-start gap-4">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-sm font-black text-white">{airport.iata}</div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#55a7ff]">Airport</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">{airport.city}</h1>
            <p className="mt-2 flex items-center gap-2 text-sm text-white/45">
              <Flag country={airport.country} size={24} />
              <span>{airport.name} · {airport.icao} · {airport.country}</span>
            </p>
            <p className="mt-1 text-xs text-white/40">{allRoutes.length} routes</p>
          </div>
        </div>
      </header>

      {liveFlights.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold"><span className="size-2 animate-pulse rounded-full bg-[#1f88ff]" />Live now</h2>
          <div className="flex flex-col gap-2">
            {liveFlights.map((f) => (
              <Link key={f.hex} href={`/route/${f.airlineIata || f.airlineIcao}/${f.from}-${f.to}`} className="flex items-center gap-3 rounded-2xl border border-[#1f88ff]/30 bg-[#1f88ff]/5 p-4 transition hover:border-[#1f88ff]/60">
                <AirlineLogo iata={f.airlineIata} icao={f.airlineIcao} name={f.airlineName} size="sm" showText={false} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 font-semibold"><span>{f.from}</span><span className="text-[#55a7ff]">→</span><span>{f.to}</span><span className="text-xs font-normal text-white/45">{f.callsign}</span></div>
                  <p className="mt-1 truncate text-sm text-white/45">{f.airlineName} · {f.fromCity} → {f.toCity}</p>
                </div>
                <span className="shrink-0 text-xs text-[#55a7ff]">{f.onGround ? 'On ground' : f.altFt != null ? `FL${Math.round(f.altFt / 100)}` : 'Airborne'}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {allRoutes.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 text-xl font-semibold">Routes from {airport.iata}</h2>
          <label className="mb-3 flex min-h-12 items-center gap-3 rounded-2xl border border-white/10 bg-white/[.06] px-4">
            <Search className="size-4 text-white/40" aria-hidden="true" />
            <span className="sr-only">Filter routes</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="City, country, airline or code" className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-white/35" />
          </label>
          {q && <p className="mb-2 text-xs text-white/40">{routes.length} of {allRoutes.length} routes</p>}

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0acc]">
            <div className="hidden grid-cols-[110px_minmax(0,1fr)_minmax(0,1.5fr)] gap-4 border-b border-white/10 px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-white/40 sm:grid">
              <span>Route</span><span>Destination</span><span>Airlines</span>
            </div>
            {routes.map((route) => (
              <div key={`${route.from}-${route.to}`} style={{ contentVisibility: 'auto', containIntrinsicSize: '0 72px' }} className="grid grid-cols-[88px_minmax(0,1fr)] items-center gap-x-4 gap-y-2 border-b border-white/5 px-4 py-3 last:border-b-0 sm:grid-cols-[110px_minmax(0,1fr)_minmax(0,1.5fr)]">
                <span className="flex items-center gap-1.5 font-mono text-sm font-semibold">{route.from}<span className="text-[#55a7ff]">↔</span>{route.to}</span>
                <Link href={`/airports/${route.to}`} className="flex min-w-0 items-center gap-2 text-sm hover:text-[#55a7ff]">
                  <Flag country={route.toAirport?.country} size={16} />
                  <span className="truncate">{route.toAirport?.city || route.to}<span className="text-white/35"> · {route.toAirport?.country}</span></span>
                </Link>
                <div className="col-span-2 flex flex-wrap gap-1.5 sm:col-span-1">
                  {route.airlines?.length ? (
                    route.airlines.map((a) => (
                      <Link key={a.id} href={`/route/${a.iata || a.id}/${route.from}-${route.to}`} className="flex min-h-9 items-center gap-1.5 rounded-full border border-white/15 bg-white/[.05] py-0.5 pl-0.5 pr-2.5 text-xs transition hover:border-[#1f88ff]/60">
                        <AirlineLogo iata={a.iata} icao={a.icao} name={fixName(a.name)} size="sm" showText={false} />
                        <span className="max-w-[9rem] truncate">{fixName(a.name)}</span>
                      </Link>
                    ))
                  ) : (
                    <Link href={`/routes/${route.from}-${route.to}`} className="text-xs text-[#55a7ff]">View route</Link>
                  )}
                </div>
              </div>
            ))}
            {!routes.length && <p className="p-5 text-sm text-white/40">No routes match “{q}”.</p>}
          </div>
        </div>
      )}

      {nearby.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 text-xl font-semibold">Nearby airports</h2>
          <div className="flex flex-col gap-2">
            {nearby.slice(0, 8).map((a) => (
              <Link key={a.iata} href={`/airports/${a.iata}`} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-[#0a0a0acc] p-4 hover:border-white/30">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white">{a.iata}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{a.city} · {a.name}</p>
                  <p className="mt-1 flex items-center gap-2 text-sm text-white/45"><Flag country={a.country} size={16} />{a.icao}</p>
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
