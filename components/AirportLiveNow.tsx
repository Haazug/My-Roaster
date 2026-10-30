'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { AirlineLogo } from '@/components/AirlineLogo'

const fetcher = (u: string) => fetch(u).then((r) => r.json())
const LABEL: Record<string, string> = { departing: 'Departing', arriving: 'Arriving', nearby: 'Nearby' }

export default function AirportLiveNow({ code }: { code?: string }) {
  const { data, isLoading } = useSWR(code ? `/api/airports/${code}/live` : null, fetcher, { refreshInterval: 45000 })
  const flights: any[] = data?.data || []
  if (isLoading) return <p className="mt-8 text-xs text-white/35">Looking for aircraft nearby…</p>
  if (!flights.length) return null
  return (
    <div className="mt-8">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-medium text-white/60">
        <span className="size-1.5 animate-pulse rounded-full bg-[#4caf50]" />Live now <span className="text-white/30">{flights.length}</span>
      </h2>
      <div className="divide-y divide-white/[.06]">
        {flights.map((f) => {
          const air = f.airlineIata || f.airlineIcao
          const href = f.from && f.to && air ? `/route/${air}/${f.from}-${f.to}` : `/live/${f.hex}`
          return (
            <Link key={f.hex} href={href} className="flex items-center gap-3 py-3">
              <AirlineLogo iata={f.airlineIata} icao={f.airlineIcao} name={f.airlineName || f.callsign} size="sm" showText={false} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {f.from && f.to ? `${f.from} → ${f.to}` : f.callsign}
                  <span className="ml-2 text-xs font-normal text-white/40">{f.from ? f.callsign : f.type || ''}</span>
                </p>
                <p className="truncate text-xs text-white/40">{f.airlineName || 'Unknown airline'}{f.fromCity ? ` · ${f.fromCity} → ${f.toCity}` : ''}</p>
              </div>
              <div className="shrink-0 text-right text-xs">
                <p className={f.kind === 'nearby' ? 'text-white/40' : 'text-[#55a7ff]'}>{LABEL[f.kind]}</p>
                <p className="text-white/40">{f.onGround ? 'Ground' : f.altFt != null ? `FL${Math.round(f.altFt / 100)}` : '—'}</p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
