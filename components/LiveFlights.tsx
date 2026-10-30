'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { AirlineLogo } from '@/components/AirlineLogo'
import { currentFlights, liveRouteHref, type ResolvedFlight } from '@/lib/live-model'

type Flight = ResolvedFlight & { kind?: 'departing' | 'arriving' }
type Result = { ok: boolean; data: Flight[]; degraded?: boolean; history?: { persistent: boolean }; timetable?: { configured: boolean; complete: boolean } }
const fetcher = async (url: string): Promise<Result> => {
  const r = await fetch(url)
  if (!r.ok) throw new Error('Live traffic unavailable')
  const json = await r.json()
  return { ...json, data: Array.isArray(json.data) ? json.data : json.data?.aircraft || [] }
}

export default function LiveFlights({ airport, airline, pair }: { airport?: string; airline?: string; pair?: [string, string] }) {
  const [tab, setTab] = useState('all')
  const [clock, setClock] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 30000)
    return () => clearInterval(timer)
  }, [])
  const { data, error, isLoading, mutate } = useSWR<Result>(airport ? `/api/airports/${airport}/live` : pair && airline ? `/api/live/route?airline=${encodeURIComponent(airline)}&from=${pair[0]}&to=${pair[1]}` : '/api/live/now', fetcher,
    { refreshInterval: 60000, revalidateOnFocus: false, shouldRetryOnError: false })
  const flights = currentFlights(data?.data || [], Math.max(clock, Date.now())).filter(f => (!pair || (f.from === pair[0] && f.to === pair[1]) || (f.from === pair[1] && f.to === pair[0])) && (!airline || f.airlineIcao === airline || f.airlineIata === airline) && (tab === 'all' || (f as Flight).kind === tab)) as Flight[]
  const groups = new Map<string, Flight[]>()
  for (const f of flights) {
    const key = f.airlineIcao || f.airlineIata || f.airlineName
    groups.set(key, [...(groups.get(key) || []), f])
  }
  return <section className="mt-8" aria-label="Live now">
    <h2 className="flex items-center gap-2 text-sm font-medium"><span className="size-1.5 rounded-full bg-green-400" />Live now <span className="text-white/35">{flights.length}</span></h2>
    <p className="mt-2 text-xs text-white/40">Detected routes · partial coverage. Estimates have unknown stage and no remaining time.</p>
    {data?.history?.persistent === false && <p className="mt-2 text-xs text-amber-200">Flight history is temporarily unavailable; showing current detections.</p>}
    {data?.timetable?.configured === false && <p className="mt-2 text-xs text-white/40">Radar coverage only · airport timetables are not connected.</p>}
    {data?.timetable?.configured && !data.timetable.complete && <p className="mt-2 text-xs text-white/40">Airport timetable coverage is still being synchronised.</p>}
    {airport && <div className="mt-3 flex gap-5 border-b border-white/10" role="tablist" aria-label="Airport live flights">
      {([['all', 'All'], ['arriving', 'In flight · arrivals'], ['departing', 'Departures']] as const).map(([key, label]) =>
        <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={`min-h-11 border-b text-xs ${tab === key ? 'border-white text-white' : 'border-transparent text-white/40'}`}>{label}</button>)}
    </div>}
    {isLoading && <p className="mt-4 text-sm text-white/40" role="status">Discovering live routes…</p>}
    {(error || data?.degraded || data?.ok === false) && <p className="mt-4 text-sm text-amber-200" role="status">Some live sources are unavailable. <button className="underline" onClick={() => mutate()}>Retry</button></p>}
    {!isLoading && !flights.length && <p className="mt-4 text-sm text-white/40">No identified live routes in this coverage. This is not a departures or arrivals timetable.</p>}
    {[...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, items]) => <div key={key} className="mt-6">
      <h3 className="flex items-center gap-3 text-sm text-white/65"><AirlineLogo iata={items[0].airlineIata} icao={items[0].airlineIcao} name={items[0].airlineName} size="sm" showText={false} />{items[0].airlineName} <span className="text-white/30">{items.length}</span></h3>
      <div className="mt-2 divide-y divide-white/[.06]">{items.sort((a, b) => a.flightNumber.localeCompare(b.flightNumber)).map(f => <div key={f.id || f.hex} className="py-3">
        <Link href={liveRouteHref(f) || `/routes/${f.from}-${f.to}`} className="flex min-h-11 items-center justify-between gap-3">
          <div className="min-w-0"><p className="font-medium">{f.from} → {f.to} <span className="ml-2 text-sm text-white/60">{f.flightNumber || f.callsign}</span></p><p className="mt-1 truncate text-xs text-white/40">{f.fromCity} → {f.toCity}</p></div>
          <span className="shrink-0 text-right text-xs text-white/50">{f.status === 'estimated' ? 'Estimated · unknown stage' : f.kind === 'departing' ? 'Departed · in flight' : f.kind === 'arriving' ? 'In flight · arriving' : 'In flight'}<br />No time remaining available</span>
        </Link>
        <p className="mt-1 text-xs text-white/30">{f.source === 'timetable' ? 'Timetable checked' : 'Last observed'} {new Date(f.source === 'timetable' ? f.updatedAt || f.observedAt : f.observedAt).toLocaleTimeString()}{/^[A-Z0-9~]{6,8}$/i.test(f.hex) && <> · <Link className="underline" href={`/live/${f.hex}`}>Aircraft details</Link></>}</p>
      </div>)}</div>
    </div>)}
  </section>
}
