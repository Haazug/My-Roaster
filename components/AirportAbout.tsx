'use client'

import Link from 'next/link'
import useSWR from 'swr'

const fetcher = (u: string) => fetch(u).then((r) => r.json())

export default function AirportAbout({ code }: { code: string }) {
  const { data } = useSWR(code ? `/api/airports/${code}/about` : null, fetcher)
  if (!data?.airport) return null
  const pt = typeof navigator !== 'undefined' && (navigator.language || '').toLowerCase().startsWith('pt')
  const a = data.airport
  const codes = [a.iata, a.icao].filter(Boolean).join(' / ')
  const line = pt
    ? `${a.name} (${codes}) serve ${a.city}, ${a.country}. Nos dados de rotas liga-se a ${data.destinations} destinos com ${data.airlines} companhias.`
    : `${a.name} (${codes}) serves ${a.city}, ${a.country}. In the route data it connects to ${data.destinations} destinations with ${data.airlines} airlines.`
  const L = pt ? { hub: 'Hub de', air: 'Principais companhias', dest: 'Principais destinos' } : { hub: 'Hub for', air: 'Main airlines', dest: 'Main destinations' }
  const chip = 'flex min-h-10 items-center gap-2 rounded-full bg-white/[.06] px-3 text-xs transition hover:bg-white/10'
  return (
    <div className="mt-4">
      <p className="text-sm leading-relaxed text-white/60">{line}</p>
      <p className="mt-2 text-xs text-white/35">{Number(a.lat).toFixed(3)}°, {Number(a.lon).toFixed(3)}°</p>
      {data.hubOf?.length > 0 && (
        <>
          <p className="mt-4 text-xs text-white/40">{L.hub}</p>
          <div className="mt-2 flex flex-wrap gap-2">{data.hubOf.map((h: any) => <Link key={h.id} href={`/airlines/${h.id}`} className={chip}>{h.name}</Link>)}</div>
        </>
      )}
      {data.topAirlines?.length > 0 && (
        <>
          <p className="mt-4 text-xs text-white/40">{L.air}</p>
          <div className="mt-2 flex flex-wrap gap-2">{data.topAirlines.map((h: any) => <Link key={h.id} href={`/airlines/${h.id}`} className={chip}>{h.name}<span className="text-white/40">{h.routes}</span></Link>)}</div>
        </>
      )}
      {data.topDestinations?.length > 0 && (
        <>
          <p className="mt-4 text-xs text-white/40">{L.dest}</p>
          <div className="mt-2 flex flex-wrap gap-2">{data.topDestinations.map((h: any) => <Link key={h.iata} href={`/airports/${h.iata}`} className={chip}><strong>{h.iata}</strong><span className="text-white/45">{h.city}</span></Link>)}</div>
        </>
      )}
    </div>
  )
}
