'use client'
import BackLink from '@/components/BackLink'

import {useT} from '@/lib/i18n'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import useSWR from 'swr'
import { ArrowLeft, ChevronRight, Plane, ExternalLink } from 'lucide-react'
import { useEffect } from 'react'
import { useMapStore, type Point } from '@/lib/map-store'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type Airport = { iata: string; icao: string; name: string; city: string; country: string; lat: number; lon: number }
type Flight = { 
  airlineId?: string
  airlineIata: string
  airlineName: string
  flightNumber: string
  from: string
  to: string
  aircraftIcao?: string
  aircraftName?: string
  days?: string
  estimated?: boolean
}
type RouteDetail = { fromAirport: Airport; toAirport: Airport; flights: Flight[]; distance?: number }

export default function RouteDetailPage() {
 const t=useT()
  const { pair } = useParams<{ pair: string }>()
  const [from, to] = pair ? pair.toUpperCase().split('-') : ['', '']
  const { data, error } = useSWR(from && to ? `/api/routes/${from}-${to}` : null, fetcher)
  const setView = useMapStore((s) => s.setView)

  useEffect(() => {
    if (!data?.fromAirport || !data?.toAirport) return
    const f = data.fromAirport as Airport
    const t = data.toAirport as Airport
    setView({ mode: 'route', from: f as Point, to: t as Point })
    return () => setView({ mode: 'idle' })
  }, [data, setView])

  if (error || data?.error) {
    return (
      <section className="min-h-screen p-5 sm:p-8">
        <BackLink href="/airports" className="inline-flex min-h-11 items-center gap-2 text-sm text-white/55 hover:text-white">
          <ArrowLeft className="size-4" /> Back
        </BackLink>
        <div className="mt-10 rounded-2xl border border-red-400/20 bg-red-400/10 p-5 text-red-100">
          Route "{from}" → "{to}" could not be found.
        </div>
      </section>
    )
  }

  if (!data) {
    return <section className="min-h-screen p-5 text-white/45 sm:p-8">Loading route…</section>
  }

  const fromAirport = data.fromAirport as Airport
  const toAirport = data.toAirport as Airport
  const flights = (data.flights as Flight[]) || []

  return (
    <section className="min-h-screen p-5 sm:p-8">
      <BackLink href="/airports" className="inline-flex min-h-11 items-center gap-2 text-sm text-white/55 hover:text-white">
        <ArrowLeft className="size-4" /> Back
      </BackLink>
      <header className="mt-8 border-b border-white/10 pb-7">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#55a7ff]">Route</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              {fromAirport.city} → {toAirport.city}
            </h1>
            <p className="mt-2 text-sm text-white/45">
              {fromAirport.icao} ({fromAirport.iata}) to {toAirport.icao} ({toAirport.iata})
            </p>
          </div>
        </div>
      </header>

      <p className="mt-5 text-xs text-amber-200/60">{t('catalog.reference')}</p>
      {flights.length > 0 ? (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">{t('route.airlines')}</h2>
          <div className="departure-board flex flex-col">
            {flights.map((flight, idx) => (
              <Link 
                key={idx} 
                href={`/route/${flight.airlineId || flight.airlineIata}/${flight.from}-${flight.to}`}
                className="flex items-center gap-3 p-4 transition"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 font-semibold">
                    <span className="board-code">{flight.airlineIata}</span><span className="text-xs text-white/40">{flight.flightNumber || t('route.numberUnknown')}</span>
                  </div>
                  <p className="mt-1 text-sm text-white/45">{flight.airlineName}</p>
                  {flight.aircraftName && <p className="mt-1 text-xs text-white/40">{flight.aircraftName}</p>}
                  {flight.days && <p className="mt-1 text-xs text-white/40">{flight.days}</p>}
                </div>
                <ChevronRight className="size-5 shrink-0 text-white/30" />
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-dashed border-white/10 p-6 text-center">
          <Plane className="mx-auto size-8 text-white/20 mb-2" />
          <p className="text-white/45">No airlines found for this route in our data.</p>
        </div>
      )}

      <div className="mt-8 flex gap-2">
        <Link 
          href={`https://www.flightconnections.com/pt`} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="flex min-h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/[.06] px-3 text-sm hover:bg-white/[.1]"
        >
          FlightConnections <ExternalLink className="size-4" />
        </Link>
        <Link 
          href={`https://www.flightradar24.com/${fromAirport.lat.toFixed(2)},${fromAirport.lon.toFixed(2)}/9`} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="flex min-h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/[.06] px-3 text-sm hover:bg-white/[.1]"
        >
          Live traffic <ExternalLink className="size-4" />
        </Link>
      </div>
    </section>
  )
}
