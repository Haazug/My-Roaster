'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import useSWR from 'swr'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useMapStore, type Point } from '@/lib/map-store'
import { AirlineLogo } from '@/components/AirlineLogo'
import AirlineAbout from '@/components/AirlineAbout'
import { CustomRoutes } from '@/components/CustomRoutes'
import { Flag } from '@/components/Flag'
import { fixName } from '@/lib/airline-names'

const fetcher = (url: string) => fetch(url).then((response) => response.json())

type Airport = { iata?: string; name?: string; city?: string; country?: string; lat?: number; lon?: number }
type Route = { from: string; to: string; fromAirport?: Airport; toAirport?: Airport; aircraft?: string[]; roundTrip?: boolean }
type Airline = { name: string; iata?: string; icao?: string; country?: string; active?: boolean }
type Tab = 'all' | 'domestic' | 'international'

const isDomestic = (r: Route) => !!r.fromAirport?.country && r.fromAirport.country === r.toAirport?.country

export default function AirlineDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data, error } = useSWR(id ? `/api/airlines/${id}` : null, fetcher)
  const setView = useMapStore((s) => s.setView)
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<Tab>('all')

  useEffect(() => {
    if (!data?.routes) return
    const routes = (data.routes as Route[])
      .filter((r) => r.fromAirport?.lat != null && r.toAirport?.lat != null)
      .map((r) => ({ from: r.fromAirport as Point, to: r.toAirport as Point }))
    setView({ mode: 'airline', routes })
    return () => setView({ mode: 'idle' })
  }, [data, setView])

  const allRoutes = useMemo(() => {
    const seen = new Set<string>()
    return ((data?.routes as Route[]) || []).filter((r) => {
      const k = [r.from, r.to].sort().join('-')
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
  }, [data])

  const counts = useMemo(() => {
    const dom = allRoutes.filter(isDomestic).length
    return { all: allRoutes.length, domestic: dom, international: allRoutes.length - dom }
  }, [allRoutes])

  const nq = q.trim().toLowerCase()
  const routes = useMemo(() => {
    const byTab = tab === 'all' ? allRoutes : allRoutes.filter((r) => (tab === 'domestic') === isDomestic(r))
    if (!nq) return byTab
    return byTab.filter((r) =>
      [r.from, r.to, r.fromAirport?.city, r.toAirport?.city, r.fromAirport?.name, r.toAirport?.name, r.fromAirport?.country, r.toAirport?.country]
        .filter(Boolean).join(' ').toLowerCase().includes(nq)
    )
  }, [allRoutes, tab, nq])

  if (error || data?.error) {
    return (
      <section className="min-h-screen p-5 sm:p-8">
        <Link href="/airlines" className="inline-flex min-h-11 items-center gap-2 text-sm text-white/55 hover:text-white">
          <ArrowLeft className="size-4" /> Back to airlines
        </Link>
        <div className="mt-10 rounded-2xl border border-red-400/20 bg-red-400/10 p-5 text-red-100">This airline could not be loaded.</div>
      </section>
    )
  }

  if (!data) return <section className="min-h-screen p-5 text-white/45 sm:p-8">Loading airline routes…</section>

  const airline = data.airline as Airline
  const tabs: { key: Tab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'domestic', label: 'Domestic' },
    { key: 'international', label: 'International' },
  ]

  return (
    <section className="min-h-screen p-5 pb-32 sm:p-8">
      <Link href="/airlines" className="inline-flex min-h-11 items-center gap-2 text-sm text-white/55 hover:text-white">
        <ArrowLeft className="size-4" /> Back to airlines
      </Link>
      <header className="mt-8 border-b border-white/10 pb-7">
        <div className="flex items-start gap-4">
          <AirlineLogo iata={airline.iata} icao={airline.icao} name={airline.name} size="lg" showText={false} />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#55a7ff]">Airline route network</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">{fixName(airline.name)}</h1>
            <p className="mt-2 flex items-center gap-2 text-sm text-white/45">
              <Flag country={airline.country} size={24} />
              {airline.country || 'International'} · {counts.all} routes · {airline.icao || 'ICAO unavailable'}
            </p>
          </div>
        </div>
      </header>
      <AirlineAbout id={String(id)} />
      <CustomRoutes airlineKey={airline.iata || id} />

      <div className="mt-7 flex gap-2 overflow-x-auto pb-1" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-medium transition ${tab === t.key ? 'bg-white text-black' : 'border border-white/15 text-white/60 hover:text-white'}`}
          >
            {t.label} <span className={tab === t.key ? 'text-black/50' : 'text-white/30'}>{counts[t.key]}</span>
          </button>
        ))}
      </div>

      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search routes (city, airport or code)" className="mt-4 min-h-12 w-full rounded-2xl border border-white/10 bg-white/[.06] px-4 outline-none placeholder:text-white/35 focus:border-[#1f88ff]" />
      {(nq || tab !== 'all') && <p className="mt-3 text-xs text-white/40">{routes.length} of {counts.all} routes</p>}

      <div className="mt-4 flex flex-col gap-2">
        {routes.map((route) => {
          const from = route.fromAirport
          const to = route.toAirport
          const dom = isDomestic(route)
          return (
            <Link key={`${route.from}-${route.to}`} href={`/route/${airline.iata || id}/${route.from}-${route.to}`} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0a0a0acc] p-4 transition hover:border-[#1f88ff]/60">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3 font-semibold">
                  <span>{route.from}</span><span className="text-[#55a7ff]">⇄</span><span>{route.to}</span>
                  {tab === 'all' && <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${dom ? 'border-white/20 text-white/50' : 'border-[#1f88ff]/40 text-[#55a7ff]'}`}>{dom ? 'Domestic' : 'Intl'}</span>}
                </div>
                <p className="mt-1 flex items-center gap-2 truncate text-sm text-white/45">
                  <Flag country={from?.country} size={16} />
                  <span className="truncate">{from?.city || from?.name || 'Origin'}</span>
                  <span>→</span>
                  <Flag country={to?.country} size={16} />
                  <span className="truncate">{to?.city || to?.name || 'Destination'}</span>
                </p>
                {route.aircraft?.length ? <p className="mt-2 text-xs text-white/30">{route.aircraft.join(', ')}</p> : null}
              </div>
              <ChevronRight className="size-5 shrink-0 text-white/30" />
            </Link>
          )
        })}
        {!routes.length && <p className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-white/40">No routes in this view.</p>}
      </div>
    </section>
  )
}
