'use client'
import BackLink from '@/components/BackLink'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Plane } from 'lucide-react'
import { useEffect } from 'react'
import { useMapStore } from '@/lib/map-store'

type AircraftType = {
  code: string
  name: string
  manufacturer: string
  engines: number
  maxPassengers: number
  range: number
  cruiseSpeed: number
  maxAltitude: number
  inProduction: boolean
}

const AIRCRAFT_DATA: Record<string, AircraftType> = {
  'A320': {
    code: 'A320',
    name: 'Airbus A320',
    manufacturer: 'Airbus',
    engines: 2,
    maxPassengers: 194,
    range: 3100,
    cruiseSpeed: 460,
    maxAltitude: 43000,
    inProduction: true,
  },
  'A321': {
    code: 'A321',
    name: 'Airbus A321',
    manufacturer: 'Airbus',
    engines: 2,
    maxPassengers: 244,
    range: 2700,
    cruiseSpeed: 460,
    maxAltitude: 43000,
    inProduction: true,
  },
  'A350': {
    code: 'A359',
    name: 'Airbus A350-900',
    manufacturer: 'Airbus',
    engines: 2,
    maxPassengers: 315,
    range: 8000,
    cruiseSpeed: 490,
    maxAltitude: 43000,
    inProduction: true,
  },
  'B737': {
    code: 'B738',
    name: 'Boeing 737-800',
    manufacturer: 'Boeing',
    engines: 2,
    maxPassengers: 189,
    range: 3060,
    cruiseSpeed: 450,
    maxAltitude: 41000,
    inProduction: false,
  },
  'B777': {
    code: 'B77W',
    name: 'Boeing 777-300ER',
    manufacturer: 'Boeing',
    engines: 2,
    maxPassengers: 396,
    range: 7370,
    cruiseSpeed: 490,
    maxAltitude: 43000,
    inProduction: true,
  },
  'B787': {
    code: 'B789',
    name: 'Boeing 787-9 Dreamliner',
    manufacturer: 'Boeing',
    engines: 2,
    maxPassengers: 296,
    range: 7635,
    cruiseSpeed: 490,
    maxAltitude: 43000,
    inProduction: true,
  },
}

