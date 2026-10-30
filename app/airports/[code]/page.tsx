'use client'

import {useT} from '@/lib/i18n'
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
import AirportExtras from '@/components/AirportExtras'
import { useFavs } from '@/lib/use-favs'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type Airport = { iata: string; icao: string; name: string; city: string; country: string; lat: number; lon: number; routes?: number }
type Route = { from: string; to: string; fromAirport?: Airport; toAirport?: Airport; airlines?: { id: string; iata: string; icao: string; name: string }[] }
const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const ROUTE_COLS = '96px minmax(0,1fr)'
const LIVE_COLS = '84px minmax(0,1fr) 92px'
const NEAR_COLS = '64px minmax(0,1fr)'

export default function AirportDetailPage() {
 const t=useT()
  const { code } = useParams<{ code: string }>()
  const decoded = code ? decodeURIComponent(code).toUpperCase() : ''
  const { data, error } = useSWR(decoded ? `/api/airports/${decoded}` : null, fetcher)
  const setView = useMapStore((s) => s.setView)
  const [q, setQ] = useState('')
  const favAp = useFavs('airport')
  const favAl = useFavs('airline')

  useEffect(() => {
    if (!data?.airport) return
    setView({ mode: 'point', point: data.airport as Point, nearby: (data.nearby as Airport[]) || [] })
    return () => setView({ mode: 'idle' })
  }, [data, setView])

  const allRoutes = ((data?.routes as Route[]) || [])
  const filtered = useMemo(() => {
    const n = norm(q.trim())
    if (!n) return allRoutes
    return allRoutes.filter((r) =>
      norm([r.from, r.to, r.toAirport?.city, r.toAirport?.name, r.toAirport?.country, ...(r.airlines || []).map((a) => `${a.name} ${a.iata} ${a.icao}`)].filter(Boolean).join(' ')).includes(n)
    )
  }, [allRoutes, q])

  const routes = useMemo(() => {
    const score = (r: Route) => ((r.airlines || []).some((a) => favAl.has(a.id)) ? 2 : 0) + (favAp.has(r.to) ? 1 : 0)
    return [...filtered].sort((a, b) => score(b) - score(a))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, favAl.items, favAp.items])

  if (error || data?.error) {
    return (
      <section className="min-h-screen p-5 sm:p-8">
        <Link href="/airports" className="inline-flex min-h-11 items-center gap-2 text-sm text-white/55 hover:text-white">
          <ArrowLeft className="size-4" /> {t('airlines.backAirports')}
        </Link>
        <div className="mt-10 rounded-2xl border border-red-400/20 bg-red-400/10 p-5 text-red-100">Airport "{decoded}" could not be found.</div>
      </section>
    )
  }

  if (!data) return <section className="min-h-screen p-5 text-white/45 sm:p-8">{t('airports.loading')}</section>

  const airport = data.airport as Airport
  const nearby = (data.nearby as Airport[]) || []

  return (
    <section className="min-h-screen p-5 pb-32 sm:p-8">
      <Link href="/airports" className="inline-flex min-h-11 items-center gap-2 text-sm text-white/55 hover:text-white">
        <ArrowLeft className="size-4" /> {t('airlines.backAirports')}
      </Link>
      <header className="mt-8 border-b border-white/10 pb-7">
        <div className="flex items-start gap-4">
          <div className={`${boardText} flex size-16 shrink-0 items-center justify-center rounded-2xl border border-[#facc15]/20 bg-[#0b0b0c] text-lg font-bold`}>{airport.iata}</div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#55a7ff]">{t('airports.title')}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">{airport.city}</h1>
            <p className="mt-2 flex items-center gap-2 text-sm text-white/45">
              <Flag country={airport.country} size={24} />
              <span>{airport.name} · {airport.icao} · {airport.country}</span>
            </p>
            <p className="mt-1 text-xs text-white/40">{t('airlines.routes',{n:allRoutes.length})}</p>
          </div>
        </div>
      </header>
      <AirportExtras />

      {allRoutes.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 text-xl font-semibold">{t('airports.routesFrom',{code:airport.iata})}</h2>
          <label className="mb-3 flex min-h-12 items-center gap-3 rounded-2xl border border-white/10 bg-white/[.06] px-4">
            <Search className="size-4 text-white/40" aria-hidden="true" />
            <span className="sr-only">{t('airlines.routeSearch')}</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('airlines.routeSearch')} className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-white/35" />
          </label>
          {q && <p className="mb-2 text-xs text-white/40">{routes.length} of {t('airlines.routes',{n:allRoutes.length})}</p>}

          <Board>
            <BoardHead cols={ROUTE_COLS}><span>{t('route.boardRoute')}</span><span>{t('route.boardDestination')}</span></BoardHead>
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
                        <Link href={`/routes/${route.from}-${route.to}`} className="text-xs text-[#55a7ff]">{t('random.open')}</Link>
                      )}
                    </div>
                  </div>
                </BoardRow>
              </div>
            ))}
            {!routes.length && <p className="p-5 text-sm text-white/40">{t('live.noMatch')}</p>}
          </Board>
        </div>
      )}

      {nearby.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 text-xl font-semibold">{t('airports.nearby')}</h2>
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
          {t('live.title')} <ExternalLink className="size-4" />
        </Link>
      </div>
    </section>
  )
}
