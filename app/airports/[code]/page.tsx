'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import useSWR from 'swr'
import { ArrowLeft, ExternalLink, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useMapStore, type Point } from '@/lib/map-store'
import { AirlineLogo } from '@/components/AirlineLogo'
import { Flag } from '@/components/Flag'
import { Board, BoardHead, BoardRow, boardText } from '@/components/Board'
import { fixName } from '@/lib/airline-names'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type Airport = { iata: string; icao: string; name: string; city: string; country: string; lat: number; lon: number; routes?: number }
type Route = { from: string; to: string; fromAirport?: Airport; toAirport?: Airport; airlines?: { id: string; iata: string; icao: string; name: string }[] }
const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const ROUTE_COLS = '96px minmax(0,1fr)'
const LIVE_COLS = '84px minmax(0,1fr) 92px'
const NEAR_COLS = '64px minmax(0,1fr)'

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
          <div className={`${boardText} flex size-16 shrink-0 items-center justify-center rounded-2xl border border-[#facc15]/20 bg-[#0b0b0c] text-lg font-bold`}>{airport.iata}</div>
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
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold"><span className="size-2 animate-pulse rounded-full bg-[#facc15]" />Live now</h2>
          <Board>
            <BoardHead cols={LIVE_COLS}><span>Flight</span><span>Route</span><span className="text-right">Status</span></BoardHead>
            {liveFlights.map((f) => (
              <Link key={f.hex} href={`/route/${f.airlineIata || f.airlineIcao}/${f.from}-${f.to}`} className="block transition hover:bg-[#facc15]/[.06]">
                <BoardRow cols={LIVE_COLS}>
                  <span className={`${boardText} truncate text-sm font-bold`}>{f.callsign || '—'}</span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-mono text-sm font-semibold"><span>{f.from}</span><span className="text-[#facc15]">→</span><span>{f.to}</span></p>
                    <p className="mt-1 flex items-center gap-2 truncate text-xs text-white/45">
                      <AirlineLogo iata={f.airlineIata} icao={f.airlineIcao} name={f.airlineName} size="sm" showText={false} />
                      <span className="truncate">{f.airlineName} · {f.fromCity} → {f.toCity}</span>
                    </p>
                  </div>
                  <span className={`${boardText} text-right text-xs`}>{f.onGround ? 'On ground' : f.altFt != null ? `FL${Math.round(f.altFt / 100)}` : 'Airborne'}</span>
                </BoardRow>
              </Link>
            ))}
          </Board>
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

          <Board>
            <BoardHead cols={ROUTE_COLS}><span>Route</span><span>Destination · Airlines</span></BoardHead>
            {routes.map((route) => (
              <div key={`${route.from}-${route.to}`} style={{ contentVisibility: 'auto', containIntrinsicSize: '0 72px' }}>
                <BoardRow cols={ROUTE_COLS} className="items-start">
                  <span className={`${boardText} flex items-center gap-1.5 pt-1 text-sm font-bold`}>{route.from}<span className="text-white/40">↔</span>{route.to}</span>
                  <div className="min-w-0">
                    <Link href={`/airports/${route.to}`} className="flex min-w-0 items-center gap-2 text-sm hover:text-[#facc15]">
                      <Flag country={route.toAirport?.country} size={16} />
                      <span className="truncate">{route.toAirport?.city || route.to}<span className="text-white/35"> · {route.toAirport?.country}</span></span>
                    </Link>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {route.airlines?.length ? (
                        route.airlines.map((a) => (
                          <Link key={a.id} href={`/route/${a.iata || a.id}/${route.from}-${route.to}`} className="flex min-h-9 items-center gap-1.5 rounded-full border border-white/15 bg-white/[.05] py-0.5 pl-0.5 pr-2.5 text-xs transition hover:border-[#facc15]/60">
                            <AirlineLogo iata={a.iata} icao={a.icao} name={fixName(a.name)} size="sm" showText={false} />
                            <span className="max-w-[9rem] truncate">{fixName(a.name)}</span>
                          </Link>
                        ))
                      ) : (
                        <Link href={`/routes/${route.from}-${route.to}`} className="text-xs text-[#55a7ff]">View route</Link>
                      )}
                    </div>
                  </div>
                </BoardRow>
              </div>
            ))}
            {!routes.length && <p className="p-5 text-sm text-white/40">No routes match “{q}”.</p>}
          </Board>
        </div>
      )}

      {nearby.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 text-xl font-semibold">Nearby airports</h2>
          <Board>
            {nearby.slice(0, 8).map((a) => (
              <Link key={a.iata} href={`/airports/${a.iata}`} className="block transition hover:bg-[#facc15]/[.06]">
                <BoardRow cols={NEAR_COLS}>
                  <span className={`${boardText} text-base font-bold`}>{a.iata}</span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{a.city} <span className="font-normal text-white/40">· {a.name}</span></p>
                    <p className="mt-1 flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-white/45"><Flag country={a.country} size={16} />{a.icao}</p>
                  </div>
                </BoardRow>
              </Link>
            ))}
          </Board>
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