export default function AircraftDetailPage() {
  const { type } = useParams<{ type: string }>()
  const typeCode = type ? (type as string).toUpperCase() : ''
  const aircraft = AIRCRAFT_DATA[typeCode]
  const setView = useMapStore((s) => s.setView)

  useEffect(() => {
    setView({ mode: 'idle' })
    return () => setView({ mode: 'idle' })
  }, [setView])

  if (!aircraft) {
    return (
      <section className="min-h-screen p-5 sm:p-8">
        <BackLink href="/airlines" className="inline-flex min-h-11 items-center gap-2 text-sm text-white/55">
          <ArrowLeft className="size-4" /> Back
        </BackLink>
        <div className="mt-10 rounded-2xl border border-red-400/20 bg-red-400/10 p-5 text-red-100">
          Aircraft type "{typeCode}" not found in our database.
        </div>
      </section>
    )
  }

  return (
    <section className="min-h-screen p-5 sm:p-8">
      <BackLink href="/airlines" className="inline-flex min-h-11 items-center gap-2 text-sm text-white/55 hover:text-white">
        <ArrowLeft className="size-4" /> Back
      </BackLink>

      <header className="mt-8 border-b border-white/10 pb-7">
        <div className="flex items-start gap-4">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-[#1f88ff]/15 text-sm font-bold text-[#1f88ff]">
            <Plane className="size-8" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#55a7ff]">Aircraft</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">{aircraft.name}</h1>
            <p className="mt-2 text-sm text-white/45">{aircraft.manufacturer} · {aircraft.code}</p>
          </div>
        </div>
      </header>

      {/* Specifications Grid */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-[#0a0a0acc] p-6">
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-white/60">Engines</p>
          <p className="mt-3 text-3xl font-bold">{aircraft.engines}</p>
          <p className="mt-1 text-sm text-white/45">turbofan engines</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0a0a0acc] p-6">
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-white/60">Capacity</p>
          <p className="mt-3 text-3xl font-bold">{aircraft.maxPassengers}</p>
          <p className="mt-1 text-sm text-white/45">maximum passengers</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0a0a0acc] p-6">
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-white/60">Range</p>
          <p className="mt-3 text-3xl font-bold">{aircraft.range}</p>
          <p className="mt-1 text-sm text-white/45">nautical miles</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0a0a0acc] p-6">
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-white/60">Cruise Speed</p>
          <p className="mt-3 text-3xl font-bold">{aircraft.cruiseSpeed}</p>
          <p className="mt-1 text-sm text-white/45">knots</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0a0a0acc] p-6">
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-white/60">Service Ceiling</p>
          <p className="mt-3 text-3xl font-bold">FL{Math.round(aircraft.maxAltitude / 100)}</p>
          <p className="mt-1 text-sm text-white/45">{aircraft.maxAltitude.toLocaleString()} feet</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0a0a0acc] p-6">
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-white/60">Production</p>
          <p className="mt-3 text-2xl font-bold">
            {aircraft.inProduction ? (
              <span className="text-[#55a7ff]">Active</span>
            ) : (
              <span className="text-[#55a7ff]">Legacy</span>
            )}
          </p>
          <p className="mt-1 text-sm text-white/45">
            {aircraft.inProduction ? 'In production' : 'Out of production'}
          </p>
        </div>
      </div>

      {/* Performance Data */}
      <div className="mt-8 rounded-2xl border border-white/10 bg-[#0a0a0acc] p-6">
        <h2 className="text-xl font-semibold mb-4">Performance Data</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="border-l-4 border-[#1f88ff] pl-4">
            <p className="text-sm text-white/60">Maximum Takeoff Weight</p>
            <p className="mt-1 font-semibold text-white">
              {aircraft.code === 'A320' && '73,500 kg'}
              {aircraft.code === 'A321' && '93,500 kg'}
              {aircraft.code === 'A359' && '280,000 kg'}
              {aircraft.code === 'B738' && '79,000 kg'}
              {aircraft.code === 'B77W' && '348,800 kg'}
              {aircraft.code === 'B789' && '242,450 kg'}
            </p>
          </div>
          <div className="border-l-4 border-[#55a7ff] pl-4">
            <p className="text-sm text-white/60">Fuel Capacity</p>
            <p className="mt-1 font-semibold text-white">
              {aircraft.code === 'A320' && '27,200 L'}
              {aircraft.code === 'A321' && '32,850 L'}
              {aircraft.code === 'A359' && '138,000 L'}
              {aircraft.code === 'B738' && '26,730 L'}
              {aircraft.code === 'B77W' && '181,300 L'}
              {aircraft.code === 'B789' && '126,400 L'}
            </p>
          </div>
        </div>
      </div>

      {/* Usage Info */}
      <div className="mt-8 rounded-2xl border border-white/10 bg-white/[.02] p-6">
        <p className="text-sm text-white/60">
          {aircraft.code === 'A320' && 'The most widely used commercial aircraft in the world. Short to medium-range airliner used by most airlines globally.'}
          {aircraft.code === 'A321' && 'Stretched version of the A320 with increased capacity and range. Popular for both short and medium-haul routes.'}
          {aircraft.code === 'A359' && 'Ultra-modern long-range wide-body aircraft. Known for efficiency and passenger comfort on long international routes.'}
          {aircraft.code === 'B738' && 'One of the most successful commercial aircraft ever built. Short to medium-range workhorse of global aviation.'}
          {aircraft.code === 'B77W' && 'Long-range wide-body twin-engine jet. Flagship aircraft for many premium international carriers.'}
          {aircraft.code === 'B789' && 'State-of-the-art aircraft with advanced materials and composite construction. Ideal for long-haul operations with improved efficiency.'}
        </p>
      </div>
    </section>
  )
}
