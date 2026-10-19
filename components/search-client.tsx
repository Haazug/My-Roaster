'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import Link from 'next/link'
import { ArrowLeft, ChevronRight, ExternalLink, Loader2, Plane, Radio, Search } from 'lucide-react'

type Airport = { iata: string; icao: string; name: string; city: string; country: string; lat: number; lon: number }
type Airline = { id: string; name: string; iata: string; icao: string; country: string; numRoutes: number }
type RouteHit = { airline: Airline; from: Airport; to: Airport; distanceKm: number; route: { codeshare: boolean } }
type LiveHit = { hex: string; callsign: string; reg?: string; type?: string; altFt: number | null; onGround: boolean }
type Result = {
  airlines: Airline[]
  airports: Airport[]
  routes: RouteHit[]
  flights: LiveHit[]
  aircraftTypes: { name: string; icao: string }[]
  sources: Record<string, string>
  degraded?: boolean
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())
const tabs = ['All', 'Routes', 'Airlines', 'Flights', 'Airports'] as const
type Tab = (typeof tabs)[number]
const sourceLabels: Record<string, string> = { flightConnections: 'FlightConnections', flightradar24: 'Flightradar24', openSky: 'OpenSky' }

export default function SearchClient() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [input, setInput] = useState(params.get('q') ?? '')
  const [query, setQuery] = useState(params.get('q') ?? '')
  const [tab, setTab] = useState<Tab>('All')

  useEffect(() => {
    const t = setTimeout(() => {
      const q = input.trim()
      setQuery(q)
      router.replace(q ? `${pathname}?q=${encodeURIComponent(q)}` : pathname, { scroll: false })
    }, 300)
    return () => clearTimeout(t)
  }, [input, pathname, router])

  const { data, isLoading, error } = useSWR<Result>(query ? `/api/search?q=${encodeURIComponent(query)}` : null, fetcher, { keepPreviousData: true })

  const counts = { Routes: data?.routes.length ?? 0, Airlines: data?.airlines.length ?? 0, Flights: data?.flights.length ?? 0, Airports: data?.airports.length ?? 0 }
  const show = (t: Exclude<Tab, 'All'>) => tab === 'All' || tab === t

  return (
    <section className="min-h-screen p-5 sm:p-8">
      <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm text-white/50"><ArrowLeft className="size-4" />Back</Link>
      <header className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#55a7ff]">Discovery</p>
        <h1 className="mt-2 text-4xl font-semibold">Search the world</h1>
        <p className="mt-2 text-sm text-white/45">Routes, flight codes, airlines, airports, aircraft types and registrations.</p>
      </header>
      <form role="search" onSubmit={(e) => { e.preventDefault(); setQuery(input.trim()) }} className="mt-6 flex min-h-14 items-center gap-3 rounded-2xl border border-[#1f88ff]/40 bg-white/[.08] px-4">
        <Search className="size-5 shrink-0 text-[#1f88ff]" aria-hidden="true" />
        <label htmlFor="q" className="sr-only">Search</label>
        <input id="q" autoFocus value={input} onChange={(e) => setInput(e.target.value)} className="min-h-12 w-full min-w-0 bg-transparent outline-none placeholder:text-white/35" placeholder="Try DT 653, LAD LIS, TAAG or Lisboa" />
        {isLoading && <Loader2 className="size-5 shrink-0 animate-spin text-white/50" aria-label="Searching" />}
      </form>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1" role="tablist">
        {tabs.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`min-h-11 shrink-0 rounded-full px-4 text-sm ${tab === t ? 'bg-[#1f88ff] text-white' : 'bg-white/10 text-white/70'}`}>
            {t}{t !== 'All' && data ? ` ${counts[t]}` : ''}
          </button>
        ))}
      </div>

      {!query && <p className="mt-8 text-sm text-white/40">Type at least two characters to search.</p>}
      {query && isLoading && !data && (
        <div className="mt-8 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.05] p-6 text-white/60" aria-live="polite">
          <Loader2 className="size-5 animate-spin" />Searching OpenFlights routes and live traffic…
        </div>
      )}
      {(error || data?.degraded) && <div className="mt-8 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-5 text-sm text-amber-100">Route data is temporarily unavailable. Try again in a moment.</div>}

      {query && data && (
        <div className={`mt-6 flex flex-col gap-8 ${isLoading ? 'opacity-60' : ''}`}>
          {show('Routes') && (
            <Group title="Routes" count={data.routes.length}>
              {data.routes.map((r) => (
                <Row key={`${r.airline.id}-${r.from.iata}-${r.to.iata}`} href={`/route/${r.airline.iata || r.airline.id}/${r.from.iata}-${r.to.iata}`}>
                  <p className="font-semibold">{r.airline.iata || r.airline.icao} · {r.airline.name} · {r.from.city} - {r.to.city}</p>
                  <p className="mt-1 text-sm text-white/45">{r.from.iata} → {r.to.iata} · {r.distanceKm.toLocaleString('en-US')} km{r.route.codeshare ? ' · codeshare' : ''}</p>
                </Row>
              ))}
            </Group>
          )}
          {show('Airlines') && (
            <Group title="Airlines" count={data.airlines.length}>
              {data.airlines.map((a) => (
                <Row key={a.id} href={`/airlines/${a.id}`}>
                  <p className="font-semibold">{a.name}</p>
                  <p className="mt-1 text-sm text-white/45">{[a.iata, a.icao, a.country].filter(Boolean).join(' · ')} · <span className="text-[#4caf50]">{a.numRoutes} routes</span></p>
                </Row>
              ))}
            </Group>
          )}
          {show('Flights') && (
            <Group title="Live flights" count={data.flights.length} empty={data.aircraftTypes.length ? `No live ${data.aircraftTypes[0].name} found right now.` : 'No live aircraft match. Flight numbers resolve to live callsigns while airborne.'}>
              {data.flights.map((f) => (
                <Row key={f.hex} href={`/live/${f.hex}`}>
                  <p className="flex items-center gap-2 font-semibold"><Radio className="size-4 text-cyan-300" aria-hidden="true" />{f.callsign || f.hex}</p>
                  <p className="mt-1 text-sm text-white/45">{[f.type, f.reg].filter(Boolean).join(' · ') || 'Unknown type'} · {f.onGround || f.altFt == null ? 'On ground' : `${f.altFt.toLocaleString('en-US')} ft`}</p>
                </Row>
              ))}
            </Group>
          )}
          {show('Airports') && (
            <Group title="Airports" count={data.airports.length}>
              {data.airports.map((a) => (
                <Row key={a.iata} href={`/search?q=${a.iata}`} onClick={() => setInput(a.iata)}>
                  <p className="font-semibold">{a.city} · {a.iata}</p>
                  <p className="mt-1 text-sm text-white/45">{a.icao} · {a.name} · {a.country}</p>
                </Row>
              ))}
            </Group>
          )}
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.sources).map(([k, url]) => (
              <a key={k} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 px-4 text-sm text-white/65 hover:bg-white/5">
                {sourceLabels[k] ?? k}<ExternalLink className="size-3.5" />
              </a>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function Group({ title, count, empty, children }: { title: string; count: number; empty?: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white/80"><Plane className="size-4 text-[#1f88ff]" aria-hidden="true" />{title}<span className="text-white/30">{count}</span></h2>
      {count ? <div className="flex flex-col gap-2">{children}</div> : <p className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-white/40">{empty ?? `No ${title.toLowerCase()} matched this search.`}</p>}
    </section>
  )
}

function Row({ href, onClick, children }: { href: string; onClick?: () => void; children: React.ReactNode }) {
  return (
    <Link href={href} onClick={onClick} className="flex min-h-14 items-center gap-3 rounded-2xl border border-white/10 bg-[#111217cc] p-4 transition hover:border-[#1f88ff]/60">
      <div className="min-w-0 flex-1 break-words">{children}</div>
      <ChevronRight className="size-5 shrink-0 text-white/30" aria-hidden="true" />
    </Link>
  )
}
