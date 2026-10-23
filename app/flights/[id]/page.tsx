'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, MapPin, Clock, Plane } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useMapStore, type Point } from '@/lib/map-store'
import { ExportMenu } from '@/components/ExportMenu'
import { AirlineLogo } from '@/components/AirlineLogo'
import { simbriefUrl, type ExportFlight } from '@/lib/export'
import { useNow } from '@/lib/use-now'

const SAMPLE_FLIGHTS: Record<string, any> = {
  'DT-653': {
    airline: 'TAAG Angola Airlines',
    airlineIata: 'DT',
    airlineIcao: 'DTA',
    flightNumber: '653',
    from: 'NBJ',
    to: 'LIS',
    fromCity: 'Luanda',
    toCity: 'Lisbon',
    fromIcao: 'FNBJ',
    toIcao: 'LPPT',
    fromLat: -9.0507,
    fromLon: 13.4991,
    toLat: 38.774,
    toLon: -9.135,
    aircraftType: 'Airbus A320',
    aircraftIcao: 'A320',
    distanceNm: 2200,
    depTime: '22:45',
    depHour: 22,
    depMin: 45,
    durationMin: 360,
  },
  'EK-287': {
    airline: 'Emirates',
    airlineIata: 'EK',
    airlineIcao: 'UAE',
    flightNumber: '287',
    from: 'DXB',
    to: 'JFK',
    fromCity: 'Dubai',
    toCity: 'New York',
    fromIcao: 'OMDB',
    toIcao: 'KJFK',
    fromLat: 25.252,
    fromLon: 55.364,
    toLat: 40.640,
    toLon: -73.778,
    aircraftType: 'Boeing 777-300ER',
    aircraftIcao: 'B77W',
    distanceNm: 5124,
    depTime: '14:00',
    depHour: 14,
    depMin: 0,
    durationMin: 765,
  },
}

const hhmm = (m: number) => {
  const x = ((Math.round(m) % 1440) + 1440) % 1440
  return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`
}

export default function FlightDetailPage() {
  const { id } = useParams<{ id: string }>()
  const setView = useMapStore((s) => s.setView)
  const now = useNow()

  const flight = useMemo(() => {
    const key = id ? (id as string).toUpperCase() : ''
    return SAMPLE_FLIGHTS[key]
  }, [id])

  useEffect(() => {
    if (!flight) return
    const from: Point = { iata: flight.from, icao: flight.fromIcao, city: flight.fromCity, lat: flight.fromLat, lon: flight.fromLon }
    const to: Point = { iata: flight.to, icao: flight.toIcao, city: flight.toCity, lat: flight.toLat, lon: flight.toLon }
    setView({ mode: 'route', from, to })
    return () => setView({ mode: 'idle' })
  }, [flight, setView])

  if (!flight) {
    return (
      <section className="min-h-screen p-5 sm:p-8">
        <Link href="/airlines" className="inline-flex min-h-11 items-center gap-2 text-sm text-white/55">
          <ArrowLeft className="size-4" /> Back
        </Link>
        <div className="mt-10 rounded-2xl border border-red-400/20 bg-red-400/10 p-5 text-red-100">
          Flight "{id}" not found.
        </div>
      </section>
    )
  }

  // departure = current time, arrival = current time + duration
  const depH = now ? now.getHours() : flight.depHour
  const depM = now ? now.getMinutes() : flight.depMin

  const exportData: ExportFlight = {
    airlineIcao: flight.airlineIcao,
    airlineIata: flight.airlineIata,
    airlineName: flight.airline,
    flightNumber: flight.flightNumber,
    origin: {
      icao: flight.fromIcao,
      iata: flight.from,
      city: flight.fromCity,
      lat: flight.fromLat,
      lon: flight.fromLon,
    },
    dest: {
      icao: flight.toIcao,
      iata: flight.to,
      city: flight.toCity,
      lat: flight.toLat,
      lon: flight.toLon,
    },
    aircraftIcao: flight.aircraftIcao,
    aircraftName: flight.aircraftType,
    depHour: depH,
    depMin: depM,
    durationMin: flight.durationMin,
    distanceNm: flight.distanceNm,
  }

  return (
    <section className="min-h-screen p-5 sm:p-8">
      <Link href="/airlines" className="inline-flex min-h-11 items-center gap-2 text-sm text-white/55 hover:text-white">
        <ArrowLeft className="size-4" /> Back
      </Link>

      <header className="mt-8 border-b border-white/10 pb-7">
        <AirlineLogo 
          iata={flight.airlineIata}
          icao={flight.airlineIcao}
          name={flight.airline}
          size="lg"
        />
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">{flight.flightNumber}</h1>
        <p className="mt-2 text-sm text-white/45">{flight.fromCity} → {flight.toCity}</p>
      </header>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-[#111217cc] p-6">
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-white/60">Departure</p>
          <p className="mt-3 text-3xl font-bold">{now ? hhmm(depH * 60 + depM) : '--:--'}</p>
          <p className="mt-2 text-sm text-white/45">{flight.fromCity} ({flight.from})</p>
          <p className="mt-1 text-xs text-white/40">{flight.fromIcao}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#111217cc] p-6">
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-white/60">Duration</p>
          <p className="mt-3 text-3xl font-bold">{Math.floor(flight.durationMin / 60)}h {flight.durationMin % 60}m</p>
          <p className="mt-2 text-sm text-white/45">{flight.distanceNm} nm (~{Math.round(flight.distanceNm * 1.15)}mi)</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#111217cc] p-6">
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-white/60">Arrival</p>
          <p className="mt-3 text-3xl font-bold">
            {now ? hhmm(depH * 60 + depM + flight.durationMin) : '--:--'}
            {now && depH * 60 + depM + flight.durationMin >= 1440 && <sup className="ml-1 text-xs text-white/40">+1</sup>}
          </p>
          <p className="mt-2 text-sm text-white/45">{flight.toCity} ({flight.to})</p>
          <p className="mt-1 text-xs text-white/40">{flight.toIcao}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#111217cc] p-6">
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-white/60">Aircraft</p>
          <p className="mt-3 text-2xl font-bold">{flight.aircraftIcao}</p>
          <p className="mt-2 text-sm text-white/45">{flight.aircraftType}</p>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-4 sm:flex-row">
        <Link
          href={`/flights/${id}/flight-plan`} onClick={() => window.open(simbriefUrl(exportData), "_blank", "noopener,noreferrer")}
          className="flex min-h-12 items-center justify-center rounded-xl bg-[#1f88ff] px-6 font-semibold text-white transition hover:bg-[#1f88ff]/90"
        >
          <Plane className="mr-2 size-5" /> Fly Now
        </Link>
        <ExportMenu flight={exportData} />
      </div>

      <div className="mt-8 rounded-2xl border border-white/10 bg-white/[.02] p-6">
        <p className="text-sm text-white/60">
          This is a simulated flight for flight simulation only. Aircraft type, registration, and schedule are estimated and may differ from real-world operations. You can import your SimBrief flight plan for accurate data.
        </p>
      </div>
    </section>
  )
}
